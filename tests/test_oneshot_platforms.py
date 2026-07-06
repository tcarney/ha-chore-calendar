"""Verify the calendar and todo platforms render oneshots correctly.

These tests assert that the existing platforms — calendar.py and todo.py —
handle OneshotChore via the chore-type-agnostic methods (compute_status,
compute_next_due, compute_due_range) without any oneshot-specific code paths.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.chore_calendar.const import CONF_LIST_NAME, DOMAIN, ChoreStatus, ChoreType
from custom_components.chore_calendar.models import OneshotChore
from homeassistant.components.todo import TodoItemStatus
from homeassistant.config_entries import ConfigEntryState
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.entity_platform import async_get_platforms

TZ = timezone(timedelta(hours=-5))
FROZEN_NOW = datetime(2026, 4, 15, 10, 0, tzinfo=TZ)


@pytest.fixture
def config_entry() -> MockConfigEntry:
    """Return a mock config entry."""
    return MockConfigEntry(
        domain=DOMAIN,
        title="Daily Chores",
        data={CONF_LIST_NAME: "Daily Chores"},
        unique_id="daily chores",
    )


async def _setup(hass, entry: MockConfigEntry) -> tuple[str, str]:
    """Set up the integration; return (calendar_entity_id, todo_entity_id)."""
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.LOADED

    registry = er.async_get(hass)
    calendar_id = registry.async_get_entity_id("calendar", DOMAIN, entry.entry_id)
    todo_id = registry.async_get_entity_id("todo", DOMAIN, f"{entry.entry_id}_todo")
    assert calendar_id is not None
    assert todo_id is not None
    return calendar_id, todo_id


def _get_entity(hass, entity_id: str):
    """Fetch the platform entity by entity_id."""
    for platform in async_get_platforms(hass, DOMAIN):
        for entity in platform.entities.values():
            if entity.entity_id == entity_id:
                return entity
    return None


async def _refresh(hass, entry, frozen):
    """Refresh the coordinator with dt_util.now() pinned."""
    with patch("homeassistant.util.dt.now", return_value=frozen):
        await entry.runtime_data.coordinator.async_refresh()
        await hass.async_block_till_done()


# ---------------------------------------------------------------------------
# Calendar
# ---------------------------------------------------------------------------


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_calendar_emits_due_event_for_active_oneshot(hass, config_entry):
    """An active oneshot emits a zero-duration due event at due_datetime."""
    calendar_id, _ = await _setup(hass, config_entry)
    due = FROZEN_NOW + timedelta(hours=4)  # outside early window, future-due
    chore = OneshotChore(
        uid="active",
        chore_name="File Taxes",
        chore_type=ChoreType.ONESHOT,
        due_datetime=due,
    )
    await config_entry.runtime_data.store.async_create_chore(chore)
    await _refresh(hass, config_entry, FROZEN_NOW)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        entity = _get_entity(hass, calendar_id)
        events = await entity.async_get_events(
            hass,
            FROZEN_NOW - timedelta(days=30),
            FROZEN_NOW + timedelta(days=30),
        )

    due_events = [e for e in events if e.summary == "File Taxes"]
    assert len(due_events) == 1
    assert due_events[0].start == due
    # Zero-duration marker per the post-f933a24 calendar convention.
    assert due_events[0].end == due


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_calendar_no_due_event_for_unscheduled_oneshot(hass, config_entry):
    """An unscheduled oneshot (due_datetime=None) emits no calendar event."""
    calendar_id, _ = await _setup(hass, config_entry)
    chore = OneshotChore(
        uid="unscheduled",
        chore_name="Buy Milk",
        chore_type=ChoreType.ONESHOT,
        due_datetime=None,
    )
    await config_entry.runtime_data.store.async_create_chore(chore)
    await _refresh(hass, config_entry, FROZEN_NOW)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        entity = _get_entity(hass, calendar_id)
        events = await entity.async_get_events(
            hass,
            FROZEN_NOW - timedelta(days=30),
            FROZEN_NOW + timedelta(days=30),
        )

    assert events == []


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_calendar_completed_oneshot_emits_check_marker(hass, config_entry):
    """A completed oneshot emits a ✓ marker at last_completed and no future due."""
    calendar_id, _ = await _setup(hass, config_entry)
    due = FROZEN_NOW - timedelta(hours=2)
    completed = FROZEN_NOW - timedelta(hours=1)
    chore = OneshotChore(
        uid="completed",
        chore_name="File Taxes",
        chore_type=ChoreType.ONESHOT,
        due_datetime=due,
        last_completed=completed,
    )
    await config_entry.runtime_data.store.async_create_chore(chore)
    await _refresh(hass, config_entry, FROZEN_NOW)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        entity = _get_entity(hass, calendar_id)
        events = await entity.async_get_events(
            hass,
            FROZEN_NOW - timedelta(days=30),
            FROZEN_NOW + timedelta(days=30),
        )

    # Exactly one ✓ marker, no separate "future due" event.
    assert len(events) == 1
    assert events[0].summary.startswith("✓")
    assert events[0].start == completed


# ---------------------------------------------------------------------------
# Todo
# ---------------------------------------------------------------------------


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_todo_active_oneshot_renders_needs_action(hass, config_entry):
    """An active (DUE) oneshot appears as needs_action with TodoItem.due set."""
    _, todo_id = await _setup(hass, config_entry)
    due = FROZEN_NOW  # exactly at due → DUE
    chore = OneshotChore(
        uid="active",
        chore_name="File Taxes",
        chore_type=ChoreType.ONESHOT,
        due_datetime=due,
    )
    await config_entry.runtime_data.store.async_create_chore(chore)
    await _refresh(hass, config_entry, FROZEN_NOW)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        entity = _get_entity(hass, todo_id)
        items = entity.todo_items

    assert items is not None
    assert len(items) == 1
    assert items[0].uid == "active"
    assert items[0].status == TodoItemStatus.NEEDS_ACTION
    assert items[0].due == due
    assert items[0].completed is None


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_todo_unscheduled_oneshot_renders_needs_action_no_due(hass, config_entry):
    """An unscheduled oneshot appears in the todo list with TodoItem.due = None."""
    _, todo_id = await _setup(hass, config_entry)
    chore = OneshotChore(
        uid="unscheduled",
        chore_name="Buy Milk",
        chore_type=ChoreType.ONESHOT,
        due_datetime=None,
    )
    await config_entry.runtime_data.store.async_create_chore(chore)
    await _refresh(hass, config_entry, FROZEN_NOW)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        entity = _get_entity(hass, todo_id)
        items = entity.todo_items

    assert items is not None
    assert len(items) == 1
    assert items[0].uid == "unscheduled"
    assert items[0].status == TodoItemStatus.NEEDS_ACTION
    assert items[0].due is None


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_todo_completed_oneshot_renders_completed(hass, config_entry):
    """A completed oneshot appears as TodoItemStatus.COMPLETED with completed timestamp."""
    _, todo_id = await _setup(hass, config_entry)
    due = FROZEN_NOW - timedelta(hours=2)
    completed = FROZEN_NOW - timedelta(hours=1)
    chore = OneshotChore(
        uid="completed",
        chore_name="File Taxes",
        chore_type=ChoreType.ONESHOT,
        due_datetime=due,
        last_completed=completed,
    )
    await config_entry.runtime_data.store.async_create_chore(chore)
    await _refresh(hass, config_entry, FROZEN_NOW)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        entity = _get_entity(hass, todo_id)
        items = entity.todo_items

    assert items is not None
    assert len(items) == 1
    assert items[0].uid == "completed"
    assert items[0].status == TodoItemStatus.COMPLETED
    assert items[0].completed == completed
    assert items[0].due is None  # completed items don't carry the past due


# ---------------------------------------------------------------------------
# Todo platform — due edits (oneshot writes due_datetime directly)
# ---------------------------------------------------------------------------


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_todo_due_edit_writes_oneshot_due_datetime(hass, config_entry):
    """A due edit on a oneshot rewrites due_datetime — the occurrence is the series.

    Both directions work (no skip-override involved), and any stale
    skipped_until is released so it cannot shadow the new anchor.
    """
    _, todo_id = await _setup(hass, config_entry)
    chore = OneshotChore(
        uid="oneshot",
        chore_name="File Taxes",
        chore_type=ChoreType.ONESHOT,
        due_datetime=FROZEN_NOW + timedelta(days=5),
        skipped_until=FROZEN_NOW + timedelta(days=9),
    )
    await config_entry.runtime_data.store.async_create_chore(chore)
    await _refresh(hass, config_entry, FROZEN_NOW)

    new_due = FROZEN_NOW + timedelta(days=1)  # earlier than both anchors
    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            "todo",
            "update_item",
            {"entity_id": todo_id, "item": "oneshot", "due_datetime": new_due.isoformat()},
            blocking=True,
        )
        await hass.async_block_till_done()

    updated = config_entry.runtime_data.store.get_chore("oneshot")
    assert isinstance(updated, OneshotChore)
    assert updated.due_datetime == new_due
    assert updated.skipped_until is None
    assert updated.compute_next_due(FROZEN_NOW) == new_due


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_todo_due_cleared_unschedules_oneshot(hass, config_entry):
    """An explicit null due makes the oneshot unscheduled (still actionable)."""
    _, todo_id = await _setup(hass, config_entry)
    chore = OneshotChore(
        uid="oneshot",
        chore_name="Buy Milk",
        chore_type=ChoreType.ONESHOT,
        due_datetime=FROZEN_NOW + timedelta(days=2),
    )
    await config_entry.runtime_data.store.async_create_chore(chore)
    await _refresh(hass, config_entry, FROZEN_NOW)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            "todo",
            "update_item",
            {"entity_id": todo_id, "item": "oneshot", "due_datetime": None},
            blocking=True,
        )
        await hass.async_block_till_done()

    updated = config_entry.runtime_data.store.get_chore("oneshot")
    assert isinstance(updated, OneshotChore)
    assert updated.due_datetime is None
    assert updated.compute_status(FROZEN_NOW) == ChoreStatus.PENDING


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_todo_due_edit_reopens_terminal_oneshot(hass, config_entry):
    """Setting a due on a completed (terminal) oneshot reopens it.

    Mirrors the chore_calendar.update_item reschedule semantics: the
    terminal flag clears and the chore re-enters the cycle at the new due.
    (Until the new pending window opens it reads as dormant-COMPLETED,
    like any rescheduled chore with a prior completion.)
    """
    _, todo_id = await _setup(hass, config_entry)
    chore = OneshotChore(
        uid="oneshot",
        chore_name="File Taxes",
        chore_type=ChoreType.ONESHOT,
        due_datetime=FROZEN_NOW - timedelta(days=1),
        last_completed=FROZEN_NOW - timedelta(days=1),
        terminal=True,
    )
    await config_entry.runtime_data.store.async_create_chore(chore)
    await _refresh(hass, config_entry, FROZEN_NOW)

    new_due = FROZEN_NOW + timedelta(days=30)
    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            "todo",
            "update_item",
            {"entity_id": todo_id, "item": "oneshot", "due_datetime": new_due.isoformat()},
            blocking=True,
        )
        await hass.async_block_till_done()

    updated = config_entry.runtime_data.store.get_chore("oneshot")
    assert isinstance(updated, OneshotChore)
    assert updated.due_datetime == new_due
    assert updated.terminal is False
    assert updated.compute_next_due(FROZEN_NOW + timedelta(days=29)) == new_due
