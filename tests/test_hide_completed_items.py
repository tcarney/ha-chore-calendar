"""Tests for hide_completed_items and the persist=false oneshot deletion sweep.

Covers the chore_calendar.hide_completed_items service, the
todo.remove_completed_items / todo.remove_item entity actions, and the
visibility filter in calendar / todo / get_items.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.chore_calendar.const import CONF_LIST_NAME, DOMAIN, EVENT_ITEM_DELETED, ChoreType
from custom_components.chore_calendar.models import IntervalChore, OneshotChore
from homeassistant.components.todo import TodoItemStatus
from homeassistant.config_entries import ConfigEntryState
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.entity_platform import async_get_platforms

TZ = timezone(timedelta(hours=-5))
FROZEN_NOW = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)


@pytest.fixture
def config_entry() -> MockConfigEntry:
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
    for platform in async_get_platforms(hass, DOMAIN):
        for entity in platform.entities.values():
            if entity.entity_id == entity_id:
                return entity
    return None


async def _refresh(hass, entry, frozen):
    with patch("homeassistant.util.dt.now", return_value=frozen):
        await entry.runtime_data.coordinator.async_refresh()
        await hass.async_block_till_done()


# ---------------------------------------------------------------------------
# hide_completed_items service
# ---------------------------------------------------------------------------


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_hide_completed_items_default_sets_cutoff_to_now(hass, config_entry):
    """No args: cutoff is set to now."""
    calendar_id, _ = await _setup(hass, config_entry)
    store = config_entry.runtime_data.store
    assert store.completed_cleared_at is None

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            DOMAIN,
            "hide_completed_items",
            {"entity_id": calendar_id},
            blocking=True,
        )

    assert store.completed_cleared_at == FROZEN_NOW


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_hide_completed_items_at_specific_datetime(hass, config_entry):
    """`before` sets the cutoff to the given datetime."""
    calendar_id, _ = await _setup(hass, config_entry)
    explicit_cutoff = datetime(2026, 3, 1, 10, 0, tzinfo=TZ)

    await hass.services.async_call(
        DOMAIN,
        "hide_completed_items",
        {"entity_id": calendar_id, "before": explicit_cutoff.isoformat()},
        blocking=True,
    )

    assert config_entry.runtime_data.store.completed_cleared_at == explicit_cutoff


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_hide_completed_items_keep_for_offsets_now(hass, config_entry):
    """`keep_for: 24h` sets the cutoff to now - 24 hours."""
    calendar_id, _ = await _setup(hass, config_entry)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            DOMAIN,
            "hide_completed_items",
            {"entity_id": calendar_id, "keep_for": {"hours": 24}},
            blocking=True,
        )

    expected = FROZEN_NOW - timedelta(hours=24)
    assert config_entry.runtime_data.store.completed_cleared_at == expected


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_hide_completed_items_at_and_keep_for_mutually_exclusive(hass, config_entry):
    """Specifying both `before` and `keep_for` raises ServiceValidationError."""
    calendar_id, _ = await _setup(hass, config_entry)

    with pytest.raises(ServiceValidationError, match="Cannot specify both"):
        await hass.services.async_call(
            DOMAIN,
            "hide_completed_items",
            {
                "entity_id": calendar_id,
                "before": "2026-03-01T10:00:00-05:00",
                "keep_for": {"hours": 24},
            },
            blocking=True,
        )


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_hide_completed_items_naive_at_coerced_to_local(hass, config_entry):
    """`before` without a tz suffix is coerced to local tz so storage stays tz-aware."""
    calendar_id, _ = await _setup(hass, config_entry)

    await hass.services.async_call(
        DOMAIN,
        "hide_completed_items",
        {"entity_id": calendar_id, "before": "2026-04-15T10:00:00"},
        blocking=True,
    )

    cleared_at = config_entry.runtime_data.store.completed_cleared_at
    assert cleared_at is not None
    assert cleared_at.tzinfo is not None


# ---------------------------------------------------------------------------
# persist=false sweep
# ---------------------------------------------------------------------------


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_sweep_deletes_persist_false_completed_oneshot(hass, config_entry):
    """A terminal-completed oneshot with persist=False is deleted by the sweep."""
    calendar_id, _ = await _setup(hass, config_entry)
    store = config_entry.runtime_data.store

    chore = OneshotChore(
        uid="oneshot-1",
        chore_name="File Taxes",
        chore_type=ChoreType.ONESHOT,
        due_datetime=FROZEN_NOW - timedelta(hours=2),
        last_completed=FROZEN_NOW - timedelta(hours=1),
        persist=False,
    )
    await store.async_create_chore(chore)
    await _refresh(hass, config_entry, FROZEN_NOW)

    events: list = []
    hass.bus.async_listen(EVENT_ITEM_DELETED, events.append)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            DOMAIN,
            "hide_completed_items",
            {"entity_id": calendar_id},
            blocking=True,
        )

    assert store.get_chore("oneshot-1") is None
    assert len(events) == 1
    assert events[0].data["uid"] == "oneshot-1"
    assert events[0].data["chore_type"] == "oneshot"
    assert events[0].data["entity_id"] == calendar_id


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_sweep_keeps_persist_true_completed_oneshot(hass, config_entry):
    """A terminal-completed oneshot with persist=True is hidden but kept in storage."""
    calendar_id, _ = await _setup(hass, config_entry)
    store = config_entry.runtime_data.store

    chore = OneshotChore(
        uid="oneshot-keep",
        chore_name="Renew Passport",
        chore_type=ChoreType.ONESHOT,
        due_datetime=FROZEN_NOW - timedelta(hours=2),
        last_completed=FROZEN_NOW - timedelta(hours=1),
        persist=True,
    )
    await store.async_create_chore(chore)
    await _refresh(hass, config_entry, FROZEN_NOW)

    events: list = []
    hass.bus.async_listen(EVENT_ITEM_DELETED, events.append)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            DOMAIN,
            "hide_completed_items",
            {"entity_id": calendar_id},
            blocking=True,
        )

    assert store.get_chore("oneshot-keep") is not None
    assert events == []


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_sweep_keeps_recurring_chore(hass, config_entry):
    """Recurring chores are always kept regardless of persist (which is N/A)."""
    calendar_id, _ = await _setup(hass, config_entry)
    store = config_entry.runtime_data.store

    chore = IntervalChore(
        uid="interval-1",
        chore_name="Water Plants",
        chore_type=ChoreType.INTERVAL,
        freq="daily",
        interval=7,
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW - timedelta(hours=1),
    )
    await store.async_create_chore(chore)
    await _refresh(hass, config_entry, FROZEN_NOW)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            DOMAIN,
            "hide_completed_items",
            {"entity_id": calendar_id},
            blocking=True,
        )

    assert store.get_chore("interval-1") is not None


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_sweep_does_not_delete_active_persist_false_oneshot(hass, config_entry):
    """A persist=false oneshot that is not terminal-completed is kept by the sweep."""
    calendar_id, _ = await _setup(hass, config_entry)
    store = config_entry.runtime_data.store

    # Active oneshot (due in the future) — never been completed.
    chore = OneshotChore(
        uid="active-1",
        chore_name="File Taxes",
        chore_type=ChoreType.ONESHOT,
        due_datetime=FROZEN_NOW + timedelta(days=30),
        persist=False,
    )
    await store.async_create_chore(chore)
    await _refresh(hass, config_entry, FROZEN_NOW)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        await hass.services.async_call(
            DOMAIN,
            "hide_completed_items",
            {"entity_id": calendar_id},
            blocking=True,
        )

    assert store.get_chore("active-1") is not None


# ---------------------------------------------------------------------------
# Visibility filter (calendar + todo)
# ---------------------------------------------------------------------------


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_calendar_hides_pre_cutoff_completed_event(hass, config_entry):
    """Calendar's completed event is suppressed when last_completed < cleared_at."""
    calendar_id, _ = await _setup(hass, config_entry)
    store = config_entry.runtime_data.store

    # Recurring chore completed yesterday.
    chore = IntervalChore(
        uid="recurring",
        chore_name="Water Plants",
        chore_type=ChoreType.INTERVAL,
        freq="daily",
        interval=7,
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW - timedelta(days=1),
    )
    await store.async_create_chore(chore)
    # Cutoff at now → yesterday's completion precedes it.
    await store.async_set_completed_cleared_at(FROZEN_NOW)
    await _refresh(hass, config_entry, FROZEN_NOW)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        entity = _get_entity(hass, calendar_id)
        events = await entity.async_get_events(
            hass,
            FROZEN_NOW - timedelta(days=30),
            FROZEN_NOW + timedelta(days=30),
        )

    completed_events = [e for e in events if e.summary.startswith("✓")]
    assert completed_events == []


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_todo_hides_pre_cutoff_completed_item(hass, config_entry):
    """Todo entity skips completed items where last_completed < cleared_at."""
    _, todo_id = await _setup(hass, config_entry)
    store = config_entry.runtime_data.store

    chore = IntervalChore(
        uid="recurring",
        chore_name="Water Plants",
        chore_type=ChoreType.INTERVAL,
        freq="daily",
        interval=7,
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW - timedelta(days=1),
    )
    await store.async_create_chore(chore)
    await store.async_set_completed_cleared_at(FROZEN_NOW)
    await _refresh(hass, config_entry, FROZEN_NOW)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        entity = _get_entity(hass, todo_id)
        items = entity.todo_items

    completed_items = [i for i in (items or []) if i.status == TodoItemStatus.COMPLETED]
    assert completed_items == []


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_post_cutoff_completion_reappears(hass, config_entry):
    """A completion *after* the cutoff reappears in calendar / todo views."""
    calendar_id, todo_id = await _setup(hass, config_entry)
    store = config_entry.runtime_data.store

    chore = IntervalChore(
        uid="recurring",
        chore_name="Water Plants",
        chore_type=ChoreType.INTERVAL,
        freq="daily",
        interval=7,
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW + timedelta(minutes=5),  # post-cutoff
    )
    await store.async_create_chore(chore)
    await store.async_set_completed_cleared_at(FROZEN_NOW)

    later = FROZEN_NOW + timedelta(minutes=30)
    await _refresh(hass, config_entry, later)

    with patch("homeassistant.util.dt.now", return_value=later):
        cal_entity = _get_entity(hass, calendar_id)
        events = await cal_entity.async_get_events(
            hass,
            FROZEN_NOW - timedelta(days=30),
            later + timedelta(days=30),
        )
        todo_entity = _get_entity(hass, todo_id)
        todo_items = todo_entity.todo_items

    completed_calendar = [e for e in events if e.summary.startswith("✓")]
    completed_todo = [i for i in (todo_items or []) if i.status == TodoItemStatus.COMPLETED]
    assert len(completed_calendar) == 1
    assert len(completed_todo) == 1


