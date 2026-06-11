"""Tests for Chore Calendar service actions."""

from __future__ import annotations

from datetime import datetime, time as dtime, timedelta, timezone
from unittest.mock import patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry
import voluptuous as vol

from custom_components.chore_calendar.const import (
    CONF_LIST_NAME,
    DOMAIN,
    EVENT_ITEM_CREATED,
    EVENT_ITEM_DELETED,
    EVENT_STATUS_CHANGED,
    ChoreEventSource,
    ChoreType,
)
from custom_components.chore_calendar.models import IntervalChore, OneshotChore, ScheduledChore
from homeassistant.config_entries import ConfigEntryState
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import entity_registry as er

TZ = timezone(timedelta(hours=-5))
FROZEN_NOW = datetime(2026, 3, 30, 12, 0, tzinfo=TZ)
TEST_UID = "aabbccdd-1122-3344-5566-778899aabbcc"


@pytest.fixture
def config_entry() -> MockConfigEntry:
    """Return a mock config entry."""
    return MockConfigEntry(
        domain=DOMAIN,
        title="Daily Chores",
        data={CONF_LIST_NAME: "Daily Chores"},
        unique_id="daily chores",
    )


async def _setup_with_chore(hass, entry: MockConfigEntry) -> str:
    """Set up the integration with one pre-existing chore, returning the calendar entity_id."""
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.LOADED

    # Create a chore so service tests that need an existing chore can use it.
    runtime_data = entry.runtime_data
    chore = IntervalChore(
        uid=TEST_UID,
        chore_name="Test Chore",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=3),
        grace_period=timedelta(days=1),
    )
    await runtime_data.store.async_create_chore(chore)
    await runtime_data.coordinator.async_refresh()
    await hass.async_block_till_done()

    # Target the calendar entity (always exists per list).
    registry = er.async_get(hass)
    entity_id = registry.async_get_entity_id("calendar", DOMAIN, entry.entry_id)
    assert entity_id is not None
    return entity_id


def _get_sensor_entity_id(hass, entry: MockConfigEntry, uid: str) -> str:
    """Return the sensor entity_id for a chore."""
    registry = er.async_get(hass)
    unique_id = f"{entry.entry_id}_{uid}"
    entity_id = registry.async_get_entity_id("sensor", DOMAIN, unique_id)
    assert entity_id is not None
    return entity_id


