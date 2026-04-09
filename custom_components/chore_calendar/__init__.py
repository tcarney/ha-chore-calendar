"""Custom integration to integrate Chore Calendar with Home Assistant."""

from __future__ import annotations

from pathlib import Path
from typing import NamedTuple

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN, PLATFORMS
from .coordinator import ChoreCalendarCoordinator
from .services import async_register_services
from .store import ChoreStore
from .triggers import async_setup_tag_listener

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

CARD_JS = "chore-calendar-card.js"
CARD_URL = f"/{DOMAIN}/{CARD_JS}"


class ChoreCalendarData(NamedTuple):
    """Runtime data stored on the config entry."""

    store: ChoreStore
    coordinator: ChoreCalendarCoordinator


type ChoreCalendarConfigEntry = ConfigEntry[ChoreCalendarData]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the Chore Calendar integration (register services and card)."""
    await async_register_services(hass)

    # Serve the bundled Lovelace card and register it as a frontend resource.
    card_path = Path(__file__).parent / "www" / CARD_JS
    if card_path.is_file():
        await hass.http.async_register_static_paths(
            [StaticPathConfig(url_path=CARD_URL, path=str(card_path), cache_headers=True)]
        )
        add_extra_js_url(hass, CARD_URL)

    return True


async def async_setup_entry(hass: HomeAssistant, entry: ChoreCalendarConfigEntry) -> bool:
    """Set up a Chore Calendar list from a config entry."""
    store = ChoreStore(hass, entry.entry_id)
    await store.async_load()

    coordinator = ChoreCalendarCoordinator(hass, store)
    await coordinator.async_config_entry_first_refresh()

    entry.runtime_data = ChoreCalendarData(store=store, coordinator=coordinator)

    # Register tag scan listener for auto-completion.
    entry.async_on_unload(async_setup_tag_listener(hass, store, coordinator))

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ChoreCalendarConfigEntry) -> bool:
    """Unload a Chore Calendar config entry."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
