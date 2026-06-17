"""Structured recurrence selector → RRULE translation for service calls.

Implements §5 of the recurrence-model design: ``chore_calendar.create_item``
/ ``update_item`` accept structured selector fields (``frequency``,
``byday``, ``bysetpos``, …) and this layer validates the combination and
synthesizes the canonical RRULE string for storage. Users never write
``FREQ=...`` by hand — the same stance HA's own calendar UI takes.
"""

from __future__ import annotations

from datetime import date, datetime, time as dt_time
import re
from typing import Any

from homeassistant.exceptions import ServiceValidationError
from homeassistant.util import dt as dt_util

from .models.interval import VALID_INTERVAL_FREQS
from .models.scheduled import BYDAY_CODES, DAY_NAMES, DEFAULT_TIME, FALLBACK_ANCHOR_DATE

_FREQUENCIES = ("daily", "weekly", "monthly", "yearly")

# Interval selector fields. Like the scheduled selector, the recurrence
# fields form a full specification (``frequency`` required when any is
# present); ``persist`` alone is a lifecycle tweak that keeps the rule.
_INTERVAL_RECURRENCE_KEYS = ("frequency", "interval", "bymonth", "until", "count")
_INTERVAL_ALLOWED_KEYS = (*_INTERVAL_RECURRENCE_KEYS, "persist")

# Fields that define the recurrence rule itself. When any is present the
# sub-object is treated as a full rule specification (``frequency``
# required); ``dtstart`` / ``persist`` alone are anchor / lifecycle tweaks
# that keep the stored rule.
_RECURRENCE_KEYS = ("frequency", "interval", "byday", "bymonthday", "bysetpos", "bymonth", "until", "count")
_ALLOWED_KEYS = (*_RECURRENCE_KEYS, "dtstart", "persist")

# Optional signed ordinal (1-53) + day name, e.g. "fri", "2mon", "-1fri".
_BYDAY_RE = re.compile(r"^(?P<ordinal>[+-]?(?:[1-9]|[1-4]\d|5[0-3]))?(?P<day>[a-z]{3})$")


def scheduled_selector_to_schedule(
    obj: dict[str, Any],
    *,
    existing: dict[str, Any],
    created_at: datetime | None,
) -> dict[str, Any]:
    """Validate a ``scheduled`` service sub-object and build the stored schedule.

    Returns the complete ``{rrule, dtstart, persist}`` schedule dict.
    *existing* is the chore's current schedule (empty on create): it supplies
    the stored rule when only ``dtstart`` / ``persist`` are tweaked, the
    stored ``dtstart`` date when a time-only ``dtstart`` is given, and the
    stored ``persist`` when the flag is omitted.
    """
    unknown = [key for key in obj if key not in _ALLOWED_KEYS]
    if unknown:
        msg = (
            f"Unknown scheduled field(s) {unknown!r}; valid fields are {list(_ALLOWED_KEYS)!r}. "
            "(The former 'time' / 'active_days' shape was replaced by the structured selector — "
            "e.g. {'frequency': 'weekly', 'byday': ['mon', 'wed'], 'dtstart': '08:00:00'}.)"
        )
        raise ServiceValidationError(msg)

    persist = bool(obj.get("persist", existing.get("persist", False)))
    dtstart = _resolve_dtstart(obj.get("dtstart"), existing.get("dtstart"), created_at)

    if any(key in obj for key in _RECURRENCE_KEYS):
        rrule = _synthesize_rrule(obj)
    else:
        rrule = existing.get("rrule")
        if not rrule:
            msg = "scheduled requires 'frequency' when creating a chore"
            raise ServiceValidationError(msg)

    return {"rrule": rrule, "dtstart": dtstart.isoformat(), "persist": persist}


def interval_selector_to_schedule(obj: dict[str, Any], *, existing: dict[str, Any]) -> dict[str, Any]:
    """Validate an ``interval`` service sub-object and build the stored schedule.

    Returns the complete schedule dict (``freq`` / ``interval`` / ``persist``
    plus sparse ``bymonth`` / ``until`` / ``count``). Recurrence fields are a
    full specification — omitted season/end keys are cleared; ``persist``
    alone keeps the stored rule.
    """
    unknown = [key for key in obj if key not in _INTERVAL_ALLOWED_KEYS]
    if unknown:
        msg = (
            f"Unknown interval field(s) {unknown!r}; valid fields are {list(_INTERVAL_ALLOWED_KEYS)!r}. "
            "(The former duration shape was replaced — e.g. {'frequency': 'daily', 'interval': 14}.)"
        )
        raise ServiceValidationError(msg)

    persist = bool(obj.get("persist", existing.get("persist", False)))

    if not any(key in obj for key in _INTERVAL_RECURRENCE_KEYS):
        if not existing.get("freq"):
            msg = "interval requires 'frequency' when creating a chore"
            raise ServiceValidationError(msg)
        schedule = dict(existing)
        schedule["persist"] = persist
        return schedule

    frequency = obj.get("frequency")
    if frequency is None:
        msg = "interval requires 'frequency' (one of minutely/hourly/daily/weekly/monthly/yearly)"
        raise ServiceValidationError(msg)
    if frequency not in VALID_INTERVAL_FREQS:
        msg = f"Invalid interval frequency {frequency!r} (must be one of {VALID_INTERVAL_FREQS})"
        raise ServiceValidationError(msg)
    if "until" in obj and "count" in obj:
        msg = "'until' and 'count' are mutually exclusive"
        raise ServiceValidationError(msg)

    schedule: dict[str, Any] = {
        "freq": frequency,
        "interval": _coerce_int(obj.get("interval", 1), "interval", minimum=1),
        "persist": persist,
    }
    bymonth = _coerce_int_list(obj.get("bymonth"), "bymonth", 1, 12)
    if bymonth:
        schedule["bymonth"] = bymonth
    if "until" in obj:
        schedule["until"] = _parse_until(obj["until"]).isoformat()
    if "count" in obj:
        schedule["count"] = _coerce_int(obj["count"], "count", minimum=1)
    return schedule


