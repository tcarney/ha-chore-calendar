"""Scheduled chore: recurs on an RFC 5545 RRULE grid anchored at ``dtstart``."""

from __future__ import annotations

from dataclasses import InitVar, dataclass
from datetime import date, datetime, time as dt_time, timedelta
from typing import Any, Self

from dateutil import rrule as du_rrule

from .base import BaseChore

# Day name abbreviations used by the legacy service surface (Monday = 0).
_DAY_NAMES = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
# RFC 5545 BYDAY codes, index-aligned with _DAY_NAMES.
_BYDAY_CODES = ("MO", "TU", "WE", "TH", "FR", "SA", "SU")

# FREQ values accepted on a ScheduledChore rrule — matches the subset HA's
# calendar websocket validator allows.
_VALID_FREQS = ("DAILY", "WEEKLY", "MONTHLY", "YEARLY")

# Phase-neutral anchor date used when a chore has neither an explicit
# ``dtstart`` nor a ``created_at`` to derive one from (direct construction in
# tests). Any date works while INTERVAL=1: BYDAY pins the weekdays of a weekly
# rule and a daily rule occurs every day.
_FALLBACK_ANCHOR_DATE = date(1970, 1, 1)
_DEFAULT_TIME = dt_time(8, 0)


def active_days_to_rrule(active_days: list[str]) -> str:
    """Translate a legacy ``active_days`` list to an RRULE string.

    Empty (or all-unrecognized — the legacy model never validated day names,
    so a stored typo must not fail the load) means every day.
    """
    codes = [_BYDAY_CODES[_DAY_NAMES.index(day)] for day in active_days if day in _DAY_NAMES]
    if not codes:
        return "FREQ=DAILY"
    return "FREQ=WEEKLY;BYDAY=" + ",".join(codes)


def migrate_legacy_schedule(schedule: dict[str, Any], created_at: datetime | None) -> dict[str, Any]:
    """Translate a v3 ``{time, active_days}`` schedule dict to v4 ``{rrule, dtstart}``.

    ``dtstart``'s date comes from ``created_at`` — phase is irrelevant at
    INTERVAL=1, but the anchor must exist (see the class docstring).
    """
    tod = _parse_time(schedule.get("time", "08:00:00"))
    anchor = created_at.date() if created_at is not None else _FALLBACK_ANCHOR_DATE
    return {
        "rrule": active_days_to_rrule(list(schedule.get("active_days", []))),
        "dtstart": datetime.combine(anchor, tod.replace(second=0, microsecond=0)).isoformat(),
    }


def _parse_time(raw: str) -> dt_time:
    """Parse an ``HH:MM[:SS]`` string into a time."""
    parts = raw.split(":")
    return dt_time(int(parts[0]), int(parts[1]), int(parts[2]) if len(parts) > 2 else 0)


def _rrule_parts(rrule: str) -> dict[str, str]:
    """Split an RRULE string into an uppercase-keyed part dict."""
    parts: dict[str, str] = {}
    for chunk in rrule.split(";"):
        if "=" in chunk:
            key, _, value = chunk.partition("=")
            parts[key.strip().upper()] = value.strip()
    return parts


