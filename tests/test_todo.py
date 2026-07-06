"""Tests for the Chore Calendar todo platform."""

from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from unittest.mock import patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.chore_calendar.const import (
    CONF_LIST_NAME,
    DOMAIN,
    EVENT_STATUS_CHANGED,
    ChoreEventSource,
    ChoreType,
)
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
async def test_todo_entity_advertised_features(hass, config_entry):
    """CREATE/UPDATE plus the description/due-datetime field features; DELETE/MOVE are not.

    Deletion lives on chore_calendar.* services. Advertising
    DELETE_TODO_ITEM would route both todo.remove_item and
    todo.remove_completed_items through async_delete_todo_items, where we
    can't cleanly distinguish "permanently delete this chore" from "clear
    from completed view" — the native card's "permanently deleted" warning
    would be misleading for recurring chores whose last_completed is
    load-bearing. SET_DUE_DATE_ON_ITEM (date-only) stays off: every reported
    due is a datetime, and accepting a bare date would mean inventing a
    time-of-day.
    """
    entity_id = await _setup_entry(hass, config_entry)
    state = hass.states.get(entity_id)
    assert state is not None
    features = state.attributes["supported_features"]
    assert features == (
        TodoListEntityFeature.CREATE_TODO_ITEM
        | TodoListEntityFeature.UPDATE_TODO_ITEM
        | TodoListEntityFeature.SET_DESCRIPTION_ON_ITEM
        | TodoListEntityFeature.SET_DUE_DATETIME_ON_ITEM
    )


