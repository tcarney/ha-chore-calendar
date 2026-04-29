"""Custom integration to integrate Chore Calendar with Home Assistant."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import NamedTuple

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_ID, CONF_URL
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN, PLATFORMS
from .coordinator import ChoreCalendarCoordinator
from .services import async_register_services
from .store import ChoreStore
from .triggers import async_setup_tag_listener

_LOGGER = logging.getLogger(__name__)

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

CARD_JS = "chore-calendar-card.js"
CARD_URL_PATH = f"/{DOMAIN}/{CARD_JS}"
_RESOURCE_TRACKER = f"{DOMAIN}_lovelace_resource_id"


class ChoreCalendarData(NamedTuple):
    """Runtime data stored on the config entry."""

    store: ChoreStore
    coordinator: ChoreCalendarCoordinator


type ChoreCalendarConfigEntry = ConfigEntry[ChoreCalendarData]


def chore_list_device_info(entry: ChoreCalendarConfigEntry) -> DeviceInfo:
    """Build the shared DeviceInfo for the per-list device.

    The chore list is modelled as a single ``DeviceEntryType.SERVICE`` device
    that groups the calendar, todo, and per-chore sensor entities. Whichever
    list-level entity is set up first seeds the device name; subsequent
    entities attach by ``identifiers`` only. Used by the calendar and todo
    platforms — the sensor platform builds a minimal identifiers-only
    ``DeviceInfo`` since the device is already seeded by the time per-chore
    sensors are added.
    """
    return DeviceInfo(
        identifiers={(DOMAIN, entry.entry_id)},
        name=entry.title,
        entry_type=DeviceEntryType.SERVICE,
    )


async def _async_register_card_resource(hass: HomeAssistant, resource_url: str) -> None:
    """Register the card JS as a proper Lovelace resource.

    Lovelace resources are loaded by HA's lovelace module *before* cards render,
    avoiding the race condition inherent to ``add_extra_js_url`` (which uses a
    fire-and-forget ``import()`` in the page HTML).  Falls back to
    ``add_extra_js_url`` when the Lovelace storage collection is unavailable
    (e.g. YAML-managed dashboards or ``lovelace`` not yet loaded).
    """
    from homeassistant.components.lovelace.const import (  # noqa: PLC0415 - deferred to avoid hard dep on lovelace
        CONF_RESOURCE_TYPE_WS,
        DOMAIN as LL_DOMAIN,
    )
    from homeassistant.components.lovelace.resources import (  # noqa: PLC0415 - deferred to avoid hard dep on lovelace
        ResourceStorageCollection,
        ResourceYAMLCollection,
    )

    lovelace_data = hass.data.get(LL_DOMAIN)
    if not lovelace_data or not lovelace_data.resources:
        _LOGGER.debug("Lovelace not available, falling back to add_extra_js_url")
        add_extra_js_url(hass, resource_url)
        return

    resources: ResourceStorageCollection | ResourceYAMLCollection = lovelace_data.resources
    if not resources.loaded and isinstance(resources, ResourceStorageCollection):
        await resources.async_load()
        resources.loaded = True

    # Check if our resource is already registered.  Match on the base URL path,
    # ignoring the cache-busting query parameter.
    for item in resources.async_items():
        item_url: str = item.get(CONF_URL, "")
        if not item_url.startswith(CARD_URL_PATH):
            continue
        if item_url == resource_url:
            _LOGGER.debug("Card resource already registered with correct URL")
            return
        # URL changed (new cache-bust hash).  Update it in-place.
        if isinstance(resources, ResourceStorageCollection):
            await resources.async_update_item(item[CONF_ID], {CONF_URL: resource_url})
            _LOGGER.debug("Updated card resource URL to %s", resource_url)
        return

    # Not registered yet — create it.
    if isinstance(resources, ResourceYAMLCollection):
        _LOGGER.debug("Lovelace resources are YAML-managed, falling back to add_extra_js_url")
        add_extra_js_url(hass, resource_url)
        return

    data = await resources.async_create_item({CONF_RESOURCE_TYPE_WS: "module", CONF_URL: resource_url})
    hass.data[_RESOURCE_TRACKER] = data[CONF_ID]
    _LOGGER.debug("Registered card as Lovelace resource (ID %s)", data[CONF_ID])


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the Chore Calendar integration (register services and card)."""
    await async_register_services(hass)

    # Serve the bundled Lovelace card and register it as a Lovelace resource.
    # A cache-busting hash from the file's mtime ensures browsers pick up new
    # versions without needing a hard refresh.
    card_path = Path(__file__).parent / "www" / CARD_JS
    if card_path.is_file():
        cache_hash = str(int(card_path.stat().st_mtime))
        await hass.http.async_register_static_paths(
            [StaticPathConfig(url_path=CARD_URL_PATH, path=str(card_path), cache_headers=True)]
        )
        await _async_register_card_resource(hass, f"{CARD_URL_PATH}?v={cache_hash}")

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