@dataclass
class ScheduledChore(BaseChore):
    """A chore recurring on a fixed calendar grid defined by an RRULE.

    The canonical schedule representation is ``rrule`` (RFC 5545 RRULE
    string, FREQ limited to DAILY/WEEKLY/MONTHLY/YEARLY) plus ``dtstart`` (a
    full naive-local datetime: its time-of-day applies to every occurrence,
    its date is the series phase anchor). Enumeration happens in floating
    local time — tz-stripped wall clock — and re-localizes at the edges,
    giving wall-clock recurrence across DST transitions.

    The grid is treated as bi-infinite: occurrences notionally exist before
    ``dtstart`` too, because the "first valid period" rule is governed by
    ``created_at`` pinning rather than ``dtstart`` (a tag-seeded
    ``last_completed`` may predate creation, and the completion walk-back
    must be able to follow it).

    ``time`` / ``active_days`` are accepted as init-only legacy arguments
    (the v3 surface): ``active_days`` synthesizes the rrule (empty = daily)
    and ``time`` sets ``dtstart``'s time-of-day. They take precedence over
    ``rrule`` / ``dtstart`` when both are supplied — that is what lets the
    service layer overlay partial legacy updates onto a stored schedule.
    """

    rrule: str = "FREQ=DAILY"
    dtstart: datetime | None = None
    time: InitVar[dt_time | None] = None
    active_days: InitVar[list[str] | None] = None

    def __post_init__(self, time: dt_time | None, active_days: list[str] | None) -> None:
        """Materialize ``rrule`` / ``dtstart`` from legacy init args and validate."""
        if active_days is not None:
            self.rrule = active_days_to_rrule(active_days)

        dtstart = self.dtstart
        if dtstart is not None and dtstart.tzinfo is not None:
            # dtstart is floating local time — strip a stray timezone.
            dtstart = dtstart.replace(tzinfo=None)
        if dtstart is None:
            tod = time if time is not None else _DEFAULT_TIME
            anchor = self.created_at.date() if self.created_at is not None else _FALLBACK_ANCHOR_DATE
            dtstart = datetime.combine(anchor, tod)
        elif time is not None:
            dtstart = datetime.combine(dtstart.date(), time)
        # Sub-minute precision was never part of the period math (the v3
        # model zeroed seconds in every computation) — normalize it away.
        self.dtstart = dtstart.replace(second=0, microsecond=0)

        freq = _rrule_parts(self.rrule).get("FREQ")
        if freq not in _VALID_FREQS:
            msg = f"Unsupported rrule for ScheduledChore: {self.rrule!r} (FREQ must be one of {_VALID_FREQS})"
            raise ValueError(msg)
        # Full parse so malformed parts fail at construction, not in the
        # middle of a status computation.
        du_rrule.rrulestr(self.rrule, dtstart=self.dtstart)

    @property
    def _start(self) -> datetime:
        """Return ``dtstart``, which ``__post_init__`` always materializes."""
        start = self.dtstart
        if start is None:
            # Guard against direct field mutation after construction.
            msg = "ScheduledChore.dtstart is unset"
            raise ValueError(msg)
        return start

    def _anchor_due_at(self, now: datetime) -> datetime:
        """Return the current scheduled period's due time.

        For a never-completed chore this pins to the first occurrence's
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
        # Current period is past due but not yet overdue; show next occurrence.
        return self._find_next_active_day(period_due)

    def apply_default_skip(self, now: datetime) -> datetime | None:
        """Skip to the next occurrence's period-due strictly after *now*.

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
        rule is asymmetric: the first valid period is the smallest occurrence
        whose ``period_due`` is at or after ``created_at``. We never consider
        periods that started before the chore existed.
        """
        today_sched = self._day_anchor(now)
        today_pending = today_sched - self.pending_period

        if now >= today_pending:
            candidate = self._prev_occurrence(today_sched, inclusive=True)
        else:
            candidate = self._find_previous_active_day(today_sched - timedelta(days=1))

        if self.last_completed is not None:
            # Walk backwards from candidate to find the oldest uncompleted period.
            # The completion anchors which period is "current" — only advance
            # past periods that have been satisfied.
            period = candidate
            for _ in range(365):
                prev = self._prev_occurrence(period, inclusive=False)
                prev_pending = prev - self.pending_period
                if self.last_completed >= prev_pending:
                    break
                period = prev
            return period

        if self.created_at is None:
            # Degenerate case (every real chore has created_at) — fall back to
            # the candidate so callers still get a usable anchor.
            return candidate

        # Never completed: pin to the first occurrence at or after created_at.
        # Whether candidate is before that (the chore was just created and
        # hasn't reached its first period_due yet) or after it (the first
        # period was missed), the first valid period is the anchor — none of
        # the subsequent periods are completed either.
        return self._first_active_day_at_or_after(self.created_at)

    def _first_active_day_at_or_after(self, ts: datetime) -> datetime:
        """Return the smallest occurrence greater than or equal to *ts*."""
        return self._next_occurrence(ts, inclusive=True)

    def _find_previous_active_day(self, dt: datetime) -> datetime:
        """Most recent occurrence on or before *dt*'s calendar date.

        Keyed to the date, not the instant — matching the v3 walk, so a
        ``skipped_until`` carrying an off-grid time-of-day still steps
        relative to its calendar day.
        """
        return self._prev_occurrence(self._day_anchor(dt), inclusive=True)

    def _find_next_active_day(self, dt: datetime) -> datetime:
        """First occurrence strictly after *dt*'s calendar date."""
        return self._next_occurrence(self._day_anchor(dt), inclusive=False)

    def _day_anchor(self, dt: datetime) -> datetime:
        """*dt*'s calendar date at the scheduled time-of-day (tz preserved)."""
        tod = self._start.time()
        return dt.replace(hour=tod.hour, minute=tod.minute, second=0, microsecond=0)

    def _prev_occurrence(self, ts: datetime, *, inclusive: bool) -> datetime:
        """Last occurrence at or before (``inclusive``) / strictly before *ts*.

        *ts* is tz-aware; enumeration happens in floating local time and the
        result is re-localized to ``ts.tzinfo``.
        """
        naive = ts.replace(tzinfo=None)
        found = self._build_rule(self._rebased_dtstart(naive)).before(naive, inc=inclusive)
        if found is None:
            # Unreachable on the bi-infinite DAILY/WEEKLY grid; possible for
            # a hand-edited MONTHLY/YEARLY rule queried before its anchor.
            found = self._start
        return found.replace(tzinfo=ts.tzinfo)

    def _next_occurrence(self, ts: datetime, *, inclusive: bool) -> datetime:
        """First occurrence at or after (``inclusive``) / strictly after *ts*."""
        naive = ts.replace(tzinfo=None)
        found = self._build_rule(self._rebased_dtstart(naive)).after(naive, inc=inclusive)
        if found is None:
            # Unreachable while UNTIL/COUNT are unsupported (infinite rules).
            found = self._start
        return found.replace(tzinfo=ts.tzinfo)

    def _build_rule(self, dtstart: datetime) -> Any:
        """Parse the stored rrule anchored at *dtstart* (naive local)."""
        return du_rrule.rrulestr(self.rrule, dtstart=dtstart)

    def _rebased_dtstart(self, near: datetime) -> datetime:
        """Return a phase-preserving dtstart a couple of grid steps below *near*.

        ``dateutil`` only enumerates forward from ``dtstart``: stepping near
        ``now`` from the true anchor would iterate the whole series history
        on every call, and the bi-infinite-grid reading (see the class
        docstring) needs occurrences before the anchor anyway. Shifting
        ``dtstart`` by whole interval steps preserves the occurrence grid
        exactly for DAILY/WEEKLY rules. MONTHLY/YEARLY have no fixed-length
        step and fall back to the true anchor — fine until the structured
        selector exposes them, and revisited there. COUNT-bearing rules must
        never be rebased (the count is anchored at dtstart); COUNT is not
        expressible until that same stage.
        """
        parts = _rrule_parts(self.rrule)
        interval = int(parts.get("INTERVAL", "1"))
        freq = parts.get("FREQ")
        if freq == "DAILY":
            step = timedelta(days=interval)
        elif freq == "WEEKLY":
            step = timedelta(weeks=interval)
        else:
            return self._start
        start = self._start
        # Land at least two full steps below *near* so a complete BYDAY cycle
        # precedes any query point (timedelta // timedelta floors).
        shift = (near - 2 * step - start) // step
        return start + shift * step

    def _schedule_to_dict(self) -> dict[str, Any]:
        """Serialize scheduled-chore-specific fields."""
        return {
            "rrule": self.rrule,
            "dtstart": self._start.isoformat(),
        }

    def schedule_description(self) -> dict[str, Any]:
        """Add legacy display keys (``time`` / ``active_days``) alongside the rrule.

        The card renders daily/weekly schedules from ``time`` /
        ``active_days``, so deriving them here keeps that rendering stable
        until the card learns the structured shapes. Daily (and any rule
        without a weekly BYDAY) displays as the full week so the sensor
        reads "every day".
        """
        data = super().schedule_description()
        data["time"] = self._start.time().isoformat()
        data["active_days"] = self._derived_active_days() or list(_DAY_NAMES)
        return data

    def _derived_active_days(self) -> list[str]:
        """Day names from a weekly rule's BYDAY (preserving order), else empty."""
        parts = _rrule_parts(self.rrule)
        if parts.get("FREQ") != "WEEKLY":
            return []
        names: list[str] = []
        for code in parts.get("BYDAY", "").split(","):
            cleaned = code.strip().upper()
            if cleaned in _BYDAY_CODES:
                names.append(_DAY_NAMES[_BYDAY_CODES.index(cleaned)])
        return names

    @classmethod
    def from_schedule(cls, base: dict[str, Any], schedule: dict[str, Any]) -> Self:
        """Create a ScheduledChore from base kwargs and a schedule dict.

        Accepts the v4 storage shape (``rrule`` / ``dtstart``), the legacy
        service shape (``time`` / ``active_days``), or a mix — the service
        layer overlays legacy keys onto a stored schedule for partial
        updates, and ``__post_init__`` resolves the precedence.
        """
        kwargs: dict[str, Any] = {}
        if rrule := schedule.get("rrule"):
            kwargs["rrule"] = rrule
        if dtstart_raw := schedule.get("dtstart"):
            kwargs["dtstart"] = datetime.fromisoformat(dtstart_raw)
        if time_raw := schedule.get("time"):
            kwargs["time"] = _parse_time(time_raw)
        if "active_days" in schedule:
            kwargs["active_days"] = list(schedule["active_days"])
        return cls(**base, **kwargs)
