"""Diagnostics support for chore_calendar."""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant

from . import ChoreCalendarConfigEntry


async def async_get_config_entry_diagnostics(hass: HomeAssistant, entry: ChoreCalendarConfigEntry) -> dict[str, Any]:
    """Return diagnostics for a config entry."""
    store = entry.runtime_data.store
    coordinator = entry.runtime_data.coordinator

    items: list[dict[str, Any]] = []
    for chore in store.get_all_chores().values():
        chore_dict = chore.to_dict()
        # Redact person entity IDs from assigned_to and last_completed_by.
        chore_dict["assigned_to"] = [f"**REDACTED** ({i})" for i, _ in enumerate(chore_dict.get("assigned_to", []))]
        if chore_dict.get("last_completed_by"):
            chore_dict["last_completed_by"] = "**REDACTED**"
        items.append(chore_dict)

    return {
        "entry": {
            "title": entry.title,
            "entry_id": entry.entry_id,
        },
        "coordinator": {
            "last_update_success": coordinator.last_update_success,
            "chore_count": len(coordinator.data) if coordinator.data else 0,
        },
        "items": items,
    }
