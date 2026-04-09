# Chore Calendar

A Home Assistant custom integration for managing recurring household chores. Each chore list is added through Settings > Integrations (like `local_calendar` or `local_todo`), with chores managed via service calls. Provides per-chore sensor entities and a per-list calendar entity.

## Features

- **Integration-based setup**: Create chore lists through Settings > Integrations — no YAML required
- **Service-driven management**: Create, update, delete, complete, and skip chores via service calls
- **Sensor entities**: One sensor per chore tracking its current status (pending, due, overdue, completed)
- **Calendar entity**: Read-only calendar per list showing upcoming and recently completed chores
- **Custom Lovelace card**: Built-in timeline card with per-entity filtering, colors, detail dialog, and configurable actions — auto-registered, no manual resource setup needed
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

A custom Lovelace card is included and auto-registered — no manual resource setup needed. Add it to a dashboard via the UI card picker or YAML.

#### Minimal Configuration

```yaml
type: custom:chore-calendar-card
entities:
  - calendar.daily_chores
```

#### Full Configuration

```yaml
type: custom:chore-calendar-card
title: "Chores"
entities:
  - entity: calendar.daily_chores
    color: "#4FC3F7"
    exclude:                  # Per-entity status filter (default: [] — show all)
      - completed
  - entity: calendar.weekly_chores
    color: "#81C784"
show_header: true           # Show card title bar (default: true)
show_completed: true        # Show completed section (default: true)
completed_limit: 3          # Max completed rows shown; 0 = unlimited (default: 3)
show_sections: true         # Show section headings (default: true)
no_card_background: false   # Transparent card background (default: false)
update_interval: 60         # Seconds between data refreshes (default: 60)
tap_action:                 # Action on row tap (default: details)
  action: details
hold_action:                # Action on row hold (default: none)
  action: none
double_tap_action:          # Action on row double-tap (default: none)
  action: none
```

#### Action Configuration

Chore rows support configurable tap, hold, and double-tap actions:

| Action | Behavior |
| --- | --- |
| `details` | Open the chore detail dialog (default for tap) |
| `complete` | Complete the chore directly, no dialog |
| `more-info` | Open HA's more-info panel for the calendar entity |
| `navigate` | Navigate to a dashboard path |
| `url` | Open an external URL |
| `call-service` | Call an arbitrary HA service |
| `none` | Do nothing (default for hold and double-tap) |

Example — tap to complete, hold for details:

```yaml
type: custom:chore-calendar-card
entities:
  - entity: calendar.daily_chores
tap_action:
  action: complete
hold_action:
  action: details
```

#### Detail Dialog

Tapping a chore row (default behavior) opens a detail dialog showing:

- List name (with entity icon)
- Schedule description
- Assigned people
- Last completed time and by whom

For non-completed chores, a "Complete" button appears in the dialog footer.

#### Visual Editor

All options are configurable through the visual editor — no YAML required. Each entity is shown as a collapsible panel (collapsed: entity name with color dot; expanded: entity picker, color picker, exclude statuses multi-select, and remove button). Card-level options include toggle switches, number inputs, and action type dropdowns.

## Troubleshooting

Enable debug logging by adding to `configuration.yaml`:

```yaml
logger:
  default: info
  logs:
    custom_components.chore_calendar: debug
```

## Development Setup

Requires Docker Desktop and VS Code with the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers).

1. Clone this repository
2. Open in VS Code
3. Click "Reopen in Container" when prompted

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
