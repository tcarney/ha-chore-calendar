# Chore Calendar Custom Integration for Home Assistant — Design Spec

## Project Overview

A Home Assistant custom integration called **Chore Calendar** (domain: `chore_calendar`) that manages recurring household chores. Each chore list is added through Settings > Integrations (like `local_calendar` or `local_todo`), with chores managed via services (like `calendar.create_event` or `todo.add_item`). Provides native sensor and calendar entities, service-based CRUD, and built-in trigger handling. Intended for HACS distribution.

## Key Design Decisions

### Integration Model (One List = One Config Entry)

Each chore list is added through Settings → Integrations → "Chore Calendar". This matches how `local_calendar` and `local_todo` work — one config entry per list. Each list gets its own config entry, storage file, coordinator, calendar entity, and set of chore sensor entities. All entities are grouped under a `DeviceEntryType.SERVICE` device per list.

### Naming Convention

- **Public API (services, events)**: uses "item" — matches `todo` pattern (`create_item`, `complete_item`, etc.)
- **Internal models**: uses "chore" — more descriptive for the domain (`BaseChore`, `ScheduledChore`, etc.)
- **Domain**: `chore_calendar`

### Services Over Entities for Mutations

All chore management goes through services, matching how native `calendar` and `todo` entities work. No button entities, no options flow for chore CRUD.

### Calendar is Read-Only

The calendar entity generates events dynamically from chore data — no stored calendar events. Events shown:

- **Last completed**: zero-duration event at `last_completed` time (always shown for history)
- **Next due**: event spanning from `due_at` to `overdue_at`
- At most 2 events per chore at any time

### Built-in Trigger Handling

When `trigger_entity` (a `tag.*` entity) is provided via the service call, its tag UUID is resolved and stored as `trigger_tag_id` on the chore model. The integration listens for `tag_scanned` events and matches by `tag_id`. For shared triggers (multiple chores using the same tag), the listener determines which chore's completion window the timestamp falls into and only completes that one.

On creation, the tag entity's last-scanned timestamp is also used to seed `last_completed`, allowing migration from existing tag-based systems without losing the most recent completion state.

## Architecture

### Data Flow

```text
Services (CRUD, complete, skip)  ──▶  Store (.storage)  ──▶  Coordinator (60s eval)
                                                                     │
Tag Scan Listener  ─────────────────────────────────────────────────▶│
                                                                     │
                                                           ┌─────────┼──────────┐
                                                           ▼         ▼          ▼
                                                     Sensor      Calendar    Events
                                                     Entities    Entity      (status
                                                     (per chore) (per list)  changed)
```

### Entity Model

```text
calendar.daily_chores                           — the list (one per config entry)
sensor.daily_chores_morning_medicine            — one per chore, prefixed with list name (state = status)
```

### State Machine

**Scheduled Chores** — 4 states:

```text
completed → pending → due → overdue → (trigger) → completed
```

- Period rolls forward at `pending_at` (= `period_due - early_window`)
- Active days filter controls which days the chore is active
- On non-active days, stays `completed` until next active day's `pending_at`
- **New chore behavior**: newly created chores (no `last_completed`) start in pending/due state immediately, but never go overdue — if the grace period has passed, status is `completed` (with no `last_completed`) and `next_due` advances to the next period
- **Overdue pinning**: walks back from the candidate period to find the earliest uncompleted period, using `last_completed` or `created_at` as anchor. An overdue chore stays pinned to the uncompleted period — `next_due` does not advance until the chore is completed

**Interval Chores** — 3 states:

```text
completed → due → overdue → (trigger) → completed
```

- `due_at` = `last_completed + interval`
- `overdue_at` = `due_at + grace_period`
- Never-completed interval chores are always `due` (no pending state)

**Oneshot Chores** (planned) — 4 states, same window as scheduled, no recurrence:

```text
pending → due → overdue → (trigger) → completed [terminal]
```

- Same `early_window` / `grace_period` window as scheduled chores
- `pending_at` = `due_datetime - early_window`
- `overdue_at` = `due_datetime + grace_period`
- Once completed, stays completed permanently (or auto-deletes)

### Storage Schema

File: `.storage/chore_calendar.{entry_id}` (one per list)

```json
{
  "version": 1,
  "data": {
    "chores": {
      "morning_medicine": {
        "chore_id": "morning_medicine",
        "chore_name": "Morning Medicine",
        "chore_type": "scheduled",
        "schedule": {
          "time": "08:00:00",
          "active_days": ["mon", "tue", "wed", "thu", "fri"],
          "early_window_mins": 180,
          "grace_period_mins": 60
        },
        "trigger_tag_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "assigned_to": ["person.claire"],
        "created_at": "2026-03-01T10:00:00+00:00",
        "last_completed": "2026-03-22T07:52:00+00:00",
        "last_completed_by": "person.claire",
        "skipped_until": null
      },
      "water_filter": {
        "chore_id": "water_filter",
        "chore_name": "Change Water Filter",
        "chore_type": "interval",
        "schedule": {
          "interval_mins": 259200,
          "grace_period_mins": 20160
        },
        "trigger_tag_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "assigned_to": [],
        "created_at": "2026-01-01T12:00:00+00:00",
        "last_completed": "2026-01-15T10:30:00+00:00",
        "last_completed_by": null,
        "skipped_until": null
      },
      "file_taxes": {
        "chore_id": "file_taxes",
        "chore_name": "File Taxes",
        "chore_type": "oneshot",
        "schedule": {
          "due_datetime": "2026-04-15T10:00:00-04:00",
          "early_window_mins": 10080,
          "grace_period_mins": 0,
          "auto_delete": false
        },
        "trigger_tag_id": null,
        "assigned_to": ["person.tom"],
        "created_at": "2026-03-15T09:00:00+00:00",
        "last_completed": null,
        "last_completed_by": null,
        "skipped_until": null
      }
    }
  }
}
```

