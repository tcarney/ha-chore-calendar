"""Tests for the structured recurrence selector → RRULE translation layer."""

from __future__ import annotations

from datetime import datetime, time, timedelta, timezone

import pytest

from custom_components.chore_calendar.const import ChoreType
from custom_components.chore_calendar.models import ScheduledChore
from custom_components.chore_calendar.recurrence import (
    interval_selector_to_schedule,
    schedule_to_selector,
    scheduled_selector_to_schedule,
)
from homeassistant.exceptions import ServiceValidationError

TZ = timezone(timedelta(hours=-5))
CREATED_AT = datetime(2026, 6, 1, 10, 30, tzinfo=TZ)


def _translate(obj, existing=None, created_at=CREATED_AT):
    return scheduled_selector_to_schedule(obj, existing=existing or {}, created_at=created_at)


# ---------------------------------------------------------------------------
# RRULE synthesis
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("obj", "expected_rrule"),
    [
        ({"frequency": "daily"}, "FREQ=DAILY"),
        ({"frequency": "weekly", "byday": ["mon", "thu"]}, "FREQ=WEEKLY;BYDAY=MO,TH"),
        ({"frequency": "weekly", "interval": 2, "byday": ["mon"]}, "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO"),
        ({"frequency": "monthly", "bymonthday": [15]}, "FREQ=MONTHLY;BYMONTHDAY=15"),
        ({"frequency": "monthly", "byday": ["fri"], "bysetpos": [-1]}, "FREQ=MONTHLY;BYDAY=FR;BYSETPOS=-1"),
        ({"frequency": "monthly", "byday": ["-1fri"]}, "FREQ=MONTHLY;BYDAY=-1FR"),
        ({"frequency": "monthly", "byday": ["2mon"]}, "FREQ=MONTHLY;BYDAY=2MO"),
        ({"frequency": "yearly", "bymonth": [3], "bymonthday": [15]}, "FREQ=YEARLY;BYMONTHDAY=15;BYMONTH=3"),
        # Seasonal daily — bymonth is a window for any frequency. Values may
        # arrive as strings (select selector).
        ({"frequency": "daily", "bymonth": ["4", "5", "6"]}, "FREQ=DAILY;BYMONTH=4,5,6"),
        ({"frequency": "daily", "count": 3}, "FREQ=DAILY;COUNT=3"),
        ({"frequency": "daily", "until": "2027-06-30T08:00:00"}, "FREQ=DAILY;UNTIL=20270630T080000"),
        # Bare-date until means the end of that day.
        ({"frequency": "daily", "until": "2027-06-30"}, "FREQ=DAILY;UNTIL=20270630T235959"),
    ],
)
def test_rrule_synthesis(obj, expected_rrule):
    """Each selector combination produces the canonical RRULE string."""
    schedule = _translate(obj)
    assert schedule["rrule"] == expected_rrule


def test_defaults_and_dtstart_from_created_at():
    """Omitted dtstart anchors at created_at's date with the 08:00 default time."""
    schedule = _translate({"frequency": "daily"})
    assert schedule == {"rrule": "FREQ=DAILY", "dtstart": "2026-06-01T08:00:00", "persist": False}


# ---------------------------------------------------------------------------
# dtstart resolution
# ---------------------------------------------------------------------------


def test_dtstart_time_only_uses_created_at_date():
    """A time-only dtstart fills the date from created_at on create."""
    schedule = _translate({"frequency": "daily", "dtstart": "06:45:00"})
    assert schedule["dtstart"] == "2026-06-01T06:45:00"


def test_dtstart_time_only_keeps_existing_date():
    """A time-only dtstart keeps the stored anchor date on update."""
    existing = {"rrule": "FREQ=DAILY", "dtstart": "2026-01-15T08:00:00"}
    schedule = _translate({"frequency": "daily", "dtstart": "06:45:00"}, existing=existing)
    assert schedule["dtstart"] == "2026-01-15T06:45:00"


def test_dtstart_full_datetime_sets_phase():
    """A full datetime dtstart is stored verbatim (naive)."""
    schedule = _translate({"frequency": "weekly", "interval": 2, "byday": ["mon"], "dtstart": "2026-06-08T08:00:00"})
    assert schedule["dtstart"] == "2026-06-08T08:00:00"


def test_dtstart_accepts_time_object():
    """A datetime.time value (object selector) resolves like a time string."""
    schedule = _translate({"frequency": "daily", "dtstart": time(7, 0)})
    assert schedule["dtstart"] == "2026-06-01T07:00:00"


