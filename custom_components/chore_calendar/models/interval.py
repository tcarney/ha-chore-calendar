"""Interval chore: recurs a fixed period after the last completion."""

from __future__ import annotations

from dataclasses import dataclass, field
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

# Iteration guard for the season-excision walks (50 years of months).
_MAX_MONTH_STEPS = 600


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

    ``bymonth`` is an optional season window: out-of-season months are
    excised from the interval clock (see ``_next_due_from``). ``until`` /
    ``count`` end the series — ``until`` once the season-filtered next due
    exceeds it, ``count`` after N completions (read from the cross-type
    ``completion_count``; deliberately different from RFC COUNT, which
    counts grid occurrences — the meaning ``ScheduledChore`` keeps). Both
    set ``terminal`` with the same ``persist`` sweep lifecycle as the other
    chore types.
    """

    freq: str = "daily"
    interval: int | timedelta = 1
    # Optional season window — months (1-12) in which the interval clock
    # runs. Empty means all year.
    bymonth: list[int] = field(default_factory=list)
    # Series end conditions (mutually exclusive at the service layer).
    # ``until`` is floating local time, matching the scheduled model.
    until: datetime | None = None
    count: int | None = None
    # When False (default), a terminal interval chore (until/count
    # exhausted) is deleted on the next hide_completed_items sweep.
    persist: bool = False

    def __post_init__(self) -> None:
        """Normalize a legacy timedelta interval and validate the new fields."""
        if isinstance(self.interval, timedelta):
            self.freq, self.interval = mins_to_freq_interval(int(self.interval.total_seconds() // 60))
        if self.freq not in VALID_INTERVAL_FREQS:
            msg = f"Unsupported interval freq: {self.freq!r} (must be one of {VALID_INTERVAL_FREQS})"
            raise ValueError(msg)
        if any(month < 1 or month > 12 for month in self.bymonth):
            msg = f"Invalid bymonth {self.bymonth!r} (months must be 1-12)"
            raise ValueError(msg)
        if self.until is not None and self.until.tzinfo is not None:
            # until is floating local time — strip a stray timezone.
            self.until = self.until.replace(tzinfo=None)

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
        """Return one full interval as a calendar-aware delta (season-blind)."""
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

    def _next_due_from(self, anchor: datetime) -> datetime:
        """One interval after *anchor*, with out-of-season months excised.

        Without ``bymonth`` this is plain ``anchor + step``. With a season
        window, the interval elapses only across in-season time, as if the
        closed months didn't exist (§2 of the recurrence design):

        - Sub-monthly freqs accumulate elapsed time only within allowed
          months — time remaining at a season close carries over to the
          next opening.
        - ``monthly`` steps whole months counting only allowed months,
          preserving day-of-month (clamped) and time-of-day.
        - ``yearly`` steps years normally, then shifts forward to the next
          allowed month — year-granularity excision has no sensible reading.
        - An anchor that lands out of season starts the clock at the next
          season opening.

        Computation happens in naive local wall time (the floating-local
        convention shared with ``ScheduledChore``), so DST transitions
        inside the window read as wall-clock.
        """
        if not self.bymonth:
            return anchor + self._step()

        allowed = set(self.bymonth)
        naive = anchor.replace(tzinfo=None)
        if self.freq in ("monthly", "yearly"):
            result = self._excised_month_step(naive, allowed)
        else:
            result = self._excised_duration_add(naive, allowed)
        return result.replace(tzinfo=anchor.tzinfo)

    def _excised_duration_add(self, naive: datetime, allowed: set[int]) -> datetime:
        """Accumulate a fixed-length interval across in-season time only."""
        unit_mins = _UNIT_MINS[self.freq]
        remaining = timedelta(minutes=unit_mins * self._interval_n())
        cursor = naive
        if cursor.month not in allowed:
            cursor = _next_allowed_month_start(cursor, allowed)
        for _ in range(_MAX_MONTH_STEPS):
            month_end = _month_start(cursor) + relativedelta(months=1)
            available = month_end - cursor
            if remaining < available:
                return cursor + remaining
            remaining -= available
            cursor = month_end
            if cursor.month not in allowed:
                cursor = _next_allowed_month_start(cursor, allowed)
        return cursor  # Guard fallback — unreachable for sane windows.

    def _excised_month_step(self, naive: datetime, allowed: set[int]) -> datetime:
        """Step month/year intervals across the season window.

        ``monthly``: the due month is the Nth allowed month strictly after
        the anchor month; an out-of-season anchor first slides to the next
        season opening (preserving day and time), so the clock starts there.
        ``yearly``: step years normally, then shift forward to the next
        allowed month if the result lands out of season.
        """
        anchor = naive
        if anchor.month not in allowed:
            anchor = _shift_to_next_allowed_month(anchor, allowed)

        if self.freq == "yearly":
            result = anchor + relativedelta(years=self._interval_n())
            if result.month not in allowed:
                result = _shift_to_next_allowed_month(result, allowed)
            return result

        remaining = self._interval_n()
        cursor = anchor
        for _ in range(_MAX_MONTH_STEPS):
            cursor = _month_start(cursor) + relativedelta(months=1)
            if cursor.month in allowed:
                remaining -= 1
                if remaining == 0:
                    break
        # relativedelta(day=...) clamps to the month length (Jan 31 → Apr 30).
        return cursor + relativedelta(day=anchor.day, hour=anchor.hour, minute=anchor.minute, second=anchor.second)

    def _anchor_due_at(self, now: datetime) -> datetime | None:
        """Return the season-filtered due once the cycle has anchored."""
        del now  # cycle is anchored solely on last_completed.
        if self.last_completed is None:
            return None
        return self._next_due_from(self.last_completed)

    def compute_next_due(self, now: datetime) -> datetime | None:
        """Return the next due datetime, or None when unscheduled/terminal."""
        if self.terminal:
            return None
        if self._skip_anchor_active(now):
            return self.skipped_until
        if self.last_completed is None:
            return None
        return self._next_due_from(self.last_completed)

    def apply_completion(
        self,
        timestamp: datetime,
        completed_by: str | None,
        *,
        clear_skip: bool = True,
    ) -> None:
        """Record a completion; ``count`` / ``until`` exhaustion ends the series."""
        super().apply_completion(timestamp, completed_by, clear_skip=clear_skip)
        if self.count is not None and self.completion_count >= self.count:
            self.terminal = True
            return
        if self.until is not None and self._next_due_from(timestamp).replace(tzinfo=None) > self.until:
            self.terminal = True

    def revert_completion(self) -> None:
        """Revert a completion, reopening an exhausted series."""
        super().revert_completion()
        self.terminal = False

    def apply_default_skip(self, now: datetime) -> datetime | None:
        """Skip by one full (season-filtered) interval from *now*.

        Sliding past ``until`` exhausts the series, mirroring the scheduled
        skip-past-end behavior. An explicit user-supplied ``until`` on the
        skip service bypasses this method and is taken verbatim.
        """
        target = self._next_due_from(now)
        if self.until is not None and target.replace(tzinfo=None) > self.until:
            self.skipped_until = None
            self.terminal = True
            return None
        self.skipped_until = target
        return self.skipped_until

    def _schedule_to_dict(self) -> dict[str, Any]:
        """Serialize interval-chore-specific fields (season/end keys sparse)."""
        # Normalize first — freq may shift alongside the interval count.
        interval = self._interval_n()
        data: dict[str, Any] = {
            "freq": self.freq,
            "interval": interval,
            "persist": self.persist,
        }
        if self.bymonth:
            data["bymonth"] = list(self.bymonth)
        if self.until is not None:
            data["until"] = self.until.isoformat()
        if self.count is not None:
            data["count"] = self.count
        return data

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

        Accepts the v5 storage shape (``freq`` / ``interval`` plus the
        optional season/end keys) and the legacy ``interval_mins`` shape,
        mapped onto the largest exactly-dividing unit.
        """
        if "freq" not in schedule and "interval_mins" in schedule:
            freq, interval = mins_to_freq_interval(int(schedule["interval_mins"]))
            return cls(**base, freq=freq, interval=interval)
        until_raw = schedule.get("until")
        count_raw = schedule.get("count")
        return cls(
            **base,
            freq=schedule.get("freq", "daily"),
            interval=int(schedule.get("interval", 1)),
            bymonth=[int(month) for month in schedule.get("bymonth", [])],
            until=datetime.fromisoformat(until_raw) if until_raw else None,
            count=int(count_raw) if count_raw is not None else None,
            persist=bool(schedule.get("persist", False)),
        )


def _month_start(naive: datetime) -> datetime:
    """First instant of *naive*'s month."""
    return naive.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _next_allowed_month_start(naive: datetime, allowed: set[int]) -> datetime:
    """First instant of the next allowed month strictly relevant to *naive*.

    *naive* is assumed to be in a closed month — the season opening is the
    start of the nearest allowed month after it.
    """
    cursor = _month_start(naive)
    for _ in range(12):
        cursor = cursor + relativedelta(months=1)
        if cursor.month in allowed:
            return cursor
    return cursor  # Unreachable: __post_init__ guarantees a valid window.


def _shift_to_next_allowed_month(naive: datetime, allowed: set[int]) -> datetime:
    """Move *naive* forward to the next allowed month, preserving day and time.

    The day-of-month clamps to the target month's length via
    ``relativedelta(day=...)``.
    """
    cursor = naive
    for _ in range(12):
        cursor = _month_start(cursor) + relativedelta(months=1)
        if cursor.month in allowed:
            return cursor + relativedelta(day=naive.day, hour=naive.hour, minute=naive.minute, second=naive.second)
    return cursor  # Unreachable: __post_init__ guarantees a valid window.
