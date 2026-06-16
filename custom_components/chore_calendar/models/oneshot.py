"""Oneshot chore: a non-recurring chore with an optional due datetime."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Self

from homeassistant.util import dt as dt_util

from .base import BaseChore


@dataclass
class OneshotChore(BaseChore):
    """A non-recurring chore with an optional due datetime.

    Unlike scheduled and interval chores which recur on a fixed cadence, a
    oneshot chore has no schedule of its own — it is anchored by an
    externally-set ``due_datetime`` (which may be ``None`` for unscheduled
    chores). Lifecycle for a single occurrence is pending → due → overdue
    → completed.

    Completion sets the inherited ``terminal`` flag (the source of truth for
    "current occurrence is satisfied and won't roll forward"), so a
    terminal-completed oneshot can have a ``None`` ``due_datetime`` without
    the cycle reopening. Reschedule via ``update_item`` clears the flag and
    re-enters the cycle.
    """

    due_datetime: datetime | None = None

    def _anchor_due_at(self, now: datetime) -> datetime | None:
        """Return ``due_datetime`` directly — may be None for unscheduled chores."""
        del now  # oneshot's anchor is fixed; no time-relative resolution needed.
        return self.due_datetime

    def compute_next_due(self, now: datetime) -> datetime | None:
        """Return the operative due datetime, or None when terminal/unscheduled."""
        if self.terminal:
            return None
        if self._skip_anchor_active(now):
            return self.skipped_until
        return self.due_datetime

    def apply_completion(
        self,
        timestamp: datetime,
        completed_by: str | None,
        *,
        clear_skip: bool = True,
    ) -> None:
        """Record a completion and mark the occurrence terminal.

        ``terminal=True`` is the explicit signal that the current occurrence
        is satisfied and won't roll forward. ``due_datetime`` is left as-is
        — a never-scheduled completion (Path A) keeps ``due_datetime=None``,
        and a normally-scheduled completion keeps the original date for
        history. Reschedule via ``update_item`` clears the flag.
        """
        self.terminal = True
        super().apply_completion(timestamp, completed_by, clear_skip=clear_skip)

    def revert_completion(self) -> None:
        """Revert a completion and clear the terminal flag."""
        super().revert_completion()
        self.terminal = False

    def apply_default_skip(self, now: datetime) -> datetime | None:
        """Clear ``due_datetime`` rather than picking a new anchor.

        Returns ``None`` — the skip event payload's ``skipped_until`` field
        becomes ``null``, signalling "no operative anchor". The chore is now
        unscheduled and stays open for reschedule via ``update_item``. The
        service layer rejects this path on terminal-completed oneshots, so
        ``terminal`` stays False here.
        """
        del now  # default-skip on oneshot is time-independent.
        self.due_datetime = None
        return None

    def _schedule_to_dict(self) -> dict[str, Any]:
        """Serialize oneshot-specific schedule fields."""
        return {
            "due_datetime": self.due_datetime.isoformat() if self.due_datetime else None,
            "persist": self.persist,
        }

    @classmethod
    def from_schedule(cls, base: dict[str, Any], schedule: dict[str, Any]) -> Self:
        """Create a OneshotChore from base kwargs and a schedule dict.

        Coerces a naive ``due_datetime`` (e.g. from the datetime selector or
        a YAML service call without a ``+HH:MM`` suffix) to HA's local
        timezone so comparisons against ``dt_util.now()`` don't raise.
        ``persist`` defaults to False for backward-compat with stored
        oneshots that pre-date the field.
        """
        due_datetime_raw = schedule.get("due_datetime")
        due_datetime = dt_util.parse_datetime(due_datetime_raw) if due_datetime_raw else None
        if due_datetime is not None and due_datetime.tzinfo is None:
            due_datetime = due_datetime.replace(tzinfo=dt_util.DEFAULT_TIME_ZONE)
        return cls(
            **base,
            due_datetime=due_datetime,
            persist=bool(schedule.get("persist", False)),
        )
