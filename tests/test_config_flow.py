"""Tests for the Chore Calendar config flow."""

from __future__ import annotations

import pytest

from custom_components.chore_calendar.const import CONF_LIST_NAME, DOMAIN
from homeassistant.config_entries import SOURCE_USER
from homeassistant.data_entry_flow import FlowResultType


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_user_step_shows_form(hass):
    """Test that the user step presents an empty form."""
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_USER})

    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"
    assert result["errors"] == {}


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_user_step_creates_entry(hass):
    """Test that valid input creates a config entry."""
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_USER})
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {CONF_LIST_NAME: "Daily Chores"},
    )

    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Daily Chores"
    assert result["data"] == {CONF_LIST_NAME: "Daily Chores"}


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_user_step_rejects_empty_name(hass):
    """Test that an empty list name returns a validation error."""
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_USER})
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {CONF_LIST_NAME: "   "},
    )

    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {CONF_LIST_NAME: "invalid_name"}


@pytest.mark.usefixtures("enable_custom_integrations")
async def test_duplicate_name_aborts(hass, mock_config_entry):
    """Test that creating a list with a duplicate name aborts the flow."""
    mock_config_entry.add_to_hass(hass)

    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_USER})
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {CONF_LIST_NAME: "Daily Chores"},
    )

    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "already_configured"
