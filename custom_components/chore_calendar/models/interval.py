"""Interval chore: recurs at a fixed interval from last completion."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Self

from custom_components.chore_calendar.const import DEFAULT_GRACE_PERIOD_MINS, ChoreStatus

from .base import BaseChore


@dataclass
class IntervalChore(BaseChore):
    """A chore that recurs at a fixed interval from last completion."""

    interval: timedelta = field(default_factory=lambda: timedelta(days=1))

    def compute_status(self, now: datetime) -> ChoreStatus:
        """Compute interval chore status (3-state: completed/due/overdue).

        Status uses only last_completed — a chore that has never been
        completed is always DUE regardless of created_at.
        """
        if self._skip_anchor_active(now):
            assert self.skipped_until is not None
            due_at = self.skipped_until
            overdue_at = due_at + self.grace_period
            if now >= overdue_at:
                return ChoreStatus.OVERDUE
            if now >= due_at:
                return ChoreStatus.DUE
            return ChoreStatus.COMPLETED

        if self.last_completed is None:
            return ChoreStatus.DUE

        due_at = self.last_completed + self.interval
        overdue_at = due_at + self.grace_period

        if now >= overdue_at:
            return ChoreStatus.OVERDUE
        if now >= due_at:
            return ChoreStatus.DUE
        return ChoreStatus.COMPLETED

    def compute_next_due(self, now: datetime) -> datetime | None:
        """Return the next due datetime, or None if no anchor exists."""
        if self._skip_anchor_active(now):
            return self.skipped_until
        if self.last_completed is not None:
            return self.last_completed + self.interval
        # Never completed — due at creation time (immediately).
        return self.created_at

    def compute_due_range(self, now: datetime) -> tuple[datetime, datetime] | None:
        """Return (due_at, overdue_at) or None if no anchor exists."""
        if self._skip_anchor_active(now):
            assert self.skipped_until is not None
            return (self.skipped_until, self.skipped_until + self.grace_period)
        if self.last_completed is not None:
            due_at = self.last_completed + self.interval
            return (due_at, due_at + self.grace_period)
        if self.created_at is None:
            return None
        # Never completed — due window starts at creation time.
        return (self.created_at, self.created_at + self.grace_period)

    def is_in_completion_window(self, timestamp: datetime) -> bool:
        """Interval chores can always be completed (there is no early window)."""
        return True

    def apply_default_skip(self, now: datetime) -> datetime | None:
        """Skip by one full interval from *now*."""
        self.skipped_until = now + self.interval
        return self.skipped_until

    def _schedule_to_dict(self) -> dict[str, Any]:
        """Serialize interval-chore-specific fields."""
        return {
            "interval_mins": int(self.interval.total_seconds() // 60),
            "grace_period_mins": int(self.grace_period.total_seconds() // 60),
        }

    @classmethod
    def from_schedule(cls, base: dict[str, Any], schedule: dict[str, Any]) -> Self:
        """Create an IntervalChore from base kwargs and a schedule dict."""
        return cls(
            **base,
            interval=timedelta(minutes=schedule["interval_mins"]),
            grace_period=timedelta(minutes=schedule.get("grace_period_mins", DEFAULT_GRACE_PERIOD_MINS)),
        )
