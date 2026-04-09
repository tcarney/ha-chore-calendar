"""Persistent storage for chore data."""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN, STORAGE_VERSION
from .models import BaseChore


class ChoreStore:
    """Manage persistent storage of chores for a single chore list."""

    def __init__(self, hass: HomeAssistant, entry_id: str) -> None:
        """Initialize the store."""
        self._store: Store[dict[str, Any]] = Store(
            hass,
            STORAGE_VERSION,
            f"{DOMAIN}.{entry_id}",
        )
        self._chores: dict[str, BaseChore] = {}

    async def async_load(self) -> None:
        """Load chores from persistent storage into memory."""
        raw = await self._store.async_load()
        if raw is None:
            self._chores = {}
            return

        chores_data: dict[str, Any] = raw.get("chores", {})
        self._chores = {chore_id: BaseChore.from_dict(chore_data) for chore_id, chore_data in chores_data.items()}

    async def async_save(self) -> None:
        """Persist all chores to storage."""
        data = {
            "chores": {chore_id: chore.to_dict() for chore_id, chore in self._chores.items()},
        }
        await self._store.async_save(data)

    def get_all_chores(self) -> dict[str, BaseChore]:
        """Return a copy of the in-memory chores dict."""
        return dict(self._chores)

    def get_chore(self, chore_id: str) -> BaseChore | None:
        """Return a single chore by ID, or None if not found."""
        return self._chores.get(chore_id)

    async def async_create_chore(self, chore: BaseChore) -> None:
        """Add a new chore and persist."""
        self._chores[chore.chore_id] = chore
        await self.async_save()

    async def async_update_chore(self, chore: BaseChore) -> None:
        """Update an existing chore and persist."""
        self._chores[chore.chore_id] = chore
        await self.async_save()

    async def async_delete_chore(self, chore_id: str) -> None:
        """Remove a chore by ID and persist."""
        self._chores.pop(chore_id, None)
        await self.async_save()

    async def async_remove(self) -> None:
        """Remove the storage file entirely (used on entry removal)."""
        await self._store.async_remove()