def scheduled_recurrence_changed(obj: dict[str, Any]) -> bool:
    """Return True when *obj* changes the recurrence rule itself.

    A scheduled sub-object carrying any recurrence field re-synthesizes the
    rrule; a bare ``dtstart`` / ``persist`` tweak keeps the stored rule. The
    update handler uses this to decide whether a finished (terminal) series
    should re-enter its cycle — only an actual rule change reopens it.
    """
    return any(key in obj for key in _RECURRENCE_KEYS)


def interval_recurrence_changed(obj: dict[str, Any]) -> bool:
    """Return True when *obj* changes the interval recurrence rule itself.

    Mirrors ``scheduled_recurrence_changed``: any recurrence field rebuilds
    the schedule, while a bare ``persist`` tweak keeps the stored rule. Used
    by the update handler to gate reopening a finished (terminal) series.
    """
    return any(key in obj for key in _INTERVAL_RECURRENCE_KEYS)


def _synthesize_rrule(obj: dict[str, Any]) -> str:
    """Validate the recurrence fields and produce the canonical RRULE string."""
    frequency = obj.get("frequency")
    if frequency is None:
        msg = "scheduled requires 'frequency' when changing the recurrence"
        raise ServiceValidationError(msg)
    if frequency not in _FREQUENCIES:
        msg = f"Invalid scheduled frequency {frequency!r} (must be one of {_FREQUENCIES})"
        raise ServiceValidationError(msg)

    interval = _coerce_int(obj.get("interval", 1), "interval", minimum=1)
    byday = _parse_byday(obj.get("byday"), frequency)
    bymonthday = _coerce_int_list(obj.get("bymonthday"), "bymonthday", -31, 31, allow_zero=False)
    bysetpos = _coerce_int_list(obj.get("bysetpos"), "bysetpos", -366, 366, allow_zero=False)
    bymonth = _coerce_int_list(obj.get("bymonth"), "bymonth", 1, 12)

    if bymonthday and frequency not in ("monthly", "yearly"):
        msg = "'bymonthday' requires frequency 'monthly' or 'yearly'"
        raise ServiceValidationError(msg)
    if bysetpos:
        if not byday:
            msg = "'bysetpos' requires 'byday' (e.g. last Friday: byday: ['fri'], bysetpos: [-1])"
            raise ServiceValidationError(msg)
        if frequency not in ("monthly", "yearly"):
            msg = "'bysetpos' requires frequency 'monthly' or 'yearly'"
            raise ServiceValidationError(msg)
    if "until" in obj and "count" in obj:
        msg = "'until' and 'count' are mutually exclusive"
        raise ServiceValidationError(msg)

    parts = [f"FREQ={frequency.upper()}"]
    if interval > 1:
        parts.append(f"INTERVAL={interval}")
    if byday:
        parts.append("BYDAY=" + ",".join(byday))
    if bymonthday:
        parts.append("BYMONTHDAY=" + ",".join(str(value) for value in bymonthday))
    if bysetpos:
        parts.append("BYSETPOS=" + ",".join(str(value) for value in bysetpos))
    if bymonth:
        parts.append("BYMONTH=" + ",".join(str(value) for value in bymonth))
    if "count" in obj:
        parts.append(f"COUNT={_coerce_int(obj['count'], 'count', minimum=1)}")
    if "until" in obj:
        parts.append("UNTIL=" + _parse_until(obj["until"]).strftime("%Y%m%dT%H%M%S"))
    return ";".join(parts)


