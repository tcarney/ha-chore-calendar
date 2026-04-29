"""Tests for ChoreStore persistent storage."""

from __future__ import annotations

from datetime import timedelta

import pytest

from custom_components.chore_calendar.const import DEFAULT_PENDING_PERIOD_MINS, DOMAIN, ChoreType
from custom_components.chore_calendar.models import IntervalChore, OneshotChore, ScheduledChore
from custom_components.chore_calendar.store import ChoreStore
from homeassistant.helpers.storage import Store


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_store_empty_load(hass):
    """Loading from an empty store returns no chores."""
    store = ChoreStore(hass, "test_entry")
    await store.async_load()
    assert store.get_all_chores() == {}


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_store_create_and_get(hass):
    """Creating a chore makes it retrievable."""
    store = ChoreStore(hass, "test_entry")
    await store.async_load()

    chore = IntervalChore(
        uid="water_filter",
        chore_name="Change Water Filter",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=90),
        grace_period=timedelta(days=14),
    )
    await store.async_create_chore(chore)

    result = store.get_chore("water_filter")
    assert result is not None
    assert result.chore_name == "Change Water Filter"


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_store_update_chore(hass):
    """Updating a chore replaces it in the store."""
    store = ChoreStore(hass, "test_entry")
    await store.async_load()

    chore = IntervalChore(
        uid="water_filter",
        chore_name="Change Water Filter",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=90),
    )
    await store.async_create_chore(chore)

    chore.chore_name = "Replace Water Filter"
    await store.async_update_chore(chore)

    result = store.get_chore("water_filter")
    assert result is not None
    assert result.chore_name == "Replace Water Filter"


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_store_delete_chore(hass):
    """Deleting a chore removes it from the store."""
    store = ChoreStore(hass, "test_entry")
    await store.async_load()

    chore = IntervalChore(
        uid="water_filter",
        chore_name="Change Water Filter",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=90),
    )
    await store.async_create_chore(chore)
    await store.async_delete_chore("water_filter")

    assert store.get_chore("water_filter") is None
    assert store.get_all_chores() == {}


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_store_persistence_round_trip(hass):
    """Data survives a save/load cycle."""
    store1 = ChoreStore(hass, "test_entry")
    await store1.async_load()

    chore = ScheduledChore(
        uid="morning_medicine",
        chore_name="Morning Medicine",
        chore_type=ChoreType.SCHEDULED,
    )
    await store1.async_create_chore(chore)

    # Create a new store instance pointing at the same storage key.
    store2 = ChoreStore(hass, "test_entry")
    await store2.async_load()

    result = store2.get_chore("morning_medicine")
    assert result is not None
    assert result.chore_name == "Morning Medicine"
    assert isinstance(result, ScheduledChore)


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_store_get_all_returns_copy(hass):
    """get_all_chores returns a copy, not the internal dict."""
    store = ChoreStore(hass, "test_entry")
    await store.async_load()

    chore = IntervalChore(
        uid="test",
        chore_name="Test",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=1),
    )
    await store.async_create_chore(chore)

    all_chores = store.get_all_chores()
    all_chores.clear()

    # Internal state should be unaffected.
    assert store.get_chore("test") is not None


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_store_delete_nonexistent_is_noop(hass):
    """Deleting a nonexistent chore does not raise."""
    store = ChoreStore(hass, "test_entry")
    await store.async_load()
    await store.async_delete_chore("nonexistent")
    assert store.get_all_chores() == {}


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_storage_migration_v2_to_v3(hass):
    """v2→v3 migration lifts early_window/grace mins out of schedule and renames the former."""
    entry_id = "migration_entry"
    key = f"{DOMAIN}.{entry_id}"

    # Seed the underlying HA store directly with a v2 payload.
    raw_store: Store[dict] = Store(hass, 2, key)
    await raw_store.async_save(
        {
            "items": [
                {
                    "uid": "scheduled-uid",
                    "chore_name": "Morning Medicine",
                    "chore_type": "scheduled",
                    "schedule": {
                        "time": "08:00:00",
                        "active_days": [],
                        "early_window_mins": 240,
                        "grace_period_mins": 90,
                    },
                },
                {
                    "uid": "interval-uid",
                    "chore_name": "Change Filter",
                    "chore_type": "interval",
                    "schedule": {
                        "interval_mins": 129600,
                        "grace_period_mins": 1440,
                    },
                },
                {
                    "uid": "oneshot-uid",
                    "chore_name": "File Taxes",
                    "chore_type": "oneshot",
                    "schedule": {
                        "due_datetime": None,
                        "early_window_mins": 60,
                        "grace_period_mins": 30,
                        "persist": False,
                    },
                },
            ],
        }
    )

    # Loading via ChoreStore triggers _async_migrate_func from v2 → v3.
    store = ChoreStore(hass, entry_id)
    await store.async_load()

    scheduled = store.get_chore("scheduled-uid")
    assert isinstance(scheduled, ScheduledChore)
    assert scheduled.pending_period == timedelta(minutes=240)
    assert scheduled.grace_period == timedelta(minutes=90)

    interval = store.get_chore("interval-uid")
    assert isinstance(interval, IntervalChore)
    # Interval had no early_window_mins in v2 — migration injects the new 3h default.
    assert interval.pending_period == timedelta(minutes=DEFAULT_PENDING_PERIOD_MINS)
    assert interval.grace_period == timedelta(minutes=1440)

    oneshot = store.get_chore("oneshot-uid")
    assert isinstance(oneshot, OneshotChore)
    assert oneshot.pending_period == timedelta(minutes=60)
    assert oneshot.grace_period == timedelta(minutes=30)

    # After save, the on-disk payload uses the new top-level keys and the
    # schedule dicts no longer carry the old window fields.
    await store.async_save()
    persisted = await Store(hass, 3, key).async_load()
    assert persisted is not None
    by_uid = {item["uid"]: item for item in persisted["items"]}
    assert by_uid["scheduled-uid"]["pending_period_mins"] == 240
    assert by_uid["scheduled-uid"]["grace_period_mins"] == 90
    assert "early_window_mins" not in by_uid["scheduled-uid"]["schedule"]
    assert "grace_period_mins" not in by_uid["scheduled-uid"]["schedule"]
    assert by_uid["interval-uid"]["pending_period_mins"] == DEFAULT_PENDING_PERIOD_MINS
    assert "grace_period_mins" not in by_uid["interval-uid"]["schedule"]
