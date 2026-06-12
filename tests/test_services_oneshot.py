"""Tests for OneshotChore service actions (create/update/skip)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.chore_calendar.const import (
    CONF_LIST_NAME,
    DOMAIN,
    EVENT_STATUS_CHANGED,
    ChoreEventSource,
    ChoreType,
)
from custom_components.chore_calendar.models import OneshotChore
from homeassistant.config_entries import ConfigEntryState
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import entity_registry as er

TZ = timezone(timedelta(hours=-5))


@pytest.fixture
def config_entry() -> MockConfigEntry:
    """Return a mock config entry."""
    return MockConfigEntry(
        domain=DOMAIN,
        title="Daily Chores",
        data={CONF_LIST_NAME: "Daily Chores"},
        unique_id="daily chores",
    )


async def _setup(hass, entry: MockConfigEntry) -> str:
    """Set up the integration and return the calendar entity_id."""
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.LOADED

    registry = er.async_get(hass)
    entity_id = registry.async_get_entity_id("calendar", DOMAIN, entry.entry_id)
    assert entity_id is not None
    return entity_id


def _find_oneshot(store, name: str) -> OneshotChore | None:
    """Find a oneshot chore in the store by name."""
    for chore in store.get_all_chores().values():
        if chore.chore_name == name and isinstance(chore, OneshotChore):
            return chore
    return None


# ---------------------------------------------------------------------------
# create_item with oneshot
# ---------------------------------------------------------------------------


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_create_oneshot_with_due_datetime(hass, config_entry):
    """create_item accepts a oneshot schedule with a due_datetime."""
    entity_id = await _setup(hass, config_entry)
    due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)

    await hass.services.async_call(
        DOMAIN,
        "create_item",
        {
            "entity_id": entity_id,
            "chore_name": "File Taxes",
            "oneshot": {
                "due_datetime": due.isoformat(),
            },
            "pending_period": {"days": 7},
            "grace_period": {"hours": 1},
        },
        blocking=True,
    )

    store = config_entry.runtime_data.store
    chore = _find_oneshot(store, "File Taxes")
    assert chore is not None
    assert chore.chore_type == ChoreType.ONESHOT
    assert chore.due_datetime == due
    assert chore.pending_period == timedelta(days=7)
    assert chore.grace_period == timedelta(hours=1)


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_create_oneshot_with_naive_due_datetime_coerces_to_local(hass, config_entry):
    """A due_datetime without timezone info is coerced to local tz, not stored naive.

    Regression test: a naive datetime in storage causes compute_status to raise
    ``TypeError: can't compare offset-naive and offset-aware datetimes`` on the
    next coordinator refresh.
    """
    entity_id = await _setup(hass, config_entry)

    await hass.services.async_call(
        DOMAIN,
        "create_item",
        {
            "entity_id": entity_id,
            "chore_name": "Naive Due",
            # No timezone suffix — voluptuous parses this as a naive datetime.
            "oneshot": {"due_datetime": "2026-04-26T10:00:00"},
        },
        blocking=True,
    )

    chore = _find_oneshot(config_entry.runtime_data.store, "Naive Due")
    assert chore is not None
    assert chore.due_datetime is not None
    assert chore.due_datetime.tzinfo is not None  # coerced
    # Coordinator refresh exercises compute_status — must not raise.
    await config_entry.runtime_data.coordinator.async_refresh()


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_create_oneshot_without_due_datetime(hass, config_entry):
    """create_item with no due_datetime creates an unscheduled oneshot."""
    entity_id = await _setup(hass, config_entry)

    await hass.services.async_call(
        DOMAIN,
        "create_item",
        {
            "entity_id": entity_id,
            "chore_name": "Buy Milk",
            "oneshot": {},
        },
        blocking=True,
    )

    store = config_entry.runtime_data.store
    chore = _find_oneshot(store, "Buy Milk")
    assert chore is not None
    assert chore.due_datetime is None


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_create_with_multiple_schedule_keys_raises(hass, config_entry):
    """Specifying both oneshot and scheduled raises ServiceValidationError."""
    entity_id = await _setup(hass, config_entry)
    with pytest.raises(ServiceValidationError, match="more than one"):
        await hass.services.async_call(
            DOMAIN,
            "create_item",
            {
                "entity_id": entity_id,
                "chore_name": "Confused Chore",
                "scheduled": {"frequency": "daily"},
                "oneshot": {"due_datetime": "2026-04-15T12:00:00-05:00"},
            },
            blocking=True,
        )


# ---------------------------------------------------------------------------
# update_item
# ---------------------------------------------------------------------------


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_oneshot_due_datetime(hass, config_entry):
    """update_item can change a oneshot's due_datetime."""
    entity_id = await _setup(hass, config_entry)
    original_due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)
    new_due = datetime(2026, 6, 15, 12, 0, tzinfo=TZ)

    await hass.services.async_call(
        DOMAIN,
        "create_item",
        {
            "entity_id": entity_id,
            "chore_name": "Reschedulable",
            "oneshot": {"due_datetime": original_due.isoformat()},
        },
        blocking=True,
    )
    await hass.services.async_call(
        DOMAIN,
        "update_item",
        {
            "entity_id": entity_id,
            "item": "Reschedulable",
            "oneshot": {"due_datetime": new_due.isoformat()},
        },
        blocking=True,
    )

    chore = _find_oneshot(config_entry.runtime_data.store, "Reschedulable")
    assert chore is not None
    assert chore.due_datetime == new_due


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_oneshot_clears_due_datetime(hass, config_entry):
    """update_item with oneshot.due_datetime: null clears the date."""
    entity_id = await _setup(hass, config_entry)
    due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)

    await hass.services.async_call(
        DOMAIN,
        "create_item",
        {
            "entity_id": entity_id,
            "chore_name": "Clearable",
            "oneshot": {"due_datetime": due.isoformat()},
        },
        blocking=True,
    )
    await hass.services.async_call(
        DOMAIN,
        "update_item",
        {
            "entity_id": entity_id,
            "item": "Clearable",
            "oneshot": {"due_datetime": None},
        },
        blocking=True,
    )

    chore = _find_oneshot(config_entry.runtime_data.store, "Clearable")
    assert chore is not None
    assert chore.due_datetime is None


