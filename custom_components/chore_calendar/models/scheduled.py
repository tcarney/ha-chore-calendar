"""Scheduled chore: recurs on an RFC 5545 RRULE grid anchored at ``dtstart``."""

from __future__ import annotations

from dataclasses import InitVar, dataclass
from datetime import date, datetime, time as dt_time, timedelta
from typing import Any, Self

from dateutil import rrule as du_rrule

from .base import BaseChore

# Day name abbreviations used by the legacy service surface (Monday = 0).
DAY_NAMES = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
# RFC 5545 BYDAY codes, index-aligned with DAY_NAMES.
BYDAY_CODES = ("MO", "TU", "WE", "TH", "FR", "SA", "SU")

# FREQ values accepted on a ScheduledChore rrule — matches the subset HA's
# calendar websocket validator allows.
_VALID_FREQS = ("DAILY", "WEEKLY", "MONTHLY", "YEARLY")

# RRULE parts the integration supports (matches the structured selector and
# the §1 supported-parts contract). dateutil tolerates the full RFC 5545
# vocabulary, so anything outside this set is rejected at construction rather
# than silently altering enumeration. (ical's Recur model enforces the same
# subset structurally — see card-crud-ui.md for adopting it as the canonical
# parse/validate layer.)
_SUPPORTED_RRULE_PARTS = frozenset({"FREQ", "INTERVAL", "BYDAY", "BYMONTHDAY", "BYMONTH", "BYSETPOS", "COUNT", "UNTIL"})

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
    codes = [BYDAY_CODES[DAY_NAMES.index(day)] for day in active_days if day in DAY_NAMES]
    if not codes:
        return "FREQ=DAILY"
    return "FREQ=WEEKLY;BYDAY=" + ",".join(codes)


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

    ``time`` / ``active_days`` are accepted as init-only convenience
    arguments: ``active_days`` synthesizes the rrule (empty = daily) and
    ``time`` sets ``dtstart``'s time-of-day. They are construction sugar
    (used heavily by tests), not a serialization surface — storage and
    services speak only ``rrule`` / ``dtstart``.
    """

    rrule: str = "FREQ=DAILY"
    dtstart: datetime | None = None
    # When False (default), a terminal scheduled chore (UNTIL/COUNT
    # exhausted) is deleted from storage on the next hide_completed_items /
    # todo.remove_completed_items sweep — the OneshotChore lifecycle. When
    # True the chore stays in storage, re-enterable via update_item.
    persist: bool = False
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

        parts = _rrule_parts(self.rrule)
        if parts.get("FREQ") not in _VALID_FREQS:
            msg = f"Unsupported rrule for ScheduledChore: {self.rrule!r} (FREQ must be one of {_VALID_FREQS})"
            raise ValueError(msg)
        if unsupported := [key for key in parts if key not in _SUPPORTED_RRULE_PARTS]:
            msg = (
                f"Unsupported rrule part(s) {unsupported!r} in {self.rrule!r}; "
                f"supported parts are {sorted(_SUPPORTED_RRULE_PARTS)}"
            )
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
        This keeps next_due stable until the chore is completed. Returns
        None once the series is terminal (UNTIL/COUNT exhausted) or when
        the satisfied current period has no occurrence after it.
        """
        if self.terminal:
            return None
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
        strictly after *now*. Skipping past the final occurrence of a
        finite (UNTIL/COUNT) rule exhausts the series: the chore goes
        terminal and the skip anchor clears.
        """
        # Operative anchor is non-None for ScheduledChore — _anchor_due_at
        # always resolves a period — but the base signature returns
        # ``datetime | None``, so resolve directly here.
        if self._skip_anchor_active(now) and self.skipped_until is not None:
            anchor = self.skipped_until
        else:
            anchor = self._find_current_period(now)
        candidate = self._find_next_active_day(anchor)
        while candidate is not None and candidate <= now:
            candidate = self._find_next_active_day(candidate)
        if candidate is None:
            self.skipped_until = None
            self.terminal = True
            return None
        self.skipped_until = candidate
        return candidate

    def apply_completion(
        self,
        timestamp: datetime,
        completed_by: str | None,
        *,
        clear_skip: bool = True,
    ) -> None:
        """Record a completion; exhausting a finite rule marks the chore terminal.

        Completing the final occurrence of an UNTIL/COUNT rule ends the
        series — ``terminal=True`` is the same "won't roll forward" signal
        ``OneshotChore`` uses, and the persist sweep keys off it.
        """
        super().apply_completion(timestamp, completed_by, clear_skip=clear_skip)
        if self._is_finite():
            period = self._find_current_period(timestamp)
            if self._find_next_active_day(period) is None:
                self.terminal = True

    def revert_completion(self) -> None:
        """Revert a completion, reopening an exhausted series."""
        super().revert_completion()
        self.terminal = False

    def _is_finite(self) -> bool:
        """Return True when the rrule carries UNTIL or COUNT."""
        parts = _rrule_parts(self.rrule)
        return "UNTIL" in parts or "COUNT" in parts

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
                if prev >= period:
                    # Clamped at the series start (finite rule) — nothing
                    # earlier exists to pin to.
                    break
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
        first_valid = self._first_active_day_at_or_after(self.created_at)
        if first_valid is None:
            # Finite rule fully exhausted before the chore existed — pin to
            # the final occurrence so callers still get a usable anchor.
            return candidate
        return first_valid

    def _first_active_day_at_or_after(self, ts: datetime) -> datetime | None:
        """Return the smallest occurrence greater than or equal to *ts*.

        None when a finite rule has no occurrence at or after *ts*.
        """
        return self._next_occurrence(ts, inclusive=True)

    def _find_previous_active_day(self, dt: datetime) -> datetime:
        """Most recent occurrence on or before *dt*'s calendar date.

        Keyed to the date, not the instant — matching the v3 walk, so a
        ``skipped_until`` carrying an off-grid time-of-day still steps
        relative to its calendar day.
        """
        return self._prev_occurrence(self._day_anchor(dt), inclusive=True)

    def _find_next_active_day(self, dt: datetime) -> datetime | None:
        """First occurrence strictly after *dt*'s calendar date.

        None when a finite (UNTIL/COUNT) rule has no further occurrence.
        """
        return self._next_occurrence(self._day_anchor(dt), inclusive=False)

    def _day_anchor(self, dt: datetime) -> datetime:
        """*dt*'s calendar date at the scheduled time-of-day (tz preserved)."""
        tod = self._start.time()
        return dt.replace(hour=tod.hour, minute=tod.minute, second=0, microsecond=0)

    def _prev_occurrence(self, ts: datetime, *, inclusive: bool) -> datetime:
        """Last occurrence at or before (``inclusive``) / strictly before *ts*.

        *ts* is tz-aware; enumeration happens in floating local time and the
        result is re-localized to ``ts.tzinfo``. When *ts* precedes the
        series start (a finite, non-rebased rule), clamps to the first
        occurrence so the completion walk-back terminates there — callers
        treat a non-decreasing step as "nothing earlier exists".
        """
        naive = ts.replace(tzinfo=None)
        rule = self._build_rule(self._rebased_dtstart(naive))
        found = rule.before(naive, inc=inclusive)
        if found is None:
            found = rule.after(naive, inc=True)
        if found is None:
            # Degenerate empty rule (e.g. UNTIL before dtstart).
            found = self._start
        return found.replace(tzinfo=ts.tzinfo)

    def _next_occurrence(self, ts: datetime, *, inclusive: bool) -> datetime | None:
        """First occurrence at or after (``inclusive``) / strictly after *ts*.

        None when a finite (UNTIL/COUNT) rule is exhausted at *ts*.
        """
        naive = ts.replace(tzinfo=None)
        rule = self._build_rule(self._rebased_dtstart(naive))
        found = rule.after(naive, inc=inclusive)
        if found is None:
            return None
        return found.replace(tzinfo=ts.tzinfo)

    def occurrences_between(self, start: datetime, end: datetime, *, limit: int = 366) -> list[datetime]:
        """Grid occurrences in ``[start, end)``, localized to ``start.tzinfo``.

        Capped at *limit* occurrences (the 365-step guard precedent) so a
        pathological window stays cheap. Pure rrule expansion — pinning and
        skip handling are the caller's concern.
        """
        naive_start = start.replace(tzinfo=None)
        naive_end = end.replace(tzinfo=None)
        rule = self._build_rule(self._rebased_dtstart(naive_start))
        occurrences: list[datetime] = []
        for occurrence in rule.xafter(naive_start, count=limit, inc=True):
            if occurrence >= naive_end:
                break
            occurrences.append(occurrence.replace(tzinfo=start.tzinfo))
        return occurrences

    def occurrence_recurrence_id(self, ts: datetime) -> str | None:
        """Compact iCalendar RECURRENCE-ID for *ts*, or None when off-grid.

        Floating local time in the form ``local_calendar`` emits
        (``20260615T080000``) — the round-trip key for per-occurrence
        mutations. A ``skipped_until`` marker that does not coincide with a
        grid occurrence has no series identity and yields None.
        """
        if self._next_occurrence(ts, inclusive=True) != ts:
            return None
        return ts.replace(tzinfo=None).strftime("%Y%m%dT%H%M%S")

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
        step and use the true anchor (acceptably slow: their occurrences are
        sparse). Finite (COUNT/UNTIL) rules are never rebased — COUNT is
        anchored at dtstart, and rebasing an UNTIL rule toward ``near`` can
        push dtstart past UNTIL into an empty rule (whose enumeration would
        wrongly fall back to the series start). Their cost is bounded by the
        count / the UNTIL horizon.
        """
        parts = _rrule_parts(self.rrule)
        if "COUNT" in parts or "UNTIL" in parts:
            return self._start
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
            "persist": self.persist,
        }

    def schedule_description(self) -> dict[str, Any]:
        """Add derived display keys (``time`` / ``active_days``) alongside the rrule.

        The card's compact daily/weekly rendering consumes these directly
        instead of re-deriving them from the rrule. Daily (and any rule
        without a weekly BYDAY) displays as the full week so the sensor
        reads "every day".
        """
        data = super().schedule_description()
        data["time"] = self._start.time().isoformat()
        data["active_days"] = self._derived_active_days() or list(DAY_NAMES)
        return data

    def _derived_active_days(self) -> list[str]:
        """Day names from a weekly rule's BYDAY (preserving order), else empty."""
        parts = _rrule_parts(self.rrule)
        if parts.get("FREQ") != "WEEKLY":
            return []
        names: list[str] = []
        for code in parts.get("BYDAY", "").split(","):
            cleaned = code.strip().upper()
            if cleaned in BYDAY_CODES:
                names.append(DAY_NAMES[BYDAY_CODES.index(cleaned)])
        return names

    @classmethod
    def from_schedule(cls, base: dict[str, Any], schedule: dict[str, Any]) -> Self:
        """Create a ScheduledChore from a v4+ schedule dict."""
        kwargs: dict[str, Any] = {}
        if rrule := schedule.get("rrule"):
            kwargs["rrule"] = rrule
        if dtstart_raw := schedule.get("dtstart"):
            kwargs["dtstart"] = datetime.fromisoformat(dtstart_raw)
        # persist defaults False for stored schedules predating the field.
        return cls(**base, persist=bool(schedule.get("persist", False)), **kwargs)