def _find_chore_by_name(store, name: str):
    """Find a chore in the store by name."""
    for chore in store.get_all_chores().values():
        if chore.chore_name == name:
            return chore
    return None


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_create_item(hass, config_entry):
    """create_item adds a new chore and creates a sensor entity."""
    entity_id = await _setup_with_chore(hass, config_entry)

    await hass.services.async_call(
        DOMAIN,
        "create_item",
        {
            "entity_id": entity_id,
            "chore_name": "New Chore",
            "interval": {"days": 1},
            "grace_period": {"hours": 1},
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    store = config_entry.runtime_data.store
    chore = _find_chore_by_name(store, "New Chore")
    assert chore is not None
    assert len(chore.uid) == 36  # Standard UUID format with dashes
    assert chore.created_at is not None


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_create_item_generates_uid(hass, config_entry):
    """create_item always generates a unique UID."""
    entity_id = await _setup_with_chore(hass, config_entry)

    await hass.services.async_call(
        DOMAIN,
        "create_item",
        {
            "entity_id": entity_id,
            "chore_name": "Morning Medicine",
            "interval": {"days": 1},
            "grace_period": {"hours": 1},
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    store = config_entry.runtime_data.store
    chore = _find_chore_by_name(store, "Morning Medicine")
    assert chore is not None
    assert len(chore.uid) == 36  # Standard UUID format with dashes
    # UID should not be a slug of the name.
    assert chore.uid != "morning_medicine"


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_create_item_same_name_succeeds(hass, config_entry):
    """create_item with the same name succeeds because UIDs are always unique."""
    entity_id = await _setup_with_chore(hass, config_entry)

    for _ in range(2):
        await hass.services.async_call(
            DOMAIN,
            "create_item",
            {
                "entity_id": entity_id,
                "chore_name": "Duplicate Name",
                "interval": {"days": 1},
            },
            blocking=True,
        )
    await hass.async_block_till_done()

    store = config_entry.runtime_data.store
    matches = [c for c in store.get_all_chores().values() if c.chore_name == "Duplicate Name"]
    assert len(matches) == 2
    assert matches[0].uid != matches[1].uid


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_create_scheduled_item(hass, config_entry):
    """create_item creates a scheduled chore correctly."""
    entity_id = await _setup_with_chore(hass, config_entry)

    await hass.services.async_call(
        DOMAIN,
        "create_item",
        {
            "entity_id": entity_id,
            "chore_name": "Morning Medicine",
            "scheduled": {
                "time": "08:00:00",
                "active_days": ["mon", "tue", "wed", "thu", "fri"],
            },
            "pending_period": {"hours": 3},
            "grace_period": {"hours": 1},
            "trigger_entity": "tag.morning_med",
            "assigned_to": ["person.alice"],
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    store = config_entry.runtime_data.store
    chore = _find_chore_by_name(store, "Morning Medicine")
    assert chore is not None
    assert chore.chore_name == "Morning Medicine"
    assert chore.assigned_to == ["person.alice"]


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_create_item_with_description(hass, config_entry):
    """create_item stores an optional description."""
    entity_id = await _setup_with_chore(hass, config_entry)

    await hass.services.async_call(
        DOMAIN,
        "create_item",
        {
            "entity_id": entity_id,
            "chore_name": "Water Plants",
            "description": "Only the ones on the porch.",
            "interval": {"days": 2},
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    store = config_entry.runtime_data.store
    chore = _find_chore_by_name(store, "Water Plants")
    assert chore is not None
    assert chore.description == "Only the ones on the porch."


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_create_item_without_description_is_none(hass, config_entry):
    """create_item leaves description as None when not provided."""
    entity_id = await _setup_with_chore(hass, config_entry)

    await hass.services.async_call(
        DOMAIN,
        "create_item",
        {
            "entity_id": entity_id,
            "chore_name": "No Description",
            "interval": {"days": 2},
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    store = config_entry.runtime_data.store
    chore = _find_chore_by_name(store, "No Description")
    assert chore is not None
    assert chore.description is None


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_item_sets_and_clears_description(hass, config_entry):
    """update_item sets a description; an empty string clears it back to None."""
    entity_id = await _setup_with_chore(hass, config_entry)
    store = config_entry.runtime_data.store

    await hass.services.async_call(
        DOMAIN,
        "update_item",
        {
            "entity_id": entity_id,
            "item": "Test Chore",
            "description": "Use the green bin.",
        },
        blocking=True,
    )
    assert store.get_chore(TEST_UID).description == "Use the green bin."

    # An update without description leaves the stored value untouched.
    await hass.services.async_call(
        DOMAIN,
        "update_item",
        {
            "entity_id": entity_id,
            "item": "Test Chore",
            "chore_name": "Test Chore",
        },
        blocking=True,
    )
    assert store.get_chore(TEST_UID).description == "Use the green bin."

    await hass.services.async_call(
        DOMAIN,
        "update_item",
        {
            "entity_id": entity_id,
            "item": "Test Chore",
            "description": "",
        },
        blocking=True,
    )
    assert store.get_chore(TEST_UID).description is None


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_item(hass, config_entry):
    """update_item modifies an existing chore."""
    entity_id = await _setup_with_chore(hass, config_entry)

    await hass.services.async_call(
        DOMAIN,
        "update_item",
        {
            "entity_id": entity_id,
            "item": "Test Chore",
            "chore_name": "Updated Name",
        },
        blocking=True,
    )

    store = config_entry.runtime_data.store
    assert store.get_chore(TEST_UID).chore_name == "Updated Name"


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_item_not_found_raises(hass, config_entry):
    """update_item raises when item does not exist."""
    entity_id = await _setup_with_chore(hass, config_entry)

    with pytest.raises(ServiceValidationError, match="not found"):
        await hass.services.async_call(
            DOMAIN,
            "update_item",
            {
                "entity_id": entity_id,
                "item": "nonexistent",
                "chore_name": "Nope",
            },
            blocking=True,
        )


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_delete_item(hass, config_entry):
    """delete_item removes a chore and its sensor entity."""
    entity_id = await _setup_with_chore(hass, config_entry)

    await hass.services.async_call(
        DOMAIN,
        "delete_item",
        {
            "entity_id": entity_id,
            "item": "Test Chore",
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    store = config_entry.runtime_data.store
    assert store.get_chore(TEST_UID) is None


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_delete_item_fires_event(hass, config_entry):
    """delete_item fires chore_calendar_item_deleted with the expected payload."""
    entity_id = await _setup_with_chore(hass, config_entry)

    events = []
    hass.bus.async_listen(EVENT_ITEM_DELETED, events.append)

    await hass.services.async_call(
        DOMAIN,
        "delete_item",
        {"entity_id": entity_id, "item": "Test Chore"},
        blocking=True,
    )
    await hass.async_block_till_done()

    assert len(events) == 1
    data = events[0].data
    assert data["uid"] == TEST_UID
    assert data["chore_name"] == "Test Chore"
    assert data["chore_type"] == "interval"
    assert data["entity_id"] == entity_id


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_delete_item_not_found_does_not_fire_event(hass, config_entry):
    """A failed delete_item (item not found) does not fire the deletion event."""
    entity_id = await _setup_with_chore(hass, config_entry)

    events = []
    hass.bus.async_listen(EVENT_ITEM_DELETED, events.append)

    with pytest.raises(ServiceValidationError, match="not found"):
        await hass.services.async_call(
            DOMAIN,
            "delete_item",
            {"entity_id": entity_id, "item": "nonexistent"},
            blocking=True,
        )
    await hass.async_block_till_done()

    assert events == []


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_delete_item_not_found_raises(hass, config_entry):
    """delete_item raises when item does not exist."""
    entity_id = await _setup_with_chore(hass, config_entry)

    with pytest.raises(ServiceValidationError, match="not found"):
        await hass.services.async_call(
            DOMAIN,
            "delete_item",
            {
                "entity_id": entity_id,
                "item": "nonexistent",
            },
            blocking=True,
        )


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_complete_item(hass, config_entry):
    """complete_item sets last_completed on the chore."""
    entity_id = await _setup_with_chore(hass, config_entry)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            DOMAIN,
            "complete_item",
            {
                "entity_id": entity_id,
                "item": "Test Chore",
                "completed_by": "person.alice",
            },
            blocking=True,
        )

    store = config_entry.runtime_data.store
    chore = store.get_chore(TEST_UID)
    assert chore.last_completed is not None
    assert chore.last_completed_by == "person.alice"


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_complete_item_with_timestamp(hass, config_entry):
    """complete_item accepts a custom completed_at timestamp."""
    entity_id = await _setup_with_chore(hass, config_entry)

    await hass.services.async_call(
        DOMAIN,
        "complete_item",
        {
            "entity_id": entity_id,
            "item": TEST_UID,
            "completed_at": "2026-03-30T08:00:00-05:00",
        },
        blocking=True,
    )

    store = config_entry.runtime_data.store
    chore = store.get_chore(TEST_UID)
    assert chore.last_completed is not None
    assert chore.last_completed.hour == 8


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_complete_item_invalid_datetime_raises(hass, config_entry):
    """complete_item raises on an invalid datetime string (caught by cv.datetime schema)."""
    entity_id = await _setup_with_chore(hass, config_entry)

    with pytest.raises(vol.Invalid, match="Invalid datetime"):
        await hass.services.async_call(
            DOMAIN,
            "complete_item",
            {
                "entity_id": entity_id,
                "item": "Test Chore",
                "completed_at": "not-a-date",
            },
            blocking=True,
        )


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_get_items(hass, config_entry):
    """get_items returns all chores with their status."""
    entity_id = await _setup_with_chore(hass, config_entry)

    response = await hass.services.async_call(
        DOMAIN,
        "get_items",
        {"entity_id": entity_id},
        blocking=True,
        return_response=True,
    )

    assert "items" in response
    assert len(response["items"]) == 1
    assert response["items"][0]["uid"] == TEST_UID
    assert response["items"][0]["status"] in ("completed", "due", "overdue", "pending")
    # description is always present in the response — None when unset.
    assert response["items"][0]["description"] is None


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_get_items_returns_description(hass, config_entry):
    """get_items includes a chore's description."""
    entity_id = await _setup_with_chore(hass, config_entry)

    await hass.services.async_call(
        DOMAIN,
        "update_item",
        {
            "entity_id": entity_id,
            "item": "Test Chore",
            "description": "Use the green bin.",
        },
        blocking=True,
    )

    response = await hass.services.async_call(
        DOMAIN,
        "get_items",
        {"entity_id": entity_id},
        blocking=True,
        return_response=True,
    )

    assert response["items"][0]["description"] == "Use the green bin."


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_get_items_with_status_filter(hass, config_entry):
    """get_items filters by status when provided."""
    entity_id = await _setup_with_chore(hass, config_entry)

    # The test_chore has no last_completed — a never-completed interval
    # reads as unscheduled PENDING.
    response = await hass.services.async_call(
        DOMAIN,
        "get_items",
        {"entity_id": entity_id, "status": "completed"},
        blocking=True,
        return_response=True,
    )

    assert response["items"] == []

    response = await hass.services.async_call(
        DOMAIN,
        "get_items",
        {"entity_id": entity_id, "status": "pending"},
        blocking=True,
        return_response=True,
    )

    assert len(response["items"]) == 1


# ---------------------------------------------------------------------------
# Sensor entity targeting (item inferred from entity)
# ---------------------------------------------------------------------------


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_complete_item_via_sensor_entity(hass, config_entry):
    """complete_item works when targeting the sensor entity directly."""
    await _setup_with_chore(hass, config_entry)
    sensor_id = _get_sensor_entity_id(hass, config_entry, TEST_UID)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            DOMAIN,
            "complete_item",
            {"entity_id": sensor_id, "completed_by": "person.bob"},
            blocking=True,
        )

    chore = config_entry.runtime_data.store.get_chore(TEST_UID)
    assert chore.last_completed is not None
    assert chore.last_completed_by == "person.bob"


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_item_via_sensor_entity(hass, config_entry):
    """update_item works when targeting the sensor entity directly."""
    await _setup_with_chore(hass, config_entry)
    sensor_id = _get_sensor_entity_id(hass, config_entry, TEST_UID)

    await hass.services.async_call(
        DOMAIN,
        "update_item",
        {"entity_id": sensor_id, "chore_name": "Renamed Chore"},
        blocking=True,
    )

    chore = config_entry.runtime_data.store.get_chore(TEST_UID)
    assert chore.chore_name == "Renamed Chore"


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_delete_item_via_sensor_entity(hass, config_entry):
    """delete_item works when targeting the sensor entity directly."""
    await _setup_with_chore(hass, config_entry)
    sensor_id = _get_sensor_entity_id(hass, config_entry, TEST_UID)

    await hass.services.async_call(
        DOMAIN,
        "delete_item",
        {"entity_id": sensor_id},
        blocking=True,
    )
    await hass.async_block_till_done()

    assert config_entry.runtime_data.store.get_chore(TEST_UID) is None


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_complete_item_calendar_without_item_raises(hass, config_entry):
    """complete_item raises when targeting a calendar entity without item."""
    calendar_id = await _setup_with_chore(hass, config_entry)

    with pytest.raises(ServiceValidationError, match="item is required"):
        await hass.services.async_call(
            DOMAIN,
            "complete_item",
            {"entity_id": calendar_id},
            blocking=True,
        )


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_item_calendar_without_item_raises(hass, config_entry):
    """update_item raises when targeting a calendar entity without item."""
    calendar_id = await _setup_with_chore(hass, config_entry)

    with pytest.raises(ServiceValidationError, match="item is required"):
        await hass.services.async_call(
            DOMAIN,
            "update_item",
            {"entity_id": calendar_id, "chore_name": "Nope"},
            blocking=True,
        )


def _build_chore_of_type(chore_type: ChoreType, uid: str = TEST_UID):
    """Construct a pre-existing chore of the requested type with test defaults."""
    if chore_type == ChoreType.INTERVAL:
        return IntervalChore(
            uid=uid,
            chore_name="Existing Chore",
            chore_type=ChoreType.INTERVAL,
            interval=timedelta(days=3),
        )
    if chore_type == ChoreType.SCHEDULED:
        return ScheduledChore(
            uid=uid,
            chore_name="Existing Chore",
            chore_type=ChoreType.SCHEDULED,
            time=dtime(8, 0),
        )
    return OneshotChore(
        uid=uid,
        chore_name="Existing Chore",
        chore_type=ChoreType.ONESHOT,
        due_datetime=datetime(2026, 4, 15, 12, 0, tzinfo=TZ),
    )


# Cross-type conversion is disallowed: passing a non-matching schedule
# sub-dict to update_item raises ServiceValidationError. Cover all six
# (existing_type, requested_type) pairs.
_TYPE_MISMATCH_BLOCKS = {
    ChoreType.SCHEDULED: ("scheduled", {"time": "08:00:00"}),
    ChoreType.INTERVAL: ("interval", {"days": 1}),
    ChoreType.ONESHOT: ("oneshot", {"due_datetime": "2026-04-15T12:00:00-05:00"}),
}


@pytest.mark.usefixtures("enable_custom_integrations")
@pytest.mark.parametrize(
    ("existing_type", "requested_type"),
    [(existing, requested) for existing in ChoreType for requested in ChoreType if existing != requested],
)
async def test_update_item_rejects_cross_type_conversion(hass, config_entry, existing_type, requested_type):
    """update_item rejects every (existing_type, requested_type) cross-pair.

    Each pair has different semantics for how to handle last_completed,
    previous_*, and the type-specific anchor fields. We disallow the
    conversion entirely; users must delete + re-create to change type.
    """
    config_entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()
    chore = _build_chore_of_type(existing_type)
    await config_entry.runtime_data.store.async_create_chore(chore)
    await config_entry.runtime_data.coordinator.async_refresh()
    registry = er.async_get(hass)
    entity_id = registry.async_get_entity_id("calendar", DOMAIN, config_entry.entry_id)
    assert entity_id is not None

    requested_attr, requested_payload = _TYPE_MISMATCH_BLOCKS[requested_type]

    with pytest.raises(ServiceValidationError, match="delete and re-create"):
        await hass.services.async_call(
            DOMAIN,
            "update_item",
            {
                "entity_id": entity_id,
                "item": "Existing Chore",
                requested_attr: requested_payload,
            },
            blocking=True,
        )


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_item_same_type_succeeds(hass, config_entry):
    """update_item with a matching schedule sub-dict updates without error."""
    entity_id = await _setup_with_chore(hass, config_entry)

    await hass.services.async_call(
        DOMAIN,
        "update_item",
        {
            "entity_id": entity_id,
            "item": "Test Chore",
            "interval": {"days": 7},
        },
        blocking=True,
    )

    chore = config_entry.runtime_data.store.get_chore(TEST_UID)
    assert chore is not None
    assert isinstance(chore, IntervalChore)
    assert chore.interval == timedelta(days=7)


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_delete_item_calendar_without_item_raises(hass, config_entry):
    """delete_item raises when targeting a calendar entity without item."""
    calendar_id = await _setup_with_chore(hass, config_entry)

    with pytest.raises(ServiceValidationError, match="item is required"):
        await hass.services.async_call(
            DOMAIN,
            "delete_item",
            {"entity_id": calendar_id},
            blocking=True,
        )


# ---------------------------------------------------------------------------
# uncomplete_item
# ---------------------------------------------------------------------------


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_uncomplete_item_reverts_last_completion(hass, config_entry):
    """uncomplete_item restores last_completed to its prior value."""
    entity_id = await _setup_with_chore(hass, config_entry)
    store = config_entry.runtime_data.store

    # Two completions in sequence.
    await hass.services.async_call(
        DOMAIN,
        "complete_item",
        {"entity_id": entity_id, "item": TEST_UID, "completed_at": "2026-03-29T08:00:00-05:00"},
        blocking=True,
    )
    await hass.services.async_call(
        DOMAIN,
        "complete_item",
        {
            "entity_id": entity_id,
            "item": TEST_UID,
            "completed_at": "2026-03-30T08:00:00-05:00",
            "completed_by": "person.bob",
        },
        blocking=True,
    )

    await hass.services.async_call(
        DOMAIN,
        "uncomplete_item",
        {"entity_id": entity_id, "item": TEST_UID},
        blocking=True,
    )

    chore = store.get_chore(TEST_UID)
    assert chore.last_completed is not None
    assert chore.last_completed.day == 29
    assert chore.previous_last_completed is None


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_uncomplete_item_first_completion_clears_state(hass, config_entry):
    """Uncompleting the first-ever completion clears last_completed to None."""
    entity_id = await _setup_with_chore(hass, config_entry)
    store = config_entry.runtime_data.store

    await hass.services.async_call(
        DOMAIN,
        "complete_item",
        {"entity_id": entity_id, "item": TEST_UID, "completed_by": "person.alice"},
        blocking=True,
    )
    await hass.services.async_call(
        DOMAIN,
        "uncomplete_item",
        {"entity_id": entity_id, "item": TEST_UID},
        blocking=True,
    )

    chore = store.get_chore(TEST_UID)
    assert chore.last_completed is None
    assert chore.last_completed_by is None


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_uncomplete_item_never_completed_raises(hass, config_entry):
    """uncomplete_item raises when the chore has never been completed."""
    entity_id = await _setup_with_chore(hass, config_entry)

    with pytest.raises(ServiceValidationError, match="no completion"):
        await hass.services.async_call(
            DOMAIN,
            "uncomplete_item",
            {"entity_id": entity_id, "item": TEST_UID},
            blocking=True,
        )


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_uncomplete_item_via_sensor_entity(hass, config_entry):
    """uncomplete_item works when targeting the sensor entity directly."""
    await _setup_with_chore(hass, config_entry)
    sensor_id = _get_sensor_entity_id(hass, config_entry, TEST_UID)

    await hass.services.async_call(
        DOMAIN,
        "complete_item",
        {"entity_id": sensor_id},
        blocking=True,
    )
    await hass.services.async_call(
        DOMAIN,
        "uncomplete_item",
        {"entity_id": sensor_id},
        blocking=True,
    )

    chore = config_entry.runtime_data.store.get_chore(TEST_UID)
    assert chore.last_completed is None


# ---------------------------------------------------------------------------
# Tag ID resolution
# ---------------------------------------------------------------------------

TAG_UUID = "abc-123-tag-uuid"


def _register_tag_entity(hass, tag_uuid: str = TAG_UUID) -> str:
    """Register a fake tag entity in the entity registry and return its entity_id."""
    registry = er.async_get(hass)
    entry = registry.async_get_or_create(
        domain="tag",
        platform="tag",
        unique_id=tag_uuid,
    )
    # Set a state so the entity is "found" by hass.states.get().
    hass.states.async_set(entry.entity_id, "")
    return entry.entity_id


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_create_item_resolves_tag_id(hass, config_entry):
    """create_item resolves trigger_entity tag UUID into trigger_tag_id."""
    entity_id = await _setup_with_chore(hass, config_entry)
    tag_entity_id = _register_tag_entity(hass)

    await hass.services.async_call(
        DOMAIN,
        "create_item",
        {
            "entity_id": entity_id,
            "chore_name": "Tagged Chore",
            "interval": {"days": 1},
            "trigger_entity": tag_entity_id,
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    store = config_entry.runtime_data.store
    chore = _find_chore_by_name(store, "Tagged Chore")
    assert chore is not None
    assert chore.trigger_tag_id == TAG_UUID


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_create_item_non_tag_trigger_has_no_tag_id(hass, config_entry):
    """create_item with a non-tag trigger_entity leaves trigger_tag_id as None."""
    entity_id = await _setup_with_chore(hass, config_entry)

    await hass.services.async_call(
        DOMAIN,
        "create_item",
        {
            "entity_id": entity_id,
            "chore_name": "Button Chore",
            "interval": {"days": 1},
            "trigger_entity": "input_button.my_button",
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    store = config_entry.runtime_data.store
    chore = _find_chore_by_name(store, "Button Chore")
    assert chore is not None
    assert chore.trigger_tag_id is None


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_item_resolves_tag_id(hass, config_entry):
    """update_item resolves trigger_entity tag UUID when updating trigger."""
    entity_id = await _setup_with_chore(hass, config_entry)
    tag_entity_id = _register_tag_entity(hass)

    await hass.services.async_call(
        DOMAIN,
        "update_item",
        {
            "entity_id": entity_id,
            "item": "Test Chore",
            "trigger_entity": tag_entity_id,
        },
        blocking=True,
    )

    store = config_entry.runtime_data.store
    chore = store.get_chore(TEST_UID)
    assert chore.trigger_tag_id == TAG_UUID


# ---------------------------------------------------------------------------
# skip_item
# ---------------------------------------------------------------------------


async def _add_scheduled_chore(hass, entry: MockConfigEntry) -> str:
    """Add a ScheduledChore to the already-loaded entry and return its UID."""
    uid = "11112222-3333-4444-5555-666677778888"
    chore = ScheduledChore(
        uid=uid,
        chore_name="Morning Medicine",
        chore_type=ChoreType.SCHEDULED,
        time=dtime(8, 0),
        active_days=[],
        pending_period=timedelta(minutes=180),
        grace_period=timedelta(minutes=60),
    )
    await entry.runtime_data.store.async_create_chore(chore)
    await entry.runtime_data.coordinator.async_refresh()
    await hass.async_block_till_done()
    return uid


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_skip_item_interval_default_is_now_plus_interval(hass, config_entry):
    """skip_item with no `until` defaults to now + interval for IntervalChore."""
    entity_id = await _setup_with_chore(hass, config_entry)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            DOMAIN,
            "skip_item",
            {"entity_id": entity_id, "item": TEST_UID},
            blocking=True,
        )

    chore = config_entry.runtime_data.store.get_chore(TEST_UID)
    assert chore.skipped_until == FROZEN_NOW + timedelta(days=3)


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_skip_item_scheduled_default_is_next_active_day(hass, config_entry):
    """skip_item with no `until` defaults to next active day for ScheduledChore."""
    entity_id = await _setup_with_chore(hass, config_entry)
    sched_uid = await _add_scheduled_chore(hass, config_entry)

    # 2026-03-30 is Monday at 12:00; current period Mon 08:00 → next active day Tue 08:00.
    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            DOMAIN,
            "skip_item",
            {"entity_id": entity_id, "item": sched_uid},
            blocking=True,
        )

    chore = config_entry.runtime_data.store.get_chore(sched_uid)
    assert chore.skipped_until == datetime(2026, 3, 31, 8, 0, tzinfo=TZ)


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_skip_item_with_explicit_until(hass, config_entry):
    """skip_item with an explicit `until` uses the value as-is (no interval added)."""
    entity_id = await _setup_with_chore(hass, config_entry)

    await hass.services.async_call(
        DOMAIN,
        "skip_item",
        {
            "entity_id": entity_id,
            "item": TEST_UID,
            "until": "2026-04-10T08:00:00-05:00",
        },
        blocking=True,
    )

    chore = config_entry.runtime_data.store.get_chore(TEST_UID)
    assert chore.skipped_until == datetime(2026, 4, 10, 8, 0, tzinfo=TZ)


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_skip_item_invalid_datetime_raises(hass, config_entry):
    """skip_item raises on an invalid `until` string (caught by cv.datetime schema)."""
    entity_id = await _setup_with_chore(hass, config_entry)

    with pytest.raises(vol.Invalid, match="Invalid datetime"):
        await hass.services.async_call(
            DOMAIN,
            "skip_item",
            {"entity_id": entity_id, "item": TEST_UID, "until": "not-a-date"},
            blocking=True,
        )


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_skip_item_fires_status_changed_with_source(hass, config_entry):
    """skip_item fires chore_calendar_status_changed with source=skip.

    The fixture chore is a never-completed interval (initial PENDING). A
    far-future ``until`` makes the skip anchor active and lands the chore
    well before its pending window — transitioning to COMPLETED, which is
    what surfaces the status_changed event with source=skip.
    """
    entity_id = await _setup_with_chore(hass, config_entry)

    events = []
    hass.bus.async_listen(EVENT_STATUS_CHANGED, events.append)

    far_future = "2099-01-15T08:00:00-05:00"
    await hass.services.async_call(
        DOMAIN,
        "skip_item",
        {
            "entity_id": entity_id,
            "item": TEST_UID,
            "until": far_future,
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    assert len(events) == 1
    data = events[0].data
    assert data["uid"] == TEST_UID
    assert data["chore_name"] == "Test Chore"
    assert data["entity_id"] == entity_id
    assert data["source"] == ChoreEventSource.SKIP
    assert data["from_status"] == "pending"
    assert data["to_status"] == "completed"


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_skip_item_via_sensor_entity(hass, config_entry):
    """skip_item works when targeting the sensor entity directly."""
    await _setup_with_chore(hass, config_entry)
    sensor_id = _get_sensor_entity_id(hass, config_entry, TEST_UID)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            DOMAIN,
            "skip_item",
            {"entity_id": sensor_id},
            blocking=True,
        )

    chore = config_entry.runtime_data.store.get_chore(TEST_UID)
    assert chore.skipped_until == FROZEN_NOW + timedelta(days=3)


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_complete_item_clears_skip_by_default(hass, config_entry):
    """complete_item without keep_skip clears skipped_until and seeds the undo slot."""
    entity_id = await _setup_with_chore(hass, config_entry)

    await hass.services.async_call(
        DOMAIN,
        "skip_item",
        {"entity_id": entity_id, "item": TEST_UID, "until": "2026-04-10T08:00:00-05:00"},
        blocking=True,
    )
    await hass.services.async_call(
        DOMAIN,
        "complete_item",
        {"entity_id": entity_id, "item": TEST_UID},
        blocking=True,
    )

    chore = config_entry.runtime_data.store.get_chore(TEST_UID)
    assert chore.skipped_until is None
    assert chore.previous_skipped_until == datetime(2026, 4, 10, 8, 0, tzinfo=TZ)


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_complete_item_keep_skip_preserves(hass, config_entry):
    """complete_item with keep_skip=True preserves skipped_until and leaves undo empty."""
    entity_id = await _setup_with_chore(hass, config_entry)
    skipped_iso = "2026-04-10T08:00:00-05:00"

    await hass.services.async_call(
        DOMAIN,
        "skip_item",
        {"entity_id": entity_id, "item": TEST_UID, "until": skipped_iso},
        blocking=True,
    )
    await hass.services.async_call(
        DOMAIN,
        "complete_item",
        {"entity_id": entity_id, "item": TEST_UID, "keep_skip": True},
        blocking=True,
    )

    chore = config_entry.runtime_data.store.get_chore(TEST_UID)
    assert chore.skipped_until == datetime(2026, 4, 10, 8, 0, tzinfo=TZ)
    assert chore.previous_skipped_until is None


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_uncomplete_item_restores_skip(hass, config_entry):
    """uncomplete_item restores the skipped_until that was cleared by completion."""
    entity_id = await _setup_with_chore(hass, config_entry)

    await hass.services.async_call(
        DOMAIN,
        "skip_item",
        {"entity_id": entity_id, "item": TEST_UID, "until": "2026-04-10T08:00:00-05:00"},
        blocking=True,
    )
    await hass.services.async_call(
        DOMAIN,
        "complete_item",
        {"entity_id": entity_id, "item": TEST_UID},
        blocking=True,
    )
    await hass.services.async_call(
        DOMAIN,
        "uncomplete_item",
        {"entity_id": entity_id, "item": TEST_UID},
        blocking=True,
    )

    chore = config_entry.runtime_data.store.get_chore(TEST_UID)
    assert chore.skipped_until == datetime(2026, 4, 10, 8, 0, tzinfo=TZ)
    assert chore.previous_skipped_until is None


# ---------------------------------------------------------------------------
# Events vocabulary — chore_calendar_item_created and source on _status_changed
# ---------------------------------------------------------------------------


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_create_item_fires_item_created(hass, config_entry):
    """create_item fires chore_calendar_item_created with the documented shape."""
    entity_id = await _setup_with_chore(hass, config_entry)

    events: list = []
    hass.bus.async_listen(EVENT_ITEM_CREATED, events.append)

    await hass.services.async_call(
        DOMAIN,
        "create_item",
        {
            "entity_id": entity_id,
            "chore_name": "New Chore",
            "interval": {"days": 1},
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    assert len(events) == 1
    data = events[0].data
    assert data["chore_name"] == "New Chore"
    assert data["chore_type"] == "interval"
    assert data["entity_id"] == entity_id
    # Never-completed interval reads pending at creation.
    assert data["status"] == "pending"
    assert data["next_due"] is None
    assert data["assigned_to"] == []
    assert isinstance(data["uid"], str)


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_create_item_with_tag_seed_emits_completed_status(hass, config_entry):
    """A chore created with a recently-scanned tag fires _item_created with status=completed."""
    entity_id = await _setup_with_chore(hass, config_entry)

    # Register a tag.* entity with a recent scan timestamp as its state.
    registry = er.async_get(hass)
    tag_entry = registry.async_get_or_create("tag", "tag", "feed-cat-tag-uuid")
    tag_entity_id = tag_entry.entity_id
    recent_scan = (datetime.now(tz=TZ) - timedelta(minutes=5)).isoformat()
    hass.states.async_set(tag_entity_id, recent_scan)

    events: list = []
    hass.bus.async_listen(EVENT_ITEM_CREATED, events.append)

    await hass.services.async_call(
        DOMAIN,
        "create_item",
        {
            "entity_id": entity_id,
            "chore_name": "Feed Cat",
            "trigger_entity": tag_entity_id,
            "interval": {"days": 1},
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    assert len(events) == 1
    data = events[0].data
    assert data["chore_name"] == "Feed Cat"
    # Tag-seed put last_completed inside the current cycle's pending window —
    # the chore reports completed at creation rather than the standard pending.
    assert data["status"] == "completed"


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_complete_item_status_changed_carries_source_complete(hass, config_entry):
    """complete_item via service tags the resulting status_changed with source=complete."""
    entity_id = await _setup_with_chore(hass, config_entry)

    # First completion anchors the cycle; the chore stays PENDING (initial)
    # until then, so the transition is PENDING → COMPLETED.
    events: list = []
    hass.bus.async_listen(EVENT_STATUS_CHANGED, events.append)

    await hass.services.async_call(
        DOMAIN,
        "complete_item",
        {"entity_id": entity_id, "item": TEST_UID},
        blocking=True,
    )
    await hass.async_block_till_done()

    transitions = [e for e in events if e.data["uid"] == TEST_UID]
    assert len(transitions) == 1
    assert transitions[0].data["source"] == ChoreEventSource.COMPLETE
    assert transitions[0].data["entity_id"] == entity_id
    assert transitions[0].data["to_status"] == "completed"


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_item_status_changed_carries_source_update(hass, config_entry):
    """update_item that flips status tags the event with source=update.

    Driven via a oneshot reschedule: a chore created with a far-future
    ``due_datetime`` reads PENDING; rewriting to a past datetime flips it
    to OVERDUE on the next refresh.
    """
    entity_id = await _setup_with_chore(hass, config_entry)

    # Create a oneshot scheduled in the far future — initial status PENDING.
    await hass.services.async_call(
        DOMAIN,
        "create_item",
        {
            "entity_id": entity_id,
            "chore_name": "Future Oneshot",
            "oneshot": {"due_datetime": "2099-12-31T08:00:00-05:00"},
        },
        blocking=True,
    )
    await hass.async_block_till_done()
    chore = _find_chore_by_name(config_entry.runtime_data.store, "Future Oneshot")
    assert chore is not None

    events: list = []
    hass.bus.async_listen(EVENT_STATUS_CHANGED, events.append)

    # Reschedule into the past — pushes the chore through pending_at,
    # due_at, and overdue_at all at once → OVERDUE.
    await hass.services.async_call(
        DOMAIN,
        "update_item",
        {
            "entity_id": entity_id,
            "item": chore.uid,
            "oneshot": {"due_datetime": "2025-01-01T08:00:00-05:00"},
        },
        blocking=True,
    )
    await hass.async_block_till_done()

    transitions = [e for e in events if e.data["uid"] == chore.uid]
    assert len(transitions) == 1
    assert transitions[0].data["source"] == ChoreEventSource.UPDATE
    assert transitions[0].data["from_status"] == "pending"
    assert transitions[0].data["to_status"] == "overdue"


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_item_no_transition_no_event(hass, config_entry):
    """update_item that doesn't change status fires no event."""
    entity_id = await _setup_with_chore(hass, config_entry)

    events: list = []
    hass.bus.async_listen(EVENT_STATUS_CHANGED, events.append)

    # Rename only — chore stays in its current status (PENDING).
    await hass.services.async_call(
        DOMAIN,
        "update_item",
        {"entity_id": entity_id, "item": TEST_UID, "chore_name": "Renamed Chore"},
        blocking=True,
    )
    await hass.async_block_till_done()

    assert [e for e in events if e.data["uid"] == TEST_UID] == []


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_skip_of_completed_chore_is_silent(hass, config_entry):
    """Skipping a chore already in COMPLETED fires no status_changed event.

    This is the documented edge case: the deferral takes effect (skipped_until
    is set on the chore and observable via the sensor's state_changed) but
    the domain-level status_changed event doesn't fire because the transition
    is COMPLETED → COMPLETED.
    """
    entity_id = await _setup_with_chore(hass, config_entry)

    # Complete first so the chore is in COMPLETED.
    await hass.services.async_call(
        DOMAIN,
        "complete_item",
        {"entity_id": entity_id, "item": TEST_UID},
        blocking=True,
    )
    await hass.async_block_till_done()

    events: list = []
    hass.bus.async_listen(EVENT_STATUS_CHANGED, events.append)

    # Far-future skip — would land the chore well before its skip-anchor
    # pending window, but completed stays completed either way.
    await hass.services.async_call(
        DOMAIN,
        "skip_item",
        {"entity_id": entity_id, "item": TEST_UID, "until": "2099-01-15T08:00:00-05:00"},
        blocking=True,
    )
    await hass.async_block_till_done()

    chore = config_entry.runtime_data.store.get_chore(TEST_UID)
    assert chore.skipped_until == datetime(2099, 1, 15, 8, 0, tzinfo=TZ)
    assert [e for e in events if e.data["uid"] == TEST_UID] == []
