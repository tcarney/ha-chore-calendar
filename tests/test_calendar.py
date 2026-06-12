"""Tests for the Chore Calendar calendar platform."""

from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from unittest.mock import patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.chore_calendar.const import CONF_LIST_NAME, DOMAIN, ChoreType
from custom_components.chore_calendar.models import IntervalChore, ScheduledChore
from homeassistant.config_entries import ConfigEntryState
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.entity_platform import async_get_platforms

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


def _get_calendar_entity(hass, entity_id: str):
    """Get the calendar entity object by entity_id."""
    for platform in async_get_platforms(hass, DOMAIN):
        for entity in platform.entities.values():
            if entity.entity_id == entity_id:
                return entity
    return None


async def _setup_entry(hass, entry: MockConfigEntry) -> str:
    """Set up the integration and return the calendar entity_id."""
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.LOADED

    registry = er.async_get(hass)
    entity_id = registry.async_get_entity_id("calendar", DOMAIN, entry.entry_id)
    assert entity_id is not None
    return entity_id


# ---------------------------------------------------------------------------
# Entity creation (from Phase 1)
# ---------------------------------------------------------------------------


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_calendar_entity_created(hass, config_entry):
    """A calendar entity is created when the config entry is set up."""
    entity_id = await _setup_entry(hass, config_entry)
    assert entity_id is not None


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_calendar_entity_state_off_no_chores(hass, config_entry):
    """Calendar entity state is 'off' with no chores."""
    entity_id = await _setup_entry(hass, config_entry)
    state = hass.states.get(entity_id)
    assert state is not None
    assert state.state == "off"


