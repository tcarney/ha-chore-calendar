"""Abstract chore base class and shared serialization helpers."""

from __future__ import annotations

import abc
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Any

from custom_components.chore_calendar.const import (
    DEFAULT_GRACE_PERIOD_MINS,
    DEFAULT_PENDING_PERIOD_MINS,
    ChoreStatus,
    ChoreType,
)
from homeassistant.util import dt as dt_util

if TYPE_CHECKING:
    from .oneshot import OneshotChore


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
    # Window before the operative due time during which a chore reads as
    # PENDING (upcoming, completable early). Shared by all chore types.
    pending_period: timedelta = field(default_factory=lambda: timedelta(minutes=DEFAULT_PENDING_PERIOD_MINS))
    # Window after the operative due time during which a chore stays DUE
    # before flipping to OVERDUE. Shared by all chore types.
    grace_period: timedelta = field(default_factory=lambda: timedelta(minutes=DEFAULT_GRACE_PERIOD_MINS))

    @abc.abstractmethod
    def compute_status(self, now: datetime) -> ChoreStatus:
        """Compute the current chore status based on time."""

    @abc.abstractmethod
    def compute_next_due(self, now: datetime) -> datetime | None:
        """Compute the next due datetime, or None if not applicable."""

    @abc.abstractmethod
    def compute_due_range(self, now: datetime) -> tuple[datetime, datetime] | None:
        """Return (due_at, overdue_at) for the current period, or None."""

    @abc.abstractmethod
    def is_in_completion_window(self, timestamp: datetime) -> bool:
        """Return True if a completion at *timestamp* is valid for the current period."""

    @abc.abstractmethod
    def apply_default_skip(self, now: datetime) -> datetime | None:
        """Apply type-specific default-skip behavior; return the event payload value.

        Most types defer the next occurrence by setting ``skipped_until``; the
        returned value mirrors that. Some types (e.g. ``OneshotChore``) clear
        a different anchor instead and return ``None`` to signal "no operative
        anchor" in the ``chore_calendar_item_skipped`` event payload.
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
            pdd_raw = data.get("previous_due_datetime")
            chore.previous_due_datetime = dt_util.parse_datetime(pdd_raw) if pdd_raw else None
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
        "pending_period": timedelta(minutes=data.get("pending_period_mins", DEFAULT_PENDING_PERIOD_MINS)),
        "grace_period": timedelta(minutes=data.get("grace_period_mins", DEFAULT_GRACE_PERIOD_MINS)),
    }
