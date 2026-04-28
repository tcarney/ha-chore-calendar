"""Todo platform for Chore Calendar — one todo list entity per chore list.

The todo entity is a read-mostly companion to the calendar entity. It exposes
actionable chores (``pending`` / ``due`` / ``overdue``) as ``needs_action``
items and recently completed chores as ``completed`` items. Including
``pending`` chores keeps the todo list aligned with HA's native
``todo-list-card``, which shows all ``needs_action`` items by default;
both that card and the chore card support a ``due_date_period`` filter
for users who want a focused window.

Only ``UPDATE_TODO_ITEM`` is advertised — status toggles route through the
same helpers that back the ``complete_item`` / ``uncomplete_item`` services:

* ``needs_action`` → ``completed``: record a completion for the current period.
* ``completed`` → ``needs_action``: revert the most recent completion.

No other updates (rename, due-date, description) are supported — the HA update
service is called with a full ``TodoItem`` payload, so we silently ignore
unsupported field changes rather than raise.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from homeassistant.components.todo import TodoItem, TodoListEntity
from homeassistant.components.todo.const import TodoItemStatus, TodoListEntityFeature
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.util import dt as dt_util

from .const import DOMAIN, ChoreStatus
from .coordinator import ChoreCalendarCoordinator
from .models import BaseChore
from .services import async_complete_chore, async_uncomplete_chore

if TYPE_CHECKING:
    from datetime import datetime

    from . import ChoreCalendarConfigEntry

# Bucket priority for sorting: lower number = earlier in the list.
_BUCKET_ORDER: dict[ChoreStatus, int] = {
    ChoreStatus.OVERDUE: 0,
    ChoreStatus.DUE: 1,
    ChoreStatus.PENDING: 2,
    ChoreStatus.COMPLETED: 3,
}


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ChoreCalendarConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the todo entity for a chore list."""
    coordinator = entry.runtime_data.coordinator
    async_add_entities([ChoreCalendarTodoEntity(coordinator, entry)])


class ChoreCalendarTodoEntity(CoordinatorEntity[ChoreCalendarCoordinator], TodoListEntity):
    """Todo list entity exposing a chore list's actionable chores."""

    _attr_has_entity_name = True
    _attr_icon = "mdi:clipboard-check-outline"
    _attr_supported_features = TodoListEntityFeature.UPDATE_TODO_ITEM

    def __init__(
        self,
        coordinator: ChoreCalendarCoordinator,
        entry: ChoreCalendarConfigEntry,
    ) -> None:
        """Initialize the todo entity."""
        super().__init__(coordinator)
        self._entry = entry
        self._attr_unique_id = f"{entry.entry_id}_todo"
        self._attr_name = None  # Use device name as entity name.
        # Mirror the calendar entity's DeviceInfo so the device exists with a
        # name regardless of platform setup order — the todo platform sets up
        # before calendar, so relying on calendar to seed the device name would
        # leave this entity with a fallback slug for its object_id.
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=entry.title,
            entry_type=DeviceEntryType.SERVICE,
        )

    @property
    def todo_items(self) -> list[TodoItem] | None:
        """Return the current todo items, rebuilt from coordinator data.

        Pending/due/overdue map to ``needs_action``, completed maps to
        ``completed``. Items are sorted overdue → due → pending → completed,
        each bucket ordered by ``due`` ascending (items with no ``due`` sort
        last within their bucket).

        Field population choices:

        * ``due`` is only set on actionable (``needs_action``) items. For
          completed items we leave it empty — a done item isn't "due at X" in
          standard todo semantics, and reporting the *next* period's due time
          on a completed row looks misleading in the UI.
        * ``completed`` is only set on ``completed`` items (from
          ``chore.last_completed``). For actionable items it stays ``None`` —
          ``chore.last_completed`` persists across recurring periods, so
          surfacing it on a chore that's currently due would contradict the
          ``needs_action`` status.
        """
        if self.coordinator.data is None:
            return None

        now = dt_util.now()
        cleared_at = self.coordinator.store.completed_cleared_at
        entries: list[tuple[int, datetime | None, TodoItem]] = []
        for chore in self.coordinator.data.values():
            status = chore.compute_status(now)
            todo_status = _map_status(status)
            # next_due is used for stable within-bucket sorting regardless of
            # the TodoItem field population rules below.
            next_due = chore.compute_next_due(now)
            if todo_status == TodoItemStatus.COMPLETED:
                # Hide completed items whose last_completed precedes the
                # per-list cleared_at cutoff.
                if cleared_at is not None and chore.last_completed is not None and chore.last_completed < cleared_at:
                    continue
                item = TodoItem(
                    summary=chore.chore_name,
                    uid=chore.uid,
                    status=todo_status,
                    completed=chore.last_completed,
                )
            else:
                item = TodoItem(
                    summary=chore.chore_name,
                    uid=chore.uid,
                    status=todo_status,
                    due=next_due,
                )
            entries.append((_BUCKET_ORDER[status], next_due, item))

        # Sort by (bucket, due). Items with no due date sort after dated ones
        # within the same bucket (shouldn't happen in practice, but keeps the
        # comparison total).
        entries.sort(key=lambda e: (e[0], e[1] is None, e[1] or now))
        return [item for _, _, item in entries]

    async def async_update_todo_item(self, item: TodoItem) -> None:
        """Route a todo-item update to the appropriate chore-state transition.

        HA's ``todo.update_item`` service passes the full ``TodoItem`` with any
        updated fields merged in. We compare the new ``status`` against the
        chore's current status and route accordingly. Status-only no-ops, plus
        rename / due-date / description edits, are silently ignored.
        """
        if item.uid is None:
            msg = "Cannot update todo item without a uid"
            raise ServiceValidationError(msg)

        chore = self._get_chore(item.uid)
        if chore is None:
            msg = f"Chore '{item.uid}' not found"
            raise ServiceValidationError(msg)

        current_status = chore.compute_status(dt_util.now())
        store = self._entry.runtime_data.store

        if item.status == TodoItemStatus.COMPLETED and current_status != ChoreStatus.COMPLETED:
            await async_complete_chore(store, self.coordinator, item.uid)
            return

        if item.status == TodoItemStatus.NEEDS_ACTION and current_status == ChoreStatus.COMPLETED:
            await async_uncomplete_chore(store, self.coordinator, item.uid)
            return

        # Same status, or unsupported edit (rename/due/description) — ignore.

    def _get_chore(self, uid: str) -> BaseChore | None:
        """Look up a chore by uid in the coordinator's current snapshot."""
        if self.coordinator.data is None:
            return None
        return self.coordinator.data.get(uid)


def _map_status(status: ChoreStatus) -> TodoItemStatus:
    """Map a ChoreStatus to a TodoItemStatus."""
    if status == ChoreStatus.COMPLETED:
        return TodoItemStatus.COMPLETED
    return TodoItemStatus.NEEDS_ACTION
