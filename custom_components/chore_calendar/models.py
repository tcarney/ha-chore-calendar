"""Chore data models with state machine logic."""

from __future__ import annotations

import abc
from dataclasses import dataclass, field
from datetime import datetime, time, timedelta
from typing import Any, Self

from homeassistant.util import dt as dt_util

from .const import DEFAULT_EARLY_WINDOW_MINS, DEFAULT_GRACE_PERIOD_MINS, ChoreStatus, ChoreType

# Day name abbreviations used in active_days (Monday = 0).
_DAY_NAMES = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")


@dataclass
class BaseChore(abc.ABC):
    """Abstract base for all chore types."""

    uid: str
    chore_name: str
    chore_type: ChoreType
    trigger_tag_id: str | None = None
    assigned_to: list[str] = field(default_factory=list)
    created_at: datetime | None = None
    last_completed: datetime | None = None
    last_completed_by: str | None = None
    skipped_until: datetime | None = None

    @abc.abstractmethod
    def compute_status(self, now: datetime) -> ChoreStatus:
        """Compute the current chore status based on time."""

    @abc.abstractmethod
    def compute_next_due(self, now: datetime) -> datetime | None:
        """Compute the next due datetime, or None if not applicable."""

    @abc.abstractmethod
    def compute_due_range(self, now: datetime) -> tuple[datetime, datetime] | None:
        """Return (due_at, overdue_at) for the current period, or None."""

    @abc.abstractmethod
    def is_in_completion_window(self, timestamp: datetime) -> bool:
        """Return True if a completion at *timestamp* is valid for the current period."""

    @abc.abstractmethod
    def _schedule_to_dict(self) -> dict[str, Any]:
        """Serialize type-specific schedule fields."""

    @abc.abstractmethod
    def schedule_description(self) -> dict[str, Any]:
        """Return a human-friendly schedule dict for sensor attributes."""

    def to_dict(self) -> dict[str, Any]:
        """Serialize the chore to a storage-compatible dict."""
        return {
            "uid": self.uid,
            "chore_name": self.chore_name,
            "chore_type": str(self.chore_type),
            "schedule": self._schedule_to_dict(),
            "trigger_tag_id": self.trigger_tag_id,
            "assigned_to": list(self.assigned_to),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_completed": self.last_completed.isoformat() if self.last_completed else None,
            "last_completed_by": self.last_completed_by,
            "skipped_until": self.skipped_until.isoformat() if self.skipped_until else None,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> BaseChore:
        """Deserialize a chore from a storage dict, dispatching on chore_type."""
        chore_type = ChoreType(data["chore_type"])
        base_kwargs = _extract_base_kwargs(data, chore_type)

        if chore_type == ChoreType.SCHEDULED:
            return ScheduledChore.from_schedule(base_kwargs, data["schedule"])
        if chore_type == ChoreType.INTERVAL:
            return IntervalChore.from_schedule(base_kwargs, data["schedule"])

        msg = f"Unknown chore_type: {chore_type}"
        raise ValueError(msg)


def _extract_base_kwargs(data: dict[str, Any], chore_type: ChoreType) -> dict[str, Any]:
    """Extract shared BaseChore fields from a storage dict."""
    created_at_raw = data.get("created_at")
    last_completed_raw = data.get("last_completed")
    skipped_until_raw = data.get("skipped_until")
    return {
        # Migration v1→v2: remove "chore_id" fallback when dropping v1 support.
        "uid": data.get("uid") or data["chore_id"],
        "chore_name": data["chore_name"],
        "chore_type": chore_type,
        "trigger_tag_id": data.get("trigger_tag_id"),
        "assigned_to": list(data.get("assigned_to", [])),
        "created_at": dt_util.parse_datetime(created_at_raw) if created_at_raw else None,
        "last_completed": dt_util.parse_datetime(last_completed_raw) if last_completed_raw else None,
        "last_completed_by": data.get("last_completed_by"),
        "skipped_until": dt_util.parse_datetime(skipped_until_raw) if skipped_until_raw else None,
    }


# ---------------------------------------------------------------------------
# ScheduledChore
# ---------------------------------------------------------------------------


@dataclass
class ScheduledChore(BaseChore):
    """A chore that recurs at a fixed time on specific days."""

    time: time = field(default_factory=lambda: time(8, 0))
    active_days: list[str] = field(default_factory=list)
    early_window: timedelta = field(default_factory=lambda: timedelta(minutes=DEFAULT_EARLY_WINDOW_MINS))
    grace_period: timedelta = field(default_factory=lambda: timedelta(minutes=DEFAULT_GRACE_PERIOD_MINS))

    def compute_status(self, now: datetime) -> ChoreStatus:
        """Compute scheduled chore status using the blueprint state machine."""
        period_due = self._find_current_period(now)
        pending_at = period_due - self.early_window
        overdue_at = period_due + self.grace_period

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
        period_due = self._find_current_period(now)
        overdue_at = period_due + self.grace_period
        pending_at = period_due - self.early_window

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
        period_due = self._find_current_period(now)
        return (period_due, period_due + self.grace_period)

    def is_in_completion_window(self, timestamp: datetime) -> bool:
        """Check if *timestamp* falls after the current period's early window opens."""
        period_due = self._find_current_period(timestamp)
        pending_at = period_due - self.early_window
        return timestamp >= pending_at

    def _find_current_period(self, now: datetime) -> datetime:
        """Find the period_due for the period that *now* falls into.

        The period rolls forward when we enter the early window, **but only
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
        today_pending = today_sched - self.early_window

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
            prev_pending = prev - self.early_window
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
            "early_window_mins": int(self.early_window.total_seconds() // 60),
            "grace_period_mins": int(self.grace_period.total_seconds() // 60),
        }

    def schedule_description(self) -> dict[str, Any]:
        """Return schedule info for sensor attributes."""
        return {
            "time": self.time.isoformat(),
            "active_days": list(self.active_days) or list(_DAY_NAMES),
            "early_window_mins": int(self.early_window.total_seconds() // 60),
            "grace_period_mins": int(self.grace_period.total_seconds() // 60),
        }

    @classmethod
    def from_schedule(cls, base: dict[str, Any], schedule: dict[str, Any]) -> Self:
        """Create a ScheduledChore from base kwargs and a schedule dict."""
        parts = schedule["time"].split(":")
        sched_time = time(int(parts[0]), int(parts[1]), int(parts[2]) if len(parts) > 2 else 0)
        return cls(
            **base,
            time=sched_time,
            active_days=list(schedule.get("active_days", [])),
            early_window=timedelta(minutes=schedule.get("early_window_mins", DEFAULT_EARLY_WINDOW_MINS)),
            grace_period=timedelta(minutes=schedule.get("grace_period_mins", DEFAULT_GRACE_PERIOD_MINS)),
        )


# ---------------------------------------------------------------------------
# IntervalChore
# ---------------------------------------------------------------------------


@dataclass
class IntervalChore(BaseChore):
    """A chore that recurs at a fixed interval from last completion."""

    interval: timedelta = field(default_factory=lambda: timedelta(days=1))
    grace_period: timedelta = field(default_factory=lambda: timedelta(minutes=DEFAULT_GRACE_PERIOD_MINS))

    def compute_status(self, now: datetime) -> ChoreStatus:
        """Compute interval chore status (3-state: completed/due/overdue).

        Status uses only last_completed — a chore that has never been
        completed is always DUE regardless of created_at.
        """
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
        if self.last_completed is not None:
            return self.last_completed + self.interval
        # Never completed — due at creation time (immediately).
        return self.created_at

    def compute_due_range(self, now: datetime) -> tuple[datetime, datetime] | None:
        """Return (due_at, overdue_at) or None if no anchor exists."""
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

    def _schedule_to_dict(self) -> dict[str, Any]:
        """Serialize interval-chore-specific fields."""
        return {
            "interval_mins": int(self.interval.total_seconds() // 60),
            "grace_period_mins": int(self.grace_period.total_seconds() // 60),
        }

    def schedule_description(self) -> dict[str, Any]:
        """Return schedule info for sensor attributes."""
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
