"""Tests for the scheduled-chore streak."""

from __future__ import annotations

from datetime import datetime, time, timedelta, timezone

import pytest

from custom_components.chore_calendar.const import ChoreStatus, ChoreType
from custom_components.chore_calendar.models import BaseChore, IntervalChore, OneshotChore, ScheduledChore

# Use a fixed timezone for all tests.
TZ = timezone(timedelta(hours=-5))


def _at(day: int, hour: int = 8, minute: int = 0, month: int = 3) -> datetime:
    return datetime(2026, month, day, hour, minute, tzinfo=TZ)


def _daily(**kwargs) -> ScheduledChore:
    """Daily 08:00 chore, 3h pending window (opens 05:00), 1h grace (overdue at 09:00)."""
    return ScheduledChore(
        uid="daily",
        chore_name="Daily",
        chore_type=ChoreType.SCHEDULED,
        time=time(8, 0),
        active_days=[],
        pending_period=timedelta(hours=3),
        grace_period=timedelta(hours=1),
        **kwargs,
    )


def _evening(**kwargs) -> ScheduledChore:
    """Daily 19:00 chore, 3h pending window, 14h grace (overdue at 09:00 the next day)."""
    return ScheduledChore(
        uid="homework",
        chore_name="Math homework",
        chore_type=ChoreType.SCHEDULED,
        time=time(19, 0),
        active_days=[],
        pending_period=timedelta(hours=3),
        grace_period=timedelta(hours=14),
        **kwargs,
    )


class TestStreakStorage:
    """Both fields round-trip and default to 0 for older storage."""

    def test_round_trip_keeps_both_fields(self):
        chore = _daily(created_at=_at(1, 4), streak=4, previous_streak=3)
        data = chore.to_dict()
        assert data["streak"] == 4
        assert data["previous_streak"] == 3
        restored = BaseChore.from_dict(data)
        assert restored.streak == 4
        assert restored.previous_streak == 3

    def test_dict_without_fields_loads_as_zero(self):
        data = _daily(created_at=_at(1, 4)).to_dict()
        del data["streak"]
        del data["previous_streak"]
        restored = BaseChore.from_dict(data)
        assert restored.streak == 0
        assert restored.previous_streak == 0


class TestStreakOnCompletion:
    """apply_completion judges the completion by the status at its timestamp."""

    def test_completion_while_pending_adds_one(self):
        chore = _daily(last_completed=_at(29, 8, 30), streak=3)
        assert chore.compute_status(_at(30, 6)) == ChoreStatus.PENDING
        chore.apply_completion(_at(30, 6), None)
        assert chore.streak == 4

    def test_completion_while_due_adds_one(self):
        chore = _daily(last_completed=_at(29, 8, 30), streak=3)
        assert chore.compute_status(_at(30, 8, 30)) == ChoreStatus.DUE
        chore.apply_completion(_at(30, 8, 30), None)
        assert chore.streak == 4

    def test_completion_while_overdue_resets_then_recovers(self):
        chore = _daily(last_completed=_at(28, 8, 30), streak=3)
        assert chore.compute_status(_at(29, 10)) == ChoreStatus.OVERDUE
        chore.apply_completion(_at(29, 10), None)
        assert chore.streak == 0
        assert chore.compute_status(_at(30, 7)) == ChoreStatus.PENDING
        chore.apply_completion(_at(30, 7), None)
        assert chore.streak == 1

    def test_early_first_completion_does_not_count_twice(self):
        chore = _daily(created_at=_at(30, 3))
        # 04:00 is before the 05:00 pending window, but a never-completed chore reads pending.
        assert chore.compute_status(_at(30, 4)) == ChoreStatus.PENDING
        chore.apply_completion(_at(30, 4), None)
        assert chore.streak == 0
        # That completion did not satisfy the period, so it is still pending at 07:00.
        assert chore.compute_status(_at(30, 7)) == ChoreStatus.PENDING
        chore.apply_completion(_at(30, 7), None)
        assert chore.streak == 1

    def test_repeat_completion_leaves_streak_unchanged(self):
        chore = _daily(last_completed=_at(30, 8, 30), streak=2)
        assert chore.compute_status(_at(30, 20)) == ChoreStatus.COMPLETED
        chore.apply_completion(_at(30, 20), None)
        assert chore.streak == 2

    def test_overdue_completion_in_next_window_earns_nothing_for_that_period(self):
        chore = _daily(last_completed=_at(28, 8, 30), streak=4)
        # Mar 29 lapsed; 06:00 Mar 30 is inside Mar 30's pending window.
        assert chore.compute_status(_at(30, 6)) == ChoreStatus.OVERDUE
        chore.apply_completion(_at(30, 6), None)
        assert chore.streak == 0
        # The overdue completion also satisfied Mar 30, so a second one is a repeat.
        assert chore.compute_status(_at(30, 7)) == ChoreStatus.COMPLETED
        chore.apply_completion(_at(30, 7), None)
        assert chore.streak == 0
        # The next period's on-time completion starts the new streak.
        chore.apply_completion(_at(31, 7), None)
        assert chore.streak == 1

    def test_backdated_completion_is_judged_at_its_timestamp(self):
        chore = _daily(last_completed=_at(29, 8, 30), streak=1)
        # Recorded at noon, when the chore reads overdue, but done at 08:15.
        assert chore.compute_status(_at(30, 12)) == ChoreStatus.OVERDUE
        chore.apply_completion(_at(30, 8, 15), None)
        assert chore.streak == 2

    def test_out_of_order_backdated_completion_leaves_streak_unchanged(self):
        chore = _daily(last_completed=_at(30, 8, 30), streak=4)
        # The stored completion already satisfies Mar 29's window, so this reads completed.
        chore.apply_completion(_at(29, 8, 15), None)
        assert chore.streak == 4

    def test_long_grace_period_tolerates_next_morning(self):
        chore = _evening(last_completed=_at(29, 19, 30), streak=5)
        # Mar 30 19:00 stays due until 09:00 Mar 31.
        assert chore.compute_status(_at(31, 7)) == ChoreStatus.DUE
        chore.apply_completion(_at(31, 7), None)
        assert chore.streak == 6

    def test_long_grace_period_resets_once_lapsed(self):
        chore = _evening(last_completed=_at(29, 19, 30), streak=5)
        assert chore.compute_status(_at(31, 9, 30)) == ChoreStatus.OVERDUE
        chore.apply_completion(_at(31, 9, 30), None)
        assert chore.streak == 0

    def test_final_occurrence_of_finite_rule_counts_and_holds(self):
        chore = ScheduledChore(
            uid="course",
            chore_name="Course",
            chore_type=ChoreType.SCHEDULED,
            rrule="FREQ=DAILY;COUNT=2",
            dtstart=datetime(2026, 3, 29, 8, 0),
            pending_period=timedelta(hours=3),
            grace_period=timedelta(hours=1),
            last_completed=_at(29, 8, 30),
            streak=1,
        )
        chore.apply_completion(_at(30, 8, 15), None)
        assert chore.terminal is True
        assert chore.streak == 2
        assert chore.current_streak(_at(31, 12)) == 2


