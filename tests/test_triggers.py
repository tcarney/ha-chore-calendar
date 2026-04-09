"""Tests for tag scan listener (auto-completion via NFC tags)."""

from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from unittest.mock import patch

import pytest

from custom_components.chore_calendar.const import ChoreType
from custom_components.chore_calendar.coordinator import ChoreCalendarCoordinator
from custom_components.chore_calendar.models import IntervalChore, ScheduledChore
from custom_components.chore_calendar.store import ChoreStore
from custom_components.chore_calendar.triggers import EVENT_TAG_SCANNED, async_setup_tag_listener

TZ = timezone(timedelta(hours=-5))
TAG_UUID = "abc-123-tag-uuid"


async def _setup(hass) -> tuple[ChoreStore, ChoreCalendarCoordinator]:
    """Create a store and coordinator, returning both."""
    store = ChoreStore(hass, "test")
    await store.async_load()
    coordinator = ChoreCalendarCoordinator(hass, store)
    await coordinator.async_refresh()
    return store, coordinator


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_tag_scan_completes_matching_chore(hass):
    """A tag scan auto-completes a chore whose trigger_tag_id matches."""
    store, coordinator = await _setup(hass)

    chore = IntervalChore(
        chore_id="water_filter",
        chore_name="Water Filter",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=30),
        grace_period=timedelta(days=7),
        trigger_tag_id=TAG_UUID,
    )
    await store.async_create_chore(chore)
    await coordinator.async_refresh()

    unsub = async_setup_tag_listener(hass, store, coordinator)

    frozen = datetime(2026, 3, 30, 12, 0, tzinfo=TZ)
    with patch("homeassistant.util.dt.now", return_value=frozen):
        hass.bus.async_fire(EVENT_TAG_SCANNED, {"tag_id": TAG_UUID})
        await hass.async_block_till_done()

    updated = store.get_chore("water_filter")
    assert updated is not None
    assert updated.last_completed is not None

    unsub()


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_tag_scan_ignores_non_matching_tag(hass):
    """A tag scan with a different tag_id does not complete any chore."""
    store, coordinator = await _setup(hass)

    chore = IntervalChore(
        chore_id="water_filter",
        chore_name="Water Filter",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=30),
        grace_period=timedelta(days=7),
        trigger_tag_id=TAG_UUID,
    )
    await store.async_create_chore(chore)
    await coordinator.async_refresh()

    unsub = async_setup_tag_listener(hass, store, coordinator)

    hass.bus.async_fire(EVENT_TAG_SCANNED, {"tag_id": "different-uuid"})
    await hass.async_block_till_done()

    updated = store.get_chore("water_filter")
    assert updated.last_completed is None

    unsub()


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_tag_scan_ignores_chore_without_tag(hass):
    """Chores without trigger_tag_id are never matched."""
    store, coordinator = await _setup(hass)

    chore = IntervalChore(
        chore_id="no_tag",
        chore_name="No Tag",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=1),
    )
    await store.async_create_chore(chore)
    await coordinator.async_refresh()

    unsub = async_setup_tag_listener(hass, store, coordinator)

    hass.bus.async_fire(EVENT_TAG_SCANNED, {"tag_id": TAG_UUID})
    await hass.async_block_till_done()

    updated = store.get_chore("no_tag")
    assert updated.last_completed is None

    unsub()


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_tag_scan_completes_overdue_chore(hass):
    """An overdue scheduled chore is still auto-completed by tag scan."""
    store, coordinator = await _setup(hass)

    chore = ScheduledChore(
        chore_id="med",
        chore_name="Medicine",
        chore_type=ChoreType.SCHEDULED,
        time=time(8, 0),
        early_window=timedelta(hours=3),
        grace_period=timedelta(hours=1),
        trigger_tag_id=TAG_UUID,
        last_completed=datetime(2026, 3, 29, 8, 0, tzinfo=TZ),
    )
    await store.async_create_chore(chore)
    await coordinator.async_refresh()

    unsub = async_setup_tag_listener(hass, store, coordinator)

    # 10:00 — past the grace period (overdue_at=09:00), still completable.
    frozen = datetime(2026, 3, 30, 10, 0, tzinfo=TZ)
    with patch("homeassistant.util.dt.now", return_value=frozen):
        hass.bus.async_fire(EVENT_TAG_SCANNED, {"tag_id": TAG_UUID})
        await hass.async_block_till_done()

    updated = store.get_chore("med")
    assert updated.last_completed == frozen

    unsub()


