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
async def test_storage_migration_v2_to_v5(hass):
    """v2 payloads migrate through every step: the v3 window-field lift, the v4
    scheduled rrule rewrite, and the v5 interval freq rewrite."""
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

    # After save, the on-disk payload uses the new top-level keys, the
    # schedule dicts no longer carry the old window fields, and the per-type
    # schedules use the current {rrule, dtstart} / {freq, interval} shapes.
    await store.async_save()
    persisted = await Store(hass, 5, key).async_load()
    assert persisted is not None
    by_uid = {item["uid"]: item for item in persisted["items"]}
    assert by_uid["scheduled-uid"]["pending_period_mins"] == 240
    assert by_uid["scheduled-uid"]["grace_period_mins"] == 90
    assert by_uid["scheduled-uid"]["schedule"] == {
        "rrule": "FREQ=DAILY",
        # No created_at in the v2 payload — dtstart falls back to the
        # phase-neutral anchor date.
        "dtstart": "1970-01-01T08:00:00",
        "persist": False,
    }
    assert by_uid["interval-uid"]["pending_period_mins"] == DEFAULT_PENDING_PERIOD_MINS
    # 129600 minutes = 90 days (not a whole number of weeks).
    assert by_uid["interval-uid"]["schedule"] == {"freq": "daily", "interval": 90, "persist": False}


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_storage_migration_v3_to_v5(hass):
    """v3 payloads rewrite scheduled schedules to {rrule, dtstart} and interval
    schedules to {freq, interval}."""
    entry_id = "migration_v4_entry"
    key = f"{DOMAIN}.{entry_id}"

    raw_store: Store[dict] = Store(hass, 3, key)
    await raw_store.async_save(
        {
            "items": [
                {
                    "uid": "weekly-uid",
                    "chore_name": "Trash Night",
                    "chore_type": "scheduled",
                    "schedule": {
                        "time": "19:30:00",
                        "active_days": ["mon", "thu"],
                    },
                    "pending_period_mins": 180,
                    "grace_period_mins": 60,
                    "created_at": "2026-05-04T10:15:00-04:00",
                },
                {
                    "uid": "interval-uid",
                    "chore_name": "Change Filter",
                    "chore_type": "interval",
                    "schedule": {
                        "interval_mins": 129600,
                    },
                    "pending_period_mins": 180,
                    "grace_period_mins": 1440,
                },
            ],
        }
    )

    store = ChoreStore(hass, entry_id)
    await store.async_load()

    weekly = store.get_chore("weekly-uid")
    assert isinstance(weekly, ScheduledChore)
    assert weekly.rrule == "FREQ=WEEKLY;BYDAY=MO,TH"
    # dtstart anchors to created_at's date at the legacy time-of-day.
    assert weekly.dtstart is not None
    assert weekly.dtstart.isoformat() == "2026-05-04T19:30:00"

    interval = store.get_chore("interval-uid")
    assert isinstance(interval, IntervalChore)
    # 129600 minutes = 90 days (not a whole number of weeks).
    assert (interval.freq, interval.interval) == ("daily", 90)

    await store.async_save()
    persisted = await Store(hass, 5, key).async_load()
    assert persisted is not None
    by_uid = {item["uid"]: item for item in persisted["items"]}
    assert by_uid["weekly-uid"]["schedule"] == {
        "rrule": "FREQ=WEEKLY;BYDAY=MO,TH",
        "dtstart": "2026-05-04T19:30:00",
        "persist": False,
    }
    assert by_uid["interval-uid"]["schedule"] == {"freq": "daily", "interval": 90, "persist": False}


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_storage_migration_v4_to_v5(hass):
    """v4→v5 rewrites interval schedules onto the largest exactly-dividing unit."""
    entry_id = "migration_v5_entry"
    key = f"{DOMAIN}.{entry_id}"

    raw_store: Store[dict] = Store(hass, 4, key)
    await raw_store.async_save(
        {
            "items": [
                {
                    "uid": "fortnight-uid",
                    "chore_name": "Flip Mattress",
                    "chore_type": "interval",
                    "schedule": {"interval_mins": 20160},
                    "pending_period_mins": 180,
                    "grace_period_mins": 1440,
                },
                {
                    "uid": "hours-uid",
                    "chore_name": "Stretch Break",
                    "chore_type": "interval",
                    "schedule": {"interval_mins": 240},
                    "pending_period_mins": 30,
                    "grace_period_mins": 30,
                },
                {
                    "uid": "scheduled-uid",
                    "chore_name": "Trash Night",
                    "chore_type": "scheduled",
                    "schedule": {
                        "rrule": "FREQ=DAILY",
                        "dtstart": "2026-05-04T08:00:00",
                    },
                    "pending_period_mins": 180,
                    "grace_period_mins": 60,
                },
            ],
        }
    )

    store = ChoreStore(hass, entry_id)
    await store.async_load()

    fortnight = store.get_chore("fortnight-uid")
    assert isinstance(fortnight, IntervalChore)
    assert (fortnight.freq, fortnight.interval) == ("weekly", 2)

    hours = store.get_chore("hours-uid")
    assert isinstance(hours, IntervalChore)
    assert (hours.freq, hours.interval) == ("hourly", 4)

    # Scheduled schedules pass through v5 untouched.
    scheduled = store.get_chore("scheduled-uid")
    assert isinstance(scheduled, ScheduledChore)
    assert scheduled.rrule == "FREQ=DAILY"

    await store.async_save()
    persisted = await Store(hass, 5, key).async_load()
    assert persisted is not None
    by_uid = {item["uid"]: item for item in persisted["items"]}
    assert by_uid["fortnight-uid"]["schedule"] == {"freq": "weekly", "interval": 2, "persist": False}
    assert by_uid["hours-uid"]["schedule"] == {"freq": "hourly", "interval": 4, "persist": False}
