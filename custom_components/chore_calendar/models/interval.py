"""Interval chore: recurs a fixed period after the last completion."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Self

from dateutil.relativedelta import relativedelta

from .base import BaseChore

# Allowed freq values — RRULE vocabulary, lowercased. ``minutely`` /
# ``hourly`` keep the legacy sub-day intervals expressible; HA's calendar
# websocket validator excludes them, but that restriction only governs rrule
# strings on emitted CalendarEvents, and interval chores never emit one.
VALID_INTERVAL_FREQS = ("minutely", "hourly", "daily", "weekly", "monthly", "yearly")

# Minutes per unit for the freqs with a fixed-length period (sub-monthly),
# largest first — iteration order drives the largest-exactly-dividing-unit
# mapping for legacy minute counts.
_UNIT_MINS = {"weekly": 10080, "daily": 1440, "hourly": 60, "minutely": 1}


def mins_to_freq_interval(mins: int) -> tuple[str, int]:
    """Map a legacy interval minute count onto the largest exactly-dividing unit.

    Lossless by construction: anything that doesn't divide into a larger
    unit falls through to ``minutely``.
    """
    for freq, unit in _UNIT_MINS.items():
        if mins >= unit and mins % unit == 0:
            return freq, mins // unit
    return "minutely", mins


@dataclass
class IntervalChore(BaseChore):
    """A chore that recurs a fixed period after the last completion.

    Cycle anchor is ``last_completed`` — the chore is unscheduled until the
    first completion lands, then the cycle reads
    ``COMPLETED → PENDING → DUE → OVERDUE`` against ``last_completed``
    plus ``interval`` ``freq``-units.

    Canonical schedule fields are ``freq`` (RRULE vocabulary, lowercased)
    and ``interval`` (the N in "after N freq units"), stepped via
    ``relativedelta`` so month/year intervals track the calendar instead of
    approximating with a fixed-length duration. A ``timedelta`` is still
    accepted for ``interval`` (the legacy construction surface) and is
    normalized onto the largest exactly-dividing unit.
    """

    freq: str = "daily"
    interval: int | timedelta = 1

    def __post_init__(self) -> None:
        """Normalize a legacy timedelta interval and validate ``freq``."""
        if isinstance(self.interval, timedelta):
            self.freq, self.interval = mins_to_freq_interval(int(self.interval.total_seconds() // 60))
        if self.freq not in VALID_INTERVAL_FREQS:
            msg = f"Unsupported interval freq: {self.freq!r} (must be one of {VALID_INTERVAL_FREQS})"
            raise ValueError(msg)

    def _interval_n(self) -> int:
        """Return ``interval`` as an int, normalizing a mutated-in timedelta.

        ``__post_init__`` normalizes timedeltas at construction; this covers
        direct field mutation afterwards.
        """
        n = self.interval
        if isinstance(n, timedelta):
            self.freq, n = mins_to_freq_interval(int(n.total_seconds() // 60))
            self.interval = n
        return n

    def _step(self) -> relativedelta:
        """Return one full interval as a calendar-aware delta."""
        n = self._interval_n()
        match self.freq:
            case "minutely":
                return relativedelta(minutes=n)
            case "hourly":
                return relativedelta(hours=n)
            case "daily":
                return relativedelta(days=n)
            case "weekly":
                return relativedelta(weeks=n)
            case "monthly":
                return relativedelta(months=n)
            case _:  # "yearly" — __post_init__ rejects anything else.
                return relativedelta(years=n)

    def _anchor_due_at(self, now: datetime) -> datetime | None:
        """Return ``last_completed`` plus one interval once the cycle has anchored."""
        del now  # cycle is anchored solely on last_completed.
        if self.last_completed is None:
            return None
        return self.last_completed + self._step()

    def compute_next_due(self, now: datetime) -> datetime | None:
        """Return the next due datetime, or None when unscheduled."""
        if self._skip_anchor_active(now):
            return self.skipped_until
        if self.last_completed is None:
            return None
        return self.last_completed + self._step()

    def apply_default_skip(self, now: datetime) -> datetime | None:
        """Skip by one full interval from *now*."""
        self.skipped_until = now + self._step()
        return self.skipped_until

    def _schedule_to_dict(self) -> dict[str, Any]:
        """Serialize interval-chore-specific fields."""
        # Normalize first — freq may shift alongside the interval count.
        interval = self._interval_n()
        return {
            "freq": self.freq,
            "interval": interval,
        }

    def schedule_description(self) -> dict[str, Any]:
        """Add a derived ``interval_mins`` for freqs with a fixed-length period.

        The card renders interval schedules from ``interval_mins``, so
        deriving it keeps that rendering stable for every freq that maps
        exactly. Month/year intervals have no fixed minute count — the card
        learns the ``freq`` / ``interval`` shape in the card-display stage.
        """
        data = super().schedule_description()
        # Normalize first — freq may shift alongside the interval count.
        interval = self._interval_n()
        unit = _UNIT_MINS.get(self.freq)
        if unit is not None:
            data["interval_mins"] = unit * interval
        return data

    @classmethod
    def from_schedule(cls, base: dict[str, Any], schedule: dict[str, Any]) -> Self:
        """Create an IntervalChore from base kwargs and a schedule dict.

        Accepts the v5 storage shape (``freq`` / ``interval``) and the
        legacy ``interval_mins`` shape, mapped onto the largest
        exactly-dividing unit.
        """
        if "freq" not in schedule and "interval_mins" in schedule:
            freq, interval = mins_to_freq_interval(int(schedule["interval_mins"]))
            return cls(**base, freq=freq, interval=interval)
        return cls(
            **base,
            freq=schedule.get("freq", "daily"),
            interval=int(schedule.get("interval", 1)),
        )