## Lovelace Card

A custom Lovelace card (`chore-calendar-card`) that displays chores from one or more `chore_calendar` lists in a unified timeline view. Lives in this monorepo under `card/`, tightly coupled to the integration for simpler distribution and versioning.

See `README.md` for user-facing configuration options, YAML examples, and action types.

### Visual Design

#### Timeline View

Chores from all configured lists are merged into a single timeline, sorted by urgency. When multiple lists are configured, a colored left bar distinguishes which list each chore belongs to.

```text
┌─────────────────────────────────────────────────────┐
│  Chores                                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ── Overdue ──────────────────────────────────────  │
│  ▌ ● Morning Medicine                 2 hours ago   │
│  ▌ ● Clean Bathroom                   1 day ago     │
│                                                     │
│  ── Due ──────────────────────────────────────────  │
│  ▌ ● Take Out Trash                   now           │
│                                                     │
│  ── Upcoming ─────────────────────────────────────  │
│  ▌ ○ Evening Vitamins                 in 4 hours    │
│  ▌ ○ Vacuum Living Room               in 2 days     │
│                                                     │
│  ── Completed ────────────────────────────────────  │
│  ▌ ✓ Make Bed                         8:15 AM       │
│  ▌ ✓ Mow Lawn                         Yesterday     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### Row Anatomy

```text
┌──┬───┬──────────────────────────┬───────────────┐
│▌ │ ● │ Chore Name               │ relative time │
│  │   │                          │               │
└──┴───┴──────────────────────────┴───────────────┘
 3px  icon   primary text           secondary text
 bar  16px   (flex: 1)             (right-aligned)
```

- **Left color bar** (3px): only rendered when `entities` has 2+ lists. Color is configurable per list, auto-assigned from a default palette if omitted.
- **Status indicator**: small colored dot/icon (no MDI icon import — pure CSS circles/SVG check).
- **Chore name**: primary text, single line with ellipsis overflow.
- **Relative time**: secondary text, right-aligned, muted color.
  - Overdue: "2 hours ago", "1 day ago" (via `Intl.RelativeTimeFormat`)
  - Due: "now"
  - Pending: "in 4 hours", "in 2 days"
  - Completed: time if today ("8:15 AM"), "Yesterday", or date ("Mar 28")
- **Completed rows**: reduced opacity (0.6), strikethrough optional.

#### Section Headers

Chores are grouped under status section headers:

| Section       | Contains           | Header style           | Sort                                            |
|---------------|--------------------|------------------------|-------------------------------------------------|
| **Overdue**   | `overdue` chores   | Red text, bold         | `next_due` ascending (most overdue first)       |
| **Due**       | `due` chores       | Amber text             | `next_due` ascending                            |
| **Upcoming**  | `pending` chores   | Default secondary text | `next_due` ascending (soonest first)            |
| **Completed** | `completed` chores | Muted                  | `last_completed` descending (most recent first) |

Empty sections are hidden. The Completed section is capped at `completed_limit` rows (default 3); items beyond the limit are not shown. Set `completed_limit` to `0` to show all completed items. When `show_completed` is `false`, the entire section is hidden.

#### Status Indicators (CSS-only)

| Status    | Indicator                    | Color                          |
|-----------|------------------------------|--------------------------------|
| Overdue   | Filled circle                | `var(--error-color)`           |
| Due       | Filled circle                | `var(--warning-color)`         |
| Pending   | Hollow circle (ring)         | `var(--secondary-text-color)`  |
| Completed | Checkmark (SVG inline)       | `var(--success-color)`         |

#### Theming

- All colors via HA CSS custom properties — automatic dark/light mode support.
- `ha-card` wrapper for standard HA card appearance.
- Container queries for responsive behavior (compact row height on narrow columns).

### Data Source

The card fetches data via `chore_calendar.get_items` (one call per configured entity), merging results client-side into the unified timeline.

Response shape per item:

```typescript
interface ChoreItem {
  chore_id: string;
  chore_name: string;
  chore_type: 'scheduled' | 'interval';
  status: 'completed' | 'pending' | 'due' | 'overdue';
  next_due: string | null;       // ISO 8601
  last_completed: string | null; // ISO 8601
  last_completed_by: string | null;
  assigned_to: string[];
  trigger_entity: string | null;
  schedule: string;              // Human-readable description
}
```

### Default Color Palette

When `color` is omitted, auto-assigned from HA theme color names:

```text
blue, red, amber, green, orange, cyan, purple, pink
```

Colors are HA theme names (e.g. `"red"` → `var(--red-color)`) which adapt to light/dark themes automatically. Raw CSS values (hex codes, `rgb()`, etc.) are also accepted. Only visible when 2+ entities are configured.

### Detail Dialog

Tapping a chore row opens a detail dialog. Each row has an MDI icon and a value — no labels or dividers. Rows are only rendered when the item has data for that field.

| Row            | Icon                                   | Shows                                                |
|----------------|----------------------------------------|------------------------------------------------------|
| **List**       | `<ha-state-icon>` from calendar entity | Calendar entity friendly name — always first         |
| **Schedule**   | `mdi:calendar-clock`                   | Human-readable schedule description                  |
| **Assigned**   | `mdi:account` / `mdi:account-multiple` | Resolved person names, comma-separated               |
| **Trigger**    | `mdi:nfc-tap`                          | Resolved trigger entity name                         |
| **Last done**  | `mdi:check-circle-outline`             | Formatted completion time + "by {person}" if present |

Non-completed chores show a "Complete" button in the dialog footer.
