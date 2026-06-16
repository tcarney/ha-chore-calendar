"""Tests for chore data models and state machine logic."""

from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

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
    pending_period_mins: int = 180,
    grace_period_mins: int = 60,
    last_completed: datetime | None = None,
) -> ScheduledChore:
    """Create a ScheduledChore with test defaults."""
    return ScheduledChore(
        uid="test_chore",
        chore_name="Test Chore",
        chore_type=ChoreType.SCHEDULED,
        time=sched_time,
        active_days=active_days or [],
        pending_period=timedelta(minutes=pending_period_mins),
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

    def test_never_completed_past_overdue_stays_overdue(self):
        """A never-completed chore past the grace period reads as OVERDUE and stays pinned.

        Initial-state convention: a never-completed scheduled chore pins to
        the first active-day period_due >= created_at and surfaces as
        OVERDUE if missed — it does not silently roll forward to the next
        period.
        """
        chore = _make_scheduled()
        chore.created_at = datetime(2026, 3, 30, 4, 0, tzinfo=TZ)  # Before today's pending window.
        # Grace period ends at 09:00. At 09:01 the first cycle is overdue
        # and stays so until completion.
        now = datetime(2026, 3, 30, 9, 1, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.OVERDUE
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

    def test_before_pending_window_previous_period_overdue(self):
        """Before pending window, a previously-completed chore looks at the prior period."""
        chore = _make_scheduled(
            last_completed=datetime(2026, 3, 28, 7, 0, tzinfo=TZ),
        )
        # 04:00 — before pending window (05:00). Previous day's period is overdue.
        now = datetime(2026, 3, 30, 4, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.OVERDUE

    def test_before_pending_window_never_completed_is_pending(self):
        """A never-completed chore before its first pending window reads as PENDING."""
        chore = _make_scheduled()
        chore.created_at = datetime(2026, 3, 30, 0, 30, tzinfo=TZ)  # Created early on Mar 30.
        # 04:00 — first period_due = Mar 30 08:00; pending window opens at 05:00.
        # We're before the pending window of the first cycle → still PENDING.
        now = datetime(2026, 3, 30, 4, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.PENDING

    def test_never_completed_created_after_due_pins_to_next_period(self):
        """When created after today's period_due, the first valid period is tomorrow's."""
        chore = _make_scheduled()
        # Created at 08:30 on Monday — past today's 08:00 period_due. The
        # first valid period is Tuesday's 08:00. Status reads as PENDING
        # toward Tuesday all day Monday.
        chore.created_at = datetime(2026, 3, 30, 8, 30, tzinfo=TZ)
        now = datetime(2026, 3, 30, 12, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.PENDING
        assert chore.compute_next_due(now) == datetime(2026, 3, 31, 8, 0, tzinfo=TZ)

    def test_never_completed_overdue_stays_pinned_next_day(self):
        """An OVERDUE never-completed chore stays pinned to the missed period rather than rolling forward."""
        chore = _make_scheduled()
        chore.created_at = datetime(2026, 3, 30, 4, 0, tzinfo=TZ)
        # Two days later, still uncompleted: should remain OVERDUE pinned to Mar 30 08:00.
        now = datetime(2026, 4, 1, 12, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.OVERDUE
        assert chore.compute_next_due(now) == datetime(2026, 3, 30, 8, 0, tzinfo=TZ)


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

    def test_next_due_never_completed_past_overdue_stays_pinned(self):
        """A never-completed chore past the grace period pins next_due to the missed period."""
        chore = _make_scheduled()
        chore.created_at = datetime(2026, 3, 30, 4, 0, tzinfo=TZ)
        now = datetime(2026, 3, 30, 10, 0, tzinfo=TZ)
        # Pinned to today's missed 08:00 period — does not advance to tomorrow.
        expected = datetime(2026, 3, 30, 8, 0, tzinfo=TZ)
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


# ---------------------------------------------------------------------------
# IntervalChore — state machine
# ---------------------------------------------------------------------------


def _make_interval(
    *,
    freq: str = "daily",
    interval: int = 3,
    pending_period_mins: int = 180,
    grace_period_mins: int = 1440,  # 1 day
    created_at: datetime | None = None,
    last_completed: datetime | None = None,
) -> IntervalChore:
    """Create an IntervalChore with test defaults (every 3 days)."""
    return IntervalChore(
        uid="test_interval",
        chore_name="Test Interval",
        chore_type=ChoreType.INTERVAL,
        freq=freq,
        interval=interval,
        pending_period=timedelta(minutes=pending_period_mins),
        grace_period=timedelta(minutes=grace_period_mins),
        created_at=created_at,
        last_completed=last_completed,
    )


class TestIntervalChoreStatus:
    """Test IntervalChore.compute_status() state machine."""

    def test_never_completed_no_anchor_is_pending(self):
        """A never-completed interval chore reads as unscheduled PENDING."""
        chore = _make_interval()
        now = datetime(2026, 3, 30, 12, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.PENDING

    def test_created_at_does_not_affect_status(self):
        """Status ignores created_at — never-completed chores read as PENDING regardless."""
        created = datetime(2026, 3, 29, 12, 0, tzinfo=TZ)
        chore = _make_interval(created_at=created)
        # The cycle has no anchor until first completion.
        now = datetime(2026, 3, 30, 12, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.PENDING

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

    def test_pending_inside_pending_window(self):
        """Status is PENDING in the window before due_at after first completion."""
        chore = _make_interval(
            pending_period_mins=180,  # 3 hours
            last_completed=datetime(2026, 3, 27, 12, 0, tzinfo=TZ),
        )
        # due_at = Mar 30 12:00; pending_at = Mar 30 09:00. now in [09:00, 12:00) → PENDING.
        now = datetime(2026, 3, 30, 10, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.PENDING

    def test_completed_just_before_pending_window(self):
        """Just before pending_at, status is still COMPLETED (cycle not yet pending)."""
        chore = _make_interval(
            pending_period_mins=180,
            last_completed=datetime(2026, 3, 27, 12, 0, tzinfo=TZ),
        )
        # 1 second before pending_at (Mar 30 09:00) → still COMPLETED.
        now = datetime(2026, 3, 30, 8, 59, 59, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.COMPLETED

    def test_zero_pending_period_skips_pending_state(self):
        """pending_period=0 preserves the pre-promotion behavior (no PENDING window)."""
        chore = _make_interval(
            pending_period_mins=0,
            last_completed=datetime(2026, 3, 27, 12, 0, tzinfo=TZ),
        )
        # 1 second before due — with pending_period=0, pending_at == due_at, so COMPLETED.
        now = datetime(2026, 3, 30, 11, 59, 59, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.COMPLETED

    def test_first_completion_anchors_cycle_after_unscheduled_pending(self):
        """A first completion on a never-completed interval anchors the cycle."""
        chore = _make_interval()
        first_completion = datetime(2026, 3, 30, 12, 0, tzinfo=TZ)

        chore.apply_completion(first_completion, "person.alice")

        # Immediately after first completion: COMPLETED.
        assert chore.compute_status(first_completion) == ChoreStatus.COMPLETED
        # next_due now anchored at first_completion + interval (3 days).
        assert chore.compute_next_due(first_completion) == first_completion + timedelta(days=3)


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
        """next_due is None when never completed — created_at is ignored for interval."""
        created = datetime(2026, 3, 27, 12, 0, tzinfo=TZ)
        chore = _make_interval(created_at=created)
        now = datetime(2026, 3, 28, 12, 0, tzinfo=TZ)
        assert chore.compute_next_due(now) is None


class TestIntervalChoreDueRange:
    """Test IntervalChore.compute_due_range()."""

    def test_due_range_with_completion(self):
        """Due range spans from last_completed + interval to + interval + grace."""
        chore = _make_interval(
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

    def test_due_range_never_completed_with_created_at_is_none(self):
        """Due range is None for a never-completed interval chore — created_at is ignored."""
        created = datetime(2026, 3, 27, 12, 0, tzinfo=TZ)
        chore = _make_interval(created_at=created)
        now = datetime(2026, 3, 27, 13, 0, tzinfo=TZ)
        assert chore.compute_due_range(now) is None


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
        assert restored.uid == original.uid
        assert restored.chore_name == original.chore_name
        assert restored.rrule == "FREQ=WEEKLY;BYDAY=MO,WE,FR"
        assert restored.rrule == original.rrule
        assert restored.dtstart == original.dtstart
        assert restored.pending_period == original.pending_period
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
        assert restored.uid == original.uid
        assert restored.interval == original.interval
        assert restored.grace_period == original.grace_period
        assert restored.created_at == original.created_at
        assert restored.last_completed == original.last_completed
        assert restored.trigger_tag_id == "abc-123-uuid"
        assert restored.assigned_to == ["person.tom"]

    def test_new_base_fields_round_trip(self):
        """description and completion_count survive a round-trip."""
        original = _make_scheduled()
        original.description = "Take with food."
        original.completion_count = 7

        restored = BaseChore.from_dict(original.to_dict())

        assert restored.description == "Take with food."
        assert restored.completion_count == 7

    def test_legacy_dict_without_new_fields_loads_defaults(self):
        """A stored dict predating description/completion_count loads with defaults."""
        data = _make_scheduled().to_dict()
        for key in ("description", "completion_count"):
            del data[key]

        restored = BaseChore.from_dict(data)

        assert restored.description is None
        assert restored.completion_count == 0

    def test_from_dict_unknown_type_raises(self):
        """from_dict raises ValueError for unknown chore_type."""
        data = {
            "uid": "x",
            "chore_name": "X",
            "chore_type": "unknown",
            "schedule": {},
        }
        with pytest.raises(ValueError, match="unknown"):
            BaseChore.from_dict(data)

    def test_schedule_description_scheduled(self):
        """schedule_description derives display keys from a daily rrule: full week + time."""
        chore = _make_scheduled()
        desc = chore.schedule_description()
        assert desc["rrule"] == "FREQ=DAILY"
        assert desc["time"] == "08:00:00"
        assert len(desc["active_days"]) == 7

    def test_schedule_description_weekly_derives_days(self):
        """schedule_description derives active_days from a weekly rrule's BYDAY, in order."""
        chore = _make_scheduled(active_days=["fri", "mon"])
        desc = chore.schedule_description()
        assert desc["rrule"] == "FREQ=WEEKLY;BYDAY=FR,MO"
        assert desc["active_days"] == ["fri", "mon"]

    def test_schedule_description_interval(self):
        """schedule_description returns the canonical freq/interval plus windows."""
        chore = _make_interval()
        desc = chore.schedule_description()
        assert desc["freq"] == "daily"
        assert desc["interval"] == 3
        assert desc["grace_period_mins"] == 1440


class TestScheduledRruleRepresentation:
    """Test the {rrule, dtstart} canonical representation and legacy-arg synthesis."""

    def test_legacy_args_synthesize_weekly_rrule(self):
        """active_days synthesizes a weekly BYDAY rrule; time sets dtstart's time-of-day."""
        chore = _make_scheduled(sched_time=time(19, 30), active_days=["mon", "thu"])
        assert chore.rrule == "FREQ=WEEKLY;BYDAY=MO,TH"
        assert chore.dtstart is not None
        assert chore.dtstart.time() == time(19, 30)
        assert chore.dtstart.tzinfo is None

    def test_empty_active_days_synthesizes_daily(self):
        """Empty active_days means every day → FREQ=DAILY."""
        chore = _make_scheduled(active_days=[])
        assert chore.rrule == "FREQ=DAILY"

    def test_dtstart_date_anchors_to_created_at(self):
        """Without an explicit dtstart, its date comes from created_at."""
        chore = ScheduledChore(
            uid="x",
            chore_name="X",
            chore_type=ChoreType.SCHEDULED,
            time=time(8, 0),
            created_at=datetime(2026, 5, 4, 10, 15, tzinfo=TZ),
        )
        assert chore.dtstart == datetime(2026, 5, 4, 8, 0)

    def test_explicit_dtstart_is_canonical(self):
        """An explicit rrule/dtstart pair is stored as-is (naive, seconds zeroed)."""
        chore = ScheduledChore(
            uid="x",
            chore_name="X",
            chore_type=ChoreType.SCHEDULED,
            rrule="FREQ=WEEKLY;BYDAY=SU",
            dtstart=datetime(2026, 5, 3, 9, 0, 30),
        )
        assert chore.rrule == "FREQ=WEEKLY;BYDAY=SU"
        assert chore.dtstart == datetime(2026, 5, 3, 9, 0)

    def test_unsupported_freq_raises(self):
        """FREQ outside DAILY/WEEKLY/MONTHLY/YEARLY is rejected at construction."""
        with pytest.raises(ValueError, match="FREQ"):
            ScheduledChore(
                uid="x",
                chore_name="X",
                chore_type=ChoreType.SCHEDULED,
                rrule="FREQ=MINUTELY",
            )

    @pytest.mark.parametrize("part", ["BYHOUR=9", "BYWEEKNO=3", "BYYEARDAY=100", "WKST=SU"])
    def test_unsupported_rrule_part_raises(self, part):
        """Parts outside the supported subset are rejected at construction.

        dateutil tolerates the full RFC 5545 vocabulary; the integration only
        supports INTERVAL/BYDAY/BYMONTHDAY/BYMONTH/BYSETPOS/COUNT/UNTIL, so an
        out-of-subset part must fail rather than silently change enumeration.
        """
        with pytest.raises(ValueError, match="Unsupported rrule part"):
            ScheduledChore(
                uid="x",
                chore_name="X",
                chore_type=ChoreType.SCHEDULED,
                rrule=f"FREQ=DAILY;{part}",
            )

    def test_supported_rrule_parts_accepted(self):
        """A rule using every supported part constructs cleanly."""
        chore = ScheduledChore(
            uid="x",
            chore_name="X",
            chore_type=ChoreType.SCHEDULED,
            rrule="FREQ=MONTHLY;INTERVAL=2;BYDAY=-1FR;BYMONTHDAY=15;BYMONTH=3;BYSETPOS=-1;COUNT=5",
        )
        assert chore.rrule.startswith("FREQ=MONTHLY")

    def test_from_schedule_v4_shape(self):
        """from_schedule loads the v4 storage shape directly."""
        chore = ScheduledChore.from_schedule(
            {"uid": "x", "chore_name": "X", "chore_type": ChoreType.SCHEDULED},
            {"rrule": "FREQ=WEEKLY;BYDAY=MO,WE,FR", "dtstart": "2026-05-04T08:00:00"},
        )
        assert chore.rrule == "FREQ=WEEKLY;BYDAY=MO,WE,FR"
        assert chore.dtstart == datetime(2026, 5, 4, 8, 0)

    def test_schedule_to_dict_v4_shape(self):
        """_schedule_to_dict serializes the canonical {rrule, dtstart} pair."""
        chore = _make_scheduled(active_days=["mon", "wed", "fri"])
        data = chore.to_dict()
        assert chore.dtstart is not None
        assert data["schedule"] == {
            "rrule": "FREQ=WEEKLY;BYDAY=MO,WE,FR",
            "dtstart": chore.dtstart.isoformat(),
            "persist": False,
        }


class TestScheduledFiniteRules:
    """UNTIL/COUNT lifecycle: terminal-on-exhaustion, revert, skip-past-end."""

    def _count3(self, **kwargs) -> ScheduledChore:
        """Daily chore with exactly three occurrences: Jun 1, 2, 3 2026 at 08:00."""
        return ScheduledChore(
            uid="finite",
            chore_name="Finite",
            chore_type=ChoreType.SCHEDULED,
            rrule="FREQ=DAILY;COUNT=3",
            dtstart=datetime(2026, 6, 1, 8, 0),
            pending_period=timedelta(hours=3),
            grace_period=timedelta(hours=1),
            **kwargs,
        )

    def test_completing_final_occurrence_goes_terminal(self):
        """The third completion of a COUNT=3 rule ends the series."""
        chore = self._count3()
        chore.apply_completion(datetime(2026, 6, 1, 8, 30, tzinfo=TZ), None)
        assert chore.terminal is False
        chore.apply_completion(datetime(2026, 6, 2, 8, 30, tzinfo=TZ), None)
        assert chore.terminal is False
        chore.apply_completion(datetime(2026, 6, 3, 8, 15, tzinfo=TZ), None)
        assert chore.terminal is True

        now = datetime(2026, 6, 4, 12, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.COMPLETED
        assert chore.compute_next_due(now) is None
        assert chore.compute_due_range(now) is None

    def test_until_exhaustion_goes_terminal(self):
        """Completing the final occurrence before UNTIL ends the series."""
        chore = ScheduledChore(
            uid="finite",
            chore_name="Finite",
            chore_type=ChoreType.SCHEDULED,
            rrule="FREQ=DAILY;UNTIL=20260603T235959",
            dtstart=datetime(2026, 6, 1, 8, 0),
            pending_period=timedelta(hours=3),
            grace_period=timedelta(hours=1),
        )
        chore.apply_completion(datetime(2026, 6, 3, 8, 15, tzinfo=TZ), None)
        assert chore.terminal is True

    def test_revert_reopens_the_series(self):
        """Reverting the exhausting completion clears terminal and re-pins the final period."""
        chore = self._count3(last_completed=datetime(2026, 6, 2, 8, 30, tzinfo=TZ))
        chore.apply_completion(datetime(2026, 6, 3, 8, 15, tzinfo=TZ), None)
        assert chore.terminal is True

        chore.revert_completion()
        assert chore.terminal is False
        now = datetime(2026, 6, 3, 10, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.OVERDUE
        assert chore.compute_next_due(now) == datetime(2026, 6, 3, 8, 0, tzinfo=TZ)

    def test_missed_final_occurrence_stays_pinned_overdue(self):
        """An uncompleted exhausted series stays actionable, pinned to the oldest period."""
        chore = self._count3(created_at=datetime(2026, 5, 31, 12, 0, tzinfo=TZ))
        now = datetime(2026, 6, 10, 12, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.OVERDUE
        # Never-completed pinning still applies: the first valid period, not the last.
        assert chore.compute_next_due(now) == datetime(2026, 6, 1, 8, 0, tzinfo=TZ)

    def test_default_skip_past_end_goes_terminal(self):
        """Skipping past the final occurrence exhausts the series."""
        chore = self._count3(last_completed=datetime(2026, 6, 2, 8, 30, tzinfo=TZ))
        result = chore.apply_default_skip(datetime(2026, 6, 3, 6, 0, tzinfo=TZ))
        assert result is None
        assert chore.skipped_until is None
        assert chore.terminal is True

    def test_mid_series_completion_not_terminal(self):
        """Completing a non-final occurrence leaves the series open."""
        chore = self._count3()
        chore.apply_completion(datetime(2026, 6, 2, 8, 30, tzinfo=TZ), None)
        now = datetime(2026, 6, 2, 12, 0, tzinfo=TZ)
        assert chore.terminal is False
        assert chore.compute_next_due(now) == datetime(2026, 6, 3, 8, 0, tzinfo=TZ)

    def test_until_walkback_pins_oldest_uncompleted_when_far_past_until(self):
        """A finite UNTIL rule queried well past UNTIL still walks back to the
        oldest uncompleted occurrence rather than collapsing to dtstart.

        Regression: ``_rebased_dtstart`` rebased UNTIL rules toward ``now``,
        shifting dtstart beyond UNTIL into an empty rule. ``_prev_occurrence``
        then fell back to ``self._start`` (the series start), so the
        walk-back mis-pinned to the first occurrence.
        """
        # Occurrences: Jun 1-5 at 08:00 (UNTIL inclusive of Jun 5 08:00).
        chore = ScheduledChore(
            uid="finite",
            chore_name="Finite",
            chore_type=ChoreType.SCHEDULED,
            rrule="FREQ=DAILY;UNTIL=20260605T080000",
            dtstart=datetime(2026, 6, 1, 8, 0),
            pending_period=timedelta(hours=3),
            grace_period=timedelta(hours=1),
            last_completed=datetime(2026, 6, 2, 8, 30, tzinfo=TZ),
        )
        # Completed Jun 2 → Jun 3 is the oldest uncompleted occurrence.
        # now is well past UNTIL (> two daily steps), the bug's trigger.
        now = datetime(2026, 6, 20, 12, 0, tzinfo=TZ)
        assert chore.compute_next_due(now) == datetime(2026, 6, 3, 8, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.OVERDUE

    def test_persist_round_trips(self):
        """persist survives serialization; stored schedules without it default False."""
        chore = self._count3()
        chore.persist = True
        restored = BaseChore.from_dict(chore.to_dict())
        assert isinstance(restored, ScheduledChore)
        assert restored.persist is True

        data = chore.to_dict()
        del data["schedule"]["persist"]
        restored = BaseChore.from_dict(data)
        assert isinstance(restored, ScheduledChore)
        assert restored.persist is False


class TestScheduledNewRecurrenceShapes:
    """Stage C shapes the legacy model could not express."""

    def _chore(self, rrule: str, dtstart: datetime, **kwargs) -> ScheduledChore:
        return ScheduledChore(
            uid="shape",
            chore_name="Shape",
            chore_type=ChoreType.SCHEDULED,
            rrule=rrule,
            dtstart=dtstart,
            pending_period=timedelta(hours=3),
            grace_period=timedelta(hours=1),
            **kwargs,
        )

    def test_every_other_monday_keeps_phase(self):
        """INTERVAL=2 alternates weeks anchored on dtstart, not on the query date."""
        chore = self._chore(
            "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO",
            datetime(2026, 6, 8, 8, 0),  # A Monday — the "on" week.
            last_completed=datetime(2026, 6, 8, 8, 30, tzinfo=TZ),
        )
        now = datetime(2026, 6, 9, 12, 0, tzinfo=TZ)
        # Next is Jun 22, not Jun 15 — the off week is skipped.
        assert chore.compute_next_due(now) == datetime(2026, 6, 22, 8, 0, tzinfo=TZ)

    def test_last_friday_of_month(self):
        """FREQ=MONTHLY;BYDAY=-1FR resolves the last Friday of each month."""
        chore = self._chore(
            "FREQ=MONTHLY;BYDAY=-1FR",
            datetime(2026, 1, 1, 8, 0),
            created_at=datetime(2026, 3, 1, 12, 0, tzinfo=TZ),
        )
        now = datetime(2026, 3, 10, 12, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.PENDING
        assert chore.compute_next_due(now) == datetime(2026, 3, 27, 8, 0, tzinfo=TZ)

        chore.apply_completion(datetime(2026, 3, 27, 8, 30, tzinfo=TZ), None)
        later = datetime(2026, 3, 28, 12, 0, tzinfo=TZ)
        assert chore.compute_next_due(later) == datetime(2026, 4, 24, 8, 0, tzinfo=TZ)

    def test_seasonal_daily_waits_for_season_opening(self):
        """FREQ=DAILY;BYMONTH=4..10 has no occurrences out of season."""
        chore = self._chore(
            "FREQ=DAILY;BYMONTH=4,5,6,7,8,9,10",
            datetime(2026, 1, 1, 8, 0),
            created_at=datetime(2026, 3, 15, 12, 0, tzinfo=TZ),
        )
        now = datetime(2026, 3, 20, 12, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.PENDING
        assert chore.compute_next_due(now) == datetime(2026, 4, 1, 8, 0, tzinfo=TZ)

    def test_fifteenth_of_each_month(self):
        """FREQ=MONTHLY;BYMONTHDAY=15 walks month boundaries."""
        chore = self._chore(
            "FREQ=MONTHLY;BYMONTHDAY=15",
            datetime(2026, 1, 15, 9, 0),
            last_completed=datetime(2026, 5, 15, 9, 30, tzinfo=TZ),
        )
        now = datetime(2026, 5, 20, 12, 0, tzinfo=TZ)
        assert chore.compute_next_due(now) == datetime(2026, 6, 15, 9, 0, tzinfo=TZ)


class TestIntervalFreqRepresentation:
    """Test the {freq, interval} canonical representation and calendar stepping."""

    def _make(self, freq: str, interval: int, **kwargs) -> IntervalChore:
        return IntervalChore(
            uid="x",
            chore_name="X",
            chore_type=ChoreType.INTERVAL,
            freq=freq,
            interval=interval,
            **kwargs,
        )

    def test_invalid_freq_raises(self):
        """An unknown freq is rejected at construction."""
        with pytest.raises(ValueError, match="freq"):
            self._make("fortnightly", 1)

    def test_zero_interval_rejected(self):
        """interval must be >= 1 — a zero interval never advances the cycle."""
        with pytest.raises(ValueError, match="interval"):
            self._make("minutely", 0)

    def test_monthly_steps_track_the_calendar(self):
        """Monthly intervals step calendar months, clamping at short month ends."""
        chore = self._make("monthly", 1, last_completed=datetime(2026, 1, 31, 9, 0, tzinfo=TZ))
        now = datetime(2026, 2, 1, 9, 0, tzinfo=TZ)
        assert chore.compute_next_due(now) == datetime(2026, 2, 28, 9, 0, tzinfo=TZ)

    def test_quarterly_next_due(self):
        """An "after 3 months" chore lands three calendar months out."""
        chore = self._make("monthly", 3, last_completed=datetime(2026, 3, 15, 9, 0, tzinfo=TZ))
        now = datetime(2026, 3, 16, 9, 0, tzinfo=TZ)
        assert chore.compute_next_due(now) == datetime(2026, 6, 15, 9, 0, tzinfo=TZ)

    def test_yearly_next_due(self):
        """Yearly intervals step calendar years."""
        chore = self._make("yearly", 1, last_completed=datetime(2026, 3, 15, 9, 0, tzinfo=TZ))
        now = datetime(2026, 3, 16, 9, 0, tzinfo=TZ)
        assert chore.compute_next_due(now) == datetime(2027, 3, 15, 9, 0, tzinfo=TZ)

    def test_default_skip_slides_by_calendar_step(self):
        """apply_default_skip advances by one calendar step from now."""
        chore = self._make("monthly", 3, last_completed=datetime(2026, 3, 15, 9, 0, tzinfo=TZ))
        now = datetime(2026, 3, 20, 10, 0, tzinfo=TZ)
        assert chore.apply_default_skip(now) == datetime(2026, 6, 20, 10, 0, tzinfo=TZ)
        assert chore.skipped_until == datetime(2026, 6, 20, 10, 0, tzinfo=TZ)

    def test_round_trip_v5_shape(self):
        """{freq, interval} survives a to_dict/from_dict round-trip."""
        original = self._make("monthly", 3)
        data = original.to_dict()
        assert data["schedule"] == {"freq": "monthly", "interval": 3, "persist": False}

        restored = BaseChore.from_dict(data)
        assert isinstance(restored, IntervalChore)
        assert (restored.freq, restored.interval) == ("monthly", 3)

    def test_schedule_description_has_no_derived_keys(self):
        """The description is the canonical shape — no legacy interval_mins."""
        chore = self._make("monthly", 3)
        desc = chore.schedule_description()
        assert desc["freq"] == "monthly"
        assert desc["interval"] == 3
        assert "interval_mins" not in desc


# Season window: October through March.
OCT_MAR = [10, 11, 12, 1, 2, 3]


class TestIntervalSeasonality:
    """bymonth excision clock — out-of-season months don't count (§2)."""

    def _make(self, freq: str, interval: int, bymonth: list[int], **kwargs) -> IntervalChore:
        return IntervalChore(
            uid="seasonal",
            chore_name="Seasonal",
            chore_type=ChoreType.INTERVAL,
            freq=freq,
            interval=interval,
            bymonth=bymonth,
            **kwargs,
        )

    def test_sub_monthly_carries_remainder_across_closed_months(self):
        """The plan's example: 5 days with 2 in-season days left lands 3 days
        into the next allowed month."""
        chore = self._make("daily", 5, [3, 5], last_completed=datetime(2026, 3, 30, 0, 0, tzinfo=TZ))
        now = datetime(2026, 3, 30, 1, 0, tzinfo=TZ)
        assert chore.compute_next_due(now) == datetime(2026, 5, 4, 0, 0, tzinfo=TZ)

    def test_sub_monthly_exact_boundary_lands_at_season_opening(self):
        """An interval consuming exactly the remaining in-season time lands at the opening."""
        chore = self._make("daily", 2, [3, 5], last_completed=datetime(2026, 3, 30, 0, 0, tzinfo=TZ))
        now = datetime(2026, 3, 30, 1, 0, tzinfo=TZ)
        assert chore.compute_next_due(now) == datetime(2026, 5, 1, 0, 0, tzinfo=TZ)

    def test_sub_monthly_in_season_is_plain_addition(self):
        """Fully in-season intervals behave exactly like the season-less model."""
        chore = self._make("daily", 5, [3], last_completed=datetime(2026, 3, 10, 9, 0, tzinfo=TZ))
        now = datetime(2026, 3, 10, 10, 0, tzinfo=TZ)
        assert chore.compute_next_due(now) == datetime(2026, 3, 15, 9, 0, tzinfo=TZ)

    def test_out_of_season_completion_starts_clock_at_opening(self):
        """A completion in a closed month anchors at the next season opening."""
        chore = self._make("daily", 3, [10], last_completed=datetime(2026, 8, 15, 12, 0, tzinfo=TZ))
        now = datetime(2026, 8, 15, 13, 0, tzinfo=TZ)
        assert chore.compute_next_due(now) == datetime(2026, 10, 4, 0, 0, tzinfo=TZ)

    def test_monthly_steps_count_allowed_months_only(self):
        """The plan's example: every 2 months, Oct-Mar, completed Feb 10 → Oct 10."""
        chore = self._make("monthly", 2, OCT_MAR, last_completed=datetime(2026, 2, 10, 9, 0, tzinfo=TZ))
        now = datetime(2026, 2, 11, 9, 0, tzinfo=TZ)
        assert chore.compute_next_due(now) == datetime(2026, 10, 10, 9, 0, tzinfo=TZ)

    def test_monthly_out_of_season_anchor_slides_to_opening(self):
        """An out-of-season monthly completion counts months from the opening."""
        chore = self._make("monthly", 1, OCT_MAR, last_completed=datetime(2026, 7, 10, 9, 0, tzinfo=TZ))
        now = datetime(2026, 7, 11, 9, 0, tzinfo=TZ)
        # Clock starts at the Oct opening; one allowed month later is Nov.
        assert chore.compute_next_due(now) == datetime(2026, 11, 10, 9, 0, tzinfo=TZ)

    def test_monthly_clamps_day_to_target_month(self):
        """Day-of-month clamps when the target month is shorter."""
        chore = self._make("monthly", 1, [1, 2], last_completed=datetime(2026, 1, 31, 9, 0, tzinfo=TZ))
        now = datetime(2026, 2, 1, 9, 0, tzinfo=TZ)
        assert chore.compute_next_due(now) == datetime(2026, 2, 28, 9, 0, tzinfo=TZ)

    def test_yearly_out_of_season_shifts_to_allowed_month(self):
        """A yearly chore completed out of season lands in the allowed month."""
        chore = self._make("yearly", 1, [3], last_completed=datetime(2026, 6, 15, 9, 0, tzinfo=TZ))
        now = datetime(2026, 6, 16, 9, 0, tzinfo=TZ)
        assert chore.compute_next_due(now) == datetime(2028, 3, 15, 9, 0, tzinfo=TZ)

    def test_yearly_in_season_steps_plainly(self):
        """An in-season yearly anchor stays in its month."""
        chore = self._make("yearly", 1, OCT_MAR, last_completed=datetime(2026, 11, 5, 9, 0, tzinfo=TZ))
        now = datetime(2026, 11, 6, 9, 0, tzinfo=TZ)
        assert chore.compute_next_due(now) == datetime(2027, 11, 5, 9, 0, tzinfo=TZ)

    def test_excision_is_wall_clock_across_dst(self):
        """The excision walk reads wall time — a DST transition inside the
        window doesn't shift the due time."""
        ny = ZoneInfo("America/New_York")
        # Season closes after March; spring-forward is Mar 8 2026.
        chore = self._make("daily", 5, [3, 5], last_completed=datetime(2026, 3, 6, 22, 0, tzinfo=ny))
        now = datetime(2026, 3, 7, 0, 0, tzinfo=ny)
        # 5 wall days later, same wall time, despite the lost hour.
        assert chore.compute_next_due(now) == datetime(2026, 3, 11, 22, 0, tzinfo=ny)

    def test_default_skip_slide_is_season_filtered(self):
        """The default-skip slide honors the season window."""
        chore = self._make("daily", 3, [3, 5], last_completed=datetime(2026, 3, 1, 0, 0, tzinfo=TZ))
        result = chore.apply_default_skip(datetime(2026, 3, 30, 0, 0, tzinfo=TZ))
        # 2 in-season days remain in March; the third lands May 1 + 1 day.
        assert result == datetime(2026, 5, 2, 0, 0, tzinfo=TZ)
        assert chore.skipped_until == result


class TestIntervalLifecycle:
    """until/count end conditions — terminal + persist, mirroring the other types."""

    def _make(self, **kwargs) -> IntervalChore:
        return IntervalChore(
            uid="finite",
            chore_name="Finite",
            chore_type=ChoreType.INTERVAL,
            freq="daily",
            interval=3,
            **kwargs,
        )

    def test_until_exhaustion_goes_terminal(self):
        """A completion whose next due exceeds until ends the series."""
        chore = self._make(until=datetime(2026, 6, 10, 0, 0))
        chore.apply_completion(datetime(2026, 6, 5, 9, 0, tzinfo=TZ), None)
        assert chore.terminal is False

        chore.apply_completion(datetime(2026, 6, 8, 9, 0, tzinfo=TZ), None)
        assert chore.terminal is True
        now = datetime(2026, 6, 9, 9, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.COMPLETED
        assert chore.compute_next_due(now) is None
        assert chore.compute_due_range(now) is None

    def test_count_reads_completion_count(self):
        """The Nth completion ends the series; revert reopens it."""
        chore = self._make(count=2)
        chore.apply_completion(datetime(2026, 6, 1, 9, 0, tzinfo=TZ), None)
        assert chore.terminal is False
        chore.apply_completion(datetime(2026, 6, 4, 9, 0, tzinfo=TZ), None)
        assert chore.terminal is True

        chore.revert_completion()
        assert chore.terminal is False
        assert chore.completion_count == 1

    def test_default_skip_past_until_goes_terminal(self):
        """Sliding past until exhausts the series and clears the skip anchor."""
        chore = self._make(until=datetime(2026, 6, 10, 0, 0), last_completed=datetime(2026, 6, 5, 9, 0, tzinfo=TZ))
        result = chore.apply_default_skip(datetime(2026, 6, 8, 9, 0, tzinfo=TZ))
        assert result is None
        assert chore.skipped_until is None
        assert chore.terminal is True

    def test_season_and_end_fields_round_trip(self):
        """bymonth/until/count/persist survive serialization, sparse when unset."""
        chore = self._make(bymonth=[10, 11], until=datetime(2027, 3, 31, 23, 59, 59), persist=True)
        data = chore.to_dict()
        assert data["schedule"] == {
            "freq": "daily",
            "interval": 3,
            "persist": True,
            "bymonth": [10, 11],
            "until": "2027-03-31T23:59:59",
        }
        restored = BaseChore.from_dict(data)
        assert isinstance(restored, IntervalChore)
        assert restored.bymonth == [10, 11]
        assert restored.until == datetime(2027, 3, 31, 23, 59, 59)
        assert restored.count is None
        assert restored.persist is True

    def test_invalid_bymonth_raises(self):
        """Month numbers outside 1-12 are rejected at construction."""
        with pytest.raises(ValueError, match="bymonth"):
            self._make(bymonth=[13])


class TestCompletionUndoSlot:
    """Test apply_completion / revert_completion lifecycle."""

    def test_apply_completion_stores_previous(self):
        """apply_completion saves prior state into the undo slot."""
        initial = datetime(2026, 3, 30, 7, 0, tzinfo=TZ)
        chore = _make_interval(last_completed=initial)
        chore.last_completed_by = "person.alice"

        second = datetime(2026, 3, 31, 7, 0, tzinfo=TZ)
        chore.apply_completion(second, "person.bob")

        assert chore.last_completed == second
        assert chore.last_completed_by == "person.bob"
        assert chore.previous_last_completed == initial
        assert chore.previous_last_completed_by == "person.alice"

    def test_revert_completion_restores_previous(self):
        """revert_completion restores prior state and clears the slot."""
        initial = datetime(2026, 3, 30, 7, 0, tzinfo=TZ)
        chore = _make_interval(last_completed=initial)
        chore.last_completed_by = "person.alice"

        chore.apply_completion(datetime(2026, 3, 31, 7, 0, tzinfo=TZ), "person.bob")
        chore.revert_completion()

        assert chore.last_completed == initial
        assert chore.last_completed_by == "person.alice"
        assert chore.previous_last_completed is None
        assert chore.previous_last_completed_by is None

    def test_revert_first_completion_clears_to_none(self):
        """Reverting the first-ever completion clears last_completed to None."""
        chore = _make_interval()
        chore.last_completed = None
        chore.last_completed_by = None

        chore.apply_completion(datetime(2026, 3, 31, 7, 0, tzinfo=TZ), "person.bob")
        chore.revert_completion()

        assert chore.last_completed is None
        assert chore.last_completed_by is None
        assert chore.previous_last_completed is None
        assert chore.previous_last_completed_by is None

    def test_completion_count_increments_and_reverts_symmetrically(self):
        """apply_completion increments the counter; revert_completion decrements it."""
        chore = _make_interval()
        assert chore.completion_count == 0

        chore.apply_completion(datetime(2026, 3, 30, 7, 0, tzinfo=TZ), "person.alice")
        assert chore.completion_count == 1

        chore.apply_completion(datetime(2026, 3, 31, 7, 0, tzinfo=TZ), "person.bob")
        assert chore.completion_count == 2

        chore.revert_completion()
        assert chore.completion_count == 1

    def test_completion_count_revert_floors_at_zero(self):
        """Reverting a completion loaded from a pre-counter store does not go negative."""
        # Legacy shape: last_completed set, but counter backfilled to zero.
        chore = _make_interval(last_completed=datetime(2026, 3, 30, 7, 0, tzinfo=TZ))
        assert chore.completion_count == 0

        chore.revert_completion()
        assert chore.completion_count == 0

    def test_revert_without_completion_raises(self):
        """revert_completion raises when there is nothing to revert."""
        chore = _make_interval()
        chore.last_completed = None
        chore.last_completed_by = None

        with pytest.raises(ValueError, match="no completion"):
            chore.revert_completion()

    def test_undo_slot_survives_round_trip(self):
        """previous_last_completed / _by are serialized and restored."""
        initial = datetime(2026, 3, 30, 7, 0, tzinfo=TZ)
        chore = _make_interval(last_completed=initial)
        chore.last_completed_by = "person.alice"
        chore.apply_completion(datetime(2026, 3, 31, 7, 0, tzinfo=TZ), "person.bob")

        restored = BaseChore.from_dict(chore.to_dict())

        assert restored.previous_last_completed == initial
        assert restored.previous_last_completed_by == "person.alice"


# ---------------------------------------------------------------------------
# Skip semantics
# ---------------------------------------------------------------------------


class TestScheduledChoreSkip:
    """Test ScheduledChore skip behavior — skipped_until as operative anchor."""

    def test_apply_default_skip_is_next_active_day(self):
        """Default skip sets skipped_until to the next active day's period-due."""
        chore = _make_scheduled(active_days=["mon", "wed", "fri"])
        # 2026-03-30 is Monday — current period is Mon 08:00.
        now = datetime(2026, 3, 30, 10, 0, tzinfo=TZ)
        # Next active day after Monday is Wednesday (Apr 1) 08:00.
        result = chore.apply_default_skip(now)
        expected = datetime(2026, 4, 1, 8, 0, tzinfo=TZ)
        assert result == expected
        assert chore.skipped_until == expected

    def test_apply_default_skip_advances_past_now_for_overdue(self):
        """For an overdue chore pinned in the past, default walks forward past now."""
        chore = _make_scheduled(
            last_completed=datetime(2026, 3, 28, 7, 0, tzinfo=TZ),  # Sat, 2 days ago
        )
        # now = Mon 14:00. _find_current_period pins to Sun (yesterday) because
        # Sun is also uncompleted; next active day after Sun is today Mon 08:00,
        # which is already in the past. Default must walk forward to Tue 08:00.
        now = datetime(2026, 3, 30, 14, 0, tzinfo=TZ)
        result = chore.apply_default_skip(now)
        expected = datetime(2026, 3, 31, 8, 0, tzinfo=TZ)
        assert result == expected
        assert chore.skipped_until == expected

    def test_apply_default_skip_advances_existing_skip_in_pending(self):
        """A follow-up default skip during the skip-anchor's pending window advances by one occurrence.

        Regression: previously the walk started from the *natural* period
        (anchored on ``last_completed``), so a chore in the skip-anchor's
        pending window walked to the same active day the existing
        ``skipped_until`` already pointed at — a no-op. Starting the walk
        from the operative anchor (``skipped_until`` when active) advances
        by one full active-day step instead.
        """
        chore = _make_scheduled(
            last_completed=datetime(2026, 3, 30, 8, 0, tzinfo=TZ),  # Mon
            # First skip already pushed next due to Wed 08:00.
        )
        chore.skipped_until = datetime(2026, 4, 1, 8, 0, tzinfo=TZ)
        # Wed 06:00 — inside the skip anchor's pending window (05:00–08:00).
        now = datetime(2026, 4, 1, 6, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.PENDING

        result = chore.apply_default_skip(now)
        expected = datetime(2026, 4, 2, 8, 0, tzinfo=TZ)
        assert result == expected
        assert chore.skipped_until == expected
        assert chore.compute_status(now) == ChoreStatus.COMPLETED

    def test_skip_from_overdue_transitions_to_completed(self):
        """Calling skip on an OVERDUE chore flips status to COMPLETED via skipped_until."""
        chore = _make_scheduled(
            last_completed=datetime(2026, 3, 28, 7, 0, tzinfo=TZ),
        )
        now = datetime(2026, 3, 30, 14, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.OVERDUE

        chore.apply_default_skip(now)
        assert chore.compute_status(now) == ChoreStatus.COMPLETED
        assert chore.compute_next_due(now) == datetime(2026, 3, 31, 8, 0, tzinfo=TZ)

    def test_status_completed_during_skip_before_pending_window(self):
        """While the skip is active and we haven't reached its pending window, status is COMPLETED."""
        chore = _make_scheduled()
        # Skip to Apr 2 08:00; pending_at = Apr 2 05:00.
        chore.skipped_until = datetime(2026, 4, 2, 8, 0, tzinfo=TZ)
        now = datetime(2026, 3, 31, 12, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.COMPLETED

    def test_status_pending_inside_skip_pending_window(self):
        """Inside the skip's pending window, status flips to PENDING."""
        chore = _make_scheduled()
        chore.skipped_until = datetime(2026, 4, 2, 8, 0, tzinfo=TZ)
        # 06:00 — within pending window (starts at 05:00), before due (08:00).
        now = datetime(2026, 4, 2, 6, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.PENDING

    def test_status_due_at_skipped_until(self):
        """At skipped_until, status is DUE."""
        chore = _make_scheduled()
        chore.skipped_until = datetime(2026, 4, 2, 8, 0, tzinfo=TZ)
        now = datetime(2026, 4, 2, 8, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.DUE

    def test_status_due_within_skip_grace(self):
        """Past skipped_until but within grace period, status is DUE (skip has no OVERDUE state)."""
        chore = _make_scheduled()
        chore.skipped_until = datetime(2026, 4, 2, 8, 0, tzinfo=TZ)
        # 30 minutes past due, within the 60-minute default grace.
        now = datetime(2026, 4, 2, 8, 30, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.DUE

    def test_status_after_skip_grace_falls_through(self):
        """Once the skip's grace period fully elapses, normal schedule logic resumes."""
        chore = _make_scheduled()
        # Skipped to a date three days back — all of the skip window has passed.
        chore.skipped_until = datetime(2026, 3, 27, 8, 0, tzinfo=TZ)
        # Never-completed chore on a fresh day: normal logic returns PENDING
        # in the early window of today's period.
        now = datetime(2026, 3, 30, 6, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.PENDING

    def test_next_due_returns_skipped_until(self):
        """compute_next_due returns skipped_until while skip is live."""
        chore = _make_scheduled()
        skipped = datetime(2026, 4, 2, 8, 0, tzinfo=TZ)
        chore.skipped_until = skipped
        now = datetime(2026, 3, 31, 12, 0, tzinfo=TZ)
        assert chore.compute_next_due(now) == skipped

    def test_due_range_uses_skipped_until(self):
        """compute_due_range anchors on skipped_until while skip is live."""
        chore = _make_scheduled(grace_period_mins=60)
        skipped = datetime(2026, 4, 2, 8, 0, tzinfo=TZ)
        chore.skipped_until = skipped
        now = datetime(2026, 3, 31, 12, 0, tzinfo=TZ)
        result = chore.compute_due_range(now)
        assert result == (skipped, datetime(2026, 4, 2, 9, 0, tzinfo=TZ))

    def test_overdue_after_skip_anchors_on_skipped_until(self):
        """A skipped scheduled chore that goes overdue stays anchored on skipped_until.

        Regression: previously the skip anchor was dropped at
        ``skipped_until + grace_period``, which let the operative anchor
        snap back to the pinned overdue period (anchored on a stale
        ``last_completed``). ``compute_next_due`` then reported that older
        period and the card's "overdue by" jumped backward in time.
        """
        chore = _make_scheduled(
            last_completed=datetime(2026, 3, 25, 8, 30, tzinfo=TZ),
        )
        # Skip moves due to Apr 2 08:00 (skip target later than the
        # pinned overdue period from last_completed).
        skipped = datetime(2026, 4, 2, 8, 0, tzinfo=TZ)
        chore.skipped_until = skipped
        # One minute past skipped_until + grace (1 hour default).
        now = datetime(2026, 4, 2, 9, 1, tzinfo=TZ)

        assert chore.compute_status(now) == ChoreStatus.OVERDUE
        assert chore.compute_next_due(now) == skipped


class TestIntervalChoreSkip:
    """Test IntervalChore skip behavior."""

    def test_apply_default_skip_is_now_plus_interval(self):
        """Default skip sets skipped_until to now + interval."""
        chore = _make_interval()  # 3 days
        now = datetime(2026, 3, 30, 12, 0, tzinfo=TZ)
        expected = datetime(2026, 4, 2, 12, 0, tzinfo=TZ)
        result = chore.apply_default_skip(now)
        assert result == expected
        assert chore.skipped_until == expected

    def test_status_completed_before_skipped_until(self):
        """While skip is active and we haven't reached skipped_until, status is COMPLETED."""
        chore = _make_interval()
        chore.skipped_until = datetime(2026, 4, 2, 12, 0, tzinfo=TZ)
        now = datetime(2026, 3, 31, 12, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.COMPLETED

    def test_status_due_at_skipped_until(self):
        """At skipped_until, status flips to DUE."""
        chore = _make_interval()
        chore.skipped_until = datetime(2026, 4, 2, 12, 0, tzinfo=TZ)
        now = datetime(2026, 4, 2, 12, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.DUE

    def test_status_due_within_skip_grace(self):
        """Past skipped_until but within grace, status is DUE (skip has no OVERDUE state)."""
        chore = _make_interval(grace_period_mins=1440)  # 1 day
        chore.skipped_until = datetime(2026, 4, 2, 12, 0, tzinfo=TZ)
        # 12 hours past skipped_until, within the 1-day grace.
        now = datetime(2026, 4, 3, 0, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.DUE

    def test_status_after_skip_grace_falls_through(self):
        """Once the skip's grace fully elapses, last_completed logic resumes."""
        chore = _make_interval(
            last_completed=datetime(2026, 3, 27, 12, 0, tzinfo=TZ),
        )
        # Skip fully expired (far in the past).
        chore.skipped_until = datetime(2026, 3, 25, 12, 0, tzinfo=TZ)
        now = datetime(2026, 3, 30, 12, 0, tzinfo=TZ)
        # Normal logic: last_completed 3 days ago, interval 3 days → DUE.
        assert chore.compute_status(now) == ChoreStatus.DUE

    def test_next_due_returns_skipped_until(self):
        """compute_next_due returns skipped_until while skip is live."""
        chore = _make_interval()
        skipped = datetime(2026, 4, 2, 12, 0, tzinfo=TZ)
        chore.skipped_until = skipped
        now = datetime(2026, 3, 30, 12, 0, tzinfo=TZ)
        assert chore.compute_next_due(now) == skipped

    def test_due_range_uses_skipped_until(self):
        """compute_due_range anchors on skipped_until while skip is live."""
        chore = _make_interval(grace_period_mins=1440)  # 1 day
        skipped = datetime(2026, 4, 2, 12, 0, tzinfo=TZ)
        chore.skipped_until = skipped
        now = datetime(2026, 3, 30, 12, 0, tzinfo=TZ)
        result = chore.compute_due_range(now)
        assert result == (skipped, datetime(2026, 4, 3, 12, 0, tzinfo=TZ))

    def test_overdue_after_skip_anchors_on_skipped_until(self):
        """A skipped interval chore that goes overdue stays anchored on skipped_until.

        Regression: previously the skip anchor was dropped at
        ``skipped_until + grace_period``, which let the operative anchor
        snap back to ``last_completed + interval`` (often weeks earlier).
        ``compute_next_due`` then reported a stale value and the card's
        "overdue by" jumped to that gap instead of starting at zero.
        """
        chore = _make_interval(
            last_completed=datetime(2026, 3, 20, 12, 0, tzinfo=TZ),
        )
        # Skip moves due to 3/30 12:00 (well past last_completed + interval = 3/23).
        skipped = datetime(2026, 3, 30, 12, 0, tzinfo=TZ)
        chore.skipped_until = skipped
        # One minute past skipped_until + grace (1 day default).
        now = datetime(2026, 3, 31, 12, 1, tzinfo=TZ)

        assert chore.compute_status(now) == ChoreStatus.OVERDUE
        assert chore.compute_next_due(now) == skipped


class TestSkipUndoInteraction:
    """Test apply_completion / revert_completion with skip semantics."""

    def test_complete_clears_skip_by_default(self):
        """Default completion clears skipped_until and saves it to the undo slot."""
        chore = _make_interval()
        skipped = datetime(2026, 4, 2, 12, 0, tzinfo=TZ)
        chore.skipped_until = skipped

        chore.apply_completion(datetime(2026, 3, 31, 10, 0, tzinfo=TZ), "person.alice")

        assert chore.skipped_until is None
        assert chore.previous_skipped_until == skipped

    def test_complete_with_keep_skip_preserves(self):
        """apply_completion(clear_skip=False) preserves skipped_until and leaves undo empty."""
        chore = _make_interval()
        skipped = datetime(2026, 4, 2, 12, 0, tzinfo=TZ)
        chore.skipped_until = skipped

        chore.apply_completion(
            datetime(2026, 3, 31, 10, 0, tzinfo=TZ),
            "person.alice",
            clear_skip=False,
        )

        assert chore.skipped_until == skipped
        assert chore.previous_skipped_until is None

    def test_revert_restores_skipped_until(self):
        """revert_completion restores skipped_until from the undo slot."""
        chore = _make_interval()
        skipped = datetime(2026, 4, 2, 12, 0, tzinfo=TZ)
        chore.skipped_until = skipped

        chore.apply_completion(datetime(2026, 3, 31, 10, 0, tzinfo=TZ), "person.alice")
        chore.revert_completion()

        assert chore.skipped_until == skipped
        assert chore.previous_skipped_until is None

    def test_skip_fields_survive_round_trip(self):
        """skipped_until and previous_skipped_until are serialized and restored."""
        chore = _make_interval(last_completed=datetime(2026, 3, 30, 7, 0, tzinfo=TZ))
        chore.skipped_until = datetime(2026, 4, 2, 12, 0, tzinfo=TZ)
        chore.previous_skipped_until = datetime(2026, 3, 25, 12, 0, tzinfo=TZ)

        restored = BaseChore.from_dict(chore.to_dict())

        assert restored.skipped_until == chore.skipped_until
        assert restored.previous_skipped_until == chore.previous_skipped_until