# ---------------------------------------------------------------------------
# event property — next upcoming event
# ---------------------------------------------------------------------------


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_event_property_returns_soonest_due(hass, config_entry):
    """The event property returns the soonest due chore event, and state is
    ``on`` while any chore is due or overdue."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    # Create two scheduled chores: one at 08:00, one at 10:00.
    chore_early = ScheduledChore(
        uid="early",
        chore_name="Early Chore",
        chore_type=ChoreType.SCHEDULED,
        time=time(8, 0),
        pending_period=timedelta(hours=3),
        grace_period=timedelta(hours=1),
    )
    chore_late = ScheduledChore(
        uid="late",
        chore_name="Late Chore",
        chore_type=ChoreType.SCHEDULED,
        time=time(10, 0),
        pending_period=timedelta(hours=3),
        grace_period=timedelta(hours=1),
    )
    await runtime.store.async_create_chore(chore_early)
    await runtime.store.async_create_chore(chore_late)

    # Freeze at 08:30 — early chore is DUE (08:00 period, 1h grace).
    frozen = datetime(2026, 3, 30, 8, 30, tzinfo=TZ)
    with patch("homeassistant.util.dt.now", return_value=frozen):
        await runtime.coordinator.async_refresh()
        await hass.async_block_till_done()
        state = hass.states.get(entity_id)

    assert state is not None
    assert state.state == "on"
    assert state.attributes.get("message") == "Early Chore"


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_event_property_shows_next_due_when_completed(hass, config_entry):
    """A completed chore still produces an event for the next due period."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    frozen = datetime(2026, 3, 30, 7, 0, tzinfo=TZ)
    chore = ScheduledChore(
        uid="done",
        chore_name="Done Chore",
        chore_type=ChoreType.SCHEDULED,
        time=time(8, 0),
        pending_period=timedelta(hours=3),
        grace_period=timedelta(hours=1),
        last_completed=frozen,  # Completed in this period.
    )
    await runtime.store.async_create_chore(chore)

    with patch("homeassistant.util.dt.now", return_value=frozen):
        await runtime.coordinator.async_refresh()
        await hass.async_block_till_done()
        state = hass.states.get(entity_id)

    assert state is not None
    # State is "off" because now (07:00 Mar 30) is not within the next
    # event's window (08:00–09:00 Mar 31), but the event IS present.
    assert state.state == "off"
    assert state.attributes.get("message") == "Done Chore"


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_event_property_skips_interval_no_anchor(hass, config_entry):
    """Never-completed interval chore is unscheduled — no event, state ``off``.

    ``compute_due_range`` returns ``None`` for a never-completed interval
    chore (no anchor until first completion), so ``_make_due_event``
    produces no event. The chore reads as PENDING, so the state override
    leaves the entity ``off``.
    """
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    chore = IntervalChore(
        uid="no_anchor",
        chore_name="No Anchor",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=3),
        grace_period=timedelta(days=1),
    )
    await runtime.store.async_create_chore(chore)

    frozen = datetime(2026, 3, 30, 12, 0, tzinfo=TZ)
    with patch("homeassistant.util.dt.now", return_value=frozen):
        await runtime.coordinator.async_refresh()
        await hass.async_block_till_done()
        state = hass.states.get(entity_id)

    assert state is not None
    assert state.state == "off"
    assert state.attributes.get("message") is None


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_event_property_interval_with_created_at(hass, config_entry):
    """Never-completed interval chore ignores created_at — still unscheduled, no event."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    created = datetime(2026, 3, 27, 12, 0, tzinfo=TZ)
    chore = IntervalChore(
        uid="with_created",
        chore_name="With Created",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(days=3),
        grace_period=timedelta(days=1),
        created_at=created,
    )
    await runtime.store.async_create_chore(chore)

    frozen = datetime(2026, 3, 27, 18, 0, tzinfo=TZ)
    with patch("homeassistant.util.dt.now", return_value=frozen):
        await runtime.coordinator.async_refresh()
        await hass.async_block_till_done()
        state = hass.states.get(entity_id)

    # No anchor until first completion → no event, state ``off``.
    assert state.state == "off"
    assert state.attributes.get("message") is None


# ---------------------------------------------------------------------------
# async_get_events — calendar card population
# ---------------------------------------------------------------------------


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_get_events_returns_due_event(hass, config_entry):
    """async_get_events returns a due event within the query range."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    chore = ScheduledChore(
        uid="med",
        chore_name="Medicine",
        chore_type=ChoreType.SCHEDULED,
        time=time(8, 0),
        pending_period=timedelta(hours=3),
        grace_period=timedelta(hours=1),
    )
    await runtime.store.async_create_chore(chore)

    frozen = datetime(2026, 3, 30, 7, 0, tzinfo=TZ)
    with patch("homeassistant.util.dt.now", return_value=frozen):
        await runtime.coordinator.async_refresh()
        await hass.async_block_till_done()

        entity = _get_calendar_entity(hass, entity_id)
        start = datetime(2026, 3, 30, 0, 0, tzinfo=TZ)
        end = datetime(2026, 3, 31, 0, 0, tzinfo=TZ)
        events = await entity.async_get_events(hass, start, end)

    assert len(events) == 1
    assert events[0].summary == "Medicine"
    assert events[0].start == datetime(2026, 3, 30, 8, 0, tzinfo=TZ)
    # Due events are zero-duration markers at the due time.
    assert events[0].end == events[0].start
    # Every emitted event carries the chore's uid as the join key.
    assert events[0].uid == "med"


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_get_events_returns_completed_event(hass, config_entry):
    """async_get_events includes a completed event within 24 hours."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    completed_at = datetime(2026, 3, 30, 7, 30, tzinfo=TZ)
    chore = ScheduledChore(
        uid="med",
        chore_name="Medicine",
        chore_type=ChoreType.SCHEDULED,
        time=time(8, 0),
        pending_period=timedelta(hours=3),
        grace_period=timedelta(hours=1),
        last_completed=completed_at,
    )
    await runtime.store.async_create_chore(chore)

    frozen = datetime(2026, 3, 30, 9, 0, tzinfo=TZ)
    with patch("homeassistant.util.dt.now", return_value=frozen):
        await runtime.coordinator.async_refresh()
        await hass.async_block_till_done()

        entity = _get_calendar_entity(hass, entity_id)
        start = datetime(2026, 3, 30, 0, 0, tzinfo=TZ)
        end = datetime(2026, 3, 31, 0, 0, tzinfo=TZ)
        events = await entity.async_get_events(hass, start, end)

    # Completed event present; next-due event (Mar 31) is outside the query range.
    completed_events = [e for e in events if "✓" in e.summary]
    assert len(completed_events) == 1
    assert completed_events[0].summary == "✓ Medicine"
    assert completed_events[0].start == completed_at
    due_events = [e for e in events if "✓" not in e.summary]
    assert len(due_events) == 0


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_get_events_shows_next_due_for_completed_chore(hass, config_entry):
    """A completed chore produces a next-due event in a wider query range."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    completed_at = datetime(2026, 3, 30, 7, 30, tzinfo=TZ)
    chore = ScheduledChore(
        uid="med",
        chore_name="Medicine",
        chore_type=ChoreType.SCHEDULED,
        time=time(8, 0),
        pending_period=timedelta(hours=3),
        grace_period=timedelta(hours=1),
        last_completed=completed_at,
    )
    await runtime.store.async_create_chore(chore)

    frozen = datetime(2026, 3, 30, 9, 0, tzinfo=TZ)
    with patch("homeassistant.util.dt.now", return_value=frozen):
        await runtime.coordinator.async_refresh()
        await hass.async_block_till_done()

        entity = _get_calendar_entity(hass, entity_id)
        # Wide range covering today and tomorrow.
        start = datetime(2026, 3, 30, 0, 0, tzinfo=TZ)
        end = datetime(2026, 4, 1, 0, 0, tzinfo=TZ)
        events = await entity.async_get_events(hass, start, end)

    due_events = [e for e in events if "✓" not in e.summary]
    assert len(due_events) == 1
    # Next due is March 31 at 08:00 (next active day after completed period).
    assert due_events[0].summary == "Medicine"
    assert due_events[0].start == datetime(2026, 3, 31, 8, 0, tzinfo=TZ)
    assert due_events[0].end == due_events[0].start


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_get_events_includes_old_completed(hass, config_entry):
    """Completed events are included regardless of age for history viewing."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    old_completed = datetime(2026, 3, 28, 7, 0, tzinfo=TZ)
    chore = ScheduledChore(
        uid="med",
        chore_name="Medicine",
        chore_type=ChoreType.SCHEDULED,
        time=time(8, 0),
        pending_period=timedelta(hours=3),
        grace_period=timedelta(hours=1),
        last_completed=old_completed,
    )
    await runtime.store.async_create_chore(chore)

    frozen = datetime(2026, 3, 30, 7, 0, tzinfo=TZ)
    with patch("homeassistant.util.dt.now", return_value=frozen):
        await runtime.coordinator.async_refresh()
        await hass.async_block_till_done()

        entity = _get_calendar_entity(hass, entity_id)
        start = datetime(2026, 3, 28, 0, 0, tzinfo=TZ)
        end = datetime(2026, 3, 31, 0, 0, tzinfo=TZ)
        events = await entity.async_get_events(hass, start, end)

    # Completed event is visible even though it's >24h old.
    completed_events = [e for e in events if "✓" in e.summary]
    assert len(completed_events) == 1


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_get_events_filters_by_date_range(hass, config_entry):
    """Events outside the query range are excluded."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    chore = ScheduledChore(
        uid="med",
        chore_name="Medicine",
        chore_type=ChoreType.SCHEDULED,
        time=time(8, 0),
        pending_period=timedelta(hours=3),
        grace_period=timedelta(hours=1),
    )
    await runtime.store.async_create_chore(chore)

    frozen = datetime(2026, 3, 30, 7, 0, tzinfo=TZ)
    with patch("homeassistant.util.dt.now", return_value=frozen):
        await runtime.coordinator.async_refresh()
        await hass.async_block_till_done()

        entity = _get_calendar_entity(hass, entity_id)
        # Query a range that doesn't overlap with the due event (08:00–09:00).
        start = datetime(2026, 3, 30, 10, 0, tzinfo=TZ)
        end = datetime(2026, 3, 30, 12, 0, tzinfo=TZ)
        events = await entity.async_get_events(hass, start, end)

    assert len(events) == 0


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_get_events_empty_when_no_chores(hass, config_entry):
    """async_get_events returns empty list when there are no chores."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    await runtime.coordinator.async_refresh()
    await hass.async_block_till_done()

    entity = _get_calendar_entity(hass, entity_id)
    start = datetime(2026, 3, 30, 0, 0, tzinfo=TZ)
    end = datetime(2026, 3, 31, 0, 0, tzinfo=TZ)
    events = await entity.async_get_events(hass, start, end)

    assert events == []


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_get_events_carries_uid_and_description(hass, config_entry):
    """Due events carry uid and description; completed markers carry uid only."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    completed_at = datetime(2026, 3, 30, 7, 30, tzinfo=TZ)
    chore = ScheduledChore(
        uid="med",
        chore_name="Medicine",
        chore_type=ChoreType.SCHEDULED,
        description="Take with food.",
        time=time(8, 0),
        pending_period=timedelta(hours=3),
        grace_period=timedelta(hours=1),
        last_completed=completed_at,
    )
    await runtime.store.async_create_chore(chore)

    frozen = datetime(2026, 3, 30, 9, 0, tzinfo=TZ)
    with patch("homeassistant.util.dt.now", return_value=frozen):
        await runtime.coordinator.async_refresh()
        await hass.async_block_till_done()

        entity = _get_calendar_entity(hass, entity_id)
        start = datetime(2026, 3, 30, 0, 0, tzinfo=TZ)
        end = datetime(2026, 4, 1, 0, 0, tzinfo=TZ)
        events = await entity.async_get_events(hass, start, end)

    due_events = [e for e in events if "✓" not in e.summary]
    completed_events = [e for e in events if "✓" in e.summary]
    assert len(due_events) == 1
    assert due_events[0].uid == "med"
    assert due_events[0].description == "Take with food."
    assert len(completed_events) == 1
    assert completed_events[0].uid == "med"
    # The completed marker is a synthetic history event — no description.
    assert completed_events[0].description is None


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_get_events_description_none_when_unset(hass, config_entry):
    """A chore without a description emits due events with description=None."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    chore = ScheduledChore(
        uid="med",
        chore_name="Medicine",
        chore_type=ChoreType.SCHEDULED,
        time=time(8, 0),
        pending_period=timedelta(hours=3),
        grace_period=timedelta(hours=1),
    )
    await runtime.store.async_create_chore(chore)

    frozen = datetime(2026, 3, 30, 7, 0, tzinfo=TZ)
    with patch("homeassistant.util.dt.now", return_value=frozen):
        await runtime.coordinator.async_refresh()
        await hass.async_block_till_done()

        entity = _get_calendar_entity(hass, entity_id)
        start = datetime(2026, 3, 30, 0, 0, tzinfo=TZ)
        end = datetime(2026, 3, 31, 0, 0, tzinfo=TZ)
        events = await entity.async_get_events(hass, start, end)

    assert len(events) == 1
    assert events[0].uid == "med"
    assert events[0].description is None


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_get_events_sorted_by_start(hass, config_entry):
    """Events are returned sorted by start time."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data

    chore_late = ScheduledChore(
        uid="late",
        chore_name="Late",
        chore_type=ChoreType.SCHEDULED,
        time=time(10, 0),
        pending_period=timedelta(hours=3),
        grace_period=timedelta(hours=1),
    )
    chore_early = ScheduledChore(
        uid="early",
        chore_name="Early",
        chore_type=ChoreType.SCHEDULED,
        time=time(8, 0),
        pending_period=timedelta(hours=3),
        grace_period=timedelta(hours=1),
    )
    # Add late first, early second — events should still be sorted.
    await runtime.store.async_create_chore(chore_late)
    await runtime.store.async_create_chore(chore_early)

    frozen = datetime(2026, 3, 30, 7, 0, tzinfo=TZ)
    with patch("homeassistant.util.dt.now", return_value=frozen):
        await runtime.coordinator.async_refresh()
        await hass.async_block_till_done()

        entity = _get_calendar_entity(hass, entity_id)
        start = datetime(2026, 3, 30, 0, 0, tzinfo=TZ)
        end = datetime(2026, 3, 31, 0, 0, tzinfo=TZ)
        events = await entity.async_get_events(hass, start, end)

    assert len(events) == 2
    assert events[0].summary == "Early"
    assert events[1].summary == "Late"


