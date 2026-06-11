"""Characterization matrix for ScheduledChore — the behavioral spec for the RRULE rewrite.

These tests pin exact ``(status, next_due, due_range)`` tuples for the current
``ScheduledChore`` implementation across the scenarios most at risk in a
representation swap: created_at pinning, completion walk-back, skip-anchor
interactions (#20, #24), week wrap, DST transitions, pending windows crossing
midnight, and year boundaries.

**Stage B contract:** the internal rewrite to ``{rrule, dtstart}`` must pass
this file byte-for-byte unchanged. Deliberate quirks of the current model are
pinned on purpose (see individual case notes) — if Stage B wants to diverge
from one, that is a design conversation, not a test edit.
"""

from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest

from custom_components.chore_calendar.const import ChoreStatus, ChoreType
from custom_components.chore_calendar.models import ScheduledChore

# Fixed offset for non-DST cases (matches test_models.py).
TZ = timezone(timedelta(hours=-5))
# Real zone for DST cases. 2026 transitions: spring forward Mar 8, fall back Nov 1.
NY = ZoneInfo("America/New_York")


def _chore(
    *,
    sched_time: time = time(8, 0),
    active_days: list[str] | None = None,
    pending_period_mins: int = 180,
    grace_period_mins: int = 60,
    created_at: datetime | None = None,
    last_completed: datetime | None = None,
    skipped_until: datetime | None = None,
) -> ScheduledChore:
    """Create a ScheduledChore with the matrix defaults (08:00, 3h pending, 1h grace)."""
    return ScheduledChore(
        uid="char_chore",
        chore_name="Characterization Chore",
        chore_type=ChoreType.SCHEDULED,
        time=sched_time,
        active_days=active_days or [],
        pending_period=timedelta(minutes=pending_period_mins),
        grace_period=timedelta(minutes=grace_period_mins),
        created_at=created_at,
        last_completed=last_completed,
        skipped_until=skipped_until,
    )


