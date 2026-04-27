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
from .models import BaseChore, IntervalChore, OneshotChore, ScheduledChore
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
        msg = "item is required when targeting a calendar entity"
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


def _resolve_tag_entity_id(hass: HomeAssistant, trigger_tag_id: str | None) -> str | None:
    """Resolve a tag UUID back to its entity_id for display.

    Returns the entity_id (e.g. ``tag.morning_medicine``) or None.
    """
    if not trigger_tag_id:
        return None
    registry = er.async_get(hass)
    return registry.async_get_entity_id("tag", "tag", trigger_tag_id)


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


def _build_schedule_dict(data: dict[str, Any], chore_type: ChoreType) -> dict[str, Any]:
    """Build an internal schedule dict from service call data."""
    schedule: dict[str, Any]
    if chore_type == ChoreType.SCHEDULED:
        obj = data[ATTR_SCHEDULED]
        schedule = {"time": obj["time"]}
        if "active_days" in obj:
            schedule["active_days"] = obj["active_days"]
        if "early_window" in obj:
            schedule["early_window_mins"] = _duration_to_mins(obj["early_window"])
    elif chore_type == ChoreType.INTERVAL:
        schedule = {"interval_mins": _duration_to_mins(data[ATTR_INTERVAL])}
    else:  # ONESHOT
        obj = data[ATTR_ONESHOT]
        schedule = {}
        if "due_datetime" in obj:
            # None is meaningful (explicit unscheduled) — preserve verbatim.
            due = obj["due_datetime"]
            schedule["due_datetime"] = due.isoformat() if isinstance(due, datetime) else due
        if "early_window" in obj:
            schedule["early_window_mins"] = _duration_to_mins(obj["early_window"])
        if "persist" in obj:
            schedule["persist"] = bool(obj["persist"])

    # grace_period is a top-level field shared by all types.
    if ATTR_GRACE_PERIOD in data:
        schedule["grace_period_mins"] = _duration_to_mins(data[ATTR_GRACE_PERIOD])
    return schedule


def _build_chore_from_data(data: dict[str, Any]) -> BaseChore:
    """Build a chore model from service call data."""
    chore_type = _infer_chore_type(data)
    schedule = _build_schedule_dict(data, chore_type)
    base_kwargs: dict[str, Any] = {
        "uid": data["uid"],
        "chore_name": data[ATTR_CHORE_NAME],
        "chore_type": chore_type,
        "assigned_to": list(data.get(ATTR_ASSIGNED_TO, [])),
    }

    if chore_type == ChoreType.SCHEDULED:
        return ScheduledChore.from_schedule(base_kwargs, schedule)
    if chore_type == ChoreType.INTERVAL:
        return IntervalChore.from_schedule(base_kwargs, schedule)
    return OneshotChore.from_schedule(base_kwargs, schedule)


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
    # systems transfer state into chore calendar on creation.
    last_scanned = _resolve_tag_last_scanned(call.hass, call.data.get(ATTR_TRIGGER_ENTITY))
    if last_scanned is not None:
        chore.last_completed = last_scanned
        LOGGER.debug("Seeded last_completed from tag last-scanned: %s", last_scanned.isoformat())

    await store.async_create_chore(chore)
    await coordinator.async_refresh()
    _notify_calendar_event_listeners(call.hass, store.entry_id)
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

    # Overlay schedule fields if any were provided. update_item is type-locked:
    # the type-specific sub-dicts are valid only for matching chore types so a
    # silent no-op (e.g. interval_mins added to a scheduled chore's schedule and
    # then ignored by ScheduledChore.from_schedule) doesn't masquerade as a
    # successful update.
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
                f"chore type is '{existing.chore_type}'; use '{allowed_attr}'."
            )
            raise ServiceValidationError(msg)

    has_schedule_fields = any(k in call.data for k in (ATTR_SCHEDULED, ATTR_INTERVAL, ATTR_ONESHOT, ATTR_GRACE_PERIOD))
    if has_schedule_fields:
        schedule = dict(updated["schedule"])
        if ATTR_SCHEDULED in call.data:
            obj = call.data[ATTR_SCHEDULED]
            if "time" in obj:
                schedule["time"] = obj["time"]
            if "active_days" in obj:
                schedule["active_days"] = obj["active_days"]
            if "early_window" in obj:
                schedule["early_window_mins"] = _duration_to_mins(obj["early_window"])
        if ATTR_INTERVAL in call.data:
            schedule["interval_mins"] = _duration_to_mins(call.data[ATTR_INTERVAL])
        if ATTR_ONESHOT in call.data:
            obj = call.data[ATTR_ONESHOT]
            if "due_datetime" in obj:
                # Explicit None clears the date back to unscheduled PENDING.
                due = obj["due_datetime"]
                schedule["due_datetime"] = due.isoformat() if isinstance(due, datetime) else due
            if "early_window" in obj:
                schedule["early_window_mins"] = _duration_to_mins(obj["early_window"])
            if "persist" in obj:
                schedule["persist"] = bool(obj["persist"])
        if ATTR_GRACE_PERIOD in call.data:
            schedule["grace_period_mins"] = _duration_to_mins(call.data[ATTR_GRACE_PERIOD])
        updated["schedule"] = schedule

    chore = BaseChore.from_dict(updated)
    await store.async_update_chore(chore)
    await coordinator.async_refresh()
    _notify_calendar_event_listeners(call.hass, store.entry_id)
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
    _notify_calendar_event_listeners(call.hass, store.entry_id)

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


