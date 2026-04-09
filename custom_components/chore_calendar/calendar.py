"""Calendar platform for Chore Calendar — one calendar entity per list."""

from __future__ import annotations

import datetime
from typing import TYPE_CHECKING

from homeassistant.components.calendar import CalendarEntity, CalendarEvent
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.util import dt as dt_util

from .const import DOMAIN, ChoreStatus
from .coordinator import ChoreCalendarCoordinator
from .models import BaseChore

if TYPE_CHECKING:
    from . import ChoreCalendarConfigEntry

# Show completed events for this long after completion.
_COMPLETED_EVENT_WINDOW = datetime.timedelta(hours=24)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ChoreCalendarConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the calendar entity for a chore list."""
    coordinator = entry.runtime_data.coordinator
    async_add_entities([ChoreCalendarListEntity(coordinator, entry)])


def _make_due_event(chore: BaseChore, now: datetime.datetime) -> CalendarEvent | None:
    """Create a calendar event for the chore's next upcoming due window."""
    due_range = chore.compute_due_range(now)
    if due_range is None:
        return None

    if chore.compute_status(now) != ChoreStatus.COMPLETED:
        # Current period is active — show it.
        due_at, overdue_at = due_range
        return CalendarEvent(summary=chore.chore_name, start=due_at, end=overdue_at)

    # Current period is completed — show the next one.
    # Ask for next_due from after the current period ends so we skip past it.
    due_at, overdue_at = due_range
    next_due = chore.compute_next_due(overdue_at)
    if next_due is None or next_due <= due_at:
        return None
    grace_duration = overdue_at - due_at
    return CalendarEvent(
        summary=chore.chore_name,
        start=next_due,
        end=next_due + grace_duration,
    )


def _make_completed_event(chore: BaseChore, now: datetime.datetime) -> CalendarEvent | None:
    """Create a zero-duration event at last_completed if within 24 hours."""
    if chore.last_completed is None:
        return None
    if now - chore.last_completed > _COMPLETED_EVENT_WINDOW:
        return None
    return CalendarEvent(
        summary=f"✓ {chore.chore_name}",
        start=chore.last_completed,
        end=chore.last_completed,
    )


class ChoreCalendarListEntity(CoordinatorEntity[ChoreCalendarCoordinator], CalendarEntity):
    """Calendar entity representing a chore list.

    Shows next-due and recently-completed events for all chores in the list.
    """

    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: ChoreCalendarCoordinator,
        entry: ChoreCalendarConfigEntry,
    ) -> None:
        """Initialize the calendar entity."""
        super().__init__(coordinator)
        self._attr_unique_id = entry.entry_id
        self._attr_name = None  # Use device name as entity name.
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=entry.title,
            entry_type=DeviceEntryType.SERVICE,
        )

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

    async def async_get_events(
        self,
        hass: HomeAssistant,
        start_date: datetime.datetime,
        end_date: datetime.datetime,
    ) -> list[CalendarEvent]:
        """Return calendar events within a datetime range."""
        if self.coordinator.data is None:
            return []
        now = dt_util.now()
        events: list[CalendarEvent] = []
        for chore in self.coordinator.data.values():
            # Completed event (zero-duration at last_completed).
            completed_evt = _make_completed_event(chore, now)
            if completed_evt is not None and _overlaps(completed_evt, start_date, end_date):
                events.append(completed_evt)
            # Next due event.
            due_evt = _make_due_event(chore, now)
            if due_evt is not None and _overlaps(due_evt, start_date, end_date):
                events.append(due_evt)
        events.sort(key=lambda e: e.start)
        return events


def _overlaps(
    event: CalendarEvent,
    start: datetime.datetime,
    end: datetime.datetime,
) -> bool:
    """Return True if *event* overlaps the [start, end) query range."""
    return event.end > start and event.start < end
