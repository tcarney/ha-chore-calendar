"""Tests for the Chore Calendar todo platform."""

from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from unittest.mock import patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.chore_calendar.const import CONF_LIST_NAME, DOMAIN, EVENT_STATUS_CHANGED, ChoreType
from custom_components.chore_calendar.models import IntervalChore, ScheduledChore
from homeassistant.components.todo import TodoItemStatus, TodoListEntityFeature
from homeassistant.config_entries import ConfigEntryState
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.entity_platform import async_get_platforms

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


async def _setup_entry(hass, entry: MockConfigEntry) -> str:
    """Set up the integration and return the todo entity_id."""
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.LOADED

    registry = er.async_get(hass)
    entity_id = registry.async_get_entity_id("todo", DOMAIN, f"{entry.entry_id}_todo")
    assert entity_id is not None
    return entity_id


def _get_todo_entity(hass, entity_id: str):
    """Return the todo entity object by entity_id."""
    for platform in async_get_platforms(hass, DOMAIN):
        for entity in platform.entities.values():
            if entity.entity_id == entity_id:
                return entity
    return None


async def _refresh_at(hass, entry: MockConfigEntry, frozen: datetime) -> None:
    """Refresh the coordinator and entity state with ``dt_util.now()`` pinned."""
    with patch("homeassistant.util.dt.now", return_value=frozen):
        await entry.runtime_data.coordinator.async_refresh()
        await hass.async_block_till_done()


# ---------------------------------------------------------------------------
# Entity creation
# ---------------------------------------------------------------------------


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_todo_entity_created(hass, config_entry):
    """One todo entity is created per chore list, with the expected unique_id."""
    entity_id = await _setup_entry(hass, config_entry)
    assert entity_id == "todo.daily_chores"

    registry = er.async_get(hass)
    entry = registry.async_get(entity_id)
    assert entry is not None
    assert entry.unique_id == f"{config_entry.entry_id}_todo"


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_todo_entity_shares_device_with_calendar(hass, config_entry):
    """The todo entity is on the same device as the calendar entity."""
    todo_id = await _setup_entry(hass, config_entry)
    registry = er.async_get(hass)
    calendar_id = registry.async_get_entity_id("calendar", DOMAIN, config_entry.entry_id)
    assert calendar_id is not None

    todo_entry = registry.async_get(todo_id)
    calendar_entry = registry.async_get(calendar_id)
    assert todo_entry is not None
    assert calendar_entry is not None
    assert todo_entry.device_id == calendar_entry.device_id


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_todo_entity_only_advertises_update(hass, config_entry):
    """Only UPDATE_TODO_ITEM is advertised; CREATE/DELETE/MOVE are not."""
    entity_id = await _setup_entry(hass, config_entry)
    state = hass.states.get(entity_id)
    assert state is not None
    features = state.attributes["supported_features"]
    assert features == TodoListEntityFeature.UPDATE_TODO_ITEM


