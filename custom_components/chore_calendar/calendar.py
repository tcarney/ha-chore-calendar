"""Calendar platform for Chore Calendar — one calendar entity per list."""

from __future__ import annotations

import datetime
from typing import TYPE_CHECKING

from homeassistant.components.calendar import CalendarEntity, CalendarEvent
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.util import dt as dt_util

from . import chore_list_device_info
from .const import LOGGER, ChoreStatus
from .coordinator import ChoreCalendarCoordinator
from .models import BaseChore, ScheduledChore

if TYPE_CHECKING:
    from . import ChoreCalendarConfigEntry


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ChoreCalendarConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the calendar entity for a chore list."""
    coordinator = entry.runtime_data.coordinator
    async_add_entities([ChoreCalendarListEntity(coordinator, entry)])


def _make_due_event(chore: BaseChore, now: datetime.datetime) -> CalendarEvent | None:
    """Create a zero-duration calendar event at the chore's operative due time.

    Events are emitted as point-in-time markers (start == end) rather than
    spanning the grace period — long grace windows would otherwise render as
    multi-day blocks on the calendar. The entity's ``state`` property is
    overridden so the ``on``/``off`` signal still reflects "any chore due or
    overdue" despite the zero-duration events.

    Scheduled-chore markers that coincide with a grid occurrence carry the
    series ``rrule`` and the occurrence's ``recurrence_id``; a skip-shifted
    marker is a synthetic anchor with no series identity and carries neither.
    """
    due_range = chore.compute_due_range(now)
    if due_range is None:
        return None

    due_at, overdue_at = due_range

    if chore.compute_status(now) != ChoreStatus.COMPLETED or due_at > now:
        # Current period is active, or the due window is still in the future
        # (interval chores report the upcoming window even when completed).
        return _due_marker(chore, due_at)

    # Current period is completed — show the next one. Ask for next_due from
    # after the current period ends so we skip past it.
    next_due = chore.compute_next_due(overdue_at)
    if next_due is None or next_due <= due_at:
        return None
    return _due_marker(chore, next_due)


def _due_marker(chore: BaseChore, start: datetime.datetime) -> CalendarEvent:
    """Build a zero-duration due event, attaching series fields when on-grid."""
    rrule: str | None = None
    recurrence_id: str | None = None
    if isinstance(chore, ScheduledChore):
        recurrence_id = chore.occurrence_recurrence_id(start)
        if recurrence_id is not None:
            rrule = chore.rrule
    return CalendarEvent(
        summary=chore.chore_name,
        start=start,
        end=start,
        description=chore.description,
        uid=chore.uid,
        rrule=rrule,
        recurrence_id=recurrence_id,
    )


def _expand_future_occurrences(
    chore: ScheduledChore,
    operative_start: datetime.datetime,
    now: datetime.datetime,
    start_date: datetime.datetime,
    end_date: datetime.datetime,
) -> list[CalendarEvent]:
    """Expand grid occurrences beyond the operative marker within the window.

    The operative marker (pinned / skip-aware) represents the current
    period; everything strictly after ``max(now, operative)`` is pure rrule
    expansion, which also keeps occurrences deferred by an active
    ``skipped_until`` out of the window. Past grid occurrences are
    deliberately not re-emitted: history is represented by the completion
    markers and the pinned operative period, so the raw grid would only add
    phantom "missed" duplicates.
    """
    threshold = max(now, operative_start)
    window_start = max(start_date, threshold)
    if window_start >= end_date:
        return []
    return [
        _due_marker(chore, occurrence)
        for occurrence in chore.occurrences_between(window_start, end_date)
        if occurrence > threshold
    ]


def _make_completed_event(
    chore: BaseChore,
    cleared_at: datetime.datetime | None,
) -> CalendarEvent | None:
    """Create a zero-duration event at last_completed.

    Returns None when the chore has no completion, or when its
    ``last_completed`` precedes the per-list ``completed_cleared_at`` cutoff
    (set by ``hide_completed_items`` / ``todo.remove_completed_items``).
    """
    if chore.last_completed is None:
        return None
    if cleared_at is not None and chore.last_completed < cleared_at:
        return None
    # The completed marker carries the chore's uid so consumers can correlate
    # it back to the chore, but no description — it is a synthetic history
    # marker, not the chore's due event.
    return CalendarEvent(
        summary=f"✓ {chore.chore_name}",
        start=chore.last_completed,
        end=chore.last_completed,
        uid=chore.uid,
    )


class ChoreCalendarListEntity(CoordinatorEntity[ChoreCalendarCoordinator], CalendarEntity):
    """Calendar entity representing a chore list.

    Shows next-due and recently-completed events for all chores in the list.
    """

    _attr_has_entity_name = True
    _attr_icon = "mdi:calendar-check"

    def __init__(
        self,
        coordinator: ChoreCalendarCoordinator,
        entry: ChoreCalendarConfigEntry,
    ) -> None:
        """Initialize the calendar entity."""
        super().__init__(coordinator)
        self._attr_unique_id = entry.entry_id
        self._attr_name = None  # Use device name as entity name.
        self._attr_device_info = chore_list_device_info(entry)

    @property
    def event(self) -> CalendarEvent | None:
        """Return the nearest active due event across all chores."""
        if self.coordinator.data is None:
            return None
        now = dt_util.now()
        soonest: CalendarEvent | None = None
        for chore in self.coordinator.data.values():
            evt = _make_due_event(chore, now)
            if evt is None:
                continue
            if soonest is None or evt.start < soonest.start:
                soonest = evt
        return soonest

    @property
    def state(self) -> str:
        """Return ``on`` while any chore in the list is due or overdue.

        HA's default ``CalendarEntity.state`` reads ``on`` only while
        ``event.start <= now < event.end``. Our events are zero-duration
        markers, so that check can never pass — we override to reflect
        chore-level state instead, keeping the calendar entity useful for
        automation conditions like "any chore actionable?". Pending and
        completed chores leave the state ``off``.
        """
        if self.coordinator.data is None:
            return "off"
        now = dt_util.now()
        for chore in self.coordinator.data.values():
            status = chore.compute_status(now)
            if status in (ChoreStatus.DUE, ChoreStatus.OVERDUE):
                return "on"
        return "off"

    async def async_get_events(
        self,
        hass: HomeAssistant,
        start_date: datetime.datetime,
        end_date: datetime.datetime,
    ) -> list[CalendarEvent]:
        """Return calendar events within a datetime range.

        Per the HA calendar contract, recurring chores are returned
        flattened: the operative (pinned / skip-aware) marker plus every
        future grid occurrence inside the window, each carrying ``uid``,
        the series ``rrule``, and its ``recurrence_id``.
        """
        if self.coordinator.data is None:
            return []
        now = dt_util.now()
        cleared_at = self.coordinator.store.completed_cleared_at
        events: list[CalendarEvent] = []
        for chore in self.coordinator.data.values():
            # Completed event (zero-duration at last_completed) — hidden
            # when last_completed precedes the per-list cleared_at cutoff.
            completed_evt = _make_completed_event(chore, cleared_at)
            if completed_evt is not None and _overlaps(completed_evt, start_date, end_date):
                events.append(completed_evt)
            # Operative due event (current period).
            due_evt = _make_due_event(chore, now)
            if due_evt is None:
                continue
            if _overlaps(due_evt, start_date, end_date):
                events.append(due_evt)
            # Future occurrences beyond the operative marker — scheduled
            # chores only; interval/oneshot chores have no grid to expand.
            # (The isinstance check on start narrows CalendarEvent's
            # date | datetime union; due markers are always datetimes.)
            if isinstance(chore, ScheduledChore) and isinstance(due_evt.start, datetime.datetime):
                events.extend(_expand_future_occurrences(chore, due_evt.start, now, start_date, end_date))
        events.sort(key=lambda e: e.start)
        LOGGER.debug(
            "%s.async_get_events(%s → %s): %d event(s) (cleared_at=%s)",
            self.entity_id,
            start_date.isoformat(),
            end_date.isoformat(),
            len(events),
            cleared_at.isoformat() if cleared_at else None,
        )
        return events


def _overlaps(
    event: CalendarEvent,
    start: datetime.datetime,
    end: datetime.datetime,
) -> bool:
    """Return True if *event* overlaps the [start, end) query range."""
    return event.end > start and event.start < end
