"""Tests for the scheduled-chore streak."""

from __future__ import annotations

from datetime import datetime, time, timedelta, timezone

from custom_components.chore_calendar.const import ChoreType
from custom_components.chore_calendar.models import BaseChore, ScheduledChore

# Use a fixed timezone for all tests.
TZ = timezone(timedelta(hours=-5))


def _at(day: int, hour: int = 8, minute: int = 0, month: int = 3) -> datetime:
    return datetime(2026, month, day, hour, minute, tzinfo=TZ)


def _daily(**kwargs) -> ScheduledChore:
    """Daily 08:00 chore, 3h pending window (opens 05:00), 1h grace (overdue at 09:00)."""
    return ScheduledChore(
        uid="daily",
        chore_name="Daily",
        chore_type=ChoreType.SCHEDULED,
        time=time(8, 0),
        active_days=[],
        pending_period=timedelta(hours=3),
        grace_period=timedelta(hours=1),
        **kwargs,
    )


def _evening(**kwargs) -> ScheduledChore:
    """Daily 19:00 chore, 3h pending window, 14h grace (overdue at 09:00 the next day)."""
    return ScheduledChore(
        uid="homework",
        chore_name="Math homework",
        chore_type=ChoreType.SCHEDULED,
        time=time(19, 0),
        active_days=[],
        pending_period=timedelta(hours=3),
        grace_period=timedelta(hours=14),
        **kwargs,
    )


class TestStreakStorage:
    """Both fields round-trip and default to 0 for older storage."""

    def test_round_trip_keeps_both_fields(self):
        chore = _daily(created_at=_at(1, 4), streak=4, previous_streak=3)
        data = chore.to_dict()
        assert data["streak"] == 4
        assert data["previous_streak"] == 3
        restored = BaseChore.from_dict(data)
        assert restored.streak == 4
        assert restored.previous_streak == 3

    def test_dict_without_fields_loads_as_zero(self):
        data = _daily(created_at=_at(1, 4)).to_dict()
        del data["streak"]
        del data["previous_streak"]
        restored = BaseChore.from_dict(data)
        assert restored.streak == 0
        assert restored.previous_streak == 0
