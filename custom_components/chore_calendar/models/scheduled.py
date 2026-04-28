"""Scheduled chore: recurs at a fixed time on specific days."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, time, timedelta
from typing import Any, Self

from custom_components.chore_calendar.const import ChoreStatus

from .base import BaseChore

# Day name abbreviations used in active_days (Monday = 0).
_DAY_NAMES = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")


@dataclass
class ScheduledChore(BaseChore):
    """A chore that recurs at a fixed time on specific days."""

    time: time = field(default_factory=lambda: time(8, 0))
    active_days: list[str] = field(default_factory=list)

    def compute_status(self, now: datetime) -> ChoreStatus:
        """Compute scheduled chore status using the blueprint state machine.

        Initial-state convention (compare with IntervalChore / OneshotChore —
        each type handles "never completed" differently; see SPECS.md):
        a never-completed scheduled chore reads as ``COMPLETED`` once past
        the grace window, so a new chore created after its scheduled time
        doesn't immediately nag — ``next_due`` advances to the next period.
        """
        using_skip = self._skip_anchor_active(now)
        period_due = self.skipped_until if using_skip else self._find_current_period(now)
        assert period_due is not None  # using_skip implies skipped_until set
        pending_at = period_due - self.pending_period
        overdue_at = period_due + self.grace_period

        # Skip anchor may place now well before pending_at — the normal path
        # never hits this because _find_current_period guarantees now ≥ pending_at.
        if using_skip and now < pending_at:
            return ChoreStatus.COMPLETED

        if self.last_completed and self.last_completed >= pending_at:
            return ChoreStatus.COMPLETED

        # Never completed: allow pending/due but not overdue.  A brand-new
        # chore should not immediately nag — treat it as completed (no
        # last_completed) so next_due advances to the following period.
        if self.last_completed is None and now >= overdue_at:
            return ChoreStatus.COMPLETED

        if now >= overdue_at:
            return ChoreStatus.OVERDUE
        if now >= period_due:
            return ChoreStatus.DUE
        return ChoreStatus.PENDING

    def compute_next_due(self, now: datetime) -> datetime | None:
        """Return the due time for the current period.

        If the chore is overdue (uncompleted and past the grace period),
        return the *overdue* period's due time — not the next period's.
        This keeps next_due stable until the chore is completed.
        """
        if self._skip_anchor_active(now):
            return self.skipped_until

        period_due = self._find_current_period(now)
        overdue_at = period_due + self.grace_period
        pending_at = period_due - self.pending_period

        is_completed = bool(self.last_completed and self.last_completed >= pending_at)

        # Never completed and past the grace period — advance to next period
        # instead of pinning (new chores should not stay stuck on a missed period).
        if self.last_completed is None and now >= overdue_at:
            return self._find_next_active_day(period_due)

        if not is_completed and now >= overdue_at:
            # Chore is overdue — return the overdue period's due time.
            return period_due

        if now < period_due:
            return period_due
        # Current period is past due but not yet overdue; show next active day.
        return self._find_next_active_day(period_due)

    def compute_due_range(self, now: datetime) -> tuple[datetime, datetime] | None:
        """Return (period_due, overdue_at) for the current scheduled period."""
        if self._skip_anchor_active(now):
            assert self.skipped_until is not None
            return (self.skipped_until, self.skipped_until + self.grace_period)
        period_due = self._find_current_period(now)
        return (period_due, period_due + self.grace_period)

    def is_in_completion_window(self, timestamp: datetime) -> bool:
        """Check if *timestamp* falls after the current period's pending window opens."""
        period_due = self._find_current_period(timestamp)
        pending_at = period_due - self.pending_period
        return timestamp >= pending_at

    def apply_default_skip(self, now: datetime) -> datetime | None:
        """Skip to the next active day's period-due strictly after *now*.

        Walks forward from the current operative period. An overdue chore's
        period may be pinned in the past — stepping once would still land
        in the past, so we advance until the candidate is strictly after
        *now*. Guarantees the skip actually takes effect.
        """
        candidate = self._find_next_active_day(self._find_current_period(now))
        while candidate <= now:
            candidate = self._find_next_active_day(candidate)
        self.skipped_until = candidate
        return candidate

    def _find_current_period(self, now: datetime) -> datetime:
        """Find the period_due for the period that *now* falls into.

        The period rolls forward when we enter the pending window, **but only
        if the previous period has been completed**.  This ensures an overdue
        chore stays pinned to the uncompleted period rather than silently
        advancing to the next one.
        """
        today_sched = now.replace(
            hour=self.time.hour,
            minute=self.time.minute,
            second=0,
            microsecond=0,
        )
        today_pending = today_sched - self.pending_period

        if now >= today_pending:
            if self._is_active_day(today_sched):
                candidate = today_sched
            else:
                candidate = self._find_previous_active_day(today_sched)
        else:
            candidate = self._find_previous_active_day(today_sched - timedelta(days=1))

        # Walk back to find the earliest uncompleted period.
        # If the chore has never been completed, find the first period after
        # created_at. If it was completed, the completion anchors which period
        # is "current" — only advance past periods that have been satisfied.
        anchor = self.last_completed or self.created_at
        if anchor is None:
            return candidate

        # Walk backwards from candidate to find the oldest uncompleted period.
        period = candidate
        for _ in range(365):
            prev = self._find_previous_active_day(period - timedelta(days=1))
            prev_pending = prev - self.pending_period
            if anchor >= prev_pending:
                # The anchor (last completion or creation) falls within or after
                # this previous period's window — so *period* is the first
                # uncompleted one.
                break
            period = prev
        return period

    def _is_active_day(self, dt: datetime) -> bool:
        """Return True if *dt* falls on an active day (empty = all days active)."""
        if not self.active_days:
            return True
        return _DAY_NAMES[dt.weekday()] in self.active_days

    def _find_previous_active_day(self, dt: datetime) -> datetime:
        """Walk backwards from *dt* to find the most recent active day.

        Returns *dt* adjusted to the scheduled time on the found day.
        """
        candidate = dt.replace(
            hour=self.time.hour,
            minute=self.time.minute,
            second=0,
            microsecond=0,
        )
        for _ in range(7):
            if self._is_active_day(candidate):
                return candidate
            candidate -= timedelta(days=1)
        # Fallback: should never happen if active_days is valid.
        return candidate

    def _find_next_active_day(self, dt: datetime) -> datetime:
        """Walk forwards from the day after *dt* to find the next active day."""
        candidate = dt.replace(
            hour=self.time.hour,
            minute=self.time.minute,
            second=0,
            microsecond=0,
        ) + timedelta(days=1)
        for _ in range(7):
            if self._is_active_day(candidate):
                return candidate
            candidate += timedelta(days=1)
        return candidate

    def _schedule_to_dict(self) -> dict[str, Any]:
        """Serialize scheduled-chore-specific fields."""
        return {
            "time": self.time.isoformat(),
            "active_days": list(self.active_days),
        }

    def schedule_description(self) -> dict[str, Any]:
        """Display empty ``active_days`` as the full week so the sensor reads "every day"."""
        data = super().schedule_description()
        if not data["active_days"]:
            data["active_days"] = list(_DAY_NAMES)
        return data

    @classmethod
    def from_schedule(cls, base: dict[str, Any], schedule: dict[str, Any]) -> Self:
        """Create a ScheduledChore from base kwargs and a schedule dict."""
        parts = schedule["time"].split(":")
        sched_time = time(int(parts[0]), int(parts[1]), int(parts[2]) if len(parts) > 2 else 0)
        return cls(
            **base,
            time=sched_time,
            active_days=list(schedule.get("active_days", [])),
        )
