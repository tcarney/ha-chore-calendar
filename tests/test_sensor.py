"""Tests for the Chore Calendar sensor platform."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.chore_calendar.const import CONF_LIST_NAME, DOMAIN, ChoreType
from custom_components.chore_calendar.models import IntervalChore
from homeassistant.config_entries import ConfigEntryState
from homeassistant.helpers import entity_registry as er

TZ = timezone(timedelta(hours=-5))
FROZEN_NOW = datetime(2026, 3, 30, 12, 0, tzinfo=TZ)


@pytest.fixture
def config_entry() -> MockConfigEntry:
    """Return a mock config entry."""
    return MockConfigEntry(
        domain=DOMAIN,
        title="Daily Chores",
        data={CONF_LIST_NAME: "Daily Chores"},
        unique_id="daily chores",
    )


async def _setup_entry(hass, entry: MockConfigEntry) -> None:
    """Add config entry and set it up."""
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.LOADED


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_sensor_created_for_existing_chore(hass, config_entry):
    """A sensor entity is created for a chore that exists at setup time."""
    await _setup_entry(hass, config_entry)

    # Create a chore via the store, then refresh the coordinator.
    runtime_data = config_entry.runtime_data
    chore = IntervalChore(
        uid="water_filter",
        chore_name="Change Water Filter",
        chore_type=ChoreType.INTERVAL,
        freq="daily",
        interval=90,
    )
    await runtime_data.store.async_create_chore(chore)
    await runtime_data.coordinator.async_refresh()
    await hass.async_block_till_done()

    # The entity should exist in the registry.
    registry = er.async_get(hass)
    unique_id = f"{config_entry.entry_id}_water_filter"
    entity_id = registry.async_get_entity_id("sensor", DOMAIN, unique_id)
    assert entity_id is not None

    # Entity ID should have the device name prefix + slugified chore name.
    assert entity_id == "sensor.daily_chores_change_water_filter"

    # Check state. A never-completed interval chore is unscheduled-PENDING.
    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        state = hass.states.get(entity_id)
    assert state is not None
    assert state.state == "pending"


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_sensor_removed_when_chore_deleted(hass, config_entry):
    """A sensor entity is removed when its chore is deleted."""
    await _setup_entry(hass, config_entry)

    runtime_data = config_entry.runtime_data
    chore = IntervalChore(
        uid="temp_chore",
        chore_name="Temporary",
        chore_type=ChoreType.INTERVAL,
        freq="daily",
        interval=1,
    )
    await runtime_data.store.async_create_chore(chore)
    await runtime_data.coordinator.async_refresh()
    await hass.async_block_till_done()

    registry = er.async_get(hass)
    unique_id = f"{config_entry.entry_id}_temp_chore"
    entity_id = registry.async_get_entity_id("sensor", DOMAIN, unique_id)
    assert entity_id is not None

    # Delete the chore.
    await runtime_data.store.async_delete_chore("temp_chore")
    await runtime_data.coordinator.async_refresh()
    await hass.async_block_till_done()

    entity_id = registry.async_get_entity_id("sensor", DOMAIN, unique_id)
    assert entity_id is None


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_sensor_attributes(hass, config_entry):
    """Sensor extra_state_attributes contain expected chore metadata."""
    await _setup_entry(hass, config_entry)

    runtime_data = config_entry.runtime_data
    # Register a tag entity so the reverse lookup (tag_id -> entity_id) works.
    registry = er.async_get(hass)
    registry.async_get_or_create("tag", "tag", "dishes-tag-uuid", suggested_object_id="dishes")

    chore = IntervalChore(
        uid="dishes",
        chore_name="Do Dishes",
        chore_type=ChoreType.INTERVAL,
        freq="daily",
        interval=1,
        trigger_tag_id="dishes-tag-uuid",
        assigned_to=["person.alice"],
    )
    await runtime_data.store.async_create_chore(chore)
    await runtime_data.coordinator.async_refresh()
    await hass.async_block_till_done()

    unique_id = f"{config_entry.entry_id}_dishes"
    entity_id = registry.async_get_entity_id("sensor", DOMAIN, unique_id)
    assert entity_id is not None

    state = hass.states.get(entity_id)
    assert state is not None
    assert state.attributes["uid"] == "dishes"
    assert state.attributes["chore_type"] == "interval"
    assert state.attributes["trigger_entity"] == "tag.dishes"
    assert state.attributes["assigned_to"] == ["person.alice"]