# ---------------------------------------------------------------------------
# skip_item
# ---------------------------------------------------------------------------


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_skip_default_on_oneshot_clears_due_and_fires_source_skip(hass, config_entry):
    """skip_item without 'until' on a oneshot clears due_datetime; status_changed has source=skip.

    The created oneshot is OVERDUE at test time (real-now is well past
    ``due_datetime``). Default-skip clears due_datetime → status flips to
    PENDING (unscheduled), surfacing as ``status_changed`` with
    ``source=skip``.
    """
    entity_id = await _setup(hass, config_entry)
    due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)

    await hass.services.async_call(
        DOMAIN,
        "create_item",
        {
            "entity_id": entity_id,
            "chore_name": "Skippable",
            "oneshot": {"due_datetime": due.isoformat()},
        },
        blocking=True,
    )

    events: list = []
    hass.bus.async_listen(EVENT_STATUS_CHANGED, events.append)

    await hass.services.async_call(
        DOMAIN,
        "skip_item",
        {"entity_id": entity_id, "item": "Skippable"},
        blocking=True,
    )
    await hass.async_block_till_done()

    chore = _find_oneshot(config_entry.runtime_data.store, "Skippable")
    assert chore is not None
    assert chore.due_datetime is None  # cleared by Path C default-skip

    skip_events = [e for e in events if e.data["uid"] == chore.uid]
    assert len(skip_events) == 1
    data = skip_events[0].data
    assert data["source"] == ChoreEventSource.SKIP
    assert data["entity_id"] == entity_id
    assert data["to_status"] == "pending"


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_skip_with_explicit_until_on_oneshot(hass, config_entry):
    """skip_item with explicit 'until' on a oneshot sets skipped_until normally."""
    entity_id = await _setup(hass, config_entry)
    due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)
    until = datetime(2026, 5, 1, 12, 0, tzinfo=TZ)

    await hass.services.async_call(
        DOMAIN,
        "create_item",
        {
            "entity_id": entity_id,
            "chore_name": "ExplicitSkip",
            "oneshot": {"due_datetime": due.isoformat()},
        },
        blocking=True,
    )
    await hass.services.async_call(
        DOMAIN,
        "skip_item",
        {"entity_id": entity_id, "item": "ExplicitSkip", "until": until.isoformat()},
        blocking=True,
    )

    chore = _find_oneshot(config_entry.runtime_data.store, "ExplicitSkip")
    assert chore is not None
    assert chore.skipped_until == until
    assert chore.due_datetime == due  # unchanged — explicit skip uses skipped_until anchor


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_skip_completed_oneshot_raises(hass, config_entry):
    """skip_item on a terminal-completed oneshot raises ServiceValidationError."""
    entity_id = await _setup(hass, config_entry)
    due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)

    await hass.services.async_call(
        DOMAIN,
        "create_item",
        {
            "entity_id": entity_id,
            "chore_name": "DoneAlready",
            "oneshot": {"due_datetime": due.isoformat()},
        },
        blocking=True,
    )
    # Complete the chore (in window).
    await hass.services.async_call(
        DOMAIN,
        "complete_item",
        {
            "entity_id": entity_id,
            "item": "DoneAlready",
            "completed_at": (due - timedelta(minutes=10)).isoformat(),
        },
        blocking=True,
    )

    with pytest.raises(ServiceValidationError, match="completed oneshot"):
        await hass.services.async_call(
            DOMAIN,
            "skip_item",
            {"entity_id": entity_id, "item": "DoneAlready"},
            blocking=True,
        )
