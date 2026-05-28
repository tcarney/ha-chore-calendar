"""Scheduled chore: recurs at a fixed time on specific days."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, time, timedelta
from typing import Any, Self

from .base import BaseChore

# Day name abbreviations used in active_days (Monday = 0).
_DAY_NAMES = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")


@dataclass
class ScheduledChore(BaseChore):
    """A chore that recurs at a fixed time on specific days."""

    time: time = field(default_factory=lambda: time(8, 0))
    active_days: list[str] = field(default_factory=list)

    def _anchor_due_at(self, now: datetime) -> datetime:
        """Return the current scheduled period's due time.

        For a never-completed chore this pins to the first active-day
        ``period_due`` at or after ``created_at`` (so the cycle does not
        silently roll forward past a missed initial period). For a
        completed chore, walks back from the candidate period to the
        earliest uncompleted one.
        """
        return self._find_current_period(now)

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

        if not is_completed and now >= overdue_at:
            # Chore is overdue — return the overdue period's due time so
            # next_due stays pinned until the chore is completed.
            return period_due

        if now < period_due:
            return period_due
        # Current period is past due but not yet overdue; show next active day.
        return self._find_next_active_day(period_due)

    def apply_default_skip(self, now: datetime) -> datetime | None:
        """Skip to the next active day's period-due strictly after *now*.

        Walks forward from the **operative** anchor — ``skipped_until`` when
        an active skip overrides the natural anchor, otherwise the current
        period_due. Starting from the operative anchor is what makes a
        follow-up default skip advance by one occurrence: without it, a skip
        performed inside the skip-anchor's pending window would walk from the
        natural (pre-skip) period, hit the existing ``skipped_until``, and
        produce a no-op.

        An overdue chore's anchor may still be pinned in the past — stepping
        once would land in the past, so we advance until the candidate is
        strictly after *now*.
        """
        # Operative anchor is non-None for ScheduledChore — _anchor_due_at
        # always resolves a period — but the base signature returns
        # ``datetime | None``, so resolve directly here.
        if self._skip_anchor_active(now) and self.skipped_until is not None:
            anchor = self.skipped_until
        else:
            anchor = self._find_current_period(now)
        candidate = self._find_next_active_day(anchor)
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

        For a never-completed chore the anchor is ``created_at`` — but the
        rule is asymmetric: the first valid period is the smallest active-day
        period whose ``period_due`` is at or after ``created_at``. We never
        consider periods that started before the chore existed.
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

        if self.last_completed is not None:
            # Walk backwards from candidate to find the oldest uncompleted period.
            # The completion anchors which period is "current" — only advance
            # past periods that have been satisfied.
            period = candidate
            for _ in range(365):
                prev = self._find_previous_active_day(period - timedelta(days=1))
                prev_pending = prev - self.pending_period
                if self.last_completed >= prev_pending:
                    break
                period = prev
            return period

        if self.created_at is None:
            # Degenerate case (every real chore has created_at) — fall back to
            # the candidate so callers still get a usable anchor.
            return candidate

        # Never completed: pin to the first active-day period at or after
        # created_at. If candidate is before that (e.g. the chore was just
        # created and hasn't reached its first period_due yet), surface the
        # upcoming period; otherwise the period stays pinned at the first
        # one because none of the subsequent periods are completed.
        first_valid = self._first_active_day_at_or_after(self.created_at)
        if candidate < first_valid:
            return first_valid
        return first_valid

    def _first_active_day_at_or_after(self, ts: datetime) -> datetime:
        """Return the smallest active-day period_due greater than or equal to *ts*."""
        candidate = ts.replace(
            hour=self.time.hour,
            minute=self.time.minute,
            second=0,
            microsecond=0,
        )
        if candidate < ts:
            candidate += timedelta(days=1)
        for _ in range(7):
            if self._is_active_day(candidate):
                return candidate
            candidate += timedelta(days=1)
        return candidate

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