class TestStreakUndo:
    """revert_completion restores the streak saved by the completion it undoes."""

    def test_revert_restores_on_time_completion(self):
        chore = _daily(last_completed=_at(29, 8, 30), streak=3)
        chore.apply_completion(_at(30, 7), None)
        assert (chore.streak, chore.previous_streak) == (4, 3)
        chore.revert_completion()
        assert chore.streak == 3

    def test_revert_restores_streak_reset_by_overdue_completion(self):
        chore = _daily(last_completed=_at(28, 8, 30), streak=4)
        chore.apply_completion(_at(29, 10), None)
        assert chore.streak == 0
        chore.revert_completion()
        assert chore.streak == 4

    def test_revert_of_repeat_completion_keeps_streak(self):
        chore = _daily(last_completed=_at(30, 8, 30), streak=2)
        chore.apply_completion(_at(30, 20), None)
        chore.revert_completion()
        assert chore.streak == 2

    def test_second_revert_leaves_streak_unchanged(self):
        chore = _daily(last_completed=_at(29, 8, 30), streak=3)
        chore.apply_completion(_at(30, 7), None)
        chore.revert_completion()
        # The older Mar 29 completion is still revertible; its streak was never saved.
        chore.revert_completion()
        assert chore.last_completed is None
        assert chore.streak == 3
        assert chore.previous_streak == 3


class TestStreakReadTime:
    """current_streak reports 0 while overdue without touching the stored value."""

    def test_current_streak_while_due_and_after_grace_lapses(self):
        chore = _daily(last_completed=_at(29, 8, 30), streak=5)
        assert chore.current_streak(_at(30, 8, 30)) == 5
        assert chore.current_streak(_at(30, 9)) == 0
        assert chore.streak == 5

    def test_outage_shows_reset_on_first_read(self):
        chore = _daily(last_completed=_at(27, 8, 30), streak=5)
        # Home Assistant was down from Mar 27 to Mar 30; no tick or event ran.
        assert chore.current_streak(_at(30, 12)) == 0
        assert chore.streak == 5


class TestSettleStreak:
    """settle_streak stores the read-time reset before an anchor moves."""

    def test_settle_stores_zero_when_overdue(self):
        chore = _daily(last_completed=_at(29, 8, 30), streak=5)
        chore.settle_streak(_at(30, 9))
        assert chore.streak == 0

    @pytest.mark.parametrize(
        ("last_completed", "now"),
        [
            (_at(29, 8, 30), _at(30, 6)),  # Pending.
            (_at(29, 8, 30), _at(30, 8, 30)),  # Due.
            (_at(30, 8, 30), _at(30, 12)),  # Completed.
        ],
    )
    def test_settle_is_noop_unless_overdue(self, last_completed, now):
        chore = _daily(last_completed=last_completed, streak=5)
        assert chore.compute_status(now) != ChoreStatus.OVERDUE
        chore.settle_streak(now)
        assert chore.streak == 5


class TestStreakOtherTypes:
    """Interval and oneshot chores have no streak."""

    def test_interval_chore_has_no_streak(self):
        chore = IntervalChore(
            uid="interval",
            chore_name="Interval",
            chore_type=ChoreType.INTERVAL,
            freq="daily",
            interval=1,
        )
        chore.apply_completion(_at(30, 8), None)
        chore.settle_streak(_at(31, 12))
        assert chore.streak == 0
        assert chore.current_streak(_at(30, 9)) is None

    def test_oneshot_chore_has_no_streak(self):
        chore = OneshotChore(
            uid="oneshot",
            chore_name="Oneshot",
            chore_type=ChoreType.ONESHOT,
            due_datetime=_at(30, 8),
        )
        chore.apply_completion(_at(30, 8), None)
        assert chore.streak == 0
        assert chore.current_streak(_at(30, 9)) is None
