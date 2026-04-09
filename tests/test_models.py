"""Tests for chore data models and state machine logic."""

from __future__ import annotations

from datetime import datetime, time, timedelta, timezone

import pytest

from custom_components.chore_calendar.const import ChoreStatus, ChoreType
from custom_components.chore_calendar.models import BaseChore, IntervalChore, ScheduledChore

# Use a fixed timezone for all tests.
TZ = timezone(timedelta(hours=-5))


# ---------------------------------------------------------------------------
# ScheduledChore — state machine
# ---------------------------------------------------------------------------


def _make_scheduled(
    *,
    sched_time: time = time(8, 0),
    active_days: list[str] | None = None,
    early_window_mins: int = 180,
    grace_period_mins: int = 60,
    last_completed: datetime | None = None,
) -> ScheduledChore:
    """Create a ScheduledChore with test defaults."""
    return ScheduledChore(
        chore_id="test_chore",
        chore_name="Test Chore",
        chore_type=ChoreType.SCHEDULED,
        time=sched_time,
        active_days=active_days or [],
        early_window=timedelta(minutes=early_window_mins),
        grace_period=timedelta(minutes=grace_period_mins),
        last_completed=last_completed,
    )


class TestScheduledChoreStatus:
    """Test ScheduledChore.compute_status() state machine."""

    def test_pending_before_due_time(self):
        """Status is PENDING when in early window but before due time."""
        chore = _make_scheduled()
        # 06:00 — within early window (starts at 05:00), before due (08:00).
        now = datetime(2026, 3, 30, 6, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.PENDING

    def test_due_at_scheduled_time(self):
        """Status is DUE at the scheduled time."""
        chore = _make_scheduled()
        now = datetime(2026, 3, 30, 8, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.DUE

    def test_due_after_scheduled_time(self):
        """Status is DUE shortly after the scheduled time."""
        chore = _make_scheduled()
        now = datetime(2026, 3, 30, 8, 30, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.DUE

    def test_overdue_after_grace_period(self):
        """Status is OVERDUE after grace period expires (previously completed chore)."""
        chore = _make_scheduled(
            last_completed=datetime(2026, 3, 29, 7, 0, tzinfo=TZ),
        )
        # Grace period ends at 09:00. At 09:01 it's overdue.
        now = datetime(2026, 3, 30, 9, 1, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.OVERDUE

    def test_never_completed_past_overdue_is_completed(self):
        """A never-completed chore past the grace period shows as completed, not overdue."""
        chore = _make_scheduled()
        # Grace period ends at 09:00. At 09:01 a never-completed chore
        # should not nag — it shows as completed with next_due on the next day.
        now = datetime(2026, 3, 30, 9, 1, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.COMPLETED
        assert chore.last_completed is None

    def test_completed_after_completion(self):
        """Status is COMPLETED after completion in the current period."""
        chore = _make_scheduled(
            last_completed=datetime(2026, 3, 30, 7, 0, tzinfo=TZ),
        )
        now = datetime(2026, 3, 30, 10, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.COMPLETED

    def test_completion_before_period_does_not_count(self):
        """A completion from a previous period does not satisfy current period."""
        chore = _make_scheduled(
            last_completed=datetime(2026, 3, 29, 7, 0, tzinfo=TZ),
        )
        # March 30 at 06:00 — new period started, old completion doesn't count.
        now = datetime(2026, 3, 30, 6, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.PENDING

    def test_before_early_window_previous_period_overdue(self):
        """Before early window, a previously-completed chore looks at the prior period."""
        chore = _make_scheduled(
            last_completed=datetime(2026, 3, 28, 7, 0, tzinfo=TZ),
        )
        # 04:00 — before early window (05:00). Previous day's period is overdue.
        now = datetime(2026, 3, 30, 4, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.OVERDUE

    def test_before_early_window_never_completed_is_completed(self):
        """Before early window, a never-completed chore is completed (not overdue)."""
        chore = _make_scheduled()
        # 04:00 — before early window (05:00). Never-completed chore should not nag.
        now = datetime(2026, 3, 30, 4, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.COMPLETED


class TestScheduledChoreActiveDays:
    """Test ScheduledChore active_days filtering."""

    def test_weekday_only_chore_on_weekday(self):
        """Chore is active on a configured weekday."""
        # 2026-03-30 is a Monday.
        chore = _make_scheduled(active_days=["mon", "wed", "fri"])
        now = datetime(2026, 3, 30, 6, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.PENDING

    def test_weekday_only_chore_on_inactive_day(self):
        """On an inactive day, a previously-completed chore refers back to the last active day."""
        # 2026-03-31 is a Tuesday (not active).
        chore = _make_scheduled(
            active_days=["mon", "wed", "fri"],
            last_completed=datetime(2026, 3, 28, 7, 0, tzinfo=TZ),
        )
        # At 10am Tuesday, the period refers back to Monday.
        # Monday's period is overdue by now (past grace).
        now = datetime(2026, 3, 31, 10, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.OVERDUE

    def test_empty_active_days_means_every_day(self):
        """Empty active_days list means the chore is active every day."""
        chore = _make_scheduled(active_days=[])
        now = datetime(2026, 3, 30, 6, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.PENDING


class TestScheduledChoreNextDue:
    """Test ScheduledChore.compute_next_due()."""

    def test_next_due_before_due_time(self):
        """Before the due time, next_due is today's due time."""
        chore = _make_scheduled()
        now = datetime(2026, 3, 30, 6, 0, tzinfo=TZ)
        expected = datetime(2026, 3, 30, 8, 0, tzinfo=TZ)
        assert chore.compute_next_due(now) == expected

    def test_next_due_after_due_time_overdue(self):
        """After the due time, an uncompleted chore stays pinned to the overdue period."""
        chore = _make_scheduled(
            last_completed=datetime(2026, 3, 29, 7, 0, tzinfo=TZ),
        )
        now = datetime(2026, 3, 30, 10, 0, tzinfo=TZ)
        expected = datetime(2026, 3, 30, 8, 0, tzinfo=TZ)
        assert chore.compute_next_due(now) == expected

    def test_next_due_never_completed_past_overdue_advances(self):
        """A never-completed chore past the grace period advances to the next day."""
        chore = _make_scheduled()
        now = datetime(2026, 3, 30, 10, 0, tzinfo=TZ)
        expected = datetime(2026, 3, 31, 8, 0, tzinfo=TZ)
        assert chore.compute_next_due(now) == expected

    def test_next_due_after_due_time_completed(self):
        """After completing the current period, next_due advances to the next day."""
        chore = _make_scheduled(last_completed=datetime(2026, 3, 30, 8, 30, tzinfo=TZ))
        now = datetime(2026, 3, 30, 10, 0, tzinfo=TZ)
        expected = datetime(2026, 3, 31, 8, 0, tzinfo=TZ)
        assert chore.compute_next_due(now) == expected


class TestScheduledChoreDueRange:
    """Test ScheduledChore.compute_due_range()."""

    def test_due_range_returns_period_due_to_overdue(self):
        """Due range spans from period_due to period_due + grace_period."""
        chore = _make_scheduled(grace_period_mins=60)
        now = datetime(2026, 3, 30, 7, 0, tzinfo=TZ)
        result = chore.compute_due_range(now)
        assert result is not None
        due_at, overdue_at = result
        assert due_at == datetime(2026, 3, 30, 8, 0, tzinfo=TZ)
        assert overdue_at == datetime(2026, 3, 30, 9, 0, tzinfo=TZ)

    def test_due_range_after_grace_period(self):
        """Due range still reflects the current period even when overdue."""
        chore = _make_scheduled(grace_period_mins=60)
        now = datetime(2026, 3, 30, 10, 0, tzinfo=TZ)
        result = chore.compute_due_range(now)
        assert result is not None
        due_at, overdue_at = result
        assert due_at == datetime(2026, 3, 30, 8, 0, tzinfo=TZ)
        assert overdue_at == datetime(2026, 3, 30, 9, 0, tzinfo=TZ)


class TestScheduledChoreCompletionWindow:
    """Test ScheduledChore.is_in_completion_window()."""

    def test_in_window(self):
        """Timestamp within the completion window returns True."""
        chore = _make_scheduled()
        ts = datetime(2026, 3, 30, 7, 0, tzinfo=TZ)
        assert chore.is_in_completion_window(ts) is True

    def test_overdue_still_completable(self):
        """Timestamp after the grace period is still completable (no upper bound)."""
        chore = _make_scheduled()
        ts = datetime(2026, 3, 30, 10, 0, tzinfo=TZ)
        assert chore.is_in_completion_window(ts) is True


# ---------------------------------------------------------------------------
# IntervalChore — state machine
# ---------------------------------------------------------------------------


def _make_interval(
    *,
    interval_mins: int = 4320,  # 3 days
    grace_period_mins: int = 1440,  # 1 day
    created_at: datetime | None = None,
    last_completed: datetime | None = None,
) -> IntervalChore:
    """Create an IntervalChore with test defaults."""
    return IntervalChore(
        chore_id="test_interval",
        chore_name="Test Interval",
        chore_type=ChoreType.INTERVAL,
        interval=timedelta(minutes=interval_mins),
        grace_period=timedelta(minutes=grace_period_mins),
        created_at=created_at,
        last_completed=last_completed,
    )


class TestIntervalChoreStatus:
    """Test IntervalChore.compute_status() state machine."""

    def test_never_completed_no_anchor_is_due(self):
        """An interval chore with no anchor is DUE."""
        chore = _make_interval()
        now = datetime(2026, 3, 30, 12, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.DUE

    def test_created_at_does_not_affect_status(self):
        """Status ignores created_at — never-completed chores are always DUE."""
        created = datetime(2026, 3, 29, 12, 0, tzinfo=TZ)
        chore = _make_interval(created_at=created)
        # 1 day after creation, interval is 3 days — but status is DUE
        # because last_completed is None.
        now = datetime(2026, 3, 30, 12, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.DUE

    def test_completed_within_interval(self):
        """Status is COMPLETED when within the interval."""
        chore = _make_interval(
            last_completed=datetime(2026, 3, 29, 12, 0, tzinfo=TZ),
        )
        now = datetime(2026, 3, 30, 12, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.COMPLETED

    def test_due_after_interval(self):
        """Status is DUE after the interval has passed."""
        chore = _make_interval(
            last_completed=datetime(2026, 3, 27, 12, 0, tzinfo=TZ),
        )
        # 3 days later = March 30 12:00 — exactly at due_at.
        now = datetime(2026, 3, 30, 12, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.DUE

    def test_overdue_after_grace(self):
        """Status is OVERDUE after interval + grace period."""
        chore = _make_interval(
            last_completed=datetime(2026, 3, 27, 12, 0, tzinfo=TZ),
        )
        # 3 days + 1 day grace = April 1 12:00.
        now = datetime(2026, 4, 1, 12, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.OVERDUE


class TestIntervalChoreNextDue:
    """Test IntervalChore.compute_next_due()."""

    def test_next_due_with_completion(self):
        """next_due is last_completed + interval."""
        chore = _make_interval(
            last_completed=datetime(2026, 3, 27, 12, 0, tzinfo=TZ),
        )
        now = datetime(2026, 3, 28, 12, 0, tzinfo=TZ)
        expected = datetime(2026, 3, 30, 12, 0, tzinfo=TZ)
        assert chore.compute_next_due(now) == expected

    def test_next_due_never_completed_no_created_at(self):
        """next_due is None when never completed and no created_at."""
        chore = _make_interval()
        now = datetime(2026, 3, 30, 12, 0, tzinfo=TZ)
        assert chore.compute_next_due(now) is None

    def test_next_due_never_completed_with_created_at(self):
        """next_due is created_at itself when never completed (due immediately)."""
        created = datetime(2026, 3, 27, 12, 0, tzinfo=TZ)
        chore = _make_interval(created_at=created)
        now = datetime(2026, 3, 28, 12, 0, tzinfo=TZ)
        assert chore.compute_next_due(now) == created

    def test_always_in_completion_window(self):
        """Interval chores can always be completed."""
        chore = _make_interval()
        assert chore.is_in_completion_window(datetime(2026, 1, 1, tzinfo=TZ)) is True


class TestIntervalChoreDueRange:
    """Test IntervalChore.compute_due_range()."""

    def test_due_range_with_completion(self):
        """Due range spans from last_completed + interval to + interval + grace."""
        chore = _make_interval(
            interval_mins=4320,  # 3 days
            grace_period_mins=1440,  # 1 day
            last_completed=datetime(2026, 3, 27, 12, 0, tzinfo=TZ),
        )
        now = datetime(2026, 3, 29, 12, 0, tzinfo=TZ)
        result = chore.compute_due_range(now)
        assert result is not None
        due_at, overdue_at = result
        assert due_at == datetime(2026, 3, 30, 12, 0, tzinfo=TZ)
        assert overdue_at == datetime(2026, 3, 31, 12, 0, tzinfo=TZ)

    def test_due_range_no_anchor_is_none(self):
        """Due range is None when no last_completed and no created_at."""
        chore = _make_interval()
        now = datetime(2026, 3, 30, 12, 0, tzinfo=TZ)
        assert chore.compute_due_range(now) is None

    def test_due_range_uses_created_at_fallback(self):
        """Due range starts at created_at when never completed (due immediately)."""
        created = datetime(2026, 3, 27, 12, 0, tzinfo=TZ)
        chore = _make_interval(
            grace_period_mins=1440,  # 1 day
            created_at=created,
        )
        now = datetime(2026, 3, 27, 13, 0, tzinfo=TZ)
        result = chore.compute_due_range(now)
        assert result is not None
        due_at, overdue_at = result
        # Due immediately at created_at, grace period extends 1 day.
        assert due_at == created
        assert overdue_at == datetime(2026, 3, 28, 12, 0, tzinfo=TZ)


# ---------------------------------------------------------------------------
# Serialization round-trip
# ---------------------------------------------------------------------------


class TestSerialization:
    """Test to_dict / from_dict round-trip for all chore types."""

    def test_scheduled_round_trip(self):
        """ScheduledChore survives a to_dict/from_dict round-trip."""
        original = _make_scheduled(
            last_completed=datetime(2026, 3, 30, 7, 0, tzinfo=TZ),
            active_days=["mon", "wed", "fri"],
        )
        data = original.to_dict()
        restored = BaseChore.from_dict(data)

        assert isinstance(restored, ScheduledChore)
        assert restored.chore_id == original.chore_id
        assert restored.chore_name == original.chore_name
        assert restored.time == original.time
        assert restored.active_days == original.active_days
        assert restored.early_window == original.early_window
        assert restored.grace_period == original.grace_period
        assert restored.last_completed == original.last_completed
        assert restored.trigger_tag_id == original.trigger_tag_id
        assert restored.assigned_to == original.assigned_to

    def test_interval_round_trip(self):
        """IntervalChore survives a to_dict/from_dict round-trip."""
        original = _make_interval(
            created_at=datetime(2026, 3, 25, 12, 0, tzinfo=TZ),
            last_completed=datetime(2026, 3, 27, 12, 0, tzinfo=TZ),
        )
        original.trigger_tag_id = "abc-123-uuid"
        original.assigned_to = ["person.tom"]
        data = original.to_dict()
        restored = BaseChore.from_dict(data)

        assert isinstance(restored, IntervalChore)
        assert restored.chore_id == original.chore_id
        assert restored.interval == original.interval
        assert restored.grace_period == original.grace_period
        assert restored.created_at == original.created_at
        assert restored.last_completed == original.last_completed
        assert restored.trigger_tag_id == "abc-123-uuid"
        assert restored.assigned_to == ["person.tom"]

    def test_from_dict_unknown_type_raises(self):
        """from_dict raises ValueError for unknown chore_type."""
        data = {
            "chore_id": "x",
            "chore_name": "X",
            "chore_type": "unknown",
            "schedule": {},
        }
        with pytest.raises(ValueError, match="unknown"):
            BaseChore.from_dict(data)

    def test_schedule_description_scheduled(self):
        """schedule_description fills in all days when active_days is empty."""
        chore = _make_scheduled()
        desc = chore.schedule_description()
        assert len(desc["active_days"]) == 7

    def test_schedule_description_interval(self):
        """schedule_description returns interval_mins and grace_period_mins."""
        chore = _make_interval()
        desc = chore.schedule_description()
        assert desc["interval_mins"] == 4320
        assert desc["grace_period_mins"] == 1440
