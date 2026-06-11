"""Persistent storage for chore data."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import DEFAULT_PENDING_PERIOD_MINS, DOMAIN, STORAGE_VERSION, ChoreType
from .models import BaseChore
from .models.interval import mins_to_freq_interval
from .models.scheduled import migrate_legacy_schedule


class _ChoreCalendarStore(Store[dict[str, Any]]):
    """Storage subclass with version migration support."""

    async def _async_migrate_func(
        self,
        old_major_version: int,
        old_minor_version: int,
        old_data: dict[str, Any],
    ) -> dict[str, Any]:
        """Migrate storage data from older versions.

        v2 → v3: lift ``early_window_mins`` and ``grace_period_mins`` out of
        each item's per-type ``schedule`` dict into top-level keys, and
        rename ``early_window_mins`` to ``pending_period_mins``. Interval
        items had no ``early_window_mins`` previously — inject the new 3h
        default explicitly so the stored value matches the new behavior.

        v3 also introduced the top-level ``terminal`` flag and dropped
        ``previous_due_datetime`` from oneshot items. Both are handled at
        load time by ``BaseChore.from_dict`` (terminal is backfilled from
        the completion-vs-pending-window relationship; the dropped field is
        ignored), so no work is needed here.

        v3 → v4: rewrite each scheduled item's ``schedule`` dict from
        ``{time, active_days}`` to ``{rrule, dtstart}``. ``dtstart``'s date
        comes from the item's ``created_at`` (the series phase anchor —
        irrelevant at INTERVAL=1, but it must exist). Interval and oneshot
        schedules are unchanged. The other v4 additions (``description``,
        ``completion_count``, ``exdate``, ``rdate``) ride on load-time
        defaults in ``BaseChore.from_dict``.

        v4 → v5: rewrite each interval item's ``schedule`` dict from
        ``{interval_mins}`` to ``{freq, interval}``, mapped onto the largest
        exactly-dividing unit (lossless by construction — anything that
        doesn't divide falls through to ``minutely``).
        """
        if old_major_version < 3:
            for item in old_data.get("items", []):
                schedule = item.get("schedule", {})
                pending_mins = schedule.pop("early_window_mins", DEFAULT_PENDING_PERIOD_MINS)
                grace_mins = schedule.pop("grace_period_mins", None)
                item["pending_period_mins"] = pending_mins
                if grace_mins is not None:
                    item["grace_period_mins"] = grace_mins
        if old_major_version < 4:
            for item in old_data.get("items", []):
                if item.get("chore_type") != str(ChoreType.SCHEDULED):
                    continue
                created_raw = item.get("created_at")
                created_at = dt_util.parse_datetime(created_raw) if created_raw else None
                item["schedule"] = migrate_legacy_schedule(item.get("schedule", {}), created_at)
        if old_major_version < 5:
            for item in old_data.get("items", []):
                if item.get("chore_type") != str(ChoreType.INTERVAL):
                    continue
                schedule = item.get("schedule", {})
                # Missing interval_mins maps to the model default (1 day).
                freq, interval = mins_to_freq_interval(int(schedule.get("interval_mins", 1440)))
                item["schedule"] = {"freq": freq, "interval": interval}
        return old_data


class ChoreStore:
    """Manage persistent storage of chores for a single chore list."""

    def __init__(self, hass: HomeAssistant, entry_id: str) -> None:
        """Initialize the store."""
        self._store = _ChoreCalendarStore(hass, STORAGE_VERSION, f"{DOMAIN}.{entry_id}")
        self._chores: dict[str, BaseChore] = {}
        # Surface the config entry id so shared helpers (e.g. the calendar
        # event-listener notifier in services.py) can resolve to the
        # per-list calendar entity without an extra registry hop.
        self.entry_id = entry_id
        # Per-list cutoff for hiding completed items (set by
        # hide_completed_items / todo.remove_completed_items). Items whose
        # last_completed precedes this datetime are hidden from the
        # calendar/todo entities. None means no cutoff is active.
        self._completed_cleared_at: datetime | None = None

    async def async_load(self) -> None:
        """Load chores from persistent storage into memory."""
        raw = await self._store.async_load()
        if raw is None:
            self._chores = {}
            self._completed_cleared_at = None
            return

        items: list[dict[str, Any]] = raw.get("items", [])
        self._chores = {item["uid"]: BaseChore.from_dict(item) for item in items}
        cleared_raw = raw.get("completed_cleared_at")
        # Older stores omit this field — load as None for backward compat.
        self._completed_cleared_at = dt_util.parse_datetime(cleared_raw) if cleared_raw else None

    async def async_save(self) -> None:
        """Persist all chores to storage."""
        data: dict[str, Any] = {
            "items": [chore.to_dict() for chore in self._chores.values()],
            "completed_cleared_at": (self._completed_cleared_at.isoformat() if self._completed_cleared_at else None),
        }
        await self._store.async_save(data)

    @property
    def completed_cleared_at(self) -> datetime | None:
        """Return the per-list cutoff for hiding completed items, or None."""
        return self._completed_cleared_at

    async def async_set_completed_cleared_at(self, value: datetime | None) -> None:
        """Set the cutoff and persist."""
        self._completed_cleared_at = value
        await self.async_save()

    def get_all_chores(self) -> dict[str, BaseChore]:
        """Return a copy of the in-memory chores dict."""
        return dict(self._chores)

    def get_chore(self, uid: str) -> BaseChore | None:
        """Return a single chore by UID, or None if not found."""
        return self._chores.get(uid)

    async def async_create_chore(self, chore: BaseChore) -> None:
        """Add a new chore and persist."""
        self._chores[chore.uid] = chore
        await self.async_save()

    async def async_update_chore(self, chore: BaseChore) -> None:
        """Update an existing chore and persist."""
        self._chores[chore.uid] = chore
        await self.async_save()

    async def async_delete_chore(self, uid: str) -> None:
        """Remove a chore by UID and persist."""
        self._chores.pop(uid, None)
        await self.async_save()

    async def async_remove(self) -> None:
        """Remove the storage file entirely (used on entry removal)."""
        await self._store.async_remove()
