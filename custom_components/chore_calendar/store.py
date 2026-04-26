"""Persistent storage for chore data."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import uuid4

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import DOMAIN, STORAGE_VERSION
from .models import BaseChore


class _ChoreCalendarStore(Store[dict[str, Any]]):
    """Storage subclass with version migration support.

    Migration v1→v2: remove this subclass when dropping v1 support.
    Use plain ``Store`` in ``ChoreStore.__init__`` instead.
    """

    def __init__(self, hass: HomeAssistant, key: str) -> None:
        """Initialize with the current storage version."""
        super().__init__(hass, STORAGE_VERSION, key)
        self._slug_to_uid: dict[str, str] = {}

    async def _async_migrate_func(
        self,
        old_major_version: int,
        old_minor_version: int,
        old_data: dict[str, Any],
    ) -> dict[str, Any]:
        """Migrate storage data from older versions."""
        if old_major_version == 1:
            old_chores: dict[str, Any] = old_data.get("chores", {})
            items: list[dict[str, Any]] = []
            for old_slug, chore_data in old_chores.items():
                new_uid = str(uuid4())
                chore_data["uid"] = new_uid
                chore_data.pop("chore_id", None)
                items.append(chore_data)
                self._slug_to_uid[old_slug] = new_uid
            old_data.pop("chores", None)
            old_data["items"] = items
        return old_data

    @property
    def slug_to_uid_map(self) -> dict[str, str]:
        """Return the slug→uid mapping produced by a v1→v2 migration.

        Empty if no migration was needed. Migration v1→v2: remove when
        dropping v1 support.
        """
        return self._slug_to_uid


class ChoreStore:
    """Manage persistent storage of chores for a single chore list."""

    def __init__(self, hass: HomeAssistant, entry_id: str) -> None:
        """Initialize the store."""
        # Migration v1→v2: replace _ChoreCalendarStore with plain Store
        # when dropping v1 support.
        self._store = _ChoreCalendarStore(hass, f"{DOMAIN}.{entry_id}")
        self._chores: dict[str, BaseChore] = {}
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

    @property
    def slug_to_uid_map(self) -> dict[str, str]:
        """Return the slug→uid mapping from a v1→v2 migration.

        Migration v1→v2: remove when dropping v1 support.
        """
        return self._store.slug_to_uid_map

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