def test_dtstart_only_keeps_existing_rule():
    """Passing only dtstart (no recurrence fields) keeps the stored rrule."""
    existing = {"rrule": "FREQ=WEEKLY;BYDAY=MO,TH", "dtstart": "2026-01-15T08:00:00", "persist": True}
    schedule = _translate({"dtstart": "09:30:00"}, existing=existing)
    assert schedule == {"rrule": "FREQ=WEEKLY;BYDAY=MO,TH", "dtstart": "2026-01-15T09:30:00", "persist": True}


def test_persist_only_keeps_rule_and_dtstart():
    """Passing only persist flips the flag without touching the rule."""
    existing = {"rrule": "FREQ=DAILY", "dtstart": "2026-01-15T08:00:00", "persist": False}
    schedule = _translate({"persist": True}, existing=existing)
    assert schedule == {"rrule": "FREQ=DAILY", "dtstart": "2026-01-15T08:00:00", "persist": True}


# ---------------------------------------------------------------------------
# Validation matrix
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("obj", "match"),
    [
        ({"frequency": "fortnightly"}, "frequency"),
        ({"interval": 2}, "frequency"),  # recurrence change without frequency
        ({}, "frequency"),  # create with empty object
        ({"frequency": "daily", "byday": ["mon"]}, "byday.*daily|daily.*byday"),
        ({"frequency": "weekly", "byday": ["-1fri"]}, "Ordinal"),
        ({"frequency": "weekly", "byday": ["funday"]}, "Invalid byday"),
        ({"frequency": "weekly", "bymonthday": [15]}, "bymonthday"),
        ({"frequency": "monthly", "bysetpos": [-1]}, "bysetpos.*byday"),
        ({"frequency": "weekly", "byday": ["fri"], "bysetpos": [-1]}, "bysetpos"),
        ({"frequency": "daily", "until": "2027-06-30", "count": 3}, "mutually exclusive"),
        ({"frequency": "daily", "count": 0}, "count"),
        ({"frequency": "daily", "interval": 0}, "interval"),
        ({"frequency": "daily", "bymonth": [13]}, "bymonth"),
        ({"frequency": "monthly", "bymonthday": [0]}, "bymonthday"),
        ({"frequency": "daily", "until": "not-a-date"}, "until"),
        ({"frequency": "daily", "dtstart": "not-a-time"}, "dtstart"),
        ({"time": "08:00:00"}, "structured selector"),  # removed legacy shape
        ({"frequency": "daily", "active_days": ["mon"]}, "Unknown scheduled field"),
    ],
)
def test_validation_rejections(obj, match):
    """Invalid combinations raise ServiceValidationError with a pointed message."""
    with pytest.raises(ServiceValidationError, match=match):
        _translate(obj)


def test_synthesized_rrules_parse_in_the_model():
    """Every synthesized rrule round-trips through ScheduledChore validation."""
    cases = [
        {"frequency": "monthly", "byday": ["fri"], "bysetpos": [-1]},
        {"frequency": "monthly", "byday": ["-1fri"]},
        {"frequency": "weekly", "interval": 2, "byday": ["mon"], "dtstart": "2026-06-08T08:00:00"},
        {"frequency": "daily", "bymonth": [4, 5, 6, 7, 8, 9, 10]},
        {"frequency": "daily", "count": 3},
        {"frequency": "yearly", "bymonth": [3], "bymonthday": [15]},
    ]
    for obj in cases:
        schedule = _translate(obj)
        chore = ScheduledChore.from_schedule(
            {"uid": "x", "chore_name": "X", "chore_type": ChoreType.SCHEDULED},
            schedule,
        )
        assert chore.rrule == schedule["rrule"]


# ---------------------------------------------------------------------------
# Interval selector translation
# ---------------------------------------------------------------------------


def _translate_interval(obj, existing=None):
    return interval_selector_to_schedule(obj, existing=existing or {})


def test_interval_full_shape():
    """Season and end fields land in the schedule; bymonth strings coerce."""
    schedule = _translate_interval(
        {"frequency": "monthly", "interval": 2, "bymonth": ["10", "11", "12", "1", "2", "3"]}
    )
    assert schedule == {
        "freq": "monthly",
        "interval": 2,
        "persist": False,
        "bymonth": [10, 11, 12, 1, 2, 3],
    }


def test_interval_until_and_count():
    """until parses like the scheduled selector (bare date = end of day)."""
    schedule = _translate_interval({"frequency": "daily", "interval": 3, "until": "2027-03-31"})
    assert schedule["until"] == "2027-03-31T23:59:59"

    schedule = _translate_interval({"frequency": "daily", "count": 5})
    assert schedule["count"] == 5


