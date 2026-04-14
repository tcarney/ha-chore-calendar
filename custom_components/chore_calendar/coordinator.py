"""DataUpdateCoordinator for chore status evaluation."""

from __future__ import annotations

from datetime import timedelta

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator
from homeassistant.util import dt as dt_util

from .const import DEFAULT_UPDATE_INTERVAL, EVENT_STATUS_CHANGED, LOGGER, ChoreStatus
from .models import BaseChore
from .store import ChoreStore


class ChoreCalendarCoordinator(DataUpdateCoordinator[dict[str, BaseChore]]):
    """Periodically evaluate chore statuses and fire transition events."""

    def __init__(self, hass: HomeAssistant, store: ChoreStore) -> None:
        """Initialize the coordinator."""
        super().__init__(
            hass,
            LOGGER,
            name="chore_calendar",
            update_interval=timedelta(seconds=DEFAULT_UPDATE_INTERVAL),
        )
        self.store = store
        self._previous_statuses: dict[str, ChoreStatus] = {}
        # UIDs flagged by an uncomplete_item call. Consumed on the next refresh
        # so the resulting status-changed event carries an "uncomplete": True
        # marker — letting automations distinguish undo from natural transitions.
        self._pending_uncomplete_uids: set[str] = set()

    def mark_uncompleted(self, uid: str) -> None:
        """Flag *uid* so its next status transition event is marked as an undo."""
        self._pending_uncomplete_uids.add(uid)

    async def _async_update_data(self) -> dict[str, BaseChore]:
        """Evaluate all chore statuses and fire events on transitions."""
        chores = self.store.get_all_chores()
        now = dt_util.now()

        for uid, chore in chores.items():
            current_status = chore.compute_status(now)
            previous_status = self._previous_statuses.get(uid)
            is_uncomplete = uid in self._pending_uncomplete_uids

            if previous_status is not None and current_status != previous_status:
                next_due = chore.compute_next_due(now)
                payload = {
                    "uid": chore.uid,
                    "chore_name": chore.chore_name,
                    "from_status": str(previous_status),
                    "to_status": str(current_status),
                    "next_due": next_due.isoformat() if next_due else None,
                    "assigned_to": list(chore.assigned_to),
                }
                if is_uncomplete:
                    payload["uncomplete"] = True
                self.hass.bus.async_fire(EVENT_STATUS_CHANGED, payload)

            self._previous_statuses[uid] = current_status
            self._pending_uncomplete_uids.discard(uid)

        # Clean up statuses for deleted chores.
        deleted = self._previous_statuses.keys() - chores.keys()
        for uid in deleted:
            del self._previous_statuses[uid]

        return chores
