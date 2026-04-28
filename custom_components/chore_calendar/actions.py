"""Shared chore-mutation primitives.

These are the building blocks the ``services.py`` handlers, the ``todo``
platform, and the tag-scan listener all reuse — completion, uncompletion,
the per-list completed-items sweep, and the calendar-listener invalidation
hook. Keeping them in their own module breaks an awkward
``platforms → services`` dependency edge and lets ``services.py`` focus on
service-handler glue.
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util

from .const import DOMAIN, EVENT_ITEM_DELETED, LOGGER, ChoreStatus
from .models import OneshotChore

if TYPE_CHECKING:
    from .coordinator import ChoreCalendarCoordinator
    from .store import ChoreStore


async def async_complete_chore(
    store: ChoreStore,
    coordinator: ChoreCalendarCoordinator,
    uid: str,
    *,
    completed_at: datetime | None = None,
    completed_by: str | None = None,
    keep_skip: bool = False,
) -> None:
    """Record a completion for *uid* and refresh the coordinator.

    Shared by the ``complete_item`` service handler, the todo entity's
    ``needs_action`` → ``completed`` transition, and the tag-scan listener.
    Raises ServiceValidationError if the chore is missing.
    """
    existing = store.get_chore(uid)
    if existing is None:
        msg = f"Chore '{uid}' not found"
        raise ServiceValidationError(msg)

    timestamp = completed_at if completed_at is not None else dt_util.now()
    existing.apply_completion(timestamp, completed_by, clear_skip=not keep_skip)
    await store.async_update_chore(existing)
    await coordinator.async_refresh()
    notify_calendar_event_listeners(coordinator.hass, store.entry_id)
    LOGGER.info("completed %s (%s) at %s", existing.chore_name, uid, timestamp.isoformat())


async def async_uncomplete_chore(
    store: ChoreStore,
    coordinator: ChoreCalendarCoordinator,
    uid: str,
) -> None:
    """Revert the most recent completion for *uid* and refresh the coordinator.

    Shared by the ``uncomplete_item`` service handler and the todo entity's
    ``completed`` → ``needs_action`` transition. Raises ServiceValidationError
    if the chore is missing or has no completion to revert.
    """
    existing = store.get_chore(uid)
    if existing is None:
        msg = f"Chore '{uid}' not found"
        raise ServiceValidationError(msg)

    if existing.last_completed is None:
        msg = f"Chore '{existing.chore_name}' has no completion to revert"
        raise ServiceValidationError(msg)

    existing.revert_completion()
    coordinator.mark_uncompleted(uid)
    await store.async_update_chore(existing)
    await coordinator.async_refresh()
    notify_calendar_event_listeners(coordinator.hass, store.entry_id)
    LOGGER.info("uncompleted %s (%s)", existing.chore_name, uid)


async def async_apply_completed_cleared_at(
    hass: HomeAssistant,
    store: ChoreStore,
    coordinator: ChoreCalendarCoordinator,
    entity_id: str,
    cleared_at: datetime,
) -> None:
    """Set the per-list completed-items cutoff and sweep persist=false oneshots.

    Used by both the ``hide_completed_items`` service handler and the todo
    entity's ``async_remove_completed_items``. After updating the cutoff,
    deletes any terminal-completed oneshot whose ``last_completed`` precedes
    the new cutoff and whose ``persist`` flag is False — these chores are
    "done with" by user intent. Each deletion fires
    ``chore_calendar_item_deleted`` with the supplied *entity_id* in the
    payload.
    """
    await store.async_set_completed_cleared_at(cleared_at)
    LOGGER.debug(
        "completed_cleared_at set to %s for %s",
        cleared_at.isoformat(),
        entity_id,
    )

    now = dt_util.now()
    swept = 0
    for chore in list(store.get_all_chores().values()):
        if not isinstance(chore, OneshotChore):
            continue
        if chore.persist:
            continue
        if chore.last_completed is None or chore.last_completed >= cleared_at:
            continue
        if chore.compute_status(now) != ChoreStatus.COMPLETED:
            continue
        # Eligible: terminal-completed, pre-cutoff, and not flagged to persist.
        await store.async_delete_chore(chore.uid)
        hass.bus.async_fire(
            EVENT_ITEM_DELETED,
            {
                "uid": chore.uid,
                "chore_name": chore.chore_name,
                "chore_type": str(chore.chore_type),
                "entity_id": entity_id,
            },
        )
        LOGGER.info(
            "deleted persist=false oneshot %s (%s)",
            chore.chore_name,
            chore.uid,
        )
        swept += 1

    LOGGER.debug("persist=false sweep complete: %d chore(s) deleted", swept)
    await coordinator.async_refresh()
    notify_calendar_event_listeners(hass, store.entry_id)


def notify_calendar_event_listeners(hass: HomeAssistant, entry_id: str) -> None:
    """Push fresh events to the calendar panel subscribers for *entry_id*.

    HA's calendar dashboard caches event lists client-side and does not
    refetch on ``state_changed`` — CRUD actions on chores leave stale
    events visible until the user navigates dates or reloads the browser.
    ``CalendarEntity.async_update_event_listeners`` (added on HA dev,
    post-2026.3.1) lets the integration push an invalidation.

    Looks up the calendar entity for the given config entry (its unique_id
    is the entry_id) and calls the listener-update method when present.
    Silently no-ops when:

    - The calendar entity isn't loaded for this entry.
    - The HA version doesn't yet implement ``async_update_event_listeners``.
    """
    registry = er.async_get(hass)
    calendar_entity_id = registry.async_get_entity_id("calendar", DOMAIN, entry_id)
    if calendar_entity_id is None:
        return

    calendar_component = hass.data.get("calendar")
    if calendar_component is None:
        return
    entity = calendar_component.get_entity(calendar_entity_id)
    notify = getattr(entity, "async_update_event_listeners", None)
    if notify is None:
        return
    notify()
    LOGGER.debug(
        "Pushed calendar event update to subscribers of %s",
        calendar_entity_id,
    )
