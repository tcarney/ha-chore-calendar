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
        uid="test_chore",
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

    # Create a chore that is currently COMPLETED (completed this morning).
    chore = ScheduledChore(
        uid="medicine",
        chore_name="Medicine",
        chore_type=ChoreType.SCHEDULED,
        time=time(8, 0),
        early_window=timedelta(hours=3),
        grace_period=timedelta(hours=1),
        last_completed=datetime(2026, 3, 30, 7, 0, tzinfo=TZ),
    )
    await store.async_create_chore(chore)

    # First refresh at 07:30 — status is COMPLETED, establishes baseline.
    with patch("homeassistant.util.dt.now", return_value=datetime(2026, 3, 30, 7, 30, tzinfo=TZ)):
        coordinator = await _setup_coordinator(hass, store)

    events: list = []
    hass.bus.async_listen(EVENT_STATUS_CHANGED, events.append)

    # Time advances to next day's due window (08:30) — status transitions to DUE.
    with patch("homeassistant.util.dt.now", return_value=datetime(2026, 3, 31, 8, 30, tzinfo=TZ)):
        await coordinator.async_refresh()
    await hass.async_block_till_done()

    assert len(events) == 1
    assert events[0].data["uid"] == "medicine"
    assert events[0].data["from_status"] == "completed"
    assert events[0].data["to_status"] == "due"


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_coordinator_no_event_when_status_unchanged(hass):
    """No event fires when the chore status does not change between refreshes."""
    store = ChoreStore(hass, "test")
    await store.async_load()

    chore = IntervalChore(
        uid="test",
        chore_name="Test",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=30),
    )
    await store.async_create_chore(chore)

    coordinator = await _setup_coordinator(hass, store)

    events: list = []
    hass.bus.async_listen(EVENT_STATUS_CHANGED, events.append)

    await coordinator.async_refresh()
    await hass.async_block_till_done()

    assert len(events) == 0


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_coordinator_cleans_up_deleted_chores(hass):
    """Deleting a chore removes it from coordinator data and does not fire stale events."""
    store = ChoreStore(hass, "test")
    await store.async_load()

    chore = IntervalChore(
        uid="temp",
        chore_name="Temp",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=1),
    )
    await store.async_create_chore(chore)
    coordinator = await _setup_coordinator(hass, store)

    assert "temp" in coordinator.data

    events: list = []
    hass.bus.async_listen(EVENT_STATUS_CHANGED, events.append)

    await store.async_delete_chore("temp")
    await coordinator.async_refresh()
    await hass.async_block_till_done()

    assert "temp" not in coordinator.data
    # No spurious events for the deleted chore.
    assert len(events) == 0


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_coordinator_uncomplete_marker_on_event(hass):
    """Events fired after mark_uncompleted include uncomplete=True."""
    store = ChoreStore(hass, "test")
    await store.async_load()

    chore = ScheduledChore(
        uid="medicine",
        chore_name="Medicine",
        chore_type=ChoreType.SCHEDULED,
        time=time(8, 0),
        early_window=timedelta(hours=3),
        grace_period=timedelta(hours=1),
        last_completed=datetime(2026, 3, 30, 7, 0, tzinfo=TZ),
    )
    await store.async_create_chore(chore)

    # Baseline refresh at 07:30 — status COMPLETED.
    with patch("homeassistant.util.dt.now", return_value=datetime(2026, 3, 30, 7, 30, tzinfo=TZ)):
        coordinator = await _setup_coordinator(hass, store)

    # Simulate an uncomplete: clear last_completed and flag the uid.
    stored = store.get_chore("medicine")
    assert stored is not None
    stored.revert_completion()
    await store.async_update_chore(stored)
    coordinator.mark_uncompleted("medicine")

    events: list = []
    hass.bus.async_listen(EVENT_STATUS_CHANGED, events.append)

    with patch("homeassistant.util.dt.now", return_value=datetime(2026, 3, 30, 7, 30, tzinfo=TZ)):
        await coordinator.async_refresh()
    await hass.async_block_till_done()

    assert len(events) == 1
    assert events[0].data["uid"] == "medicine"
    assert events[0].data.get("uncomplete") is True

    # Marker is consumed — a subsequent natural transition does not carry it.
    events.clear()
    with patch("homeassistant.util.dt.now", return_value=datetime(2026, 3, 31, 8, 30, tzinfo=TZ)):
        await coordinator.async_refresh()
    await hass.async_block_till_done()

    assert "uncomplete" not in events[0].data
