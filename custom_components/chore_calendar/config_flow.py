"""Config flow for Chore Calendar."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult
from homeassistant.helpers.selector import TextSelector

from .const import CONF_LIST_NAME, DOMAIN

_STEP_USER_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_LIST_NAME): TextSelector(),
    }
)


class ChoreCalendarConfigFlow(ConfigFlow, domain=DOMAIN):
    """Config flow for creating a Chore Calendar list."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Handle the initial step — create a new chore list."""
        errors: dict[str, str] = {}

        if user_input is not None:
            list_name = user_input[CONF_LIST_NAME].strip()
            if not list_name:
                errors[CONF_LIST_NAME] = "invalid_name"
            else:
                await self.async_set_unique_id(list_name.lower())
                self._abort_if_unique_id_configured()
                return self.async_create_entry(
                    title=list_name,
                    data={CONF_LIST_NAME: list_name},
                )

        return self.async_show_form(
            step_id="user",
            data_schema=_STEP_USER_SCHEMA,
            errors=errors,
        )

    async def async_step_reconfigure(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Handle reconfiguration — rename an existing chore list."""
        entry = self._get_reconfigure_entry()
        errors: dict[str, str] = {}

        if user_input is not None:
            list_name = user_input[CONF_LIST_NAME].strip()
            if not list_name:
                errors[CONF_LIST_NAME] = "invalid_name"
            else:
                return self.async_update_reload_and_abort(
                    entry,
                    title=list_name,
                    data_updates={CONF_LIST_NAME: list_name},
                )

        return self.async_show_form(
            step_id="reconfigure",
            data_schema=self.add_suggested_values_to_schema(
                _STEP_USER_SCHEMA,
                entry.data,
            ),
            errors=errors,
        )
