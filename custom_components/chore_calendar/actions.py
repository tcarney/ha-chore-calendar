"""Shared chore-mutation primitives.

These are the building blocks the ``services.py`` handlers, the ``todo``
platform, and the tag-scan listener all reuse — completion, uncompletion,
and the per-list completed-items sweep. Keeping them in their own module
breaks an awkward ``platforms → services`` dependency edge and lets
``services.py`` focus on service-handler glue.
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util

from .const import EVENT_ITEM_DELETED, LOGGER, ChoreEventSource

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
    source: ChoreEventSource = ChoreEventSource.COMPLETE,
) -> None:
    """Record a completion for *uid* and refresh the coordinator.

    Shared by the ``complete_item`` service handler, the todo entity's
    ``needs_action`` → ``completed`` transition, and the tag-scan listener.
    The tag-scan path passes ``source=TAG`` so the resulting status_changed
    event distinguishes auto-completion from explicit user action. Raises
    ServiceValidationError if the chore is missing.
    """
    existing = store.get_chore(uid)
    if existing is None:
        msg = f"Chore '{uid}' not found"
        raise ServiceValidationError(msg)

    timestamp = completed_at if completed_at is not None else dt_util.now()
    existing.apply_completion(timestamp, completed_by, clear_skip=not keep_skip)
    coordinator.mark_source(uid, source)
    await store.async_update_chore(existing)
    await coordinator.async_refresh()
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
    coordinator.mark_source(uid, ChoreEventSource.UNCOMPLETE)
    await store.async_update_chore(existing)
    await coordinator.async_refresh()
    LOGGER.info("uncompleted %s (%s)", existing.chore_name, uid)


async def async_apply_completed_cleared_at(
    hass: HomeAssistant,
    store: ChoreStore,
    coordinator: ChoreCalendarCoordinator,
    entity_id: str,
    cleared_at: datetime,
) -> None:
    """Set the per-list completed-items cutoff and sweep persist=false chores.

    Used by both the ``hide_completed_items`` service handler and the todo
    entity's ``async_remove_completed_items``. After updating the cutoff,
    deletes any terminal-completed oneshot — and any until/count-exhausted
    (``terminal``) scheduled or interval chore — whose ``last_completed``
    precedes the new cutoff and whose ``persist`` flag is False; these
    chores are "done with" by user intent. A recurring chore that is merely
    completed for the current cycle is never swept: only the ``terminal``
    flag makes it eligible. Each deletion fires
    ``chore_calendar_item_deleted`` with the supplied *entity_id* in the
    payload.
    """
    await store.async_set_completed_cleared_at(cleared_at)
    LOGGER.debug(
        "completed_cleared_at set to %s for %s",
        cleared_at.isoformat(),
        entity_id,
    )

    swept = 0
    for chore in list(store.get_all_chores().values()):
        # Sweep only terminal-completed chores not flagged to persist. The
        # `terminal` gate is uniform: a completed oneshot is terminal
        # (apply_completion sets it), and a recurring chore is terminal only
        # once its UNTIL/COUNT series is exhausted — so a dormant-between-cycles
        # recurring chore, or a rescheduled (re-activated) oneshot, is kept.
        if not chore.terminal or chore.persist:
            continue
        if chore.last_completed is None or chore.last_completed >= cleared_at:
            continue
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
            "deleted persist=false chore %s (%s)",
            chore.chore_name,
            chore.uid,
        )
        swept += 1

    LOGGER.debug("persist=false sweep complete: %d chore(s) deleted", swept)
    await coordinator.async_refresh()


def resolve_tag_entity_id(hass: HomeAssistant, trigger_tag_id: str | None) -> str | None:
    """Resolve a tag UUID back to its current ``tag.*`` entity_id, or None.

    Tag entity_ids can be renamed by the user; the tag UUID is stable. We
    store the UUID on the chore (``trigger_tag_id``) and resolve back to
    the entity_id on demand for sensor attributes and service responses.
    """
    if not trigger_tag_id:
        return None
    registry = er.async_get(hass)
    return registry.async_get_entity_id("tag", "tag", trigger_tag_id)
