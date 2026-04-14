"""Tests for ChoreStore persistent storage."""

from __future__ import annotations

from datetime import timedelta

import pytest

from custom_components.chore_calendar.const import ChoreType
from custom_components.chore_calendar.models import IntervalChore, ScheduledChore
from custom_components.chore_calendar.store import ChoreStore


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
