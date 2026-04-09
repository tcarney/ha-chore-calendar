# Chore Calendar

A Home Assistant custom integration for managing recurring household chores. Each chore list is added through Settings > Integrations, with chores managed via service calls. Provides per-chore sensor entities and a per-list calendar entity.

## Features

- **Integration-based setup**: Create chore lists through Settings > Integrations — no YAML required
- **Service-driven management**: Create, update, delete, and complete chores via service calls
- **Sensor entities**: One sensor per chore tracking its current status (pending, due, overdue, completed)
- **Calendar entity**: Read-only calendar per list showing upcoming and recently completed chores
- **Custom Lovelace card**: Built-in timeline card with per-entity filtering, colors, detail dialog, and configurable actions
- **Tag scan auto-completion**: Assign NFC tags to chores for tap-to-complete; shared tags automatically resolve to the correct chore based on completion windows
- **Flexible scheduling**: Scheduled (specific days/times) and interval-based chore types
- **Status events**: Fires `chore_calendar_status_changed` events for use in automations
- **Persistent storage**: Chore data stored locally — no external API or cloud dependency

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

### Add a Chore

Use the `chore_calendar.create_item` service to add chores to a list. See [Chore Types and Options](#chore-types-and-options) for all available options and [Add Chores](#add-chores) for more examples.

```yaml
action: chore_calendar.create_item
data:
  entity_id: calendar.daily_chores
  chore_name: "Morning Medicine"
  scheduled:
    time: "08:00:00"
```

### Add a Dashboard Card

A custom Lovelace card is included and auto-registered. Search for "Chore Calendar Card" in the card picker, or add it manually. See [Dashboard Card](#dashboard-card) for full configuration options.

```yaml
type: custom:chore-calendar-card
entities:
  - calendar.daily_chores
```

## Chore Types and Options

### Scheduled Chores

Recur at a fixed time on specific days. Status cycle: **pending** → **due** → **overdue** → **completed**.

| Option | Required | Default | Description |
| --- | --- | --- | --- |
| `time` | yes | — | Time of day the chore is due (e.g. `"08:00:00"`) |
| `active_days` | no | all days | Days the chore is active: `mon`, `tue`, `wed`, `thu`, `fri`, `sat`, `sun` |
| `early_window` | no | 3 hours | How early the chore can be completed before it's due (duration) |

### Interval Chores

Recur on a fixed interval from the last completion. Status cycle: **due** → **overdue** → **completed** (no pending state).

| Option | Required | Default | Description |
| --- | --- | --- | --- |
| `interval` | yes | — | Time between occurrences (duration, e.g. `days: 90`) |

### Common Options

These apply to both chore types:

| Option | Required | Default | Description |
| --- | --- | --- | --- |
| `chore_name` | yes | — | Display name for the chore |
| `chore_id` | no | auto from name | Unique identifier (e.g. `morning_medicine`); auto-generated from name if omitted |
| `grace_period` | no | 1 hour | How long after the due time before the chore becomes overdue (duration) |
| `trigger_entity` | no | — | A `tag.*` entity for NFC tap-to-complete (see [Tag Triggers](#tag-triggers)) |
| `assigned_to` | no | — | List of `person.*` entities assigned to the chore (informational, shown in card and events) |

Duration values use the standard Home Assistant format: `hours: 3`, `days: 14`, `minutes: 30`, etc.

### Chore Statuses

Each chore sensor reports one of four statuses:

| Status | Meaning |
| --- | --- |
| **completed** | The chore has been completed for the current period |
| **pending** | The early window has opened but the chore is not yet due (scheduled chores only) |
| **due** | The chore is due now and waiting to be completed |
| **overdue** | The grace period has passed without completion |

Overdue chores stay pinned to their uncompleted period — the next due time does not advance until the chore is completed. Newly created chores start in pending or due state but will not go overdue until they have been completed at least once.

The `complete_item` service accepts an optional `completed_by` parameter (`person.*` entity) to record who completed the chore. This is shown in the card detail dialog and included in status events.

### Tag Triggers

Assigning a `tag.*` entity to a chore enables NFC tap-to-complete. When the tag is scanned, the integration checks whether the chore is currently in its completion window (early window through overdue) and auto-completes it.

If multiple chores share the same tag, only the chore whose completion window matches the scan time is completed.

When a chore is created with a `trigger_entity`, the tag's last-scanned timestamp is used to seed `last_completed` — this allows migration from existing tag-based systems without losing the most recent completion.

## Services

### Add Chores

```yaml
# Scheduled chore — weekdays at 8 AM with NFC tag trigger
action: chore_calendar.create_item
data:
  entity_id: calendar.daily_chores
  chore_name: "Morning Medicine"
  scheduled:
    time: "08:00:00"
    active_days: [mon, tue, wed, thu, fri]
  trigger_entity: tag.morning_medicine_nfc

# Interval chore — every 90 days
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

# By calendar entity + explicit chore_id
action: chore_calendar.complete_item
data:
  entity_id: calendar.daily_chores
  chore_id: morning_medicine
```

### Update a Chore

```yaml
action: chore_calendar.update_item
data:
  entity_id: sensor.daily_chores_morning_medicine
  chore_name: "Morning Vitamins"
  scheduled:
    time: "07:30:00"
```

### Delete a Chore

```yaml
action: chore_calendar.delete_item
data:
  entity_id: sensor.daily_chores_morning_medicine
```

### List Chores

Returns all chores in a list, optionally filtered by status. Useful in automations and templates.

```yaml
action: chore_calendar.get_items
data:
  entity_id: calendar.daily_chores
  status: overdue
response_variable: result
# result.items contains the list of matching chores
```

## Dashboard Card

A custom Lovelace card is included and auto-registered — no manual resource setup needed. Add it to a dashboard via the UI card picker or YAML.

### Minimal Configuration

```yaml
type: custom:chore-calendar-card
entities:
  - calendar.daily_chores
```

### Full Configuration

```yaml
type: custom:chore-calendar-card
title: "Chores"
entities:
  - entity: calendar.daily_chores
    color: "#4FC3F7"
    exclude:
      - completed
  - entity: calendar.weekly_chores
    color: "#81C784"
show_header: true
show_completed: true
completed_limit: 3
show_sections: true
no_card_background: false
update_interval: 60
tap_action:
  action: details
hold_action:
  action: none
double_tap_action:
  action: none
```

| Option | Default | Description |
| --- | --- | --- |
| `entities` | required | List of `chore_calendar` calendar entities to display |
| `entities[].color` | auto | Color for the entity's left bar (HA theme name like `"red"` or CSS value like `"#4FC3F7"`) |
| `entities[].exclude` | `[]` | Statuses to hide for this entity: `overdue`, `due`, `pending`, `completed` |
| `title` | none | Card title text |
| `show_header` | `true` | Show the card title bar |
| `show_completed` | `true` | Show the completed section |
| `completed_limit` | `3` | Max completed rows shown; `0` for unlimited |
| `show_sections` | `true` | Show section headings (Overdue, Due, Upcoming, Completed) |
| `no_card_background` | `false` | Transparent card background |
| `update_interval` | `60` | Seconds between data refreshes |
| `tap_action` | `details` | Action on row tap |
| `hold_action` | `none` | Action on row hold (500ms) |
| `double_tap_action` | `none` | Action on row double-tap |

### Action Configuration

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

### Detail Dialog

Tapping a chore row (default behavior) opens a detail dialog showing:

- List name (with entity icon)
- Schedule description
- Assignee(s) (if assigned)
- Trigger tag (if configured)
- Last completed time and by whom (if set)

For non-completed chores, a "Complete" button appears in the dialog footer.

### Visual Editor

All options are configurable through the visual editor — no YAML required. Each entity is shown as a collapsible panel (collapsed: entity name with color dot; expanded: entity picker, color picker, exclude statuses multi-select, and remove button). Card-level options include toggle switches, number inputs, and action type dropdowns.

## Automation Events

The integration fires `chore_calendar_status_changed` events on status transitions, useful for notifications or automations:

```yaml
event_type: chore_calendar_status_changed
data:
  chore_id: "morning_medicine"
  chore_name: "Morning Medicine"
  from_status: "pending"
  to_status: "due"
  next_due: "2026-03-23T08:00:00-04:00"
  assigned_to: ["person.claire"]
  list_entity: "calendar.daily_chores"
```

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

## Acknowledgements

- Inspiration from [Chore Helper](https://github.com/VolantisDev/ha-chore-helper)
- For full-featured chores with gamification, etc. check out [ChoreOps](https://github.com/ccpk1/ChoreOps)
- Card styling based on [week-planner-card](https://github.com/FamousWolf/week-planner-card), which I use for calendars on all of my dashboards

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
