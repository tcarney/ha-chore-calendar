"""Abstract chore base class and shared serialization helpers."""

from __future__ import annotations

import abc
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

from custom_components.chore_calendar.const import (
    DEFAULT_GRACE_PERIOD_MINS,
    DEFAULT_PENDING_PERIOD_MINS,
    ChoreStatus,
    ChoreType,
)
from homeassistant.util import dt as dt_util


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
    # Internal undo slot — holds the prior completion so it can be restored
    # once via uncomplete_item. Not user-facing.
    previous_last_completed: datetime | None = None
    previous_last_completed_by: str | None = None
    skipped_until: datetime | None = None
    previous_skipped_until: datetime | None = None
    # When True, the current occurrence is satisfied terminally — compute_status
    # short-circuits to COMPLETED and compute_due_range/compute_next_due return
    # None. Set by `apply_completion` for types whose current occurrence does
    # not roll forward (OneshotChore today; UNTIL/COUNT-exhausted ScheduledChore
    # under future RRULE work). Cleared by `revert_completion` and by reschedule
    # paths that re-enter the cycle.
    terminal: bool = False
    # Window before the operative due time during which a chore reads as
    # PENDING (upcoming, completable early). Shared by all chore types.
    pending_period: timedelta = field(default_factory=lambda: timedelta(minutes=DEFAULT_PENDING_PERIOD_MINS))
    # Window after the operative due time during which a chore stays DUE
    # before flipping to OVERDUE. Shared by all chore types.
    grace_period: timedelta = field(default_factory=lambda: timedelta(minutes=DEFAULT_GRACE_PERIOD_MINS))

    @abc.abstractmethod
    def _anchor_due_at(self, now: datetime) -> datetime | None:
        """Return the type-specific due anchor (without skip handling).

        Returns None when the chore is unscheduled — interval with no prior
        completion, oneshot with no ``due_datetime``. Skip handling is
        layered on by ``_operative_due_at``, which wraps this method.

        Initial-state convention (compare across types — see SPECS.md):

        - ``ScheduledChore``: pins to the first active-day ``period_due``
          at or after ``created_at`` for never-completed chores; walks
          back from the candidate period for completed chores. Always
          non-None.
        - ``IntervalChore``: ``last_completed + interval`` once first
          completion lands; None until then.
        - ``OneshotChore``: returns ``due_datetime`` directly, which may
          be None for unscheduled chores.
        """

    def _operative_due_at(self, now: datetime) -> datetime | None:
        """Return the operative due time, honoring an active skip anchor.

        ``skipped_until`` overrides the type-specific anchor while the skip
        window is active (until ``skipped_until + grace_period``). Once the
        window elapses, falls through to the normal anchor.
        """
        if self._skip_anchor_active(now):
            return self.skipped_until
        return self._anchor_due_at(now)

    def compute_status(self, now: datetime) -> ChoreStatus:
        """Compute the current chore status from the operative anchor.

        Unified state machine across types. The operative anchor (set by
        ``_operative_due_at``) determines ``due_at``; from there the same
        window math applies: ``pending_at = due_at - pending_period`` and
        ``overdue_at = due_at + grace_period``.

        Terminal short-circuit: a chore flagged ``terminal=True`` reports
        COMPLETED unconditionally. This is the explicit "current occurrence
        is satisfied and won't roll forward" state set by ``apply_completion``
        on types without a next cycle. Reschedule paths (e.g. oneshot
        ``update_item`` setting a new ``due_datetime``) clear the flag.

        Initial-state convention: a chore with no operative anchor — interval
        without a prior completion, oneshot without a ``due_datetime`` —
        reports PENDING (unscheduled but actionable). When ``now`` falls
        before ``pending_at`` and no completion has landed in the current
        cycle, the fallthrough rule reads:

        - ``last_completed`` is set → COMPLETED (the previous cycle was
          satisfied; the chore is dormant until ``pending_at``).
        - ``last_completed`` is None → PENDING (the chore is awaiting its
          first action — keep it visible in the upcoming list).

        See ``_anchor_due_at`` for the per-type rules that produce the
        anchor in the first place.
        """
        if self.terminal:
            return ChoreStatus.COMPLETED
        due_at = self._operative_due_at(now)
        if due_at is None:
            return ChoreStatus.PENDING

        pending_at = due_at - self.pending_period
        overdue_at = due_at + self.grace_period

        # Skip anchor may place ``now`` well before its pending window —
        # treat the gap before pending_at as COMPLETED (the chore is
        # explicitly deferred).
        if self._skip_anchor_active(now) and now < pending_at:
            return ChoreStatus.COMPLETED

        # Completion landing within the current cycle's pending window
        # marks the cycle satisfied.
        if self.last_completed is not None and self.last_completed >= pending_at:
            return ChoreStatus.COMPLETED

        if now >= overdue_at:
            return ChoreStatus.OVERDUE
        if now >= due_at:
            return ChoreStatus.DUE
        if now >= pending_at:
            return ChoreStatus.PENDING

        # Fallthrough — ``now`` is before ``pending_at``. A previous
        # completion implies the cycle is satisfied (dormant); no completion
        # implies the chore is awaiting first action.
        if self.last_completed is not None:
            return ChoreStatus.COMPLETED
        return ChoreStatus.PENDING

    def compute_due_range(self, now: datetime) -> tuple[datetime, datetime] | None:
        """Return (due_at, overdue_at) for the current cycle, or None.

        Returns None when the chore is terminal-completed (no further window
        to surface) or has no operative anchor.
        """
        if self.terminal:
            return None
        due_at = self._operative_due_at(now)
        if due_at is None:
            return None
        return (due_at, due_at + self.grace_period)

    @abc.abstractmethod
    def compute_next_due(self, now: datetime) -> datetime | None:
        """Compute the next due datetime, or None if not applicable.

        Per-type because the cadence-advancement rules genuinely differ:
        scheduled walks active days, interval adds ``interval`` to
        ``last_completed``, oneshot has no advancement (terminal).
        """

    @abc.abstractmethod
    def apply_default_skip(self, now: datetime) -> datetime | None:
        """Apply type-specific default-skip behavior; return the operative anchor.

        Most types defer the next occurrence by setting ``skipped_until``; the
        returned value mirrors that. Some types (e.g. ``OneshotChore``) clear
        a different anchor instead and return ``None`` to signal "no operative
        anchor". Used by the skip handler for logging only — the resulting
        status transition surfaces via ``chore_calendar_status_changed`` with
        ``source=skip``.
        """

    def apply_completion(
        self,
        timestamp: datetime,
        completed_by: str | None,
        *,
        clear_skip: bool = True,
    ) -> None:
        """Record a completion, saving the prior state to the undo slot.

        When *clear_skip* is True (the default), any active ``skipped_until`` is
        moved to the undo slot and cleared. Pass False to preserve the skip —
        e.g. when the user completed early but still wants the deferral to hold.
        """
        self.previous_last_completed = self.last_completed
        self.previous_last_completed_by = self.last_completed_by
        self.last_completed = timestamp
        self.last_completed_by = completed_by
        if clear_skip:
            self.previous_skipped_until = self.skipped_until
            self.skipped_until = None
        else:
            self.previous_skipped_until = None

    def revert_completion(self) -> None:
        """Restore the previous completion state from the undo slot.

        Also restores ``skipped_until`` if it was cleared by the completion,
        keeping skip state symmetric with the other previous-* fields.
        Raises ValueError if there is no completion to revert.
        """
        if self.last_completed is None:
            msg = "Chore has no completion to revert."
            raise ValueError(msg)
        self.last_completed = self.previous_last_completed
        self.last_completed_by = self.previous_last_completed_by
        self.skipped_until = self.previous_skipped_until
        self.previous_last_completed = None
        self.previous_last_completed_by = None
        self.previous_skipped_until = None

    def _skip_anchor_active(self, now: datetime) -> bool:
        """Return True while ``skipped_until`` should override the type's normal anchor.

        Active from the moment ``skipped_until`` is set until ``skipped_until + grace_period``,
        matching the same DUE/OVERDUE window each type applies to its own anchor.
        """
        return self.skipped_until is not None and now < self.skipped_until + self.grace_period

    @abc.abstractmethod
    def _schedule_to_dict(self) -> dict[str, Any]:
        """Serialize type-specific schedule fields."""

    def schedule_description(self) -> dict[str, Any]:
        """Return a human-friendly schedule dict for sensor attributes.

        Combines per-type ``_schedule_to_dict`` output with the cross-type
        ``pending_period_mins`` / ``grace_period_mins`` window fields so the
        sensor's ``schedule`` attribute presents a single unified view.
        Subclasses extend ``_schedule_to_dict`` for type-specific shape;
        the windows are added here uniformly.
        """
        data = self._schedule_to_dict()
        data["pending_period_mins"] = int(self.pending_period.total_seconds() // 60)
        data["grace_period_mins"] = int(self.grace_period.total_seconds() // 60)
        return data

    def to_dict(self) -> dict[str, Any]:
        """Serialize the chore to a storage-compatible dict."""
        return {
            "uid": self.uid,
            "chore_name": self.chore_name,
            "chore_type": str(self.chore_type),
            "schedule": self._schedule_to_dict(),
            "pending_period_mins": int(self.pending_period.total_seconds() // 60),
            "grace_period_mins": int(self.grace_period.total_seconds() // 60),
            "terminal": self.terminal,
            "trigger_tag_id": self.trigger_tag_id,
            "assigned_to": list(self.assigned_to),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_completed": self.last_completed.isoformat() if self.last_completed else None,
            "last_completed_by": self.last_completed_by,
            "previous_last_completed": (
                self.previous_last_completed.isoformat() if self.previous_last_completed else None
            ),
            "previous_last_completed_by": self.previous_last_completed_by,
            "skipped_until": self.skipped_until.isoformat() if self.skipped_until else None,
            "previous_skipped_until": (
                self.previous_skipped_until.isoformat() if self.previous_skipped_until else None
            ),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> BaseChore:
        """Deserialize a chore from a storage dict, dispatching on chore_type.

        Subclasses are imported lazily so the sibling modules can import
        ``BaseChore`` without forming a cycle.
        """
        # Local import: each subclass module imports from .base, so importing
        # them at module scope here would form a cycle.
        from .interval import IntervalChore  # noqa: PLC0415 - cycle break
        from .oneshot import OneshotChore  # noqa: PLC0415 - cycle break
        from .scheduled import ScheduledChore  # noqa: PLC0415 - cycle break

        chore_type = ChoreType(data["chore_type"])
        base_kwargs = _extract_base_kwargs(data, chore_type)

        if chore_type == ChoreType.SCHEDULED:
            return ScheduledChore.from_schedule(base_kwargs, data["schedule"])
        if chore_type == ChoreType.INTERVAL:
            return IntervalChore.from_schedule(base_kwargs, data["schedule"])
        if chore_type == ChoreType.ONESHOT:
            chore: OneshotChore = OneshotChore.from_schedule(base_kwargs, data["schedule"])
            # Backfill `terminal` for legacy stores written before the flag
            # existed: a oneshot was terminal-completed iff its completion
            # landed inside the current cycle's pending window.
            if "terminal" not in data and chore.due_datetime is not None and chore.last_completed is not None:
                pending_at = chore.due_datetime - chore.pending_period
                chore.terminal = chore.last_completed >= pending_at
            return chore

        msg = f"Unknown chore_type: {chore_type}"
        raise ValueError(msg)


def _extract_base_kwargs(data: dict[str, Any], chore_type: ChoreType) -> dict[str, Any]:
    """Extract shared BaseChore fields from a storage dict."""
    created_at_raw = data.get("created_at")
    last_completed_raw = data.get("last_completed")
    previous_last_completed_raw = data.get("previous_last_completed")
    skipped_until_raw = data.get("skipped_until")
    previous_skipped_until_raw = data.get("previous_skipped_until")
    return {
        "uid": data["uid"],
        "chore_name": data["chore_name"],
        "chore_type": chore_type,
        "trigger_tag_id": data.get("trigger_tag_id"),
        "assigned_to": list(data.get("assigned_to", [])),
        "created_at": dt_util.parse_datetime(created_at_raw) if created_at_raw else None,
        "last_completed": dt_util.parse_datetime(last_completed_raw) if last_completed_raw else None,
        "last_completed_by": data.get("last_completed_by"),
        "previous_last_completed": (
            dt_util.parse_datetime(previous_last_completed_raw) if previous_last_completed_raw else None
        ),
        "previous_last_completed_by": data.get("previous_last_completed_by"),
        "skipped_until": dt_util.parse_datetime(skipped_until_raw) if skipped_until_raw else None,
        "previous_skipped_until": (
            dt_util.parse_datetime(previous_skipped_until_raw) if previous_skipped_until_raw else None
        ),
        "terminal": bool(data.get("terminal", False)),
        "pending_period": timedelta(minutes=data.get("pending_period_mins", DEFAULT_PENDING_PERIOD_MINS)),
        "grace_period": timedelta(minutes=data.get("grace_period_mins", DEFAULT_GRACE_PERIOD_MINS)),
    }
