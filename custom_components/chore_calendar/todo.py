"""Todo platform for Chore Calendar — one todo list entity per chore list.

The todo entity is the HA-native companion to the calendar entity. It exposes
actionable chores (``pending`` / ``due`` / ``overdue``) as ``needs_action``
items and recently completed chores as ``completed`` items. Including
``pending`` chores keeps the todo list aligned with HA's native
``todo-list-card``, which shows all ``needs_action`` items by default;
both that card and the chore card support a ``due_date_period`` filter
for users who want a focused window.

``UPDATE_TODO_ITEM`` plus the ``SET_DESCRIPTION_ON_ITEM`` /
``SET_DUE_DATETIME_ON_ITEM`` field features are advertised. HA's update
service always submits the full ``TodoItem`` (the card's edit dialog submits
the whole form on save), so the handler diffs each field against what
``todo_items`` reported and applies only real changes:

* ``status``: routes through the same helpers that back the
  ``complete_item`` / ``uncomplete_item`` services.
* ``summary`` / ``description``: written straight onto the chore (an empty
  description clears it, matching ``chore_calendar.update_item``).
* ``due``: a *reschedule of the current occurrence*. For a oneshot chore it
  writes ``due_datetime`` directly (reopening a terminal-completed oneshot,
  the ``update_item`` semantics); ``None`` makes the chore unscheduled. For
  recurring chores it sets the ``skipped_until`` due override — later defers,
  earlier advances — and clearing the due releases an active override so the
  natural cadence resumes (the "undo skip" path). The series schedule is
  never touched from here; that remains ``chore_calendar.update_item``.

``CREATE_TODO_ITEM`` maps ``todo.add_item`` to a **oneshot** chore — the
todo surface is quick capture, and a one-off is the only chore type with 1:1
todo semantics (summary / optional due / description carry straight over).
Recurring chores are deliberate setup and keep their doorway in
``chore_calendar.create_item`` and the card. A todo-created oneshot defaults
``persist=False``, so once completed it is swept by ``hide_completed_items``
— it lives and dies entirely within todo semantics.

``DELETE_TODO_ITEM`` stays unadvertised — deletes are ambiguous between
occurrence and series (see SPECS.md).
"""

from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING
from uuid import uuid4

from homeassistant.components.todo import TodoItem, TodoListEntity
from homeassistant.components.todo.const import TodoItemStatus, TodoListEntityFeature
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.util import dt as dt_util

from . import chore_list_device_info
from .actions import async_complete_chore, async_register_chore, async_uncomplete_chore
from .const import DOMAIN, ChoreEventSource, ChoreStatus, ChoreType
from .coordinator import ChoreCalendarCoordinator
from .models import BaseChore, OneshotChore

