"""DataUpdateCoordinator for chore status evaluation."""

from __future__ import annotations

from datetime import timedelta

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator
from homeassistant.util import dt as dt_util

from .const import DEFAULT_UPDATE_INTERVAL, DOMAIN, EVENT_STATUS_CHANGED, LOGGER, ChoreEventSource, ChoreStatus
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
        # uid → source override for the next status transition fired for that
        # uid. Consumed once per refresh; absent uids default to ``SCHEDULE``.
        # Pending sources are dropped after each tick whether or not a
        # transition fired, so a service action that doesn't flip status
        # doesn't bleed its source into a later natural transition.
        self._pending_sources: dict[str, ChoreEventSource] = {}

    def mark_source(self, uid: str, source: ChoreEventSource) -> None:
        """Tag the next status_changed event for *uid* with *source*.

        Service handlers and helpers call this before ``async_refresh()`` so
        the resulting payload carries the right cause. The default ``SCHEDULE``
        source covers natural transitions on the periodic tick.
        """
        self._pending_sources[uid] = source

    def _resolve_calendar_entity_id(self) -> str | None:
        """Resolve this list's calendar entity_id, or None if not registered."""
        registry = er.async_get(self.hass)
        return registry.async_get_entity_id("calendar", DOMAIN, self.store.entry_id)

    async def _async_update_data(self) -> dict[str, BaseChore]:
        """Evaluate all chore statuses, fire events on transitions, and push the calendar listener invalidation.

        ``_notify_event_listeners`` covers every refresh path uniformly —
        service-driven CRUD (which calls ``coordinator.async_refresh()``) as
        well as the periodic tick. The notifier is a no-op when the calendar
        entity isn't loaded or when the underlying
        ``CalendarEntity.async_update_event_listeners`` API isn't available,
        so the unconditional call is cheap.
        """
        chores = self.store.get_all_chores()
        now = dt_util.now()
        calendar_entity_id = self._resolve_calendar_entity_id()

        for uid, chore in chores.items():
            current_status = chore.compute_status(now)
            previous_status = self._previous_statuses.get(uid)
            source = self._pending_sources.pop(uid, ChoreEventSource.SCHEDULE)

            if previous_status is not None and current_status != previous_status:
                next_due = chore.compute_next_due(now)
                payload = {
                    "uid": chore.uid,
                    "chore_name": chore.chore_name,
                    "entity_id": calendar_entity_id,
                    "from_status": str(previous_status),
                    "to_status": str(current_status),
                    "next_due": next_due.isoformat() if next_due else None,
                    "assigned_to": list(chore.assigned_to),
                    "source": str(source),
                }
                self.hass.bus.async_fire(EVENT_STATUS_CHANGED, payload)

            self._previous_statuses[uid] = current_status

        # Clean up statuses + any orphan pending sources for deleted chores.
        deleted = self._previous_statuses.keys() - chores.keys()
        for uid in deleted:
            del self._previous_statuses[uid]
        for uid in self._pending_sources.keys() - chores.keys():
            del self._pending_sources[uid]

        self._notify_event_listeners()
        return chores

    def _notify_event_listeners(self) -> None:
        """Push fresh events to the calendar panel subscribers for this list.

        HA's calendar dashboard caches event lists client-side and does not
        refetch on ``state_changed`` — refreshes on chores leave stale events
        visible until the user navigates dates or reloads the browser.
        ``CalendarEntity.async_update_event_listeners`` (added on HA dev,
        post-2026.3.1) lets the integration push an invalidation.

        Silently no-ops when:

        - The calendar entity isn't loaded for this entry.
        - The HA version doesn't yet implement ``async_update_event_listeners``.
        """
        calendar_entity_id = self._resolve_calendar_entity_id()
        if calendar_entity_id is None:
            return

        calendar_component = self.hass.data.get("calendar")
        if calendar_component is None:
            return
        entity = calendar_component.get_entity(calendar_entity_id)
        notify = getattr(entity, "async_update_event_listeners", None)
        if notify is None:
            return
        notify()
        LOGGER.debug(
            "Pushed calendar event update to subscribers of %s",
            calendar_entity_id,
        )