# Each case: (chore kwargs, now, expected status, expected next_due, expected due_range).
# Reference week: Mon 2026-03-30 … Sun 2026-04-05 unless the scenario says otherwise.
MATRIX = [
    # --- Never-completed pinning relative to created_at (daily) ---------------
    pytest.param(
        {"created_at": datetime(2026, 3, 30, 2, 0, tzinfo=TZ)},
        datetime(2026, 3, 30, 6, 0, tzinfo=TZ),
        ChoreStatus.PENDING,
        datetime(2026, 3, 30, 8, 0, tzinfo=TZ),
        (datetime(2026, 3, 30, 8, 0, tzinfo=TZ), datetime(2026, 3, 30, 9, 0, tzinfo=TZ)),
        id="created-before-first-pending-window",
    ),
    pytest.param(
        {"created_at": datetime(2026, 3, 30, 6, 30, tzinfo=TZ)},
        datetime(2026, 3, 30, 7, 0, tzinfo=TZ),
        ChoreStatus.PENDING,
        datetime(2026, 3, 30, 8, 0, tzinfo=TZ),
        (datetime(2026, 3, 30, 8, 0, tzinfo=TZ), datetime(2026, 3, 30, 9, 0, tzinfo=TZ)),
        id="created-inside-first-pending-window",
    ),
    pytest.param(
        # Created after today's period_due — first valid period is tomorrow's.
        {"created_at": datetime(2026, 3, 30, 8, 30, tzinfo=TZ)},
        datetime(2026, 3, 30, 12, 0, tzinfo=TZ),
        ChoreStatus.PENDING,
        datetime(2026, 3, 31, 8, 0, tzinfo=TZ),
        (datetime(2026, 3, 31, 8, 0, tzinfo=TZ), datetime(2026, 3, 31, 9, 0, tzinfo=TZ)),
        id="created-after-period-due-pins-to-next-period",
    ),
    pytest.param(
        # Missed first period stays pinned OVERDUE days later — no silent roll.
        {"created_at": datetime(2026, 3, 30, 4, 0, tzinfo=TZ)},
        datetime(2026, 4, 1, 12, 0, tzinfo=TZ),
        ChoreStatus.OVERDUE,
        datetime(2026, 3, 30, 8, 0, tzinfo=TZ),
        (datetime(2026, 3, 30, 8, 0, tzinfo=TZ), datetime(2026, 3, 30, 9, 0, tzinfo=TZ)),
        id="never-completed-missed-stays-pinned-overdue",
    ),
    pytest.param(
        {"created_at": datetime(2026, 3, 30, 6, 30, tzinfo=TZ)},
        datetime(2026, 3, 30, 9, 30, tzinfo=TZ),
        ChoreStatus.OVERDUE,
        datetime(2026, 3, 30, 8, 0, tzinfo=TZ),
        (datetime(2026, 3, 30, 8, 0, tzinfo=TZ), datetime(2026, 3, 30, 9, 0, tzinfo=TZ)),
        id="created-inside-window-now-overdue",
    ),
    # --- Completion walk-back over missed periods -----------------------------
    pytest.param(
        # Completed Fri Mar 27; Sat 28 and Sun 29 missed. Pinned to the OLDEST
        # uncompleted period (Sat 28), not the most recent one.
        {"last_completed": datetime(2026, 3, 27, 8, 30, tzinfo=TZ)},
        datetime(2026, 3, 30, 10, 0, tzinfo=TZ),
        ChoreStatus.OVERDUE,
        datetime(2026, 3, 28, 8, 0, tzinfo=TZ),
        (datetime(2026, 3, 28, 8, 0, tzinfo=TZ), datetime(2026, 3, 28, 9, 0, tzinfo=TZ)),
        id="walkback-daily-two-missed-pins-oldest",
    ),
    pytest.param(
        # Mon/Wed/Fri chore completed Mon Mar 23; Wed 25 and Fri 27 missed.
        # Pinned to Wed Mar 25 — the walk respects active days.
        {"active_days": ["mon", "wed", "fri"], "last_completed": datetime(2026, 3, 23, 8, 15, tzinfo=TZ)},
        datetime(2026, 3, 30, 6, 0, tzinfo=TZ),
        ChoreStatus.OVERDUE,
        datetime(2026, 3, 25, 8, 0, tzinfo=TZ),
        (datetime(2026, 3, 25, 8, 0, tzinfo=TZ), datetime(2026, 3, 25, 9, 0, tzinfo=TZ)),
        id="walkback-mwf-pins-oldest-active-day",
    ),
    pytest.param(
        # Completed in the current period: next_due advances to tomorrow but
        # due_range stays on the satisfied period — pinned asymmetry.
        {"last_completed": datetime(2026, 3, 30, 7, 0, tzinfo=TZ)},
        datetime(2026, 3, 30, 10, 0, tzinfo=TZ),
        ChoreStatus.COMPLETED,
        datetime(2026, 3, 31, 8, 0, tzinfo=TZ),
        (datetime(2026, 3, 30, 8, 0, tzinfo=TZ), datetime(2026, 3, 30, 9, 0, tzinfo=TZ)),
        id="completed-current-period-next-due-advances-range-stays",
    ),
    pytest.param(
        # Completed early in the pending window, still before period_due:
        # next_due reports TODAY's period_due even though it is satisfied.
        {"last_completed": datetime(2026, 3, 30, 5, 30, tzinfo=TZ)},
        datetime(2026, 3, 30, 6, 0, tzinfo=TZ),
        ChoreStatus.COMPLETED,
        datetime(2026, 3, 30, 8, 0, tzinfo=TZ),
        (datetime(2026, 3, 30, 8, 0, tzinfo=TZ), datetime(2026, 3, 30, 9, 0, tzinfo=TZ)),
        id="completed-early-next-due-is-satisfied-period",
    ),
    # --- Skip anchor (#20) -----------------------------------------------------
    pytest.param(
        # Skip active, before its pending window: dormant COMPLETED.
        {
            "last_completed": datetime(2026, 3, 29, 8, 30, tzinfo=TZ),
            "skipped_until": datetime(2026, 4, 2, 8, 0, tzinfo=TZ),
        },
        datetime(2026, 3, 31, 12, 0, tzinfo=TZ),
        ChoreStatus.COMPLETED,
        datetime(2026, 4, 2, 8, 0, tzinfo=TZ),
        (datetime(2026, 4, 2, 8, 0, tzinfo=TZ), datetime(2026, 4, 2, 9, 0, tzinfo=TZ)),
        id="skip-active-dormant-completed",
    ),
    pytest.param(
        # Skip held through OVERDUE (#20): past skipped_until + grace the chore
        # goes OVERDUE anchored on skipped_until, not the stale natural period.
        {
            "last_completed": datetime(2026, 3, 29, 8, 30, tzinfo=TZ),
            "skipped_until": datetime(2026, 4, 2, 8, 0, tzinfo=TZ),
        },
        datetime(2026, 4, 2, 9, 30, tzinfo=TZ),
        ChoreStatus.OVERDUE,
        datetime(2026, 4, 2, 8, 0, tzinfo=TZ),
        (datetime(2026, 4, 2, 8, 0, tzinfo=TZ), datetime(2026, 4, 2, 9, 0, tzinfo=TZ)),
        id="skip-held-through-overdue",
    ),
    pytest.param(
        # Skip overtaken by the natural anchor: a stale skipped_until in the
        # past falls through to normal scheduling.
        {
            "created_at": datetime(2026, 3, 29, 2, 0, tzinfo=TZ),
            "skipped_until": datetime(2026, 3, 28, 8, 0, tzinfo=TZ),
        },
        datetime(2026, 3, 30, 6, 0, tzinfo=TZ),
        ChoreStatus.OVERDUE,
        datetime(2026, 3, 29, 8, 0, tzinfo=TZ),
        (datetime(2026, 3, 29, 8, 0, tzinfo=TZ), datetime(2026, 3, 29, 9, 0, tzinfo=TZ)),
        id="skip-overtaken-by-natural-anchor",
    ),
    # --- Week wrap (Sun → Mon) -------------------------------------------------
    pytest.param(
        # Sunday-only chore completed Sunday; Monday refers back to the
        # satisfied Sunday period and next_due wraps to next Sunday.
        {"active_days": ["sun"], "last_completed": datetime(2026, 3, 29, 9, 0, tzinfo=TZ)},
        datetime(2026, 3, 30, 12, 0, tzinfo=TZ),
        ChoreStatus.COMPLETED,
        datetime(2026, 4, 5, 8, 0, tzinfo=TZ),
        (datetime(2026, 3, 29, 8, 0, tzinfo=TZ), datetime(2026, 3, 29, 9, 0, tzinfo=TZ)),
        id="week-wrap-sun-completed-next-due-next-sunday",
    ),
    pytest.param(
        # Sunday-only chore missed: Monday pins OVERDUE to yesterday's Sunday.
        {"active_days": ["sun"], "last_completed": datetime(2026, 3, 22, 8, 30, tzinfo=TZ)},
        datetime(2026, 3, 30, 12, 0, tzinfo=TZ),
        ChoreStatus.OVERDUE,
        datetime(2026, 3, 29, 8, 0, tzinfo=TZ),
        (datetime(2026, 3, 29, 8, 0, tzinfo=TZ), datetime(2026, 3, 29, 9, 0, tzinfo=TZ)),
        id="week-wrap-sun-missed-pins-overdue",
    ),
    # --- DST: spring forward (America/New_York, 2026-03-08) ---------------------
    pytest.param(
        # Pending window spans the nonexistent 02:00–03:00 hour. Window math is
        # wall-clock: pending_at lands at 01:00 EST, due at 04:00 EDT.
        {
            "sched_time": time(4, 0),
            "created_at": datetime(2026, 3, 7, 12, 0, tzinfo=NY),
        },
        datetime(2026, 3, 8, 1, 30, tzinfo=NY),
        ChoreStatus.PENDING,
        datetime(2026, 3, 8, 4, 0, tzinfo=NY),
        (datetime(2026, 3, 8, 4, 0, tzinfo=NY), datetime(2026, 3, 8, 5, 0, tzinfo=NY)),
        id="dst-spring-forward-window-spans-gap",
    ),
    pytest.param(
        # Day after a completion that landed before the transition: the new
        # period reads in EDT wall time (23h absolute day).
        {"last_completed": datetime(2026, 3, 7, 8, 30, tzinfo=NY)},
        datetime(2026, 3, 8, 6, 0, tzinfo=NY),
        ChoreStatus.PENDING,
        datetime(2026, 3, 8, 8, 0, tzinfo=NY),
        (datetime(2026, 3, 8, 8, 0, tzinfo=NY), datetime(2026, 3, 8, 9, 0, tzinfo=NY)),
        id="dst-spring-forward-next-period-wall-clock",
    ),
    # --- DST: fall back (America/New_York, 2026-11-01) --------------------------
    pytest.param(
        # 25h absolute day: the period still lands at 08:00 wall time EST.
        {"last_completed": datetime(2026, 10, 31, 8, 30, tzinfo=NY)},
        datetime(2026, 11, 1, 6, 0, tzinfo=NY),
        ChoreStatus.PENDING,
        datetime(2026, 11, 1, 8, 0, tzinfo=NY),
        (datetime(2026, 11, 1, 8, 0, tzinfo=NY), datetime(2026, 11, 1, 9, 0, tzinfo=NY)),
        id="dst-fall-back-next-period-wall-clock",
    ),
    pytest.param(
        {"last_completed": datetime(2026, 10, 31, 8, 30, tzinfo=NY)},
        datetime(2026, 11, 1, 9, 30, tzinfo=NY),
        ChoreStatus.OVERDUE,
        datetime(2026, 11, 1, 8, 0, tzinfo=NY),
        (datetime(2026, 11, 1, 8, 0, tzinfo=NY), datetime(2026, 11, 1, 9, 0, tzinfo=NY)),
        id="dst-fall-back-overdue",
    ),
    # --- Pending window crossing midnight ----------------------------------------
    pytest.param(
        # 00:30 chore, 3h pending → window opens 21:30 the previous evening.
        # Pinned quirk: the period does NOT roll forward at 21:30 — the
        # candidate is computed from now's calendar date, so the chore stays
        # COMPLETED until midnight even inside the next period's wall window.
        {"sched_time": time(0, 30), "last_completed": datetime(2026, 3, 29, 0, 45, tzinfo=TZ)},
        datetime(2026, 3, 29, 22, 0, tzinfo=TZ),
        ChoreStatus.COMPLETED,
        datetime(2026, 3, 30, 0, 30, tzinfo=TZ),
        (datetime(2026, 3, 29, 0, 30, tzinfo=TZ), datetime(2026, 3, 29, 1, 30, tzinfo=TZ)),
        id="midnight-window-does-not-roll-before-midnight",
    ),
    pytest.param(
        # Immediately after midnight the period rolls and the truncated
        # pending window applies.
        {"sched_time": time(0, 30), "last_completed": datetime(2026, 3, 29, 0, 45, tzinfo=TZ)},
        datetime(2026, 3, 30, 0, 0, tzinfo=TZ),
        ChoreStatus.PENDING,
        datetime(2026, 3, 30, 0, 30, tzinfo=TZ),
        (datetime(2026, 3, 30, 0, 30, tzinfo=TZ), datetime(2026, 3, 30, 1, 30, tzinfo=TZ)),
        id="midnight-window-rolls-at-midnight",
    ),
    # --- Year boundaries -----------------------------------------------------------
    pytest.param(
        {"last_completed": datetime(2026, 12, 31, 8, 30, tzinfo=TZ)},
        datetime(2027, 1, 1, 6, 0, tzinfo=TZ),
        ChoreStatus.PENDING,
        datetime(2027, 1, 1, 8, 0, tzinfo=TZ),
        (datetime(2027, 1, 1, 8, 0, tzinfo=TZ), datetime(2027, 1, 1, 9, 0, tzinfo=TZ)),
        id="year-boundary-daily",
    ),
    pytest.param(
        # Friday-only chore: Dec 25 2026 and Jan 1 2027 are both Fridays.
        {"active_days": ["fri"], "last_completed": datetime(2026, 12, 25, 9, 0, tzinfo=TZ)},
        datetime(2026, 12, 29, 12, 0, tzinfo=TZ),
        ChoreStatus.COMPLETED,
        datetime(2027, 1, 1, 8, 0, tzinfo=TZ),
        (datetime(2026, 12, 25, 8, 0, tzinfo=TZ), datetime(2026, 12, 25, 9, 0, tzinfo=TZ)),
        id="year-boundary-weekly-wrap",
    ),
    pytest.param(
        # Never-completed chore created on New Year's Eve, missed Jan 1.
        {"created_at": datetime(2026, 12, 31, 10, 0, tzinfo=TZ)},
        datetime(2027, 1, 2, 12, 0, tzinfo=TZ),
        ChoreStatus.OVERDUE,
        datetime(2027, 1, 1, 8, 0, tzinfo=TZ),
        (datetime(2027, 1, 1, 8, 0, tzinfo=TZ), datetime(2027, 1, 1, 9, 0, tzinfo=TZ)),
        id="year-boundary-created-at-pinning",
    ),
]