if TYPE_CHECKING:
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
    _attr_supported_features = (
        TodoListEntityFeature.CREATE_TODO_ITEM
        | TodoListEntityFeature.UPDATE_TODO_ITEM
        | TodoListEntityFeature.SET_DESCRIPTION_ON_ITEM
        | TodoListEntityFeature.SET_DUE_DATETIME_ON_ITEM
    )

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
        # Seed the device with name + entry_type — the todo platform sets up
        # before calendar, so leaving the seeding to calendar would leave
        # this entity with a fallback slug for its object_id.
        self._attr_device_info = chore_list_device_info(entry)

    @property
    def todo_items(self) -> list[TodoItem] | None:
        """Return the current todo items, rebuilt from coordinator data.

        Pending/due/overdue map to ``needs_action``, completed maps to
        ``completed``. Items are sorted overdue → due → pending → completed,
        each bucket ordered by ``due`` ascending (items with no ``due`` sort
        last within their bucket).

        Field population choices:

        * ``due`` is set on actionable (``needs_action``) items, and on
          completed items only while a ``skipped_until`` override is active —
          a skip-deferred chore reads COMPLETED (dormant) but "deferred until
          X" is exactly what the row means, and exposing the date is what
          lets a due edit move or clear the skip from the native card. A
          genuinely done item carries no due — reporting the *next* period's
          due time on a completed row looks misleading in the UI.
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
                    due=chore.skipped_until,
                    description=chore.description,
                )
            else:
                item = TodoItem(
                    summary=chore.chore_name,
                    uid=chore.uid,
                    status=todo_status,
                    due=next_due,
                    description=chore.description,
                )
            entries.append((_BUCKET_ORDER[status], next_due, item))

        # Sort by (bucket, due). Items with no due date sort after dated ones
        # within the same bucket (shouldn't happen in practice, but keeps the
        # comparison total).
        entries.sort(key=lambda e: (e[0], e[1] is None, e[1] or now))
        return [item for _, _, item in entries]

    async def async_create_todo_item(self, item: TodoItem) -> None:
        """Create a oneshot chore from a new todo item.

        The todo surface is quick capture: a one-off is the only chore type
        with 1:1 todo semantics, so ``todo.add_item`` always creates a
        ``OneshotChore`` — summary, optional due, and description carry
        over; ``persist`` defaults False so a completed one is swept by
        ``hide_completed_items``. Recurring chores are created via
        ``chore_calendar.create_item`` or the card.

        Persists and announces through the same helper as the service, so
        ``chore_calendar_item_created`` fires with the identical payload
        (``entity_id`` is the list's calendar entity, the list identifier
        used across the event surface).
        """
        if not item.summary:
            msg = "Cannot create a todo item without a summary"
            raise ServiceValidationError(msg)

        chore = OneshotChore(
            uid=str(uuid4()),
            chore_name=item.summary,
            chore_type=ChoreType.ONESHOT,
            description=item.description or None,
            due_datetime=_coerce_due(item.due),
            created_at=dt_util.now(),
        )
        await async_register_chore(
            self.hass,
            self._entry.runtime_data.store,
            self.coordinator,
            chore,
            self._list_entity_id(),
        )

    def _list_entity_id(self) -> str:
        """Return the list's calendar entity_id, the event-payload list identifier.

        Falls back to this todo entity's id in the degenerate case where the
        calendar entity is not (yet) registered.
        """
        registry = er.async_get(self.hass)
        calendar_entity_id = registry.async_get_entity_id("calendar", DOMAIN, self._entry.entry_id)
        return calendar_entity_id or self.entity_id

    async def async_update_todo_item(self, item: TodoItem) -> None:
        """Apply a todo-item update by diffing against the reported item.

        HA's ``todo.update_item`` service passes the full ``TodoItem`` with
        any updated fields merged in (the card's edit dialog submits the
        whole form), so every field is compared against what ``todo_items``
        reported and only real changes are applied — see the module
        docstring for the per-field semantics.

        Ordering: rename/description mutate the chore in place first (they
        are persisted by whichever save runs below). A status transition
        routes through the shared complete/uncomplete helpers; a due edit
        submitted together with a completion is applied first and survives
        it (``keep_skip``), while one submitted with an uncomplete is applied
        after the revert so it wins over the restored pre-completion state.
        """
        if item.uid is None:
            msg = "Cannot update todo item without a uid"
            raise ServiceValidationError(msg)

        store = self._entry.runtime_data.store
        chore = store.get_chore(item.uid)
        if chore is None:
            msg = f"Chore '{item.uid}' not found"
            raise ServiceValidationError(msg)

        now = dt_util.now()
        current_status = chore.compute_status(now)

        field_edits = False
        if item.summary is not None and item.summary != chore.chore_name:
            chore.chore_name = item.summary
            field_edits = True
        # The dialog submits "" for a cleared description — normalize to
        # None, matching the update_item service.
        new_description = item.description or None
        if new_description != chore.description:
            chore.description = new_description
            field_edits = True

        # Diff ``due`` against what todo_items reported: next_due for
        # actionable items; for completed ones the active override, if any
        # (a skip-deferred item carries its deferred-until date).
        if current_status == ChoreStatus.COMPLETED:
            reported_due = chore.skipped_until
        else:
            reported_due = chore.compute_next_due(now)
        new_due = _coerce_due(item.due)
        due_changed = new_due != reported_due

        completing = item.status == TodoItemStatus.COMPLETED and current_status != ChoreStatus.COMPLETED
        uncompleting = item.status == TodoItemStatus.NEEDS_ACTION and current_status == ChoreStatus.COMPLETED

        if completing:
            if due_changed:
                _apply_due_edit(chore, new_due)
            await async_complete_chore(store, self.coordinator, item.uid, keep_skip=due_changed)
            return

        if uncompleting:
            await async_uncomplete_chore(store, self.coordinator, item.uid)
            if due_changed:
                _apply_due_edit(chore, new_due)
                self.coordinator.mark_source(item.uid, ChoreEventSource.SKIP)
                await store.async_update_chore(chore)
                await self.coordinator.async_refresh()
            return

        if due_changed:
            _apply_due_edit(chore, new_due)
        if field_edits or due_changed:
            source = ChoreEventSource.SKIP if due_changed else ChoreEventSource.UPDATE
            self.coordinator.mark_source(item.uid, source)
            await store.async_update_chore(chore)
            await self.coordinator.async_refresh()


def _map_status(status: ChoreStatus) -> TodoItemStatus:
    """Map a ChoreStatus to a TodoItemStatus."""
    if status == ChoreStatus.COMPLETED:
        return TodoItemStatus.COMPLETED
    return TodoItemStatus.NEEDS_ACTION


def _coerce_due(due: date | datetime | None) -> datetime | None:
    """Normalize an incoming ``TodoItem.due`` to a tz-aware datetime.

    Only ``SET_DUE_DATETIME_ON_ITEM`` is advertised, so HA core rejects
    date-only values before they reach the entity — the isinstance guard is
    defensive. A naive datetime is coerced to HA's local timezone, mirroring
    the ``skip_item`` service handler.
    """
    if due is None:
        return None
    if not isinstance(due, datetime):
        msg = "Date-only due values are not supported; provide a due datetime"
        raise ServiceValidationError(msg)
    if due.tzinfo is None:
        return due.replace(tzinfo=dt_util.DEFAULT_TIME_ZONE)
    return due


def _apply_due_edit(chore: BaseChore, new_due: datetime | None) -> None:
    """Reschedule the chore's current occurrence to *new_due*.

    Oneshot: the occurrence *is* the series, so this writes ``due_datetime``
    directly — both directions work, ``None`` unschedules, and a terminal
    (completed) oneshot reopens, matching ``chore_calendar.update_item``.
    Any stale ``skipped_until`` is released so it cannot shadow the new due.

    Recurring: sets the ``skipped_until`` due override (later defers,
    earlier advances). Clearing the due releases an active override so the
    natural cadence resumes; without one there is nothing to clear — the
    due derives from the schedule — so that is rejected rather than
    silently reverting in the UI. A terminal (UNTIL/COUNT-exhausted) series
    has no occurrence left to move and is rejected likewise.
    """
    if isinstance(chore, OneshotChore):
        chore.due_datetime = new_due
        chore.skipped_until = None
        chore.terminal = False
        return

    if chore.terminal:
        msg = f"The series for '{chore.chore_name}' has ended; reschedule it via chore_calendar.update_item"
        raise ServiceValidationError(msg)
    if new_due is None:
        if chore.skipped_until is None:
            msg = (
                f"'{chore.chore_name}' takes its due from its schedule; "
                "set a due date to reschedule the current occurrence, or "
                "change the schedule via chore_calendar.update_item"
            )
            raise ServiceValidationError(msg)
        chore.skipped_until = None
        return
    chore.skipped_until = new_due
