"""Shared test fixtures for chore_calendar tests."""

from __future__ import annotations

import warnings

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.chore_calendar.const import CONF_LIST_NAME, DOMAIN
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component


@pytest.fixture
def mock_config_entry() -> MockConfigEntry:
    """Return a mock config entry representing a single chore list."""
    return MockConfigEntry(
        domain=DOMAIN,
        title="Daily Chores",
        data={CONF_LIST_NAME: "Daily Chores"},
        unique_id="daily chores",
    )


@pytest.fixture(autouse=True)
async def setup_http(hass: HomeAssistant) -> None:
    """Ensure the http component is set up (required by calendar platform).

    The aiohttp version in the test harness raises NotAppKeyWarning as an error
    when HA's http component sets legacy app keys. Suppress it so the calendar
    platform dependency can load.
    """
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", message=".*AppKey.*")
        await async_setup_component(hass, "http", {"http": {}})
