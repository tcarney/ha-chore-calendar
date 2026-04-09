"""Tests for Chore Calendar integration setup and teardown."""

from __future__ import annotations

import pytest

from homeassistant.config_entries import ConfigEntryState


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_setup_entry(hass, mock_config_entry):
    """Test that the integration loads successfully."""
    mock_config_entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(mock_config_entry.entry_id)
    await hass.async_block_till_done()

    assert mock_config_entry.state is ConfigEntryState.LOADED


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_unload_entry(hass, mock_config_entry):
    """Test that the integration unloads cleanly."""
    mock_config_entry.add_to_hass(hass)
    await hass.config_entries.async_setup(mock_config_entry.entry_id)
    await hass.async_block_till_done()

    assert await hass.config_entries.async_unload(mock_config_entry.entry_id)
    assert mock_config_entry.state is ConfigEntryState.NOT_LOADED
