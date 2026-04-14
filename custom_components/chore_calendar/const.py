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
PLATFORMS: list[Platform] = [Platform.CALENDAR, Platform.SENSOR]


class ChoreStatus(StrEnum):
    """Status of a chore."""

    COMPLETED = "completed"
    DUE = "due"
    OVERDUE = "overdue"
    PENDING = "pending"


class ChoreType(StrEnum):
    """Type of chore scheduling."""

    INTERVAL = "interval"
    SCHEDULED = "scheduled"


# Attribute keys for sensor extra_state_attributes.
ATTR_ASSIGNED_TO = "assigned_to"
ATTR_CHORE_ID = "chore_id"  # Migration v1→v2: remove when dropping v1 support.
ATTR_CHORE_TYPE = "chore_type"
ATTR_UID = "uid"
ATTR_LAST_COMPLETED = "last_completed"
ATTR_LAST_COMPLETED_BY = "last_completed_by"
ATTR_NEXT_DUE = "next_due"
ATTR_SCHEDULE = "schedule"
ATTR_TRIGGER_ENTITY = "trigger_entity"

# Service field key for item lookup by name or UID.
ATTR_ITEM = "item"

# Service action names.
SERVICE_COMPLETE_ITEM = "complete_item"
SERVICE_CREATE_ITEM = "create_item"
SERVICE_DELETE_ITEM = "delete_item"
SERVICE_GET_ITEMS = "get_items"
SERVICE_UNCOMPLETE_ITEM = "uncomplete_item"
SERVICE_UPDATE_ITEM = "update_item"

# Event names.
EVENT_STATUS_CHANGED = "chore_calendar_status_changed"

# Default values.
DEFAULT_EARLY_WINDOW_MINS = 180
DEFAULT_GRACE_PERIOD_MINS = 60
DEFAULT_UPDATE_INTERVAL = 60

# Storage.
STORAGE_VERSION = 2