@pytest.mark.parametrize(("kwargs", "now", "status", "next_due", "due_range"), MATRIX)
def test_scheduled_characterization_matrix(kwargs, now, status, next_due, due_range):
    """Pin the exact (status, next_due, due_range) tuple for each scenario."""
    chore = _chore(**kwargs)
    assert chore.compute_status(now) == status
    assert chore.compute_next_due(now) == next_due
    assert chore.compute_due_range(now) == due_range


# ---------------------------------------------------------------------------
# Stateful sequences — default-skip behavior (#24) mutates the chore, so these
# can't live in the read-only matrix above.
# ---------------------------------------------------------------------------


def test_follow_up_default_skip_advances_one_occurrence():
    """#24: a second default skip taken inside the first skip's pending window
    advances by exactly one occurrence, not back to the natural anchor."""
    chore = _chore(last_completed=datetime(2026, 3, 30, 8, 0, tzinfo=TZ))

    first = chore.apply_default_skip(datetime(2026, 3, 30, 10, 0, tzinfo=TZ))
    assert first == datetime(2026, 3, 31, 8, 0, tzinfo=TZ)
    assert chore.skipped_until == first

    # Inside the skip target's pending window (05:00–08:00 on Mar 31).
    second = chore.apply_default_skip(datetime(2026, 3, 31, 6, 0, tzinfo=TZ))
    assert second == datetime(2026, 4, 1, 8, 0, tzinfo=TZ)
    assert chore.skipped_until == second


def test_default_skip_from_pinned_overdue_walks_past_now():
    """A default skip on a deeply-pinned overdue chore lands strictly after now,
    honoring active days (Mon/Wed/Fri chore pinned to Fri, skipped on Mon afternoon)."""
    chore = _chore(
        active_days=["mon", "wed", "fri"],
        last_completed=datetime(2026, 3, 25, 8, 30, tzinfo=TZ),  # Wed, satisfied.
    )
    now = datetime(2026, 3, 30, 14, 0, tzinfo=TZ)  # Mon afternoon.
    # Natural anchor is pinned to missed Fri Mar 27; one step lands on Mon
    # Mar 30 08:00 which is already past — the walk must continue to Wed.
    assert chore.compute_status(now) == ChoreStatus.OVERDUE

    result = chore.apply_default_skip(now)
    expected = datetime(2026, 4, 1, 8, 0, tzinfo=TZ)
    assert result == expected
    assert chore.skipped_until == expected
    assert chore.compute_status(now) == ChoreStatus.COMPLETED
    assert chore.compute_next_due(now) == expected