def test_interval_recurrence_update_clears_omitted_fields():
    """A recurrence update is a full specification — omitted season/end keys clear."""
    existing = {"freq": "monthly", "interval": 2, "bymonth": [10], "count": 3, "persist": True}
    schedule = _translate_interval({"frequency": "weekly", "interval": 1}, existing=existing)
    assert schedule == {"freq": "weekly", "interval": 1, "persist": True}


def test_interval_persist_only_keeps_rule():
    """persist alone flips the flag without touching the stored rule."""
    existing = {"freq": "monthly", "interval": 2, "bymonth": [10], "persist": False}
    schedule = _translate_interval({"persist": True}, existing=existing)
    assert schedule == {"freq": "monthly", "interval": 2, "bymonth": [10], "persist": True}


@pytest.mark.parametrize(
    ("obj", "match"),
    [
        ({"days": 14}, "duration shape was replaced"),
        ({}, "frequency"),
        ({"interval": 2}, "frequency"),
        ({"frequency": "fortnightly"}, "frequency"),
        ({"frequency": "daily", "until": "2027-03-31", "count": 3}, "mutually exclusive"),
        ({"frequency": "daily", "bymonth": [13]}, "bymonth"),
        ({"frequency": "daily", "count": 0}, "count"),
    ],
)
def test_interval_validation_rejections(obj, match):
    """Invalid interval objects raise ServiceValidationError."""
    with pytest.raises(ServiceValidationError, match=match):
        _translate_interval(obj)


# ---------------------------------------------------------------------------
# schedule_to_selector — the storage → selector inverse
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "selector",
    [
        {"frequency": "daily", "dtstart": "08:00:00"},
        {"frequency": "weekly", "byday": ["mon", "wed", "fri"], "interval": 2, "dtstart": "09:00:00"},
        {"frequency": "monthly", "byday": ["fri"], "bysetpos": [-1], "count": 10},
        {"frequency": "monthly", "byday": ["2mon"]},
        {"frequency": "monthly", "byday": ["-1fri"]},
        {"frequency": "yearly", "bymonth": [3, 6, 9, 12], "bymonthday": [15]},
        {"frequency": "daily", "bymonth": [4, 5, 6]},
        {"frequency": "weekly", "until": "2026-12-31"},
    ],
)
def test_scheduled_round_trip(selector):
    """schedule → selector → schedule is stable for scheduled chores."""
    schedule = scheduled_selector_to_schedule(selector, existing={}, created_at=CREATED_AT)
    inverse = schedule_to_selector("scheduled", schedule)
    assert scheduled_selector_to_schedule(inverse, existing={}, created_at=CREATED_AT) == schedule


@pytest.mark.parametrize(
    "selector",
    [
        {"frequency": "daily", "interval": 14},
        {"frequency": "weekly", "bymonth": [6, 7, 8], "count": 5},
        {"frequency": "monthly", "interval": 2, "until": "2027-03-31"},
        {"frequency": "hourly"},
    ],
)
def test_interval_round_trip(selector):
    """schedule → selector → schedule is stable for interval chores."""
    schedule = interval_selector_to_schedule(selector, existing={})
    inverse = schedule_to_selector("interval", schedule)
    assert interval_selector_to_schedule(inverse, existing={}) == schedule


def test_oneshot_selector():
    """Oneshot decomposes to its due_datetime and persist flag."""
    assert schedule_to_selector("oneshot", {"due_datetime": "2026-07-15T14:30:00", "persist": True}) == {
        "due_datetime": "2026-07-15T14:30:00",
        "persist": True,
    }
    assert schedule_to_selector("oneshot", {"due_datetime": None, "persist": False}) == {
        "due_datetime": None,
        "persist": False,
    }


def test_scheduled_selector_separates_ordinal_byday_from_bysetpos():
    """BYDAY=2MO stays an ordinal byday; BYDAY=FR;BYSETPOS=-1 stays bysetpos."""
    ordinal = schedule_to_selector("scheduled", {"rrule": "FREQ=MONTHLY;BYDAY=2MO", "persist": False})
    assert ordinal["byday"] == ["2mon"]
    assert "bysetpos" not in ordinal

    setpos = schedule_to_selector("scheduled", {"rrule": "FREQ=MONTHLY;BYDAY=FR;BYSETPOS=-1", "persist": False})
    assert setpos["byday"] == ["fri"]
    assert setpos["bysetpos"] == [-1]


def test_schedule_to_selector_unknown_type_raises():
    """An unknown chore type is a programming error, not a user error."""
    with pytest.raises(ValueError, match="unknown chore type"):
        schedule_to_selector("nonsense", {})
