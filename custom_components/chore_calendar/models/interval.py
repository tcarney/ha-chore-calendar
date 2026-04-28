"""Interval chore: recurs at a fixed interval from last completion."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Self

from .base import BaseChore


@dataclass
class IntervalChore(BaseChore):
    """A chore that recurs at a fixed interval from last completion.

    Cycle anchor is ``last_completed`` — the chore is unscheduled until
    first completion lands, then the cycle reads
    ``COMPLETED → PENDING → DUE → OVERDUE`` against ``last_completed + interval``.
    """

    interval: timedelta = field(default_factory=lambda: timedelta(days=1))

    def _anchor_due_at(self, now: datetime) -> datetime | None:
        """Return ``last_completed + interval`` once the cycle has anchored."""
        del now  # cycle is anchored solely on last_completed.
        if self.last_completed is None:
            return None
        return self.last_completed + self.interval

    def compute_next_due(self, now: datetime) -> datetime | None:
        """Return the next due datetime, or None when unscheduled."""
        if self._skip_anchor_active(now):
            return self.skipped_until
        if self.last_completed is None:
            return None
        return self.last_completed + self.interval

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