async def test_tag_scan_skips_completed_chore(hass):
    """A completed chore is not auto-completed again by tag scan."""
    store, coordinator = await _setup(hass)

    completed_time = datetime(2026, 3, 30, 7, 0, tzinfo=TZ)
    chore = ScheduledChore(
        chore_id="med",
        chore_name="Medicine",
        chore_type=ChoreType.SCHEDULED,
        time=time(8, 0),
        early_window=timedelta(hours=3),
        grace_period=timedelta(hours=1),
        trigger_tag_id=TAG_UUID,
        last_completed=completed_time,
    )
    await store.async_create_chore(chore)
    await coordinator.async_refresh()

    unsub = async_setup_tag_listener(hass, store, coordinator)

    # 08:30 — chore is already completed for this period.
    frozen = datetime(2026, 3, 30, 8, 30, tzinfo=TZ)
    with patch("homeassistant.util.dt.now", return_value=frozen):
        hass.bus.async_fire(EVENT_TAG_SCANNED, {"tag_id": TAG_UUID})
        await hass.async_block_till_done()

    # last_completed should be unchanged.
    updated = store.get_chore("med")
    assert updated.last_completed == completed_time

    unsub()


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_tag_scan_completes_multiple_matching_chores(hass):
    """Multiple chores sharing the same tag_id are all completed."""
    store, coordinator = await _setup(hass)

    for cid in ("chore_a", "chore_b"):
        chore = IntervalChore(
            chore_id=cid,
            chore_name=cid,
            chore_type=ChoreType.INTERVAL,
            interval=timedelta(days=1),
            trigger_tag_id=TAG_UUID,
        )
        await store.async_create_chore(chore)
    await coordinator.async_refresh()

    unsub = async_setup_tag_listener(hass, store, coordinator)

    frozen = datetime(2026, 3, 30, 12, 0, tzinfo=TZ)
    with patch("homeassistant.util.dt.now", return_value=frozen):
        hass.bus.async_fire(EVENT_TAG_SCANNED, {"tag_id": TAG_UUID})
        await hass.async_block_till_done()

    for cid in ("chore_a", "chore_b"):
        assert store.get_chore(cid).last_completed is not None

    unsub()


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_tag_scan_empty_tag_id_ignored(hass):
    """A tag_scanned event with no tag_id is silently ignored."""
    store, coordinator = await _setup(hass)

    chore = IntervalChore(
        chore_id="test",
        chore_name="Test",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=1),
        trigger_tag_id=TAG_UUID,
    )
    await store.async_create_chore(chore)
    await coordinator.async_refresh()

    unsub = async_setup_tag_listener(hass, store, coordinator)

    hass.bus.async_fire(EVENT_TAG_SCANNED, {})
    await hass.async_block_till_done()

    assert store.get_chore("test").last_completed is None

    unsub()


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_unsubscribe_stops_listener(hass):
    """After unsubscribing, tag scans no longer complete chores."""
    store, coordinator = await _setup(hass)

    chore = IntervalChore(
        chore_id="test",
        chore_name="Test",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=1),
        trigger_tag_id=TAG_UUID,
    )
    await store.async_create_chore(chore)
    await coordinator.async_refresh()

    unsub = async_setup_tag_listener(hass, store, coordinator)
    unsub()  # Unsubscribe immediately.

    frozen = datetime(2026, 3, 30, 12, 0, tzinfo=TZ)
    with patch("homeassistant.util.dt.now", return_value=frozen):
        hass.bus.async_fire(EVENT_TAG_SCANNED, {"tag_id": TAG_UUID})
        await hass.async_block_till_done()

    assert store.get_chore("test").last_completed is None
