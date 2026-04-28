"""Interval chore: recurs at a fixed interval from last completion."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Self

from custom_components.chore_calendar.const import ChoreStatus

from .base import BaseChore


@dataclass
class IntervalChore(BaseChore):
    """A chore that recurs at a fixed interval from last completion."""

    interval: timedelta = field(default_factory=lambda: timedelta(days=1))

    def compute_status(self, now: datetime) -> ChoreStatus:
        """Compute interval chore status using the standard window machine.

        Initial-state convention (compare with ScheduledChore / OneshotChore —
        each type handles "never completed" differently; see SPECS.md):
        a never-completed interval chore reads as ``PENDING`` with no
        operative due time — the cycle has no anchor until first completion
        (or until a skip sets one explicitly). The user can complete at any
        time; that first completion anchors the cycle.

        Once first completion lands, the cycle anchors and the chore reads
        ``COMPLETED → PENDING → DUE → OVERDUE`` against the next due time.
        """
        if self._skip_anchor_active(now):
            assert self.skipped_until is not None
            due_at = self.skipped_until
        elif self.last_completed is None:
            return ChoreStatus.PENDING
        else:
            due_at = self.last_completed + self.interval

        pending_at = due_at - self.pending_period
        overdue_at = due_at + self.grace_period

        if now >= overdue_at:
            return ChoreStatus.OVERDUE
        if now >= due_at:
            return ChoreStatus.DUE
        if now >= pending_at:
            return ChoreStatus.PENDING
        return ChoreStatus.COMPLETED

    def compute_next_due(self, now: datetime) -> datetime | None:
        """Return the next due datetime, or None when unscheduled."""
        if self._skip_anchor_active(now):
            return self.skipped_until
        if self.last_completed is None:
            return None
        return self.last_completed + self.interval

    def compute_due_range(self, now: datetime) -> tuple[datetime, datetime] | None:
        """Return (due_at, overdue_at) or None when unscheduled."""
        if self._skip_anchor_active(now):
            assert self.skipped_until is not None
            return (self.skipped_until, self.skipped_until + self.grace_period)
        if self.last_completed is None:
            return None
        due_at = self.last_completed + self.interval
        return (due_at, due_at + self.grace_period)

    def is_in_completion_window(self, timestamp: datetime) -> bool:
        """Return True iff *timestamp* is at or after the current period's pending window opens.

        Never-completed interval chores have no anchor to gate against —
        allow completion at any time so the first scan / manual completion
        can establish the cycle. After first completion (or while a skip
        anchor is active), gate on ``pending_at`` to match scheduled / oneshot.
        """
        if self._skip_anchor_active(timestamp):
            assert self.skipped_until is not None
            due_at = self.skipped_until
        elif self.last_completed is None:
            return True
        else:
            due_at = self.last_completed + self.interval
        pending_at = due_at - self.pending_period
        return timestamp >= pending_at

    def apply_default_skip(self, now: datetime) -> datetime | None:
        """Skip by one full interval from *now*."""
        self.skipped_until = now + self.interval
        return self.skipped_until

    def _schedule_to_dict(self) -> dict[str, Any]:
        """Serialize interval-chore-specific fields."""
        return {
            "interval_mins": int(self.interval.total_seconds() // 60),
        }

    @classmethod
    def from_schedule(cls, base: dict[str, Any], schedule: dict[str, Any]) -> Self:
        """Create an IntervalChore from base kwargs and a schedule dict."""
        return cls(
            **base,
            interval=timedelta(minutes=schedule["interval_mins"]),
        )