async def async_complete_chore(
    store: ChoreStore,
    coordinator: ChoreCalendarCoordinator,
    uid: str,
    *,
    completed_at: datetime | None = None,
    completed_by: str | None = None,
    keep_skip: bool = False,
) -> None:
    """Record a completion for *uid* and refresh the coordinator.

    Shared by the ``complete_item`` service handler and the todo entity's
    ``needs_action`` → ``completed`` transition. Raises ServiceValidationError
    if the chore is missing.
    """
    existing = store.get_chore(uid)
    if existing is None:
        msg = f"Chore '{uid}' not found"
        raise ServiceValidationError(msg)

    timestamp = completed_at if completed_at is not None else dt_util.now()
    existing.apply_completion(timestamp, completed_by, clear_skip=not keep_skip)
    await store.async_update_chore(existing)
    await coordinator.async_refresh()
    _notify_calendar_event_listeners(coordinator.hass, store.entry_id)
    LOGGER.info("completed %s (%s) at %s", existing.chore_name, uid, timestamp.isoformat())


async def async_uncomplete_chore(
    store: ChoreStore,
    coordinator: ChoreCalendarCoordinator,
    uid: str,
) -> None:
    """Revert the most recent completion for *uid* and refresh the coordinator.

    Shared by the ``uncomplete_item`` service handler and the todo entity's
    ``completed`` → ``needs_action`` transition. Raises ServiceValidationError
    if the chore is missing or has no completion to revert.
    """
    existing = store.get_chore(uid)
    if existing is None:
        msg = f"Chore '{uid}' not found"
        raise ServiceValidationError(msg)

    if existing.last_completed is None:
        msg = f"Chore '{existing.chore_name}' has no completion to revert"
        raise ServiceValidationError(msg)

    existing.revert_completion()
    coordinator.mark_uncompleted(uid)
    await store.async_update_chore(existing)
    await coordinator.async_refresh()
    _notify_calendar_event_listeners(coordinator.hass, store.entry_id)
    LOGGER.info("uncompleted %s (%s)", existing.chore_name, uid)


async def _async_handle_complete(call: ServiceCall) -> None:
    """Handle complete_item service call."""
    store, coordinator = _resolve_entry_data(call.hass, call.data[ATTR_ENTITY_ID])
    uid = _resolve_item(call.hass, call.data[ATTR_ENTITY_ID], call.data.get(ATTR_ITEM), store)

    await async_complete_chore(
        store,
        coordinator,
        uid,
        completed_at=call.data.get(ATTR_COMPLETED_AT) or dt_util.now(),
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
    _notify_calendar_event_listeners(call.hass, store.entry_id)

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


async def async_apply_completed_cleared_at(
    hass: HomeAssistant,
    store: ChoreStore,
    coordinator: ChoreCalendarCoordinator,
    entity_id: str,
    cleared_at: datetime,
) -> None:
    """Set the per-list completed-items cutoff and sweep persist=false oneshots.

    Used by both the ``hide_completed_items`` service handler and the todo
    entity's ``async_remove_completed_items``. After updating the cutoff,
    deletes any terminal-completed oneshot whose ``last_completed`` precedes
    the new cutoff and whose ``persist`` flag is False — these chores are
    "done with" by user intent. Each deletion fires
    ``chore_calendar_item_deleted`` with the supplied *entity_id* in the
    payload.
    """
    await store.async_set_completed_cleared_at(cleared_at)
    LOGGER.debug(
        "completed_cleared_at set to %s for %s",
        cleared_at.isoformat(),
        entity_id,
    )

    now = dt_util.now()
    swept = 0
    for chore in list(store.get_all_chores().values()):
        if not isinstance(chore, OneshotChore):
            continue
        if chore.persist:
            continue
        if chore.last_completed is None or chore.last_completed >= cleared_at:
            continue
        if chore.compute_status(now) != ChoreStatus.COMPLETED:
            continue
        # Eligible: terminal-completed, pre-cutoff, and not flagged to persist.
        await store.async_delete_chore(chore.uid)
        hass.bus.async_fire(
            EVENT_ITEM_DELETED,
            {
                "uid": chore.uid,
                "chore_name": chore.chore_name,
                "chore_type": str(chore.chore_type),
                "entity_id": entity_id,
            },
        )
        LOGGER.info(
            "deleted persist=false oneshot %s (%s)",
            chore.chore_name,
            chore.uid,
        )
        swept += 1

    LOGGER.debug("persist=false sweep complete: %d chore(s) deleted", swept)
    await coordinator.async_refresh()
    _notify_calendar_event_listeners(hass, store.entry_id)


def _notify_calendar_event_listeners(hass: HomeAssistant, entry_id: str) -> None:
    """Push fresh events to the calendar panel subscribers for *entry_id*.

    HA's calendar dashboard caches event lists client-side and does not
    refetch on ``state_changed`` — CRUD actions on chores leave stale
    events visible until the user navigates dates or reloads the browser.
    ``CalendarEntity.async_update_event_listeners`` (added on HA dev,
    post-2026.3.1) lets the integration push an invalidation.

    Looks up the calendar entity for the given config entry (its unique_id
    is the entry_id) and calls the listener-update method when present.
    Silently no-ops when:

    - The calendar entity isn't loaded for this entry.
    - The HA version doesn't yet implement ``async_update_event_listeners``.
    """
    registry = er.async_get(hass)
    calendar_entity_id = registry.async_get_entity_id("calendar", DOMAIN, entry_id)
    if calendar_entity_id is None:
        return

    calendar_component = hass.data.get("calendar")
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
                "trigger_entity": _resolve_tag_entity_id(call.hass, chore.trigger_tag_id),
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
