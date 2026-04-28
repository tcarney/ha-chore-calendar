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

    Completed is terminal *for the current occurrence* but ``update_item``
    can rewrite ``due_datetime`` to a new value, re-entering the cycle. This
    enables ad-hoc and automation-driven workflows.
    """

    due_datetime: datetime | None = None
    # When False (default), a terminal-completed oneshot is deleted from
    # storage on the next hide_completed_items / todo.remove_completed_items
    # sweep. When True, the chore stays in storage and can be reactivated
    # via update_item by setting a new due_datetime.
    persist: bool = False
    # Undo slot for the synthetic-due_datetime rule applied at completion time.
    previous_due_datetime: datetime | None = None

    def _anchor_due_at(self, now: datetime) -> datetime | None:
        """Return ``due_datetime`` directly — may be None for unscheduled chores.

        ``(last_completed=set, due_datetime=None)`` reliably means the user
        explicitly unscheduled the chore (the synthetic-due rule in
        ``apply_completion`` ensures terminal-completed always has a date).
        """
        del now  # oneshot's anchor is fixed; no time-relative resolution needed.
        return self.due_datetime

    def _is_terminal_completed(self, now: datetime) -> bool:
        """Return True when the current occurrence is completed in its window.

        Suppresses ``compute_due_range`` so the calendar entity stops
        rendering a "next due" event for the satisfied occurrence. While a
        skip anchor is active the chore has a fresh anchor (``skipped_until``)
        and is not terminal — only the natural ``due_datetime`` window
        triggers the terminal state.
        """
        if self.due_datetime is None:
            return False
        if self._skip_anchor_active(now):
            return False
        if self.last_completed is None:
            return False
        pending_at = self.due_datetime - self.pending_period
        return self.last_completed >= pending_at

    def compute_next_due(self, now: datetime) -> datetime | None:
        """Return the operative due datetime, or None when unscheduled or terminal."""
        if self.due_datetime is None:
            return None
        if self._skip_anchor_active(now):
            return self.skipped_until
        pending_at = self.due_datetime - self.pending_period
        if self.last_completed is not None and self.last_completed >= pending_at:
            return None
        return self.due_datetime

    def apply_completion(
        self,
        timestamp: datetime,
        completed_by: str | None,
        *,
        clear_skip: bool = True,
    ) -> None:
        """Record a completion, synthesizing ``due_datetime`` when unscheduled.

        Saves the prior ``due_datetime`` to ``previous_due_datetime`` so
        ``revert_completion`` can restore it. If ``due_datetime is None`` at
        completion time (Path A: chore was created unscheduled and is being
        completed directly), set it to ``timestamp`` so terminal-completed
        always has a date — this lets ``(last_completed=set, due_datetime=None)``
        reliably signal "user explicitly unscheduled" without a separate flag.
        """
        self.previous_due_datetime = self.due_datetime
        if self.due_datetime is None:
            self.due_datetime = timestamp
        super().apply_completion(timestamp, completed_by, clear_skip=clear_skip)

    def revert_completion(self) -> None:
        """Revert a completion, restoring ``due_datetime`` from the undo slot."""
        super().revert_completion()
        self.due_datetime = self.previous_due_datetime
        self.previous_due_datetime = None

    def apply_default_skip(self, now: datetime) -> datetime | None:
        """Clear ``due_datetime`` rather than picking a new anchor.

        Returns ``None`` — the skip event payload's ``skipped_until`` field
        becomes ``null``, signalling "no operative anchor". The chore is now
        unscheduled and stays open for reschedule via ``update_item``.
        """
        self.due_datetime = None
        return None

    def to_dict(self) -> dict[str, Any]:
        """Serialize, including the OneshotChore-specific previous_due_datetime undo slot."""
        data = super().to_dict()
        data["previous_due_datetime"] = self.previous_due_datetime.isoformat() if self.previous_due_datetime else None
        return data

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