# ---------------------------------------------------------------------------
# async_get_events — occurrence expansion (recurrence model §6)
# ---------------------------------------------------------------------------


def _due_events(events):
    """Filter out the synthetic '✓' completion markers."""
    return [e for e in events if not e.summary.startswith("✓")]


async def _events_for(hass, config_entry, chore, frozen, start, end):
    """Create *chore*, freeze time at *frozen*, and query [start, end)."""
    entity_id = await _setup_entry(hass, config_entry)
    runtime = config_entry.runtime_data
    await runtime.store.async_create_chore(chore)
    with patch("homeassistant.util.dt.now", return_value=frozen):
        await runtime.coordinator.async_refresh()
        await hass.async_block_till_done()
        entity = _get_calendar_entity(hass, entity_id)
        return await entity.async_get_events(hass, start, end)


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_get_events_expands_future_occurrences(hass, config_entry):
    """A daily chore expands across the window; every marker carries series fields."""
    chore = ScheduledChore(
        uid="daily",
        chore_name="Daily Chore",
        chore_type=ChoreType.SCHEDULED,
        time=time(8, 0),
        pending_period=timedelta(hours=3),
        grace_period=timedelta(hours=1),
        last_completed=datetime(2026, 3, 30, 8, 30, tzinfo=TZ),
    )
    events = await _events_for(
        hass,
        config_entry,
        chore,
        frozen=datetime(2026, 3, 30, 12, 0, tzinfo=TZ),
        start=datetime(2026, 3, 30, 0, 0, tzinfo=TZ),
        end=datetime(2026, 4, 4, 0, 0, tzinfo=TZ),
    )

    due = _due_events(events)
    assert [e.start for e in due] == [
        datetime(2026, 3, 31, 8, 0, tzinfo=TZ),
        datetime(2026, 4, 1, 8, 0, tzinfo=TZ),
        datetime(2026, 4, 2, 8, 0, tzinfo=TZ),
        datetime(2026, 4, 3, 8, 0, tzinfo=TZ),
    ]
    for event in due:
        assert event.uid == "daily"
        assert event.rrule == "FREQ=DAILY"
    assert due[0].recurrence_id == "20260331T080000"
    assert due[1].recurrence_id == "20260401T080000"
    # The completion marker is a synthetic history event — no series fields.
    completed = [e for e in events if e.summary.startswith("✓")]
    assert len(completed) == 1
    assert completed[0].rrule is None
    assert completed[0].recurrence_id is None


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_get_events_every_other_monday_phase(hass, config_entry):
    """INTERVAL=2 expansion alternates weeks anchored on dtstart."""
    chore = ScheduledChore(
        uid="biweekly",
        chore_name="Recycling",
        chore_type=ChoreType.SCHEDULED,
        rrule="FREQ=WEEKLY;INTERVAL=2;BYDAY=MO",
        dtstart=datetime(2026, 6, 8, 8, 0),
        pending_period=timedelta(hours=3),
        grace_period=timedelta(hours=1),
        last_completed=datetime(2026, 6, 8, 8, 30, tzinfo=TZ),
    )
    events = await _events_for(
        hass,
        config_entry,
        chore,
        frozen=datetime(2026, 6, 9, 12, 0, tzinfo=TZ),
        start=datetime(2026, 6, 9, 0, 0, tzinfo=TZ),
        end=datetime(2026, 7, 31, 0, 0, tzinfo=TZ),
    )

    assert [e.start for e in _due_events(events)] == [
        datetime(2026, 6, 22, 8, 0, tzinfo=TZ),
        datetime(2026, 7, 6, 8, 0, tzinfo=TZ),
        datetime(2026, 7, 20, 8, 0, tzinfo=TZ),
    ]


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_get_events_last_friday_of_month(hass, config_entry):
    """FREQ=MONTHLY;BYDAY=-1FR expands to the last Friday of each month."""
    chore = ScheduledChore(
        uid="lastfri",
        chore_name="Deep Clean",
        chore_type=ChoreType.SCHEDULED,
        rrule="FREQ=MONTHLY;BYDAY=-1FR",
        dtstart=datetime(2026, 1, 1, 8, 0),
        pending_period=timedelta(hours=3),
        grace_period=timedelta(hours=1),
        created_at=datetime(2026, 3, 1, 12, 0, tzinfo=TZ),
    )
    events = await _events_for(
        hass,
        config_entry,
        chore,
        frozen=datetime(2026, 3, 10, 12, 0, tzinfo=TZ),
        start=datetime(2026, 3, 1, 0, 0, tzinfo=TZ),
        end=datetime(2026, 5, 31, 0, 0, tzinfo=TZ),
    )

    assert [e.start for e in _due_events(events)] == [
        datetime(2026, 3, 27, 8, 0, tzinfo=TZ),
        datetime(2026, 4, 24, 8, 0, tzinfo=TZ),
        datetime(2026, 5, 29, 8, 0, tzinfo=TZ),
    ]


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_get_events_skip_hides_deferred_occurrences(hass, config_entry):
    """Grid occurrences covered by an active skip stay out; the off-grid skip
    marker carries no series fields; expansion resumes after it."""
    chore = ScheduledChore(
        uid="skipped",
        chore_name="Skipped Chore",
        chore_type=ChoreType.SCHEDULED,
        time=time(8, 0),
        pending_period=timedelta(hours=3),
        grace_period=timedelta(hours=1),
        last_completed=datetime(2026, 3, 29, 8, 30, tzinfo=TZ),
        skipped_until=datetime(2026, 4, 2, 14, 30, tzinfo=TZ),
    )
    events = await _events_for(
        hass,
        config_entry,
        chore,
        frozen=datetime(2026, 3, 31, 12, 0, tzinfo=TZ),
        start=datetime(2026, 3, 30, 0, 0, tzinfo=TZ),
        end=datetime(2026, 4, 5, 0, 0, tzinfo=TZ),
    )

    due = _due_events(events)
    assert [e.start for e in due] == [
        datetime(2026, 4, 2, 14, 30, tzinfo=TZ),
        datetime(2026, 4, 3, 8, 0, tzinfo=TZ),
        datetime(2026, 4, 4, 8, 0, tzinfo=TZ),
    ]
    # The skip marker is synthetic — uid only, no series identity.
    assert due[0].uid == "skipped"
    assert due[0].rrule is None
    assert due[0].recurrence_id is None
    assert due[1].recurrence_id == "20260403T080000"


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_get_events_pinned_overdue_with_future_occurrences(hass, config_entry):
    """A pinned-overdue marker appears alongside future expansion; the missed
    occurrences between them are not re-emitted."""
    chore = ScheduledChore(
        uid="pinned",
        chore_name="Pinned Chore",
        chore_type=ChoreType.SCHEDULED,
        time=time(8, 0),
        pending_period=timedelta(hours=3),
        grace_period=timedelta(hours=1),
        created_at=datetime(2026, 3, 30, 4, 0, tzinfo=TZ),
    )
    events = await _events_for(
        hass,
        config_entry,
        chore,
        frozen=datetime(2026, 4, 2, 12, 0, tzinfo=TZ),
        start=datetime(2026, 3, 29, 0, 0, tzinfo=TZ),
        end=datetime(2026, 4, 5, 0, 0, tzinfo=TZ),
    )

    assert [e.start for e in _due_events(events)] == [
        datetime(2026, 3, 30, 8, 0, tzinfo=TZ),  # pinned overdue period
        datetime(2026, 4, 3, 8, 0, tzinfo=TZ),
        datetime(2026, 4, 4, 8, 0, tzinfo=TZ),
    ]


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_get_events_count_rule_stops_at_series_end(hass, config_entry):
    """Expansion of a COUNT rule ends with the final occurrence."""
    chore = ScheduledChore(
        uid="finite",
        chore_name="Course of Medicine",
        chore_type=ChoreType.SCHEDULED,
        rrule="FREQ=DAILY;COUNT=3",
        dtstart=datetime(2026, 6, 1, 8, 0),
        pending_period=timedelta(hours=3),
        grace_period=timedelta(hours=1),
        created_at=datetime(2026, 5, 31, 12, 0, tzinfo=TZ),
        last_completed=datetime(2026, 6, 1, 8, 30, tzinfo=TZ),
    )
    events = await _events_for(
        hass,
        config_entry,
        chore,
        frozen=datetime(2026, 6, 1, 12, 0, tzinfo=TZ),
        start=datetime(2026, 6, 1, 0, 0, tzinfo=TZ),
        end=datetime(2026, 6, 30, 0, 0, tzinfo=TZ),
    )

    assert [e.start for e in _due_events(events)] == [
        datetime(2026, 6, 2, 8, 0, tzinfo=TZ),
        datetime(2026, 6, 3, 8, 0, tzinfo=TZ),
    ]


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_get_events_interval_chore_single_event_no_rrule(hass, config_entry):
    """Interval chores keep a single projected event with no series fields."""
    chore = IntervalChore(
        uid="interval",
        chore_name="Water Filter",
        chore_type=ChoreType.INTERVAL,
        freq="daily",
        interval=3,
        grace_period=timedelta(days=1),
        last_completed=datetime(2026, 3, 28, 12, 0, tzinfo=TZ),
    )
    events = await _events_for(
        hass,
        config_entry,
        chore,
        frozen=datetime(2026, 3, 30, 12, 0, tzinfo=TZ),
        start=datetime(2026, 3, 28, 0, 0, tzinfo=TZ),
        end=datetime(2026, 4, 30, 0, 0, tzinfo=TZ),
    )

    due = _due_events(events)
    assert len(due) == 1
    assert due[0].start == datetime(2026, 3, 31, 12, 0, tzinfo=TZ)
    assert due[0].rrule is None
    assert due[0].recurrence_id is None
