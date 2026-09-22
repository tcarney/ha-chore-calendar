"""Tests for missed-occurrence tracking and the upcoming due attribute."""

from __future__ import annotations

from datetime import datetime, time, timedelta, timezone

from custom_components.chore_calendar.const import PERIOD_WALK_LIMIT, ChoreStatus, ChoreType
from custom_components.chore_calendar.models import IntervalChore, ScheduledChore

# Use a fixed timezone for all tests.
TZ = timezone(timedelta(hours=-5))


def _at(day: int, hour: int = 8, minute: int = 0, month: int = 3) -> datetime:
    return datetime(2026, month, day, hour, minute, tzinfo=TZ)


def _daily(**kwargs) -> ScheduledChore:
    """Daily 08:00 chore, 3h pending window, 1h grace."""
    return ScheduledChore(
        uid="daily",
        chore_name="Daily",
        chore_type=ChoreType.SCHEDULED,
        time=time(8, 0),
        active_days=kwargs.pop("active_days", []),
        pending_period=timedelta(hours=3),
        grace_period=timedelta(hours=1),
        **kwargs,
    )


class TestScheduledMissedOccurrences:
    """Missed periods are the uncompleted ones whose grace period has lapsed."""

    def test_pending_has_nothing_missed_and_upcoming_is_next_due(self):
        chore = _daily(last_completed=_at(29, 8, 30))
        now = _at(30, 6)
        assert chore.compute_status(now) == ChoreStatus.PENDING
        assert chore.compute_missed_occurrences(now) == []
        assert chore.compute_upcoming_due(now) == chore.compute_next_due(now) == _at(30)

    def test_dormant_has_nothing_missed_and_upcoming_is_next_due(self):
        chore = _daily(last_completed=_at(30, 8, 30))
        now = _at(30, 12)
        assert chore.compute_status(now) == ChoreStatus.COMPLETED
        assert chore.compute_missed_occurrences(now) == []
        assert chore.compute_upcoming_due(now) == chore.compute_next_due(now) == _at(31)

    def test_single_missed_period_before_upcoming_window(self):
        chore = _daily(last_completed=_at(28, 7))
        # 04:00 on Mar 30: Mar 29 08:00 lapsed, Mar 30's pending window opens at 05:00.
        now = _at(30, 4)
        assert chore.compute_status(now) == ChoreStatus.OVERDUE
        assert chore.compute_missed_occurrences(now) == [_at(29)]
        assert chore.compute_upcoming_due(now) == _at(30)

    def test_several_missed_periods_with_upcoming_pending(self):
        chore = _daily(last_completed=_at(25, 8, 30))
        now = _at(30, 6)
        missed = chore.compute_missed_occurrences(now)
        assert missed == [_at(26), _at(27), _at(28), _at(29)]
        # next_due stays pinned to the earliest missed period.
        assert chore.compute_next_due(now) == missed[0]
        # Mar 30 is inside its pending window, not yet missed.
        assert chore.compute_upcoming_due(now) == _at(30)

    def test_upcoming_inside_grace_window_is_not_missed(self):
        chore = _daily(last_completed=_at(25, 8, 30))
        now = _at(30, 8, 30)
        assert chore.compute_missed_occurrences(now)[-1] == _at(29)
        assert chore.compute_upcoming_due(now) == _at(30)

    def test_upcoming_joins_missed_once_grace_lapses(self):
        chore = _daily(last_completed=_at(25, 8, 30))
        now = _at(30, 9)
        assert chore.compute_missed_occurrences(now)[-1] == _at(30)
        assert chore.compute_upcoming_due(now) == _at(31)

    def test_never_completed_walks_from_created_at(self):
        chore = _daily(created_at=_at(26, 4))
        now = _at(30, 6)
        assert chore.compute_missed_occurrences(now) == [_at(26), _at(27), _at(28), _at(29)]
        assert chore.compute_upcoming_due(now) == _at(30)

    def test_active_days_walk_the_grid(self):
        # Mar 23 2026 is a Monday; Mon/Wed/Fri grid.
        chore = _daily(active_days=["mon", "wed", "fri"], last_completed=_at(23, 8, 30))
        now = _at(30, 6)
        assert chore.compute_missed_occurrences(now) == [_at(25), _at(27)]
        assert chore.compute_upcoming_due(now) == _at(30)

    def test_skip_anchor_starts_the_missed_run(self):
        """Periods deferred by a skip are skipped, not missed."""
        chore = _daily(last_completed=_at(25, 8, 30))
        chore.skipped_until = _at(2, month=4)
        now = _at(4, 6, month=4)
        assert chore.compute_status(now) == ChoreStatus.OVERDUE
        assert chore.compute_missed_occurrences(now) == [_at(2, month=4), _at(3, month=4)]
        assert chore.compute_upcoming_due(now) == _at(4, month=4)

    def test_skipping_while_overdue_clears_the_missed_run(self):
        chore = _daily(last_completed=_at(25, 8, 30))
        now = _at(30, 6)
        assert chore.compute_missed_occurrences(now)
        # The default skip lands on the first occurrence after now: Mar 30
        # 08:00, whose pending window is already open.
        assert chore.apply_default_skip(now) == _at(30)
        assert chore.compute_missed_occurrences(now) == []
        assert chore.compute_status(now) == ChoreStatus.PENDING

    def test_completion_clears_the_missed_run(self):
        chore = _daily(last_completed=_at(25, 8, 30))
        now = _at(30, 6)
        chore.apply_completion(now, None)
        assert chore.compute_missed_occurrences(now) == []
        assert chore.compute_next_due(now) == _at(30)

    def test_finite_rule_ends_the_run_with_no_upcoming(self):
        chore = ScheduledChore(
            uid="count3",
            chore_name="Count 3",
            chore_type=ChoreType.SCHEDULED,
            rrule="FREQ=DAILY;COUNT=3",
            dtstart=datetime(2026, 6, 1, 8, 0),
            pending_period=timedelta(hours=3),
            grace_period=timedelta(hours=1),
            created_at=datetime(2026, 5, 31, 12, 0, tzinfo=TZ),
        )
        now = datetime(2026, 6, 10, 12, 0, tzinfo=TZ)
        assert chore.compute_missed_occurrences(now) == [_at(1, month=6), _at(2, month=6), _at(3, month=6)]
        assert chore.compute_upcoming_due(now) is None

    def test_terminal_has_nothing(self):
        chore = _daily(last_completed=_at(25, 8, 30), terminal=True)
        now = _at(30, 6)
        assert chore.compute_missed_occurrences(now) == []
        assert chore.compute_upcoming_due(now) is None

    def test_walk_is_bounded(self):
        chore = _daily(last_completed=datetime(2025, 1, 1, 8, 30, tzinfo=TZ))
        now = _at(30, 6)
        assert len(chore.compute_missed_occurrences(now)) == PERIOD_WALK_LIMIT


class TestIntervalMissedOccurrences:
    """Interval chores have no grid: a single missed entry while overdue."""

    def _chore(self, **kwargs) -> IntervalChore:
        return IntervalChore(
            uid="interval",
            chore_name="Interval",
            chore_type=ChoreType.INTERVAL,
            freq="daily",
            interval=1,
            pending_period=timedelta(hours=3),
            grace_period=timedelta(hours=1),
            **kwargs,
        )

    def test_overdue_reports_the_operative_due(self):
        chore = self._chore(last_completed=_at(25, 8))
        now = _at(30, 6)
        assert chore.compute_status(now) == ChoreStatus.OVERDUE
        assert chore.compute_missed_occurrences(now) == [_at(26)]
        assert chore.compute_upcoming_due(now) is None

    def test_not_overdue_reports_nothing(self):
        chore = self._chore(last_completed=_at(29, 8))
        now = _at(30, 6)
        assert chore.compute_missed_occurrences(now) == []
        assert chore.compute_upcoming_due(now) is None

    def test_never_completed_reports_nothing(self):
        chore = self._chore()
        assert chore.compute_missed_occurrences(_at(30, 6)) == []
