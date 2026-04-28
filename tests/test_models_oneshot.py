"""Tests for OneshotChore — state machine, completion, skip, storage."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from custom_components.chore_calendar.const import ChoreStatus, ChoreType
from custom_components.chore_calendar.models import BaseChore, OneshotChore

TZ = timezone(timedelta(hours=-5))


def _make_oneshot(
    *,
    due_datetime: datetime | None = None,
    pending_period_mins: int = 180,
    grace_period_mins: int = 60,
    last_completed: datetime | None = None,
    created_at: datetime | None = None,
) -> OneshotChore:
    """Create a OneshotChore with test defaults."""
    return OneshotChore(
        uid="oneshot-test",
        chore_name="File Taxes",
        chore_type=ChoreType.ONESHOT,
        due_datetime=due_datetime,
        pending_period=timedelta(minutes=pending_period_mins),
        grace_period=timedelta(minutes=grace_period_mins),
        last_completed=last_completed,
        created_at=created_at,
    )


# ---------------------------------------------------------------------------
# State machine
# ---------------------------------------------------------------------------


class TestComputeStatus:
    """compute_status across every reachable state."""

    def test_unscheduled_no_completion_is_pending(self):
        """due_datetime=None, last_completed=None → PENDING."""
        chore = _make_oneshot()
        now = datetime(2026, 4, 15, 10, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.PENDING

    def test_pending_before_pending_window(self):
        """Before pending_at — PENDING."""
        due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)
        chore = _make_oneshot(due_datetime=due)
        # 4 hours before due, pending_period = 3h → still pending (anchor is unscheduled-PENDING semantics).
        now = datetime(2026, 4, 15, 8, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.PENDING

    def test_pending_inside_pending_window(self):
        """Inside pending window but before period_due — PENDING."""
        due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)
        chore = _make_oneshot(due_datetime=due)
        # 1 hour before due, inside 3h early window.
        now = datetime(2026, 4, 15, 11, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.PENDING

    def test_due_at_period_due(self):
        """At due_datetime exactly → DUE."""
        due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)
        chore = _make_oneshot(due_datetime=due)
        assert chore.compute_status(due) == ChoreStatus.DUE

    def test_due_inside_grace_period(self):
        """Past due_datetime but within grace_period → DUE."""
        due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)
        chore = _make_oneshot(due_datetime=due, grace_period_mins=60)
        # 30m past due — still inside the grace period.
        now = datetime(2026, 4, 15, 12, 30, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.DUE

    def test_overdue_after_grace(self):
        """Past overdue_at without completion → OVERDUE."""
        due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)
        chore = _make_oneshot(due_datetime=due, grace_period_mins=60)
        # 2h past due — past the grace period.
        now = datetime(2026, 4, 15, 14, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.OVERDUE

    def test_completed_terminal(self):
        """Completion in window → COMPLETED."""
        due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)
        completed = datetime(2026, 4, 15, 11, 30, tzinfo=TZ)
        chore = _make_oneshot(due_datetime=due, last_completed=completed)
        # Compute_status anywhere after completion — terminal.
        for hours_after in (0, 1, 24, 24 * 365):
            now = completed + timedelta(hours=hours_after)
            assert chore.compute_status(now) == ChoreStatus.COMPLETED

    def test_unscheduled_with_prior_completion_is_pending(self):
        """State-space discriminator: (last_completed=set, due_datetime=None) → PENDING.

        This state is reached via Path B (update_item clearing) or Path C
        (skip-default after reschedule). Reports PENDING because the user
        explicitly unscheduled — terminal-completed always has a due_datetime.
        """
        chore = _make_oneshot(
            due_datetime=None,
            last_completed=datetime(2026, 4, 15, 11, 30, tzinfo=TZ),
        )
        now = datetime(2026, 4, 20, 10, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.PENDING

    def test_skip_anchor_overrides_due_datetime(self):
        """When skipped_until is active, status flows against the skip anchor."""
        due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)
        skipped_until = datetime(2026, 5, 1, 12, 0, tzinfo=TZ)
        chore = _make_oneshot(due_datetime=due)
        chore.skipped_until = skipped_until

        # Pre-pending-window of the skip anchor — chore reads as deferred
        # (COMPLETED) until the next pending window opens. Mirrors scheduled.
        pre_pending = datetime(2026, 4, 20, 10, 0, tzinfo=TZ)
        assert chore.compute_status(pre_pending) == ChoreStatus.COMPLETED

        # Inside the skip anchor's pending window (3h before skipped_until) → PENDING.
        in_window = datetime(2026, 5, 1, 10, 0, tzinfo=TZ)
        assert chore.compute_status(in_window) == ChoreStatus.PENDING

        # At skip anchor → DUE.
        assert chore.compute_status(skipped_until) == ChoreStatus.DUE

    def test_overdue_never_completed(self):
        """A never-completed oneshot past the grace window goes overdue.

        Different from scheduled chores which advance to next period;
        oneshot has no next period, so it stays OVERDUE indefinitely
        until completed or rescheduled.
        """
        due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)
        chore = _make_oneshot(due_datetime=due)
        # Days after the grace window.
        now = datetime(2026, 4, 30, 12, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.OVERDUE


class TestComputeNextDue:
    """compute_next_due return values."""

    def test_unscheduled_returns_none(self):
        chore = _make_oneshot()
        now = datetime(2026, 4, 15, 10, 0, tzinfo=TZ)
        assert chore.compute_next_due(now) is None

    def test_active_returns_due_datetime(self):
        due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)
        chore = _make_oneshot(due_datetime=due)
        assert chore.compute_next_due(due - timedelta(hours=1)) == due

    def test_terminal_completed_returns_none(self):
        """Terminal-completed has no future due."""
        due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)
        completed = datetime(2026, 4, 15, 11, 30, tzinfo=TZ)
        chore = _make_oneshot(due_datetime=due, last_completed=completed)
        assert chore.compute_next_due(completed + timedelta(hours=1)) is None

    def test_skip_anchor_returns_skipped_until(self):
        due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)
        skipped_until = datetime(2026, 5, 1, 12, 0, tzinfo=TZ)
        chore = _make_oneshot(due_datetime=due)
        chore.skipped_until = skipped_until
        assert chore.compute_next_due(due) == skipped_until


class TestComputeDueRange:
    """compute_due_range return values."""

    def test_unscheduled_returns_none(self):
        chore = _make_oneshot()
        assert chore.compute_due_range(datetime(2026, 4, 15, 10, 0, tzinfo=TZ)) is None

    def test_active_returns_window(self):
        due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)
        chore = _make_oneshot(due_datetime=due, grace_period_mins=60)
        result = chore.compute_due_range(due - timedelta(hours=1))
        assert result == (due, due + timedelta(hours=1))

    def test_terminal_completed_returns_none(self):
        due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)
        completed = datetime(2026, 4, 15, 11, 30, tzinfo=TZ)
        chore = _make_oneshot(due_datetime=due, last_completed=completed)
        assert chore.compute_due_range(completed + timedelta(hours=1)) is None


class TestIsInCompletionWindow:
    """is_in_completion_window — only used by tag-scan auto-completion."""

    def test_unscheduled_returns_false(self):
        chore = _make_oneshot()
        assert chore.is_in_completion_window(datetime(2026, 4, 15, 10, 0, tzinfo=TZ)) is False

    def test_inside_pending_window(self):
        due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)
        chore = _make_oneshot(due_datetime=due)
        # 1h before due, inside 3h window.
        assert chore.is_in_completion_window(due - timedelta(hours=1)) is True

    def test_before_pending_window(self):
        due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)
        chore = _make_oneshot(due_datetime=due)
        # 4h before due, before window opens.
        assert chore.is_in_completion_window(due - timedelta(hours=4)) is False


# ---------------------------------------------------------------------------
# Reschedule via update_item (mutating due_datetime directly)
# ---------------------------------------------------------------------------


class TestReschedule:
    """Reschedule a completed oneshot by mutating due_datetime."""

    def test_reschedule_to_future_reactivates(self):
        """New due_datetime where last_completed < new_pending_at re-enters cycle."""
        original_due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)
        completed = datetime(2026, 4, 15, 11, 30, tzinfo=TZ)
        chore = _make_oneshot(due_datetime=original_due, last_completed=completed)
        assert chore.compute_status(completed + timedelta(hours=1)) == ChoreStatus.COMPLETED

        # Reschedule far enough in the future that last_completed < new_pending_at.
        new_due = datetime(2026, 6, 15, 12, 0, tzinfo=TZ)
        chore.due_datetime = new_due
        # last_completed (Apr 15) is well before new pending_at (Jun 15 - 3h).
        assert chore.compute_status(new_due - timedelta(hours=1)) == ChoreStatus.PENDING
        assert chore.compute_status(new_due) == ChoreStatus.DUE

    def test_reschedule_too_close_keeps_completed(self):
        """A reschedule where last_completed >= new_pending_at keeps COMPLETED.

        Guards against accidental reactivation by setting a past or near date.
        """
        original_due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)
        completed = datetime(2026, 4, 15, 11, 30, tzinfo=TZ)
        chore = _make_oneshot(due_datetime=original_due, last_completed=completed)

        # New due_datetime only 2 hours after completion — pending_at is 3h
        # before that, so completed time ≥ pending_at and the chore stays COMPLETED.
        new_due = datetime(2026, 4, 15, 13, 30, tzinfo=TZ)
        chore.due_datetime = new_due
        assert chore.compute_status(new_due) == ChoreStatus.COMPLETED


# ---------------------------------------------------------------------------
# Path A — create unscheduled, complete directly (synthetic due_datetime)
# ---------------------------------------------------------------------------


class TestPathA:
    """create unscheduled → complete → uncomplete."""

    def test_complete_synthesizes_due_datetime(self):
        """Path A: complete an unscheduled oneshot → due_datetime synthesized to completion timestamp."""
        chore = _make_oneshot()
        assert chore.due_datetime is None

        timestamp = datetime(2026, 4, 15, 14, 0, tzinfo=TZ)
        chore.apply_completion(timestamp, "person.alice")

        assert chore.last_completed == timestamp
        assert chore.due_datetime == timestamp  # synthesized
        assert chore.previous_due_datetime is None  # was None before completion
        assert chore.compute_status(timestamp) == ChoreStatus.COMPLETED

    def test_uncomplete_restores_unscheduled(self):
        """Uncomplete reverts both last_completed and the synthetic due_datetime."""
        chore = _make_oneshot()
        timestamp = datetime(2026, 4, 15, 14, 0, tzinfo=TZ)
        chore.apply_completion(timestamp, "person.alice")
        chore.revert_completion()

        assert chore.last_completed is None
        assert chore.due_datetime is None  # synthetic value reverted
        assert chore.previous_due_datetime is None
        assert chore.compute_status(timestamp + timedelta(hours=1)) == ChoreStatus.PENDING

    def test_complete_scheduled_oneshot_preserves_due(self):
        """Completion of a scheduled oneshot does not overwrite due_datetime."""
        original_due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)
        chore = _make_oneshot(due_datetime=original_due)
        completion = datetime(2026, 4, 15, 11, 45, tzinfo=TZ)
        chore.apply_completion(completion, None)

        assert chore.due_datetime == original_due  # unchanged
        assert chore.previous_due_datetime == original_due  # saved for revert

    def test_uncomplete_scheduled_oneshot_restores_original_due(self):
        """Uncomplete after a normal scheduled-oneshot completion restores due_datetime."""
        original_due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)
        chore = _make_oneshot(due_datetime=original_due)
        chore.apply_completion(datetime(2026, 4, 15, 11, 45, tzinfo=TZ), None)
        chore.revert_completion()

        assert chore.due_datetime == original_due
        assert chore.previous_due_datetime is None


# ---------------------------------------------------------------------------
# Path B — complete then update_item clear
# ---------------------------------------------------------------------------


class TestPathB:
    """complete a scheduled oneshot → update_item clears due_datetime → PENDING."""

    def test_clear_after_complete_reports_pending(self):
        """After clearing due_datetime on a completed oneshot, status is PENDING."""
        original_due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)
        chore = _make_oneshot(due_datetime=original_due)
        chore.apply_completion(datetime(2026, 4, 15, 11, 45, tzinfo=TZ), None)
        assert chore.compute_status(datetime(2026, 4, 15, 12, 30, tzinfo=TZ)) == ChoreStatus.COMPLETED

        # Simulate update_item clearing due_datetime.
        chore.due_datetime = None

        # last_completed is set, due_datetime is None → user explicitly
        # unscheduled. Should report PENDING (not COMPLETED).
        now = datetime(2026, 4, 20, 10, 0, tzinfo=TZ)
        assert chore.compute_status(now) == ChoreStatus.PENDING

    def test_subsequent_reschedule_re_enters_cycle(self):
        """After Path B clears the date, setting a new future due_datetime reactivates."""
        chore = _make_oneshot(due_datetime=datetime(2026, 4, 15, 12, 0, tzinfo=TZ))
        chore.apply_completion(datetime(2026, 4, 15, 11, 45, tzinfo=TZ), None)
        chore.due_datetime = None  # Path B clear

        # Set a new due far enough in the future.
        new_due = datetime(2026, 6, 15, 12, 0, tzinfo=TZ)
        chore.due_datetime = new_due
        assert chore.compute_status(new_due - timedelta(hours=1)) == ChoreStatus.PENDING
        assert chore.compute_status(new_due) == ChoreStatus.DUE


# ---------------------------------------------------------------------------
# Path C — skip-default clears due_datetime
# ---------------------------------------------------------------------------


class TestPathC:
    """skip-default clears due_datetime, returns None for event payload."""

    def test_apply_default_skip_clears_due_datetime(self):
        """apply_default_skip on a scheduled oneshot clears due_datetime."""
        chore = _make_oneshot(due_datetime=datetime(2026, 4, 15, 12, 0, tzinfo=TZ))
        result = chore.apply_default_skip(datetime(2026, 4, 14, 10, 0, tzinfo=TZ))

        assert result is None  # signal "no operative anchor"
        assert chore.due_datetime is None
        assert chore.skipped_until is None  # not touched

    def test_apply_default_skip_after_reschedule(self):
        """Path C: complete → reschedule → skip-default → unscheduled PENDING."""
        chore = _make_oneshot(due_datetime=datetime(2026, 4, 15, 12, 0, tzinfo=TZ))
        chore.apply_completion(datetime(2026, 4, 15, 11, 45, tzinfo=TZ), None)
        # Reschedule to a future date (re-entering the cycle).
        chore.due_datetime = datetime(2026, 6, 15, 12, 0, tzinfo=TZ)
        # last_completed remains from prior occurrence.
        assert chore.last_completed is not None

        # Skip-default clears due_datetime.
        chore.apply_default_skip(datetime(2026, 6, 1, 10, 0, tzinfo=TZ))

        assert chore.due_datetime is None
        assert chore.last_completed is not None  # preserved
        assert chore.compute_status(datetime(2026, 6, 16, 10, 0, tzinfo=TZ)) == ChoreStatus.PENDING


# ---------------------------------------------------------------------------
# Skip with explicit until
# ---------------------------------------------------------------------------


class TestExplicitSkip:
    """skip_item with explicit until uses skipped_until as the operative anchor."""

    def test_explicit_until_anchors_to_skipped_until(self):
        """Setting skipped_until directly works the same as for scheduled/interval."""
        due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)
        skipped = datetime(2026, 5, 1, 12, 0, tzinfo=TZ)
        chore = _make_oneshot(due_datetime=due)
        chore.skipped_until = skipped

        assert chore.compute_status(skipped) == ChoreStatus.DUE
        assert chore.compute_next_due(due) == skipped


# ---------------------------------------------------------------------------
# Storage round-trip
# ---------------------------------------------------------------------------


class TestStorageRoundTrip:
    """to_dict / from_dict preserves all fields including previous_due_datetime."""

    def test_round_trip_with_due_datetime(self):
        due = datetime(2026, 4, 15, 12, 0, tzinfo=TZ)
        completed = datetime(2026, 4, 15, 11, 45, tzinfo=TZ)
        chore = _make_oneshot(due_datetime=due, last_completed=completed)
        chore.previous_due_datetime = datetime(2026, 3, 1, 9, 0, tzinfo=TZ)

        restored = BaseChore.from_dict(chore.to_dict())

        assert isinstance(restored, OneshotChore)
        assert restored.due_datetime == due
        assert restored.last_completed == completed
        assert restored.previous_due_datetime == chore.previous_due_datetime
        assert restored.pending_period == chore.pending_period
        assert restored.grace_period == chore.grace_period

    def test_round_trip_unscheduled(self):
        """Unscheduled oneshot serializes due_datetime as None."""
        chore = _make_oneshot()
        data = chore.to_dict()
        assert data["schedule"]["due_datetime"] is None
        assert data["previous_due_datetime"] is None

        restored = BaseChore.from_dict(data)
        assert isinstance(restored, OneshotChore)
        assert restored.due_datetime is None
        assert restored.previous_due_datetime is None

    def test_round_trip_after_path_a_completion(self):
        """Path A: complete unscheduled oneshot, round-trip preserves synthetic due_datetime."""
        chore = _make_oneshot()
        timestamp = datetime(2026, 4, 15, 14, 0, tzinfo=TZ)
        chore.apply_completion(timestamp, "person.alice")

        restored = BaseChore.from_dict(chore.to_dict())
        assert isinstance(restored, OneshotChore)
        assert restored.due_datetime == timestamp
        assert restored.last_completed == timestamp
        assert restored.previous_due_datetime is None


class TestPersistField:
    """OneshotChore.persist controls deletion behavior on hide_completed_items."""

    def test_default_is_false(self):
        """A oneshot created without explicit persist defaults to False."""
        chore = _make_oneshot()
        assert chore.persist is False

    def test_round_trip_preserves_persist(self):
        """to_dict / from_dict round-trips persist=True."""
        chore = _make_oneshot(due_datetime=datetime(2026, 4, 15, 12, 0, tzinfo=TZ))
        chore.persist = True

        restored = BaseChore.from_dict(chore.to_dict())
        assert isinstance(restored, OneshotChore)
        assert restored.persist is True

    def test_round_trip_default_persist(self):
        """Older stores without the persist field load with persist=False."""
        chore = _make_oneshot(due_datetime=datetime(2026, 4, 15, 12, 0, tzinfo=TZ))
        data = chore.to_dict()
        # Simulate a pre-persist store: drop the field.
        data["schedule"].pop("persist", None)

        restored = BaseChore.from_dict(data)
        assert isinstance(restored, OneshotChore)
        assert restored.persist is False