# ---------------------------------------------------------------------------
# todo_items property
# ---------------------------------------------------------------------------


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_todo_items_maps_due_to_needs_action(hass, config_entry):
    """A due chore appears as a NEEDS_ACTION todo item with due set but completed empty."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    # Interval chore last completed exactly 7 days ago — at FROZEN_NOW it
    # has just hit due_at and reads as DUE.
    chore = IntervalChore(
        uid="due-chore",
        chore_name="Take Out Trash",
        chore_type=ChoreType.INTERVAL,
        freq="daily",
        interval=7,
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW - timedelta(days=7),
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
    # The actionable item must not surface the prior period's last_completed.
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
        freq="daily",
        interval=1,
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
        freq="daily",
        interval=7,
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
async def test_todo_items_skip_deferred_item_carries_due(hass, config_entry):
    """A skip-deferred chore reads COMPLETED but carries its deferred-until due.

    Exposing ``skipped_until`` on the dormant row is what makes the skip
    visible — and editable/clearable — from the native card.
    """
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    deferred_to = FROZEN_NOW + timedelta(days=3)
    chore = IntervalChore(
        uid="deferred",
        chore_name="Water Plants",
        chore_type=ChoreType.INTERVAL,
        freq="daily",
        interval=7,
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW - timedelta(days=7),
        skipped_until=deferred_to,
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
    assert items[0].due == deferred_to


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_todo_items_includes_pending_chore(hass, config_entry):
    """A pending (early-window) scheduled chore appears as NEEDS_ACTION.

    Pending chores are included so the todo list mirrors HA's native
    todo-list-card (which has no date filter); the chore card's
    ``due_date_period`` option provides date-window filtering on top.
    """
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    # Scheduled chore at 14:00 with 3h pending window — at 12:00 it's PENDING
    # (window opens at 11:00; period_due is 14:00).
    # Created earlier today so today's 14:00 is the first valid period.
    chore = ScheduledChore(
        uid="pending-chore",
        chore_name="Evening Chore",
        chore_type=ChoreType.SCHEDULED,
        time=time(14, 0),
        pending_period=timedelta(hours=3),
        grace_period=timedelta(hours=1),
        created_at=FROZEN_NOW.replace(hour=9, minute=0),
    )
    await runtime.store.async_create_chore(chore)
    await _refresh_at(hass, config_entry, FROZEN_NOW)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        entity = _get_todo_entity(hass, entity_id)
        assert entity is not None
        items = entity.todo_items

    assert items is not None
    assert len(items) == 1
    assert items[0].uid == "pending-chore"
    assert items[0].status == TodoItemStatus.NEEDS_ACTION
    # PENDING items carry the next due time, same as DUE/OVERDUE.
    assert items[0].due == FROZEN_NOW.replace(hour=14, minute=0)
    assert items[0].completed is None


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_todo_items_sort_order(hass, config_entry):
    """Items sort overdue → due → pending → completed, each bucket by due ascending."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    # DUE interval — last completed exactly 7 days ago, just hit due_at.
    due_chore = IntervalChore(
        uid="due",
        chore_name="Due Chore",
        chore_type=ChoreType.INTERVAL,
        freq="daily",
        interval=7,
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW - timedelta(days=7),
    )
    # OVERDUE interval — completed long ago, past grace period.
    overdue_chore = IntervalChore(
        uid="overdue",
        chore_name="Overdue Chore",
        chore_type=ChoreType.INTERVAL,
        freq="daily",
        interval=1,
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW - timedelta(days=3),
    )
    # PENDING scheduled — period_due at 14:00, pending window opens at 11:00,
    # FROZEN_NOW is 12:00 → in the pending window. Created today so today's
    # 14:00 is the first valid period.
    pending_chore = ScheduledChore(
        uid="pending",
        chore_name="Pending Chore",
        chore_type=ChoreType.SCHEDULED,
        time=time(14, 0),
        pending_period=timedelta(hours=3),
        grace_period=timedelta(hours=1),
        created_at=FROZEN_NOW.replace(hour=9, minute=0),
    )
    # COMPLETED interval — recently completed, not yet due.
    completed_chore = IntervalChore(
        uid="completed",
        chore_name="Completed Chore",
        chore_type=ChoreType.INTERVAL,
        freq="daily",
        interval=7,
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW - timedelta(hours=1),
    )
    for c in (due_chore, overdue_chore, pending_chore, completed_chore):
        await runtime.store.async_create_chore(c)
    await _refresh_at(hass, config_entry, FROZEN_NOW)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        entity = _get_todo_entity(hass, entity_id)
        assert entity is not None
        items = entity.todo_items

    assert items is not None
    assert [item.uid for item in items] == ["overdue", "due", "pending", "completed"]


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
        freq="daily",
        interval=7,
        grace_period=timedelta(hours=1),
        created_at=FROZEN_NOW,
    )
    due_b = IntervalChore(
        uid="due-b",
        chore_name="Due B",
        chore_type=ChoreType.INTERVAL,
        freq="daily",
        interval=7,
        grace_period=timedelta(hours=1),
        created_at=FROZEN_NOW,
    )
    done = IntervalChore(
        uid="done",
        chore_name="Done",
        chore_type=ChoreType.INTERVAL,
        freq="daily",
        interval=7,
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
        freq="daily",
        interval=7,
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
        freq="daily",
        interval=7,
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

    # Reverting the only completion leaves the chore unscheduled-PENDING
    # (no anchor until the next first completion).
    assert len(events) == 1
    assert events[0].data["to_status"] == "pending"
    assert events[0].data["source"] == ChoreEventSource.UNCOMPLETE


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_todo_items_carry_description(hass, config_entry):
    """Both actionable and completed items surface the chore's description."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    due_chore = IntervalChore(
        uid="due-chore",
        chore_name="Take Out Trash",
        chore_type=ChoreType.INTERVAL,
        description="Bins go out Sunday night.",
        freq="daily",
        interval=7,
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW - timedelta(days=7),
    )
    done_chore = IntervalChore(
        uid="done-chore",
        chore_name="Water Plants",
        chore_type=ChoreType.INTERVAL,
        description="Only the porch ones.",
        freq="daily",
        interval=7,
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW - timedelta(hours=1),
    )
    await runtime.store.async_create_chore(due_chore)
    await runtime.store.async_create_chore(done_chore)
    await _refresh_at(hass, config_entry, FROZEN_NOW)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        entity = _get_todo_entity(hass, entity_id)
        assert entity is not None
        items = {item.uid: item for item in entity.todo_items}

    assert items["due-chore"].status == TodoItemStatus.NEEDS_ACTION
    assert items["due-chore"].description == "Bins go out Sunday night."
    assert items["done-chore"].status == TodoItemStatus.COMPLETED
    assert items["done-chore"].description == "Only the porch ones."


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_description_via_service(hass, config_entry):
    """todo.update_item with a description writes it through to the chore.

    Core merges the unspecified fields (summary, status, due) from the
    reported item, so only the description registers as a change.
    """
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    chore = IntervalChore(
        uid="chore-1",
        chore_name="Test Chore",
        chore_type=ChoreType.INTERVAL,
        description="Original note.",
        freq="daily",
        interval=7,
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW - timedelta(days=7),
    )
    await runtime.store.async_create_chore(chore)
    await _refresh_at(hass, config_entry, FROZEN_NOW)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            "todo",
            "update_item",
            {"entity_id": entity_id, "item": "chore-1", "description": "Edited note."},
            blocking=True,
        )
        await hass.async_block_till_done()

    updated = runtime.store.get_chore("chore-1")
    assert updated is not None
    assert updated.description == "Edited note."
    # Status untouched — no completion was recorded by the field edit.
    assert updated.last_completed == FROZEN_NOW - timedelta(days=7)


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_clear_description_via_service(hass, config_entry):
    """An explicit null description clears the stored one (empty → None)."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    chore = IntervalChore(
        uid="chore-1",
        chore_name="Test Chore",
        chore_type=ChoreType.INTERVAL,
        description="Original note.",
        freq="daily",
        interval=7,
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW - timedelta(days=7),
    )
    await runtime.store.async_create_chore(chore)
    await _refresh_at(hass, config_entry, FROZEN_NOW)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            "todo",
            "update_item",
            {"entity_id": entity_id, "item": "chore-1", "description": None},
            blocking=True,
        )
        await hass.async_block_till_done()

    updated = runtime.store.get_chore("chore-1")
    assert updated is not None
    assert updated.description is None


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_rename_via_service(hass, config_entry):
    """todo.update_item with rename updates the chore name."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    chore = IntervalChore(
        uid="chore-1",
        chore_name="Old Name",
        chore_type=ChoreType.INTERVAL,
        freq="daily",
        interval=7,
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW - timedelta(days=7),
    )
    await runtime.store.async_create_chore(chore)
    await _refresh_at(hass, config_entry, FROZEN_NOW)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            "todo",
            "update_item",
            {"entity_id": entity_id, "item": "chore-1", "rename": "New Name"},
            blocking=True,
        )
        await hass.async_block_till_done()

    updated = runtime.store.get_chore("chore-1")
    assert updated is not None
    assert updated.chore_name == "New Name"


# ---------------------------------------------------------------------------
# async_update_todo_item — due edits
# ---------------------------------------------------------------------------


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_due_later_defers_recurring(hass, config_entry):
    """Setting a later due on a recurring chore sets the skipped_until override."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    chore = IntervalChore(
        uid="chore-1",
        chore_name="Test Chore",
        chore_type=ChoreType.INTERVAL,
        freq="daily",
        interval=7,
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW - timedelta(days=7),  # DUE at FROZEN_NOW
    )
    await runtime.store.async_create_chore(chore)
    await _refresh_at(hass, config_entry, FROZEN_NOW)

    new_due = FROZEN_NOW + timedelta(days=2)
    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            "todo",
            "update_item",
            {"entity_id": entity_id, "item": "chore-1", "due_datetime": new_due.isoformat()},
            blocking=True,
        )
        await hass.async_block_till_done()

    updated = runtime.store.get_chore("chore-1")
    assert updated is not None
    assert updated.skipped_until == new_due
    # The schedule itself is untouched — only the current occurrence moved.
    assert isinstance(updated, IntervalChore)
    assert updated.interval == 7
    assert updated.last_completed == FROZEN_NOW - timedelta(days=7)
    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        assert updated.compute_next_due(FROZEN_NOW) == new_due


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_due_earlier_advances_recurring(hass, config_entry):
    """Setting an earlier due pulls the occurrence forward of its natural anchor."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    chore = IntervalChore(
        uid="chore-1",
        chore_name="Test Chore",
        chore_type=ChoreType.INTERVAL,
        freq="daily",
        interval=7,
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW - timedelta(days=1),  # natural due in 6 days
    )
    await runtime.store.async_create_chore(chore)
    await _refresh_at(hass, config_entry, FROZEN_NOW)

    new_due = FROZEN_NOW + timedelta(days=1)
    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            "todo",
            "update_item",
            {"entity_id": entity_id, "item": "chore-1", "due_datetime": new_due.isoformat()},
            blocking=True,
        )
        await hass.async_block_till_done()

    updated = runtime.store.get_chore("chore-1")
    assert updated is not None
    assert updated.skipped_until == new_due
    assert updated.compute_next_due(FROZEN_NOW) == new_due


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_due_moves_existing_skip(hass, config_entry):
    """A due edit replaces an existing skip — 'skipped until next week, actually tomorrow'."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    chore = IntervalChore(
        uid="chore-1",
        chore_name="Test Chore",
        chore_type=ChoreType.INTERVAL,
        freq="daily",
        interval=7,
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW - timedelta(days=7),
        skipped_until=FROZEN_NOW + timedelta(days=7),
    )
    await runtime.store.async_create_chore(chore)
    await _refresh_at(hass, config_entry, FROZEN_NOW)

    new_due = FROZEN_NOW + timedelta(days=1)
    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            "todo",
            "update_item",
            {"entity_id": entity_id, "item": "chore-1", "due_datetime": new_due.isoformat()},
            blocking=True,
        )
        await hass.async_block_till_done()

    updated = runtime.store.get_chore("chore-1")
    assert updated is not None
    assert updated.skipped_until == new_due


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_due_cleared_releases_skip(hass, config_entry):
    """An explicit null due releases an active skip — the 'undo skip' path."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    natural_due = FROZEN_NOW + timedelta(hours=1)
    chore = IntervalChore(
        uid="chore-1",
        chore_name="Test Chore",
        chore_type=ChoreType.INTERVAL,
        freq="daily",
        interval=7,
        grace_period=timedelta(hours=1),
        last_completed=natural_due - timedelta(days=7),
        skipped_until=FROZEN_NOW + timedelta(days=7),
    )
    await runtime.store.async_create_chore(chore)
    await _refresh_at(hass, config_entry, FROZEN_NOW)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            "todo",
            "update_item",
            {"entity_id": entity_id, "item": "chore-1", "due_datetime": None},
            blocking=True,
        )
        await hass.async_block_till_done()

    updated = runtime.store.get_chore("chore-1")
    assert updated is not None
    assert updated.skipped_until is None
    # Natural cadence resumes.
    assert updated.compute_next_due(FROZEN_NOW) == natural_due


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_due_cleared_without_skip_raises(hass, config_entry):
    """Clearing the due of a recurring chore with no active skip is rejected.

    The due derives from the schedule; silently accepting the clear would
    just snap back in the UI. The error points at the schedule-editing path.
    """
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    chore = IntervalChore(
        uid="chore-1",
        chore_name="Test Chore",
        chore_type=ChoreType.INTERVAL,
        freq="daily",
        interval=7,
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW - timedelta(days=7),
    )
    await runtime.store.async_create_chore(chore)
    await _refresh_at(hass, config_entry, FROZEN_NOW)

    with (
        patch("homeassistant.util.dt.now", return_value=FROZEN_NOW),
        pytest.raises(ServiceValidationError, match="takes its due from its schedule"),
    ):
        await hass.services.async_call(
            "todo",
            "update_item",
            {"entity_id": entity_id, "item": "chore-1", "due_datetime": None},
            blocking=True,
        )


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_due_on_terminal_recurring_raises(hass, config_entry):
    """A due edit on an exhausted (terminal) recurring series is rejected."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    chore = IntervalChore(
        uid="chore-1",
        chore_name="Test Chore",
        chore_type=ChoreType.INTERVAL,
        freq="daily",
        interval=7,
        count=1,
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW - timedelta(days=1),
        completion_count=1,
        terminal=True,
        persist=True,
    )
    await runtime.store.async_create_chore(chore)
    await _refresh_at(hass, config_entry, FROZEN_NOW)

    with (
        patch("homeassistant.util.dt.now", return_value=FROZEN_NOW),
        pytest.raises(ServiceValidationError, match="series .* has ended"),
    ):
        await hass.services.async_call(
            "todo",
            "update_item",
            {
                "entity_id": entity_id,
                "item": "chore-1",
                "due_datetime": (FROZEN_NOW + timedelta(days=1)).isoformat(),
            },
            blocking=True,
        )


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_due_on_dormant_recurring_defers_next_cycle(hass, config_entry):
    """Setting a due on a cycle-completed (dormant) chore defers its next cycle."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    chore = IntervalChore(
        uid="chore-1",
        chore_name="Test Chore",
        chore_type=ChoreType.INTERVAL,
        freq="daily",
        interval=7,
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW - timedelta(hours=1),  # COMPLETED
    )
    await runtime.store.async_create_chore(chore)
    await _refresh_at(hass, config_entry, FROZEN_NOW)

    new_due = FROZEN_NOW + timedelta(days=10)
    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            "todo",
            "update_item",
            {"entity_id": entity_id, "item": "chore-1", "due_datetime": new_due.isoformat()},
            blocking=True,
        )
        await hass.async_block_till_done()

    updated = runtime.store.get_chore("chore-1")
    assert updated is not None
    assert updated.skipped_until == new_due
    # Still completed for the current cycle; the override moves the next one.
    assert updated.last_completed == FROZEN_NOW - timedelta(hours=1)


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_update_complete_with_due_keeps_override(hass, config_entry):
    """Completing and setting a due in one payload records both.

    The card's edit dialog submits the whole form, so a user can tick the
    checkbox and move the due together — the completion must not clear the
    just-set override.
    """
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    chore = IntervalChore(
        uid="chore-1",
        chore_name="Test Chore",
        chore_type=ChoreType.INTERVAL,
        freq="daily",
        interval=7,
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW - timedelta(days=7),  # DUE at FROZEN_NOW
    )
    await runtime.store.async_create_chore(chore)
    await _refresh_at(hass, config_entry, FROZEN_NOW)

    new_due = FROZEN_NOW + timedelta(days=10)
    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            "todo",
            "update_item",
            {
                "entity_id": entity_id,
                "item": "chore-1",
                "status": "completed",
                "due_datetime": new_due.isoformat(),
            },
            blocking=True,
        )
        await hass.async_block_till_done()

    updated = runtime.store.get_chore("chore-1")
    assert updated is not None
    assert updated.last_completed == FROZEN_NOW
    assert updated.skipped_until == new_due


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
        freq="daily",
        interval=7,
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
        freq="daily",
        interval=7,
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
        freq="daily",
        interval=1,
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
