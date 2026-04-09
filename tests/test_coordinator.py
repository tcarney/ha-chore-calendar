"""Tests for ChoreCalendarCoordinator."""

from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from unittest.mock import patch

import pytest

from custom_components.chore_calendar.const import EVENT_STATUS_CHANGED, ChoreType
from custom_components.chore_calendar.coordinator import ChoreCalendarCoordinator
from custom_components.chore_calendar.models import IntervalChore, ScheduledChore
from custom_components.chore_calendar.store import ChoreStore

TZ = timezone(timedelta(hours=-5))


async def _setup_coordinator(hass, store: ChoreStore) -> ChoreCalendarCoordinator:
    """Create and do first refresh of a coordinator."""
    coordinator = ChoreCalendarCoordinator(hass, store)
    await coordinator.async_refresh()
    return coordinator


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_coordinator_returns_chores(hass):
    """Coordinator data contains all chores from the store."""
    store = ChoreStore(hass, "test")
    await store.async_load()

    chore = IntervalChore(
        chore_id="test_chore",
        chore_name="Test",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=1),
    )
    await store.async_create_chore(chore)

    coordinator = await _setup_coordinator(hass, store)

    assert "test_chore" in coordinator.data
    assert coordinator.data["test_chore"].chore_name == "Test"


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_coordinator_fires_event_on_status_change(hass):
    """Coordinator fires a status change event when a chore's status transitions."""
    store = ChoreStore(hass, "test")
    await store.async_load()

    # Create a chore that is currently COMPLETED.
    now_completed = datetime(2026, 3, 30, 7, 0, tzinfo=TZ)
    chore = ScheduledChore(
        chore_id="medicine",
        chore_name="Medicine",
        chore_type=ChoreType.SCHEDULED,
        time=time(8, 0),
        early_window=timedelta(hours=3),
        grace_period=timedelta(hours=1),
        last_completed=now_completed,
    )
    await store.async_create_chore(chore)

    # First refresh — establishes baseline, no event expected.
    with patch("homeassistant.util.dt.now", return_value=datetime(2026, 3, 30, 7, 30, tzinfo=TZ)):
        coordinator = await _setup_coordinator(hass, store)

    # Now simulate time advancing past grace period (overdue).
    events: list = []
    hass.bus.async_listen(EVENT_STATUS_CHANGED, lambda e: events.append(e))

    # Remove the completion so status changes from COMPLETED to something else.
    chore.last_completed = None
    await store.async_update_chore(chore)

    with patch("homeassistant.util.dt.now", return_value=datetime(2026, 3, 30, 9, 30, tzinfo=TZ)):
        await coordinator.async_refresh()
    await hass.async_block_till_done()

    assert len(events) == 1
    assert events[0].data["chore_id"] == "medicine"
    assert events[0].data["from_status"] == "completed"
    assert events[0].data["to_status"] == "overdue"


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_coordinator_no_event_when_status_unchanged(hass):
    """No event fires when the chore status does not change between refreshes."""
    store = ChoreStore(hass, "test")
    await store.async_load()

    chore = IntervalChore(
        chore_id="test",
        chore_name="Test",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=30),
    )
    await store.async_create_chore(chore)

    coordinator = await _setup_coordinator(hass, store)

    events: list = []
    hass.bus.async_listen(EVENT_STATUS_CHANGED, lambda e: events.append(e))

    await coordinator.async_refresh()
    await hass.async_block_till_done()

    assert len(events) == 0


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_coordinator_cleans_up_deleted_chores(hass):
    """Deleting a chore removes it from coordinator data and does not fire stale events."""
    store = ChoreStore(hass, "test")
    await store.async_load()

    chore = IntervalChore(
        chore_id="temp",
        chore_name="Temp",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=1),
    )
    await store.async_create_chore(chore)
    coordinator = await _setup_coordinator(hass, store)

    assert "temp" in coordinator.data

    events: list = []
    hass.bus.async_listen(EVENT_STATUS_CHANGED, lambda e: events.append(e))

    await store.async_delete_chore("temp")
    await coordinator.async_refresh()
    await hass.async_block_till_done()

    assert "temp" not in coordinator.data
    # No spurious events for the deleted chore.
    assert len(events) == 0
