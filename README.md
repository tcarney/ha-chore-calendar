# Chore Calendar

A Home Assistant custom integration for managing recurring household chores. Each chore list is added through Settings > Integrations (like `local_calendar` or `local_todo`), with chores managed via service calls. Provides per-chore sensor entities and a per-list calendar entity.

## Features

- **Integration-based setup**: Create chore lists through Settings > Integrations — no YAML required
- **Service-driven management**: Create, update, delete, complete, and skip chores via service calls
- **Sensor entities**: One sensor per chore tracking its current status (pending, due, overdue, completed)
- **Calendar entity**: Read-only calendar per list showing upcoming and recently completed chores
- **Custom Lovelace card**: Built-in timeline card with status filtering, per-entity colors, and expandable details — auto-registered, no manual resource setup needed
- **Tag scan auto-completion**: Assign NFC tags to chores for tap-to-complete; shared tags automatically resolve to the correct chore based on completion windows
- **Flexible scheduling**: Scheduled (specific days/times), interval-based, and one-shot chore types
- **Status events**: Fires `chore_calendar_status_changed` events for use in automations
- **Persistent storage**: Chore data stored locally in `.storage/` — no external API or cloud dependency

## Quick Start

### Install

**Prerequisites:** [HACS](https://hacs.xyz/) must be installed.

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=tcarney&repository=ha-chore-calendar&category=integration)

1. Click "Download" to install
2. **Restart Home Assistant**

<details>
<summary>Manual Installation</summary>

1. Download the `custom_components/chore_calendar/` folder from this repository
2. Copy it to your Home Assistant's `custom_components/` directory
3. Restart Home Assistant

</details>

### Create a Chore List

1. Go to **Settings** > **Devices & Services** > **Integrations**
2. Click **"+ Add Integration"**
3. Search for **"Chore Calendar"**
4. Enter a name for the list (e.g., "Daily Chores")

Or use the one-click button:

[![Open your Home Assistant instance and start setting up a new integration.](https://my.home-assistant.io/badges/config_flow_start.svg)](https://my.home-assistant.io/redirect/config_flow_start/?domain=chore_calendar)

### Add Chores

Use the `chore_calendar.create_item` service to add chores to a list:

```yaml
# Scheduled chore — daily at a specific time
action: chore_calendar.create_item
data:
  entity_id: calendar.daily_chores
  chore_name: "Morning Medicine"
  scheduled:
    time: "08:00:00"
    active_days:
      - mon
      - tue
      - wed
      - thu
      - fri
  grace_period:
    minutes: 60
  trigger_entity: tag.morning_medicine_nfc
  assigned_to:
    - person.claire

# Interval chore — repeats on a fixed interval
action: chore_calendar.create_item
data:
  entity_id: calendar.daily_chores
  chore_name: "Change Water Filter"
  interval:
    days: 90
  grace_period:
    days: 14
```

### Complete a Chore

```yaml
# By sensor entity (chore_id inferred)
action: chore_calendar.complete_item
data:
  entity_id: sensor.daily_chores_morning_medicine
  completed_by: person.claire

# By calendar entity + explicit chore_id
action: chore_calendar.complete_item
data:
  entity_id: calendar.daily_chores
  chore_id: morning_medicine
```

### Dashboard Card

A custom Lovelace card is included and auto-registered — no manual resource setup needed. Add it to a dashboard:

```yaml
type: custom:chore-calendar-card
entities:
  - entity: calendar.daily_chores
    color: "#4FC3F7"
  - entity: calendar.weekly_chores
    color: "#81C784"
default_filter: active
```

## Troubleshooting

Enable debug logging by adding to `configuration.yaml`:

```yaml
logger:
  default: info
  logs:
    custom_components.chore_calendar: debug
```

## Contributing

Contributions are welcome! Please open an issue or pull request.

### Development Setup

#### Local Development

Requires Docker Desktop and VS Code with the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers).

1. Clone this repository
2. Open in VS Code
3. Click "Reopen in Container" when prompted

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
