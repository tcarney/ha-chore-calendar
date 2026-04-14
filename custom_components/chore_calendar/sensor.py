"""Sensor platform for Chore Calendar."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.util import dt as dt_util, slugify as slugify_util

from .const import (
    ATTR_ASSIGNED_TO,
    ATTR_CHORE_TYPE,
    ATTR_LAST_COMPLETED,
    ATTR_LAST_COMPLETED_BY,
    ATTR_NEXT_DUE,
    ATTR_SCHEDULE,
    ATTR_TRIGGER_ENTITY,
    ATTR_UID,
    DOMAIN,
    ChoreStatus,
)
from .coordinator import ChoreCalendarCoordinator
from .models import BaseChore

if TYPE_CHECKING:
    from . import ChoreCalendarConfigEntry

# Icon mapping per status.
_STATUS_ICONS: dict[ChoreStatus, str] = {
    ChoreStatus.COMPLETED: "mdi:check-circle",
    ChoreStatus.DUE: "mdi:alert",
    ChoreStatus.OVERDUE: "mdi:alert-circle",
    ChoreStatus.PENDING: "mdi:clock-outline",
}


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ChoreCalendarConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up chore sensor entities from a config entry."""
    coordinator = entry.runtime_data.coordinator
    tracked_uids: set[str] = set()

    # Add sensors for chores that already exist in storage.
    _add_new_sensors(coordinator, entry, async_add_entities, tracked_uids)

    @callback
    def _async_on_coordinator_update() -> None:
        """React to coordinator updates — add/remove sensors as chores change."""
        _add_new_sensors(coordinator, entry, async_add_entities, tracked_uids)
        _remove_deleted_sensors(hass, entry.entry_id, coordinator, tracked_uids)

    entry.async_on_unload(coordinator.async_add_listener(_async_on_coordinator_update))


@callback
def _add_new_sensors(
    coordinator: ChoreCalendarCoordinator,
    entry: ChoreCalendarConfigEntry,
    async_add_entities: AddEntitiesCallback,
    tracked_uids: set[str],
) -> None:
    """Create sensor entities for any chores not yet tracked."""
    if coordinator.data is None:
        return

    new_uids = coordinator.data.keys() - tracked_uids
    if not new_uids:
        return

    new_entities = [ChoreSensorEntity(coordinator, entry, uid) for uid in new_uids]
    tracked_uids.update(new_uids)
    async_add_entities(new_entities)


@callback
def _remove_deleted_sensors(
    hass: HomeAssistant,
    entry_id: str,
    coordinator: ChoreCalendarCoordinator,
    tracked_uids: set[str],
) -> None:
    """Remove sensor entities for chores that no longer exist."""
    if coordinator.data is None:
        return

    deleted_uids = tracked_uids - coordinator.data.keys()
    if not deleted_uids:
        return

    registry = er.async_get(hass)
    for uid in deleted_uids:
        unique_id = f"{entry_id}_{uid}"
        entity_id = registry.async_get_entity_id("sensor", DOMAIN, unique_id)
        if entity_id:
            registry.async_remove(entity_id)
    tracked_uids -= deleted_uids


class ChoreSensorEntity(CoordinatorEntity[ChoreCalendarCoordinator], SensorEntity):
    """Sensor entity representing a single chore's status."""

    _attr_has_entity_name = True
    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = [status.value for status in ChoreStatus]

    def __init__(
        self,
        coordinator: ChoreCalendarCoordinator,
        entry: ChoreCalendarConfigEntry,
        uid: str,
    ) -> None:
        """Initialize the chore sensor."""
        super().__init__(coordinator)
        self._uid = uid
        self._attr_unique_id = f"{entry.entry_id}_{uid}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
        )
        self._attr_translation_key = "chore_status"

    @property
    def name(self) -> str:
        """Return the chore name as the entity name."""
        chore = self._get_chore()
        return chore.chore_name if chore else self._uid

    @property
    def suggested_object_id(self) -> str:
        """Suggest an object_id based on the chore name."""
        chore = self._get_chore()
        return slugify_util(chore.chore_name) if chore else self._uid

    @property
    def native_value(self) -> str | None:
        """Return the current chore status."""
        chore = self._get_chore()
        if chore is None:
            return None
        return chore.compute_status(dt_util.now())

    @property
    def icon(self) -> str:
        """Return a status-appropriate icon."""
        chore = self._get_chore()
        if chore is None:
            return "mdi:clipboard-check-outline"
        status = chore.compute_status(dt_util.now())
        return _STATUS_ICONS.get(status, "mdi:clipboard-check-outline")

    @property
    def available(self) -> bool:
        """Return True if the chore still exists in coordinator data."""
        return super().available and self.coordinator.data is not None and self._uid in self.coordinator.data

    @property
    def extra_state_attributes(self) -> dict[str, Any] | None:
        """Return chore metadata as extra state attributes."""
        chore = self._get_chore()
        if chore is None:
            return None
        now = dt_util.now()
        next_due = chore.compute_next_due(now)
        return {
            ATTR_UID: chore.uid,
            ATTR_CHORE_TYPE: str(chore.chore_type),
            ATTR_TRIGGER_ENTITY: self._resolve_trigger_entity(chore),
            ATTR_LAST_COMPLETED: chore.last_completed.isoformat() if chore.last_completed else None,
            ATTR_LAST_COMPLETED_BY: chore.last_completed_by,
            ATTR_NEXT_DUE: next_due.isoformat() if next_due else None,
            ATTR_ASSIGNED_TO: list(chore.assigned_to),
            ATTR_SCHEDULE: chore.schedule_description(),
        }

    def _resolve_trigger_entity(self, chore: BaseChore) -> str | None:
        """Resolve trigger_tag_id to its current entity_id for display."""
        if not chore.trigger_tag_id:
            return None
        registry = er.async_get(self.hass)
        return registry.async_get_entity_id("tag", "tag", chore.trigger_tag_id)

    def _get_chore(self) -> BaseChore | None:
        """Get the chore from coordinator data."""
        if self.coordinator.data is None:
            return None
        return self.coordinator.data.get(self._uid)
