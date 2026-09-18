"""Tag scan listener for automatic chore completion."""

from __future__ import annotations

from datetime import datetime, timedelta

from homeassistant.core import CALLBACK_TYPE, Event, HomeAssistant, callback
from homeassistant.util import dt as dt_util

from .actions import async_complete_chore
from .const import LOGGER, ChoreEventSource, ChoreStatus
from .coordinator import ChoreCalendarCoordinator
from .models import BaseChore, IntervalChore
from .store import ChoreStore

# HA fires this event when an NFC tag is scanned.
EVENT_TAG_SCANNED = "tag_scanned"

# A scan landing this soon after the last completion is a repeat read of the
# same tap (double tap, tag left on the reader), never a second chore done.
TAG_SCAN_DEBOUNCE = timedelta(minutes=1)


def _accepts_tag_scan(chore: BaseChore, now: datetime) -> bool:
    """Return True when a scan at *now* should record a completion for *chore*.

    A terminal chore has nothing left to complete. A scan inside the debounce
    window of the last completion is a repeat read and is dropped. Beyond
    that the gate is per type. An interval chore's next due is derived from
    its last completion, so every scan is a completion and resets the clock,
    even one arriving before the pending window opens. A scheduled or oneshot
    chore is completed only while it reads as actionable: ``pending``,
    ``due``, or ``overdue``. A never-completed chore reads ``pending`` before
    its first window, so a scan completes it; that completion is recorded but
    does not satisfy the first occurrence unless it lands inside its window.
    """
    if chore.terminal:
        return False
    if chore.last_completed is not None and abs(now - chore.last_completed) < TAG_SCAN_DEBOUNCE:
        return False
    if isinstance(chore, IntervalChore):
        return True
    return chore.compute_status(now) != ChoreStatus.COMPLETED


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
            if chore.trigger_tag_id == tag_id and _accepts_tag_scan(chore, now)
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
    so a subsequent ``uncomplete_item`` can revert to the prior state, a
    OneshotChore is marked ``terminal``, and calendar event listeners are
    notified so dashboards refresh promptly.
    """
    for chore in chores:
        await async_complete_chore(store, coordinator, chore.uid, completed_at=now, source=ChoreEventSource.TAG)
        LOGGER.info("Auto-completed chore %s (%s) via tag scan", chore.chore_name, chore.uid)