def _parse_byday(raw: Any, frequency: str) -> list[str]:
    """Validate ``byday`` entries and map them to BYDAY codes.

    Entries are day names with an optional signed ordinal prefix
    (``"fri"``, ``"2mon"``, ``"-1fri"``). Plain entries are valid for
    weekly/monthly/yearly; ordinal entries only for monthly/yearly —
    ``frequency: daily`` rejects ``byday`` outright (a deliberate
    simplification; ``weekly`` + ``byday`` expresses the same thing
    unambiguously).
    """
    if not raw:
        return []
    if frequency == "daily":
        msg = "'byday' is not valid with frequency 'daily' — use frequency 'weekly' instead"
        raise ServiceValidationError(msg)
    if not isinstance(raw, list):
        raw = [raw]
    codes: list[str] = []
    for entry in raw:
        match = _BYDAY_RE.match(str(entry).strip().lower())
        if match is None or match.group("day") not in DAY_NAMES:
            msg = f"Invalid byday entry {entry!r} (expected a day name with optional ordinal, e.g. 'fri' or '-1fri')"
            raise ServiceValidationError(msg)
        ordinal = match.group("ordinal")
        if ordinal and frequency not in ("monthly", "yearly"):
            msg = f"Ordinal byday entry {entry!r} requires frequency 'monthly' or 'yearly'"
            raise ServiceValidationError(msg)
        code = BYDAY_CODES[DAY_NAMES.index(match.group("day"))]
        codes.append(f"{ordinal or ''}{code}")
    return codes


def _resolve_dtstart(raw: Any, existing_iso: str | None, created_at: datetime | None) -> datetime:
    """Resolve the ``dtstart`` field to a full naive-local datetime.

    A full datetime sets the series phase anchor explicitly (needed for
    ``interval > 1``). A time-only value keeps the existing anchor date
    (falling back to ``created_at``, which preserves the first-valid-period
    pinning rule). Omitted keeps the existing dtstart entirely.
    """
    existing = datetime.fromisoformat(existing_iso) if existing_iso else None

    if raw is None:
        if existing is not None:
            return existing
        return datetime.combine(_anchor_date(existing, created_at), DEFAULT_TIME)

    if isinstance(raw, datetime):
        return _floating_local(raw)
    if isinstance(raw, dt_time):
        return datetime.combine(_anchor_date(existing, created_at), raw)
    if isinstance(raw, str):
        try:
            return _floating_local(datetime.fromisoformat(raw))
        except ValueError:
            pass
        try:
            return datetime.combine(_anchor_date(existing, created_at), dt_time.fromisoformat(raw))
        except ValueError:
            pass
    msg = f"Invalid dtstart {raw!r} (expected a time like '08:00:00' or a full datetime)"
    raise ServiceValidationError(msg)


def _anchor_date(existing: datetime | None, created_at: datetime | None) -> date:
    """Pick the anchor date for a dtstart that carries no date of its own."""
    if existing is not None:
        return existing.date()
    if created_at is not None:
        return created_at.date()
    return FALLBACK_ANCHOR_DATE


def _floating_local(value: datetime) -> datetime:
    """Convert a datetime to floating local time (naive local wall clock)."""
    if value.tzinfo is None:
        return value
    return dt_util.as_local(value).replace(tzinfo=None)


def _parse_until(raw: Any) -> datetime:
    """Parse ``until`` to floating local time; a bare date means end of that day."""
    if isinstance(raw, datetime):
        return _floating_local(raw)
    if isinstance(raw, date):
        return datetime.combine(raw, dt_time(23, 59, 59))
    if isinstance(raw, str):
        # Date-only first — parse_datetime would read it as midnight, which
        # silently excludes that day's occurrence.
        parsed_date = dt_util.parse_date(raw)
        if parsed_date is not None:
            return datetime.combine(parsed_date, dt_time(23, 59, 59))
        parsed = dt_util.parse_datetime(raw)
        if parsed is not None:
            return _floating_local(parsed)
    msg = f"Invalid until {raw!r} (expected a datetime or date)"
    raise ServiceValidationError(msg)


def _coerce_int(raw: Any, name: str, *, minimum: int) -> int:
    """Coerce a selector value to an int with a lower bound."""
    try:
        value = int(raw)
    except (TypeError, ValueError):
        value = minimum - 1
    if value < minimum:
        msg = f"Invalid {name} {raw!r} (must be an integer >= {minimum})"
        raise ServiceValidationError(msg)
    return value


def _coerce_int_list(raw: Any, name: str, lower: int, upper: int, *, allow_zero: bool = True) -> list[int]:
    """Coerce a selector value to a bounded int list (text selectors yield strings)."""
    if raw is None:
        return []
    if not isinstance(raw, list):
        raw = [raw]
    values: list[int] = []
    for entry in raw:
        try:
            value = int(entry)
        except (TypeError, ValueError):
            msg = f"Invalid {name} entry {entry!r} (must be an integer)"
            raise ServiceValidationError(msg) from None
        if value < lower or value > upper or (value == 0 and not allow_zero):
            msg = f"Invalid {name} entry {entry!r} (must be {lower}..{upper}{'' if allow_zero else ', nonzero'})"
            raise ServiceValidationError(msg)
        values.append(value)
    return values