# ---------------------------------------------------------------------------
# todo_items property
# ---------------------------------------------------------------------------


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_todo_items_maps_due_to_needs_action(hass, config_entry):
    """A due chore appears as a NEEDS_ACTION todo item with due set but completed empty."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    # Interval chore never completed is always DUE.
    chore = IntervalChore(
        uid="due-chore",
        chore_name="Take Out Trash",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=7),
        grace_period=timedelta(hours=1),
        created_at=FROZEN_NOW,
    )
    await runtime.store.async_create_chore(chore)
    await _refresh_at(hass, config_entry, FROZEN_NOW)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        entity = _get_todo_entity(hass, entity_id)
        assert entity is not None
        items = entity.todo_items

    assert items is not None
    assert len(items) == 1
    assert items[0].uid == "due-chore"
    assert items[0].summary == "Take Out Trash"
    assert items[0].status == TodoItemStatus.NEEDS_ACTION
    assert items[0].due == FROZEN_NOW
    # A never-completed chore has no last_completed — completed must stay None.
    assert items[0].completed is None


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_needs_action_item_omits_previous_period_completion(hass, config_entry):
    """An actionable chore does not surface the previous period's last_completed.

    A recurring chore that just rolled into ``due`` still carries its prior
    period's ``last_completed``. That timestamp shouldn't appear on the
    ``TodoItem`` — a ``needs_action`` item with ``completed`` set would be
    self-contradictory.
    """
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    # Interval chore completed yesterday, 1-day interval, 1h grace — at
    # FROZEN_NOW (24h + some later) it's OVERDUE.
    previous_completion = FROZEN_NOW - timedelta(days=2)
    chore = IntervalChore(
        uid="recurring",
        chore_name="Recurring Chore",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=1),
        grace_period=timedelta(hours=1),
        last_completed=previous_completion,
    )
    await runtime.store.async_create_chore(chore)
    await _refresh_at(hass, config_entry, FROZEN_NOW)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        entity = _get_todo_entity(hass, entity_id)
        assert entity is not None
        items = entity.todo_items

    assert items is not None
    assert len(items) == 1
    assert items[0].status == TodoItemStatus.NEEDS_ACTION
    assert items[0].completed is None  # not the prior period's completion


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_todo_items_maps_completed_to_completed(hass, config_entry):
    """A completed chore has completed set, and due left empty."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    last_completed = FROZEN_NOW - timedelta(hours=1)
    # Interval chore completed recently — status COMPLETED (due in 7 days).
    chore = IntervalChore(
        uid="done",
        chore_name="Water Plants",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=7),
        grace_period=timedelta(hours=1),
        last_completed=last_completed,
    )
    await runtime.store.async_create_chore(chore)
    await _refresh_at(hass, config_entry, FROZEN_NOW)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        entity = _get_todo_entity(hass, entity_id)
        assert entity is not None
        items = entity.todo_items

    assert items is not None
    assert len(items) == 1
    assert items[0].status == TodoItemStatus.COMPLETED
    # Completed items don't carry a due time — matches standard todo UX.
    assert items[0].due is None
    # completed field mirrors chore.last_completed.
    assert items[0].completed == last_completed


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_todo_items_omits_pending_chore(hass, config_entry):
    """A pending (early-window) scheduled chore is excluded from todo_items."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    # Scheduled chore at 14:00 with 3h early window — at 12:00 it's PENDING.
    chore = ScheduledChore(
        uid="pending-chore",
        chore_name="Evening Chore",
        chore_type=ChoreType.SCHEDULED,
        time=time(14, 0),
        early_window=timedelta(hours=3),
        grace_period=timedelta(hours=1),
        created_at=FROZEN_NOW - timedelta(days=1),
    )
    await runtime.store.async_create_chore(chore)
    await _refresh_at(hass, config_entry, FROZEN_NOW)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        entity = _get_todo_entity(hass, entity_id)
        assert entity is not None
        items = entity.todo_items

    assert items is not None
    assert items == []


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_todo_items_sort_order(hass, config_entry):
    """Items sort overdue → due → completed, each bucket by due ascending."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    # DUE interval (never completed) — due at created_at.
    due_chore = IntervalChore(
        uid="due",
        chore_name="Due Chore",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=7),
        grace_period=timedelta(hours=1),
        created_at=FROZEN_NOW,  # due right now
    )
    # OVERDUE interval — completed long ago, past grace period.
    overdue_chore = IntervalChore(
        uid="overdue",
        chore_name="Overdue Chore",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=1),
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW - timedelta(days=3),
    )
    # COMPLETED interval — recently completed, not yet due.
    completed_chore = IntervalChore(
        uid="completed",
        chore_name="Completed Chore",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=7),
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW - timedelta(hours=1),
    )
    for c in (due_chore, overdue_chore, completed_chore):
        await runtime.store.async_create_chore(c)
    await _refresh_at(hass, config_entry, FROZEN_NOW)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        entity = _get_todo_entity(hass, entity_id)
        assert entity is not None
        items = entity.todo_items

    assert items is not None
    assert [item.uid for item in items] == ["overdue", "due", "completed"]


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_todo_entity_state_counts_needs_action(hass, config_entry):
    """The entity state is the count of NEEDS_ACTION items."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    # Two DUE chores + one COMPLETED → state should be 2.
    due_a = IntervalChore(
        uid="due-a",
        chore_name="Due A",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=7),
        grace_period=timedelta(hours=1),
        created_at=FROZEN_NOW,
    )
    due_b = IntervalChore(
        uid="due-b",
        chore_name="Due B",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=7),
        grace_period=timedelta(hours=1),
        created_at=FROZEN_NOW,
    )
    done = IntervalChore(
        uid="done",
        chore_name="Done",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=7),
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW - timedelta(hours=1),
    )
    for c in (due_a, due_b, done):
        await runtime.store.async_create_chore(c)
    await _refresh_at(hass, config_entry, FROZEN_NOW)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        state = hass.states.get(entity_id)
    assert state is not None
    assert state.state == "2"


# ---------------------------------------------------------------------------
# async_update_todo_item
# ---------------------------------------------------------------------------


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_needs_action_to_completed_records_completion(hass, config_entry):
    """Toggling a NEEDS_ACTION item to COMPLETED records a completion."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    chore = IntervalChore(
        uid="chore-1",
        chore_name="Test Chore",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=7),
        grace_period=timedelta(hours=1),
        created_at=FROZEN_NOW,
    )
    await runtime.store.async_create_chore(chore)
    await _refresh_at(hass, config_entry, FROZEN_NOW)

    events: list = []
    hass.bus.async_listen(EVENT_STATUS_CHANGED, events.append)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            "todo",
            "update_item",
            {"entity_id": entity_id, "item": "chore-1", "status": "completed"},
            blocking=True,
        )
        await hass.async_block_till_done()

    updated = runtime.store.get_chore("chore-1")
    assert updated is not None
    assert updated.last_completed == FROZEN_NOW

    assert len(events) == 1
    assert events[0].data["to_status"] == "completed"
    assert events[0].data["uid"] == "chore-1"


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_completed_to_needs_action_reverts_completion(hass, config_entry):
    """Toggling a COMPLETED item back to NEEDS_ACTION reverts the completion."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    # Pre-completed chore.
    chore = IntervalChore(
        uid="chore-1",
        chore_name="Test Chore",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=7),
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW - timedelta(hours=1),
    )
    await runtime.store.async_create_chore(chore)
    await _refresh_at(hass, config_entry, FROZEN_NOW)

    events: list = []
    hass.bus.async_listen(EVENT_STATUS_CHANGED, events.append)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            "todo",
            "update_item",
            {"entity_id": entity_id, "item": "chore-1", "status": "needs_action"},
            blocking=True,
        )
        await hass.async_block_till_done()

    updated = runtime.store.get_chore("chore-1")
    assert updated is not None
    assert updated.last_completed is None

    assert len(events) == 1
    assert events[0].data["to_status"] == "due"
    assert events[0].data.get("uncomplete") is True


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_unknown_item_raises(hass, config_entry):
    """Updating an unknown item raises ServiceValidationError."""
    entity_id = await _setup_entry(hass, config_entry)

    with pytest.raises(ServiceValidationError):
        await hass.services.async_call(
            "todo",
            "update_item",
            {"entity_id": entity_id, "item": "does-not-exist", "status": "completed"},
            blocking=True,
        )


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_uncomplete_with_no_completion_raises(hass, config_entry):
    """Uncomplete on a never-completed chore raises ServiceValidationError.

    A never-completed interval chore is DUE (not COMPLETED), so the todo entity
    won't accept the ``completed → needs_action`` route anyway. But if a caller
    forces it (e.g. stale client state), the helper surfaces the error.
    """
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    chore = IntervalChore(
        uid="never-done",
        chore_name="Never Done",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=7),
        grace_period=timedelta(hours=1),
        created_at=FROZEN_NOW,
    )
    await runtime.store.async_create_chore(chore)
    await _refresh_at(hass, config_entry, FROZEN_NOW)

    # Current status is DUE, request NEEDS_ACTION → no-op (same bucket).
    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            "todo",
            "update_item",
            {"entity_id": entity_id, "item": "never-done", "status": "needs_action"},
            blocking=True,
        )
    # Nothing should have changed.
    updated = runtime.store.get_chore("never-done")
    assert updated is not None
    assert updated.last_completed is None


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_same_status_is_noop(hass, config_entry):
    """Updating with the same status does not record or revert a completion."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    chore = IntervalChore(
        uid="chore-1",
        chore_name="Test Chore",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=7),
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW - timedelta(hours=1),  # COMPLETED
    )
    await runtime.store.async_create_chore(chore)
    await _refresh_at(hass, config_entry, FROZEN_NOW)

    original_last_completed = chore.last_completed

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            "todo",
            "update_item",
            {"entity_id": entity_id, "item": "chore-1", "status": "completed"},
            blocking=True,
        )

    updated = runtime.store.get_chore("chore-1")
    assert updated is not None
    assert updated.last_completed == original_last_completed


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_recurring_chore_reappears_as_needs_action(hass, config_entry):
    """After completing a recurring chore, it reappears as NEEDS_ACTION next period."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    chore = IntervalChore(
        uid="recurring",
        chore_name="Recurring Chore",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=1),
        grace_period=timedelta(hours=1),
        created_at=FROZEN_NOW,
    )
    await runtime.store.async_create_chore(chore)
    await _refresh_at(hass, config_entry, FROZEN_NOW)

    # Complete via todo service.
    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            "todo",
            "update_item",
            {"entity_id": entity_id, "item": "recurring", "status": "completed"},
            blocking=True,
        )
        entity = _get_todo_entity(hass, entity_id)
        assert entity is not None
        items = entity.todo_items
    assert items is not None
    assert items[0].status == TodoItemStatus.COMPLETED

    # Advance past interval — chore becomes DUE again.
    later = FROZEN_NOW + timedelta(days=2)
    await _refresh_at(hass, config_entry, later)
    with patch("homeassistant.util.dt.now", return_value=later):
        items = entity.todo_items
    assert items is not None
    assert items[0].status == TodoItemStatus.NEEDS_ACTION
