"""Tag scan listener for automatic chore completion."""

from __future__ import annotations

from datetime import datetime

from homeassistant.core import CALLBACK_TYPE, Event, HomeAssistant, callback
from homeassistant.util import dt as dt_util

from .const import LOGGER, ChoreStatus
from .coordinator import ChoreCalendarCoordinator
from .models import BaseChore
from .services import async_complete_chore
from .store import ChoreStore

# HA fires this event when an NFC tag is scanned.
EVENT_TAG_SCANNED = "tag_scanned"


def async_setup_tag_listener(
    hass: HomeAssistant,
    store: ChoreStore,
    coordinator: ChoreCalendarCoordinator,
) -> CALLBACK_TYPE:
    """Register a bus listener for tag_scanned events.

    Returns an unsubscribe callback.
    """

    @callback
    def _async_handle_tag_scanned(event: Event) -> None:
        """Handle a tag_scanned event — auto-complete matching chores."""
        tag_id: str | None = event.data.get("tag_id")
        if not tag_id:
            return

        now = dt_util.now()
        matching = [
            chore
            for chore in store.get_all_chores().values()
            if chore.trigger_tag_id == tag_id
            and chore.compute_status(now) != ChoreStatus.COMPLETED
            and chore.is_in_completion_window(now)
        ]

        if not matching:
            return

        LOGGER.debug("Tag %s matched %d chore(s): %s", tag_id, len(matching), [c.chore_name for c in matching])

        # Complete each matching chore. We schedule a coroutine because the
        # bus callback is synchronous.
        hass.async_create_task(_async_complete_chores(store, coordinator, matching, now))

    return hass.bus.async_listen(EVENT_TAG_SCANNED, _async_handle_tag_scanned)


async def _async_complete_chores(
    store: ChoreStore,
    coordinator: ChoreCalendarCoordinator,
    chores: list[BaseChore],
    now: datetime,
) -> None:
    """Complete one or more chores via the shared completion helper.

    Routing through ``async_complete_chore`` keeps tag-scan completions
    consistent with the ``complete_item`` service: the undo slot is populated
    so a subsequent ``uncomplete_item`` can revert to the prior state, the
    OneshotChore synthetic-due rule fires, and calendar event listeners are
    notified so dashboards refresh promptly.
    """
    for chore in chores:
        await async_complete_chore(store, coordinator, chore.uid, completed_at=now)
        LOGGER.info("Auto-completed chore %s (%s) via tag scan", chore.chore_name, chore.uid)