# ---------------------------------------------------------------------------
# Todo entity DELETE_TODO_ITEM handlers
# ---------------------------------------------------------------------------


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_todo_entity_does_not_advertise_delete(hass, config_entry):
    """DELETE_TODO_ITEM is intentionally not advertised — mutation lives on
    chore_calendar services. Hides todo.remove_item / todo.remove_completed_items
    from HA's UI to avoid the "permanently deleted" warning being misleading
    for recurring chores whose last_completed is load-bearing.
    """
    from homeassistant.components.todo.const import TodoListEntityFeature  # noqa: PLC0415

    _, todo_id = await _setup(hass, config_entry)
    state = hass.states.get(todo_id)
    assert state is not None
    features = state.attributes["supported_features"]
    assert not (features & TodoListEntityFeature.DELETE_TODO_ITEM)


# ---------------------------------------------------------------------------
# get_items response
# ---------------------------------------------------------------------------


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_get_items_surfaces_completed_cleared_at(hass, config_entry):
    """get_items response includes the per-list completed_cleared_at."""
    calendar_id, _ = await _setup(hass, config_entry)
    store = config_entry.runtime_data.store

    explicit_cutoff = datetime(2026, 3, 1, 10, 0, tzinfo=TZ)
    await store.async_set_completed_cleared_at(explicit_cutoff)

    response = await hass.services.async_call(
        DOMAIN,
        "get_items",
        {"entity_id": calendar_id},
        blocking=True,
        return_response=True,
    )

    assert response is not None
    assert response["completed_cleared_at"] == explicit_cutoff.isoformat()


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_get_items_does_not_filter_by_cutoff(hass, config_entry):
    """get_items remains the raw API — chores aren't filtered by cleared_at."""
    calendar_id, _ = await _setup(hass, config_entry)
    store = config_entry.runtime_data.store

    chore = IntervalChore(
        uid="recurring",
        chore_name="Water Plants",
        chore_type=ChoreType.INTERVAL,
        freq="daily",
        interval=7,
        grace_period=timedelta(hours=1),
        last_completed=FROZEN_NOW - timedelta(days=1),
    )
    await store.async_create_chore(chore)
    await store.async_set_completed_cleared_at(FROZEN_NOW)
    await _refresh(hass, config_entry, FROZEN_NOW)

    with patch("homeassistant.util.dt.now", return_value=FROZEN_NOW):
        response = await hass.services.async_call(
            DOMAIN,
            "get_items",
            {"entity_id": calendar_id},
            blocking=True,
            return_response=True,
        )

    assert response is not None
    items = response["items"]
    # Even though last_completed < cleared_at, the chore is still returned.
    assert any(i["uid"] == "recurring" for i in items)


# ---------------------------------------------------------------------------
# Storage round-trip for completed_cleared_at
# ---------------------------------------------------------------------------


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_completed_cleared_at_persists_across_reload(hass, config_entry):
    """completed_cleared_at survives store reload."""
    calendar_id, _ = await _setup(hass, config_entry)
    store = config_entry.runtime_data.store

    cutoff = datetime(2026, 3, 1, 10, 0, tzinfo=TZ)
    await store.async_set_completed_cleared_at(cutoff)

    # Re-load by reading raw storage and instantiating a new ChoreStore.
    from custom_components.chore_calendar.store import ChoreStore  # noqa: PLC0415

    fresh = ChoreStore(hass, config_entry.entry_id)
    await fresh.async_load()
    assert fresh.completed_cleared_at == cutoff
    # Silence unused-var warning by referencing entity_id.
    assert calendar_id is not None
