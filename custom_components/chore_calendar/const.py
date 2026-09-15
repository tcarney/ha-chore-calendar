"""Constants for chore_calendar."""

from __future__ import annotations

from enum import StrEnum
from logging import Logger, getLogger

from homeassistant.const import Platform

LOGGER: Logger = getLogger(__package__)

DOMAIN = "chore_calendar"

# Config entry field keys.
CONF_LIST_NAME = "list_name"

# Platforms.
PLATFORMS: list[Platform] = [Platform.CALENDAR, Platform.SENSOR, Platform.TODO]

# Upper bound on grid walks (the "one year of daily occurrences" guard) shared
# by the scheduled period walk-back and the missed-occurrence walk-forward.
PERIOD_WALK_LIMIT = 365
# How many of the most recent missed occurrences are exposed in the sensor's
# ``missed_occurrences`` list and the ``get_items`` response. The count is
# uncapped (up to ``PERIOD_WALK_LIMIT``); the list is a detail view.
MISSED_OCCURRENCES_LIMIT = 10


class ChoreStatus(StrEnum):
    """Status of a chore."""

    COMPLETED = "completed"
    DUE = "due"
    OVERDUE = "overdue"
    PENDING = "pending"


class ChoreType(StrEnum):
    """Type of chore scheduling."""

    INTERVAL = "interval"
    ONESHOT = "oneshot"
    SCHEDULED = "scheduled"


class ChoreEventSource(StrEnum):
    """Why a ``chore_calendar_status_changed`` event fired.

    Surfaced as the required ``source`` field on the event payload so
    automations can distinguish service-driven transitions from natural
    schedule progression.
    """

    SCHEDULE = "schedule"  # coordinator tick crossed a threshold (default)
    COMPLETE = "complete"  # complete_item service or todo entity toggle
    UNCOMPLETE = "uncomplete"  # uncomplete_item service or todo entity toggle
    SKIP = "skip"  # skip_item service
    UPDATE = "update"  # update_item changed a field that flipped status
    TAG = "tag"  # tag_scanned listener auto-completion


# Attribute keys for sensor extra_state_attributes.
ATTR_ASSIGNED_TO = "assigned_to"
ATTR_CHORE_TYPE = "chore_type"
ATTR_UID = "uid"
ATTR_LAST_COMPLETED = "last_completed"
ATTR_LAST_COMPLETED_BY = "last_completed_by"
ATTR_MISSED_COUNT = "missed_count"
ATTR_MISSED_OCCURRENCES = "missed_occurrences"
ATTR_NEXT_DUE = "next_due"
ATTR_UPCOMING_DUE = "upcoming_due"
ATTR_SCHEDULE = "schedule"
ATTR_TRIGGER_ENTITY = "trigger_entity"

# Service field key for item lookup by name or UID.
ATTR_ITEM = "item"

# Service action names.
SERVICE_COMPLETE_ITEM = "complete_item"
SERVICE_CREATE_ITEM = "create_item"
SERVICE_DELETE_ITEM = "delete_item"
SERVICE_GET_ITEMS = "get_items"
SERVICE_HIDE_COMPLETED_ITEMS = "hide_completed_items"
SERVICE_SKIP_ITEM = "skip_item"
SERVICE_UNCOMPLETE_ITEM = "uncomplete_item"
SERVICE_UPDATE_ITEM = "update_item"

# Event names.
EVENT_ITEM_CREATED = "chore_calendar_item_created"
EVENT_ITEM_DELETED = "chore_calendar_item_deleted"
EVENT_STATUS_CHANGED = "chore_calendar_status_changed"

# Default values.
DEFAULT_PENDING_PERIOD_MINS = 180
DEFAULT_GRACE_PERIOD_MINS = 60
DEFAULT_UPDATE_INTERVAL = 60

# Storage.
STORAGE_VERSION = 5
