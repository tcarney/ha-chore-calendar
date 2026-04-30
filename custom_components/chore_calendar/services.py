"""Service action handlers for Chore Calendar."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, cast
from uuid import uuid4

import voluptuous as vol

from homeassistant.core import HomeAssistant, ServiceCall, ServiceResponse, SupportsResponse
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv, entity_registry as er
from homeassistant.util import dt as dt_util

from .actions import (
    async_apply_completed_cleared_at,
    async_complete_chore,
    async_uncomplete_chore,
    resolve_tag_entity_id,
)
from .const import (
    ATTR_ASSIGNED_TO,
    ATTR_ITEM,
    ATTR_TRIGGER_ENTITY,
    DOMAIN,
    EVENT_ITEM_DELETED,
    EVENT_ITEM_SKIPPED,
    LOGGER,
    SERVICE_COMPLETE_ITEM,
    SERVICE_CREATE_ITEM,
    SERVICE_DELETE_ITEM,
    SERVICE_GET_ITEMS,
    SERVICE_HIDE_COMPLETED_ITEMS,
    SERVICE_SKIP_ITEM,
    SERVICE_UNCOMPLETE_ITEM,
    SERVICE_UPDATE_ITEM,
    ChoreStatus,
    ChoreType,
)
from .coordinator import ChoreCalendarCoordinator
from .models import BaseChore, OneshotChore
from .store import ChoreStore

# Service-specific field keys (not shared with sensor attributes).
ATTR_BEFORE = "before"
ATTR_CHORE_NAME = "chore_name"
ATTR_COMPLETED_AT = "completed_at"
ATTR_COMPLETED_BY = "completed_by"
ATTR_ENTITY_ID = "entity_id"
ATTR_KEEP_FOR = "keep_for"
ATTR_KEEP_SKIP = "keep_skip"
ATTR_STATUS = "status"
ATTR_UNTIL = "until"

# Service field keys for schedule configuration.
ATTR_SCHEDULED = "scheduled"
ATTR_INTERVAL = "interval"
ATTR_ONESHOT = "oneshot"
ATTR_PENDING_PERIOD = "pending_period"
ATTR_GRACE_PERIOD = "grace_period"

SERVICE_CREATE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Required(ATTR_CHORE_NAME): cv.string,
        vol.Optional(ATTR_TRIGGER_ENTITY): cv.entity_id,
        vol.Optional(ATTR_ASSIGNED_TO, default=[]): vol.All(cv.ensure_list, [cv.entity_id]),
        vol.Optional(ATTR_SCHEDULED): dict,
        vol.Optional(ATTR_INTERVAL): dict,
        vol.Optional(ATTR_ONESHOT): dict,
        vol.Optional(ATTR_PENDING_PERIOD): dict,
        vol.Optional(ATTR_GRACE_PERIOD): dict,
    }
)

SERVICE_UPDATE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Optional(ATTR_ITEM): cv.string,
        vol.Optional(ATTR_CHORE_NAME): cv.string,
        vol.Optional(ATTR_TRIGGER_ENTITY): cv.entity_id,
        vol.Optional(ATTR_ASSIGNED_TO): vol.All(cv.ensure_list, [cv.entity_id]),
        vol.Optional(ATTR_SCHEDULED): dict,
        vol.Optional(ATTR_INTERVAL): dict,
        vol.Optional(ATTR_ONESHOT): dict,
        vol.Optional(ATTR_PENDING_PERIOD): dict,
        vol.Optional(ATTR_GRACE_PERIOD): dict,
    }
)

SERVICE_DELETE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Optional(ATTR_ITEM): cv.string,
    }
)

SERVICE_COMPLETE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Optional(ATTR_ITEM): cv.string,
        vol.Optional(ATTR_COMPLETED_BY): cv.entity_id,
        vol.Optional(ATTR_COMPLETED_AT): cv.datetime,
        vol.Optional(ATTR_KEEP_SKIP): cv.boolean,
    }
)

SERVICE_UNCOMPLETE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Optional(ATTR_ITEM): cv.string,
    }
)

SERVICE_SKIP_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Optional(ATTR_ITEM): cv.string,
        vol.Optional(ATTR_UNTIL): cv.datetime,
    }
)

SERVICE_GET_ITEMS_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Optional(ATTR_STATUS): vol.In([s.value for s in ChoreStatus]),
    }
)

SERVICE_HIDE_COMPLETED_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ENTITY_ID): cv.entity_id,
        vol.Optional(ATTR_BEFORE): cv.datetime,
        vol.Optional(ATTR_KEEP_FOR): dict,
    }
)


def _resolve_entry_data(hass: HomeAssistant, entity_id: str) -> tuple[ChoreStore, ChoreCalendarCoordinator]:
    """Resolve an entity_id to the config entry's runtime_data.

    Returns (store, coordinator) tuple.
    """
    registry = er.async_get(hass)
    entry = registry.async_get(entity_id)
    if entry is None:
        msg = f"Entity {entity_id} not found"
        raise ServiceValidationError(msg)

    config_entry_id = entry.config_entry_id
    if config_entry_id is None:
        msg = f"Entity {entity_id} has no config entry"
        raise ServiceValidationError(msg)

    config_entry = hass.config_entries.async_get_entry(config_entry_id)
    if config_entry is None or config_entry.domain != DOMAIN:
        msg = f"Entity {entity_id} does not belong to {DOMAIN}"
        raise ServiceValidationError(msg)

    runtime_data = config_entry.runtime_data
    return runtime_data.store, runtime_data.coordinator


def _resolve_item(hass: HomeAssistant, entity_id: str, explicit_item: str | None, store: ChoreStore) -> str:
    """Resolve a chore UID from a service call.

    If *explicit_item* is provided, it is matched first as a UID, then as a
    case-insensitive chore name.  Otherwise the UID is extracted from the
    sensor entity's unique_id (format: ``{entry_id}_{uid}``).
    """
    if explicit_item:
        # Try direct UID match.
        if store.get_chore(explicit_item) is not None:
            return explicit_item
        # Try case-insensitive name match.
        item_lower = explicit_item.lower()
        for uid, chore in store.get_all_chores().items():
            if chore.chore_name.lower() == item_lower:
                return uid
        msg = f"Chore '{explicit_item}' not found"
        raise ServiceValidationError(msg)

    registry = er.async_get(hass)
    entry = registry.async_get(entity_id)
    if entry is None or entry.domain != "sensor":
        # Single-chore lookup is only inferable from a chore sensor's unique_id;
        # any other domain (calendar, todo, missing entity) must pass `item`.
        domain = entry.domain if entry is not None else "unknown"
        msg = f"item is required when targeting a {domain} entity ({entity_id})"
        raise ServiceValidationError(msg)

    # unique_id format: {entry_id}_{uid}
    unique_id = entry.unique_id
    config_entry_id = entry.config_entry_id or ""
    if unique_id and unique_id.startswith(config_entry_id + "_"):
        return unique_id[len(config_entry_id) + 1 :]

    msg = f"Cannot determine chore from entity {entity_id}"
    raise ServiceValidationError(msg)


def _resolve_trigger_tag_id(hass: HomeAssistant, trigger_entity: str | None) -> str | None:
    """Resolve a tag entity to its tag UUID for fast event matching.

    Returns the tag_id if *trigger_entity* is a ``tag.*`` entity, else None.
    """
    if not trigger_entity or not trigger_entity.startswith("tag."):
        return None
    state = hass.states.get(trigger_entity)
    if state is None:
        LOGGER.warning("Trigger entity %s not found; tag_id not resolved", trigger_entity)
        return None
    # The tag entity's unique_id (accessible via entity registry) is the tag UUID.
    registry = er.async_get(hass)
    entry = registry.async_get(trigger_entity)
    if entry and entry.unique_id:
        return entry.unique_id
    LOGGER.warning("Could not resolve tag_id for %s", trigger_entity)
    return None


def _resolve_tag_last_scanned(hass: HomeAssistant, trigger_entity: str | None) -> datetime | None:
    """Read the last-scanned timestamp from a tag entity's state.

    Tag entities in HA store their last scan time as the entity state value.
    Returns the parsed datetime if available, else None.
    """
    if not trigger_entity:
        return None
    state = hass.states.get(trigger_entity)
    if state is None or state.state in ("unknown", "unavailable", ""):
        return None
    return dt_util.parse_datetime(state.state)


def _duration_to_mins(dur: dict[str, Any]) -> int:
    """Convert an HA duration dict to total minutes."""
    return int(dur.get("days", 0)) * 1440 + int(dur.get("hours", 0)) * 60 + int(dur.get("minutes", 0))


def _infer_chore_type(data: dict[str, Any]) -> ChoreType:
    """Infer chore type from the presence of ``scheduled`` / ``interval`` / ``oneshot``.

    Raises ServiceValidationError if more than one or none are provided.
    """
    type_keys = [ATTR_SCHEDULED, ATTR_INTERVAL, ATTR_ONESHOT]
    present = [k for k in type_keys if k in data]
    if len(present) > 1:
        msg = f"Cannot specify more than one of {type_keys!r}; got {present!r}"
        raise ServiceValidationError(msg)
    if not present:
        msg = f"One of {type_keys!r} must be provided"
        raise ServiceValidationError(msg)
    return {
        ATTR_SCHEDULED: ChoreType.SCHEDULED,
        ATTR_INTERVAL: ChoreType.INTERVAL,
        ATTR_ONESHOT: ChoreType.ONESHOT,
    }[present[0]]


def _apply_overlays(
    data: dict[str, Any],
    chore_dict: dict[str, Any],
    chore_type: ChoreType,
) -> dict[str, Any]:
    """Overlay service-call fields onto a storage-shaped chore dict.

    Writes per-type schedule fields into ``chore_dict["schedule"]`` and
    cross-type window fields (``pending_period_mins``, ``grace_period_mins``)
    at the top level. Used by both ``create_item`` (empty starting dict) and
    ``update_item`` (overlaying partial fields onto the stored dict). Only
    keys present in *data* are written — absent keys leave *chore_dict*
    untouched, preserving stored values during a partial update.
    """
    schedule = chore_dict.setdefault("schedule", {})
    if chore_type == ChoreType.SCHEDULED and ATTR_SCHEDULED in data:
        obj = data[ATTR_SCHEDULED]
        if "time" in obj:
            schedule["time"] = obj["time"]
        if "active_days" in obj:
            schedule["active_days"] = obj["active_days"]
    elif chore_type == ChoreType.INTERVAL and ATTR_INTERVAL in data:
        schedule["interval_mins"] = _duration_to_mins(data[ATTR_INTERVAL])
    elif chore_type == ChoreType.ONESHOT and ATTR_ONESHOT in data:
        obj = data[ATTR_ONESHOT]
        if "due_datetime" in obj:
            # None is meaningful (explicit unscheduled) — preserve verbatim.
            due = obj["due_datetime"]
            schedule["due_datetime"] = due.isoformat() if isinstance(due, datetime) else due
        if "persist" in obj:
            schedule["persist"] = bool(obj["persist"])

    if ATTR_PENDING_PERIOD in data:
        chore_dict["pending_period_mins"] = _duration_to_mins(data[ATTR_PENDING_PERIOD])
    if ATTR_GRACE_PERIOD in data:
        chore_dict["grace_period_mins"] = _duration_to_mins(data[ATTR_GRACE_PERIOD])
    return chore_dict


def _build_chore_from_data(data: dict[str, Any]) -> BaseChore:
    """Build a chore model from service call data."""
    chore_type = _infer_chore_type(data)
    chore_dict: dict[str, Any] = {
        "uid": data["uid"],
        "chore_name": data[ATTR_CHORE_NAME],
        "chore_type": str(chore_type),
        "schedule": {},
        "assigned_to": list(data.get(ATTR_ASSIGNED_TO, [])),
    }
    _apply_overlays(data, chore_dict, chore_type)
    return BaseChore.from_dict(chore_dict)


async def _async_handle_create(call: ServiceCall) -> None:
    """Handle create_item service call."""
    store, coordinator = _resolve_entry_data(call.hass, call.data[ATTR_ENTITY_ID])

    uid = str(uuid4())

    # Resolve tag UUID if trigger_entity is a tag.
    trigger_tag_id = _resolve_trigger_tag_id(call.hass, call.data.get(ATTR_TRIGGER_ENTITY))

    # Inject the generated uid for _build_chore_from_data.
    data = {**call.data, "uid": uid}
    chore = _build_chore_from_data(data)
    chore.trigger_tag_id = trigger_tag_id
    chore.created_at = dt_util.now()

    # Seed last_completed from the tag's last-scanned time so existing tag
    # systems transfer state into chore calendar on creation. Side effect:
    # the chore's initial status reflects the seeded last_completed (typically
    # `completed`) rather than the standard never-completed `pending`. That's
    # intentional for the migration use case but worth flagging — see README.
    last_scanned = _resolve_tag_last_scanned(call.hass, call.data.get(ATTR_TRIGGER_ENTITY))
    if last_scanned is not None:
        chore.last_completed = last_scanned
        LOGGER.debug("Seeded last_completed from tag last-scanned: %s", last_scanned.isoformat())

    await store.async_create_chore(chore)
    await coordinator.async_refresh()
    LOGGER.info("created %s (%s)", chore.chore_name, uid)


async def _async_handle_update(call: ServiceCall) -> None:
    """Handle update_item service call."""
    store, coordinator = _resolve_entry_data(call.hass, call.data[ATTR_ENTITY_ID])

    uid = _resolve_item(call.hass, call.data[ATTR_ENTITY_ID], call.data.get(ATTR_ITEM), store)
    existing = store.get_chore(uid)
    if existing is None:
        msg = f"Chore '{uid}' not found"
        raise ServiceValidationError(msg)

    # Build updated dict from existing chore, overlaying provided fields.
    updated = existing.to_dict()
    if ATTR_CHORE_NAME in call.data:
        updated["chore_name"] = call.data[ATTR_CHORE_NAME]
    if ATTR_TRIGGER_ENTITY in call.data:
        updated["trigger_tag_id"] = _resolve_trigger_tag_id(call.hass, call.data[ATTR_TRIGGER_ENTITY])
    if ATTR_ASSIGNED_TO in call.data:
        updated["assigned_to"] = list(call.data[ATTR_ASSIGNED_TO])

    # update_item is type-locked: passing a per-type sub-dict that doesn't
    # match the chore's existing type is rejected. Cross-type conversion is
    # not supported because each pair (oneshot ↔ scheduled, scheduled ↔ interval,
    # ...) has different semantics for what to do with last_completed,
    # previous_*, and the type-specific anchor fields. Delete and re-create
    # the chore to change its type.
    type_to_attr = {
        ChoreType.SCHEDULED: ATTR_SCHEDULED,
        ChoreType.INTERVAL: ATTR_INTERVAL,
        ChoreType.ONESHOT: ATTR_ONESHOT,
    }
    allowed_attr = type_to_attr[existing.chore_type]
    for attr in (ATTR_SCHEDULED, ATTR_INTERVAL, ATTR_ONESHOT):
        if attr != allowed_attr and attr in call.data:
            msg = (
                f"Cannot update chore '{existing.chore_name}' with '{attr}' — "
                f"chore type is '{existing.chore_type}'. Use '{allowed_attr}' for "
                f"type-matching updates, or delete and re-create the chore to change its type."
            )
            raise ServiceValidationError(msg)

    overlay_keys = (ATTR_SCHEDULED, ATTR_INTERVAL, ATTR_ONESHOT, ATTR_PENDING_PERIOD, ATTR_GRACE_PERIOD)
    if any(k in call.data for k in overlay_keys):
        updated["schedule"] = dict(updated["schedule"])
        _apply_overlays(call.data, updated, existing.chore_type)

    # A oneshot reschedule (any change to due_datetime, including clearing
    # it for Path B) re-enters the cycle — clear the terminal flag so the
    # chore picks up window-math against the new anchor instead of staying
    # COMPLETED via the short-circuit.
    if (
        existing.chore_type == ChoreType.ONESHOT
        and ATTR_ONESHOT in call.data
        and isinstance(call.data[ATTR_ONESHOT], dict)
        and "due_datetime" in call.data[ATTR_ONESHOT]
    ):
        updated["terminal"] = False

    chore = BaseChore.from_dict(updated)
    await store.async_update_chore(chore)
    await coordinator.async_refresh()
    LOGGER.info("updated %s (%s)", existing.chore_name, uid)


async def _async_handle_delete(call: ServiceCall) -> None:
    """Handle delete_item service call."""
    store, coordinator = _resolve_entry_data(call.hass, call.data[ATTR_ENTITY_ID])

    uid = _resolve_item(call.hass, call.data[ATTR_ENTITY_ID], call.data.get(ATTR_ITEM), store)
    existing = store.get_chore(uid)
    if existing is None:
        msg = f"Chore '{uid}' not found"
        raise ServiceValidationError(msg)

    await store.async_delete_chore(uid)
    await coordinator.async_refresh()

    call.hass.bus.async_fire(
        EVENT_ITEM_DELETED,
        {
            "uid": existing.uid,
            "chore_name": existing.chore_name,
            "chore_type": str(existing.chore_type),
            "entity_id": call.data[ATTR_ENTITY_ID],
        },
    )
    LOGGER.info("deleted %s (%s)", existing.chore_name, uid)


async def _async_handle_complete(call: ServiceCall) -> None:
    """Handle complete_item service call."""
    store, coordinator = _resolve_entry_data(call.hass, call.data[ATTR_ENTITY_ID])
    uid = _resolve_item(call.hass, call.data[ATTR_ENTITY_ID], call.data.get(ATTR_ITEM), store)

    await async_complete_chore(
        store,
        coordinator,
        uid,
        completed_at=call.data.get(ATTR_COMPLETED_AT),
        completed_by=call.data.get(ATTR_COMPLETED_BY),
        keep_skip=bool(call.data.get(ATTR_KEEP_SKIP, False)),
    )


async def _async_handle_uncomplete(call: ServiceCall) -> None:
    """Handle uncomplete_item service call."""
    store, coordinator = _resolve_entry_data(call.hass, call.data[ATTR_ENTITY_ID])
    uid = _resolve_item(call.hass, call.data[ATTR_ENTITY_ID], call.data.get(ATTR_ITEM), store)
    await async_uncomplete_chore(store, coordinator, uid)


async def _async_handle_skip(call: ServiceCall) -> None:
    """Handle skip_item service call.

    Defers a chore's next occurrence. With explicit ``until``, sets
    ``skipped_until`` directly. Without it, delegates to the chore's
    ``apply_default_skip`` for type-specific default behavior — which may
    set ``skipped_until`` (scheduled/interval) or clear another anchor.
    The event payload's ``skipped_until`` mirrors the operative value, or
    ``None`` when default-skip cleared the anchor entirely.
    """
    store, coordinator = _resolve_entry_data(call.hass, call.data[ATTR_ENTITY_ID])

    uid = _resolve_item(call.hass, call.data[ATTR_ENTITY_ID], call.data.get(ATTR_ITEM), store)
    existing = store.get_chore(uid)
    if existing is None:
        msg = f"Chore '{uid}' not found"
        raise ServiceValidationError(msg)

    # Skipping a terminal-completed oneshot has no meaningful semantics —
    # there's no "next occurrence" to defer. Reject explicitly rather than
    # silently mutating fields the chore won't react to.
    if isinstance(existing, OneshotChore) and existing.compute_status(dt_util.now()) == ChoreStatus.COMPLETED:
        msg = f"Cannot skip completed oneshot chore '{existing.chore_name}'"
        raise ServiceValidationError(msg)

    explicit_until: datetime | None = call.data.get(ATTR_UNTIL)
    if explicit_until is not None:
        existing.skipped_until = explicit_until
        event_skipped_until: datetime | None = explicit_until
    else:
        event_skipped_until = existing.apply_default_skip(dt_util.now())

    await store.async_update_chore(existing)
    await coordinator.async_refresh()

    call.hass.bus.async_fire(
        EVENT_ITEM_SKIPPED,
        {
            "uid": existing.uid,
            "chore_name": existing.chore_name,
            "skipped_until": event_skipped_until.isoformat() if event_skipped_until else None,
            "entity_id": call.data[ATTR_ENTITY_ID],
        },
    )
    LOGGER.info(
        "skipped %s (%s) until %s",
        existing.chore_name,
        uid,
        event_skipped_until.isoformat() if event_skipped_until else "(cleared)",
    )


async def _async_handle_hide_completed(call: ServiceCall) -> None:
    """Handle hide_completed_items service call.

    Sets the per-list completed-items cutoff. Without args, cutoff = now.
    With ``before``: cutoff = the given datetime (items completed before
    that point are hidden). With ``keep_for``: cutoff = now - duration.
    ``before`` and ``keep_for`` are mutually exclusive.
    """
    store, coordinator = _resolve_entry_data(call.hass, call.data[ATTR_ENTITY_ID])

    has_before = ATTR_BEFORE in call.data
    has_keep_for = ATTR_KEEP_FOR in call.data
    if has_before and has_keep_for:
        msg = "Cannot specify both 'before' and 'keep_for'"
        raise ServiceValidationError(msg)

    if has_before:
        cleared_at: datetime = call.data[ATTR_BEFORE]
        # Coerce naive datetimes (from YAML without a tz suffix) to local tz
        # so storage and comparisons stay tz-aware.
        if cleared_at.tzinfo is None:
            cleared_at = cleared_at.replace(tzinfo=dt_util.DEFAULT_TIME_ZONE)
        LOGGER.debug(
            "hide_completed_items called with before=%s on %s",
            cleared_at.isoformat(),
            call.data[ATTR_ENTITY_ID],
        )
    elif has_keep_for:
        cleared_at = dt_util.now() - timedelta(minutes=_duration_to_mins(call.data[ATTR_KEEP_FOR]))
        LOGGER.debug(
            "hide_completed_items called with keep_for=%s on %s (cutoff=%s)",
            call.data[ATTR_KEEP_FOR],
            call.data[ATTR_ENTITY_ID],
            cleared_at.isoformat(),
        )
    else:
        cleared_at = dt_util.now()
        LOGGER.debug(
            "hide_completed_items called with no args on %s (cutoff=now)",
            call.data[ATTR_ENTITY_ID],
        )

    await async_apply_completed_cleared_at(
        call.hass,
        store,
        coordinator,
        call.data[ATTR_ENTITY_ID],
        cleared_at,
    )


async def _async_handle_get_items(call: ServiceCall) -> ServiceResponse:
    """Handle get_items service call — returns chore data."""
    store, _ = _resolve_entry_data(call.hass, call.data[ATTR_ENTITY_ID])

    chores = store.get_all_chores()
    now = dt_util.now()
    status_filter = call.data.get(ATTR_STATUS)

    items: list[dict[str, Any]] = []
    for chore in chores.values():
        current_status = str(chore.compute_status(now))
        if status_filter and current_status != status_filter:
            continue
        next_due = chore.compute_next_due(now)
        items.append(
            {
                "uid": chore.uid,
                "chore_name": chore.chore_name,
                "chore_type": str(chore.chore_type),
                "status": current_status,
                "next_due": next_due.isoformat() if next_due else None,
                "last_completed": chore.last_completed.isoformat() if chore.last_completed else None,
                "last_completed_by": chore.last_completed_by,
                "assigned_to": list(chore.assigned_to),
                "trigger_entity": resolve_tag_entity_id(call.hass, chore.trigger_tag_id),
                "schedule": chore.schedule_description(),
            }
        )

    cleared_at = store.completed_cleared_at
    LOGGER.debug(
        "get_items returning %d item(s) for %s (status_filter=%s, cleared_at=%s)",
        len(items),
        call.data[ATTR_ENTITY_ID],
        status_filter,
        cleared_at.isoformat() if cleared_at else None,
    )
    return cast(
        ServiceResponse,
        {
            "items": items,
            "completed_cleared_at": cleared_at.isoformat() if cleared_at else None,
        },
    )


async def async_register_services(hass: HomeAssistant) -> None:
    """Register all chore_calendar service actions."""
    if hass.services.has_service(DOMAIN, SERVICE_CREATE_ITEM):
        return

    hass.services.async_register(DOMAIN, SERVICE_CREATE_ITEM, _async_handle_create, schema=SERVICE_CREATE_SCHEMA)
    hass.services.async_register(DOMAIN, SERVICE_UPDATE_ITEM, _async_handle_update, schema=SERVICE_UPDATE_SCHEMA)
    hass.services.async_register(DOMAIN, SERVICE_DELETE_ITEM, _async_handle_delete, schema=SERVICE_DELETE_SCHEMA)
    hass.services.async_register(DOMAIN, SERVICE_COMPLETE_ITEM, _async_handle_complete, schema=SERVICE_COMPLETE_SCHEMA)
    hass.services.async_register(
        DOMAIN,
        SERVICE_UNCOMPLETE_ITEM,
        _async_handle_uncomplete,
        schema=SERVICE_UNCOMPLETE_SCHEMA,
    )
    hass.services.async_register(DOMAIN, SERVICE_SKIP_ITEM, _async_handle_skip, schema=SERVICE_SKIP_SCHEMA)
    hass.services.async_register(
        DOMAIN,
        SERVICE_HIDE_COMPLETED_ITEMS,
        _async_handle_hide_completed,
        schema=SERVICE_HIDE_COMPLETED_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_GET_ITEMS,
        _async_handle_get_items,
        schema=SERVICE_GET_ITEMS_SCHEMA,
        supports_response=SupportsResponse.ONLY,
    )
