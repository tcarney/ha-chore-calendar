# Chore Calendar Custom Integration for Home Assistant — Design Spec

## Project Overview

A Home Assistant custom integration called **Chore Calendar** (domain: `chore_calendar`) that manages recurring household chores. Each chore list is added through Settings > Integrations (like `local_calendar` or `local_todo`), with chores managed via services (like `calendar.create_event` or `todo.add_item`). Provides native sensor and calendar entities, service-based CRUD, and built-in trigger handling. Intended for HACS distribution.

## Key Design Decisions

### Integration Model (One List = One Config Entry)

Each chore list is added through Settings → Integrations → "Chore Calendar". This matches how `local_calendar` and `local_todo` work — one config entry per list. Each list gets its own config entry, storage file, coordinator, calendar entity, todo entity, and set of chore sensor entities. All entities are grouped under a `DeviceEntryType.SERVICE` device per list.

### Naming Convention

- **Public API (services, events)**: uses "item" — matches `todo` pattern (`create_item`, `complete_item`, etc.)
- **Internal models**: uses "chore" — more descriptive for the domain (`BaseChore`, `ScheduledChore`, etc.)
- **Domain**: `chore_calendar`

### Services Over Entities for Mutations

All chore management goes through services, matching how native `calendar` and `todo` entities work. No button entities, no options flow for chore CRUD.

### Calendar is Read-Only

The calendar entity generates events dynamically from chore data — no stored calendar events. Events shown:

- **Last completed**: zero-duration event at `last_completed` time (always shown for history)
- **Next due**: zero-duration event at `due_at`
- At most 2 events per chore at any time

Both event types are point-in-time markers rather than spans — a long `grace_period` would otherwise render as a multi-day block on the calendar. HA's default `state` logic depends on `event.start <= now < event.end`, which can never hold for a zero-duration event, so the calendar entity overrides `state` directly: it reads `on` while any chore in the list is `due` or `overdue`, and `off` otherwise.

### Built-in Trigger Handling

When `trigger_entity` (a `tag.*` entity) is provided via the service call, its tag UUID is resolved and stored as `trigger_tag_id` on the chore model. The integration listens for `tag_scanned` events and matches by `tag_id`. Tag scans complete every matching chore whose status is not already `completed`. For shared triggers (multiple chores using the same tag), each chore is evaluated independently — typically only the one whose cycle is currently active will be in a non-`completed` status.

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
todo.daily_chores                               — the list's actionable chores (one per config entry)
```

### State Machine

All four states use the same window math across types: `pending_at = due_at − pending_period`, `overdue_at = due_at + grace_period`. Both window fields live on `BaseChore` and apply uniformly; the type-specific subclass only supplies the `due_at` anchor.

The pre-`pending_at` fallthrough (when `now < pending_at` and no completion landed in the current cycle) is also unified across types: a chore with a previous completion on record reads `completed` (the previous cycle remains satisfied until the next pending window opens), while a never-completed chore reads `pending` so it stays visible in upcoming-task views before its first cycle is due.

**Scheduled Chores** — 4 states:

```text
completed → pending → due → overdue → (trigger) → completed
```

- Period rolls forward at `pending_at` (= `period_due - pending_period`)
- Active days filter controls which days the chore is active
- On non-active days, stays `completed` until next active day's `pending_at`
- **Initial state (never-completed)**: pins to the first active-day `period_due` at or after `created_at` (the chore couldn't have been done before it existed). The state machine runs `pending → due → overdue` against that pinned period and **stays `overdue`** until first completion — the cycle does not silently roll forward past a missed initial period. Creating a chore mid-day after its scheduled time pins to tomorrow's period (so the chore reads `pending`, not immediately `due`).
- **Overdue pinning** (post-first-completion): walks back from the candidate period to find the earliest uncompleted period using `last_completed` as anchor. An overdue chore stays pinned to the uncompleted period — `next_due` does not advance until the chore is completed.

**Interval Chores** — 4 states:

```text
completed → pending → due → overdue → (trigger) → completed
```

- `due_at` = `last_completed + interval`
- `pending_at` = `due_at - pending_period`, `overdue_at` = `due_at + grace_period`
- **Initial state (never-completed)**: reports unscheduled `pending` with `next_due = None` and `due_range = None`. The cycle has no anchor until first completion — completing the chore (manually or via tag scan) anchors it.

**Oneshot Chores** — 4 states, same window math, no built-in recurrence:

```text
pending → due → overdue → (trigger) → completed [terminal for current occurrence]
```

- `pending_at` = `due_datetime - pending_period`, `overdue_at` = `due_datetime + grace_period`
- `due_datetime` is **optional** — `None` represents an unscheduled chore that reports `pending` (actionable but not requiring action) until a date is set via `update_item` or the chore is completed directly
- Completion sets the cross-type `terminal` flag rather than mutating `due_datetime`. `compute_status` short-circuits to `completed` while `terminal=True`, and `compute_due_range` / `compute_next_due` return `None`. This keeps `due_datetime` historically accurate (a never-scheduled completion stays `None`; a normally-scheduled completion keeps the original date) and gives the state machine a single explicit signal for "current occurrence is satisfied"
- `update_item` can rewrite `due_datetime` at any time, including on a completed oneshot — any change to `due_datetime` clears `terminal`, re-entering the cycle and letting the window math evaluate against the new anchor. This enables ad-hoc and automation-driven workflows where an external script computes the next occurrence
- Skip default clears `due_datetime` (leaves the chore unscheduled); skip with explicit `until` uses the standard `skipped_until` anchor; skipping a terminal-completed oneshot raises `ServiceValidationError`

**Cross-type conversion**: `update_item` rejects per-type sub-dicts that don't match the existing chore's type. Each pair (oneshot ↔ scheduled, scheduled ↔ interval, etc.) has different semantics for `last_completed` and the type-specific anchor fields, so type changes require `delete_item` + `create_item` rather than guessing a migration.

### Completion Undo Slot

Each chore carries a one-level undo slot (`previous_last_completed` / `previous_last_completed_by`). Completing saves the prior `last_completed` / `last_completed_by` into the slot; `uncomplete_item` restores them and clears the slot. There is no history log — exactly one completion is undoable at any time, and the slot is refreshed on every completion.

A parallel `previous_skipped_until` slot holds any `skipped_until` value that a completion cleared (see [Skip](#skip)). Uncomplete restores it in the same step.

### Skip

`skip_item` defers a chore's next occurrence by writing `skipped_until` on the chore. It does **not** touch `last_completed` — skipping is distinct from completing, preserving an accurate record of when the task was really done.

- **`skipped_until` acts as the operative anchor** for scheduled and interval state machines:
  - *Scheduled*: `pending_at = skipped_until − pending_period`, `overdue_at = skipped_until + grace_period`
  - *Interval*: `due_at = skipped_until`, `pending_at = skipped_until − pending_period`, `overdue_at = skipped_until + grace_period`
  - *Oneshot*: same window math when `until` is provided (overrides `due_datetime`); when omitted, default skip clears `due_datetime` instead of advancing an anchor
- **No new status** — a skipped chore reports as `completed` while `now < pending_at` (scheduled / oneshot with explicit `until`) or `now < skipped_until` (interval). Once past that threshold, it transitions through `pending`/`due`/ etc. against the skipped anchor.
- **Stale-skip fallthrough**: once `now ≥ skipped_until + grace_period`, the skip is ignored and normal period logic resumes. The field is not eagerly cleared.
- **Defaults when `until` is omitted** — handled type-specifically via `apply_default_skip`:
  - *Scheduled*: the next active day's period-due strictly after now. Walks forward past the pinned overdue period so the skip cannot land in the past.
  - *Interval*: `now + interval`.
  - *Oneshot*: clears `due_datetime` (the chore enters the unscheduled `pending` state). Skipping a terminal-completed oneshot raises `ServiceValidationError`.
- **`complete_item` clears the skip** by default. Pass `keep_skip: true` to preserve it — internally mapped to `apply_completion(clear_skip=False)`. The cleared value is saved to `previous_skipped_until` and restored by `uncomplete_item`.
- **Fires `chore_calendar_item_skipped`** with `uid`, `chore_name`, `skipped_until`, and the list `entity_id`. The `skipped_until` field is `null` when oneshot default-skip cleared the date (no operative anchor). Status transitions continue to fire `chore_calendar_status_changed`.
- **Scope**: per-chore only; list-level skip is deferred.

### Hide Completed Items

`hide_completed_items` is a per-list visibility filter for completed items. The recurring-chore use case (where `last_completed` must be preserved for state computation) makes a true "delete completed" semantic infeasible — instead, a per-list cutoff (`completed_cleared_at`) hides items whose `last_completed` precedes it.

- **Cutoff is set by `chore_calendar.hide_completed_items`** — accepts no args (cutoff = now), `before: <datetime>` (specific cutoff), or `keep_for: <duration>` (cutoff = now − duration). `before` and `keep_for` are mutually exclusive.
- **Filtering** applies in `_make_completed_event` (calendar) and `todo_items` (todo). `last_completed` is never modified — `compute_status`, history, and per-chore sensors are unaffected. Items completed *after* the cutoff (next cycle of a recurring chore, or a re-completed oneshot) reappear naturally.
- **Persist option**: `OneshotChore.persist` (default `false`) controls whether the chore is deleted on the cutoff sweep. With `persist=false`, terminal-completed oneshots whose `last_completed < cleared_at` are removed from storage and fire `chore_calendar_item_deleted`. With `persist=true`, they are merely hidden and remain reactivatable via `update_item`. Recurring chores ignore `persist` — they are always merely hidden.
- **`get_items` exposes `completed_cleared_at`** at the response top level so the card can apply the filter client-side. The response composes with the card's existing `completed_period` filter as AND (whichever is more restrictive wins).
- **Native `todo.remove_completed_items` is intentionally unavailable** — the todo entity does not advertise `DELETE_TODO_ITEM`. HA's bulk-clear path would route through `async_delete_todo_items` per-uid with no clean way to distinguish a "permanently delete this chore" intent from a "clear from completed view" intent, and the native card's "permanently deleted" warning would be misleading for recurring chores. The `chore_calendar.hide_completed_items` service is the supported path.

### Deletion Event

`chore_calendar_item_deleted` fires on every actual storage deletion. Payload: `uid`, `chore_name`, `chore_type`, list `entity_id`. Sources:

- `chore_calendar.delete_item` — the explicit delete service.
- The `persist=false` sweep during `hide_completed_items`.

### Storage Schema

File: `.storage/chore_calendar.{entry_id}` (one per list)

```json
{
  "version": 3,
  "data": {
    "completed_cleared_at": null,
    "items": [
      {
        "uid": "01244b28-e604-11ee-a0a4-e45f0197c057",
        "chore_name": "Morning Medicine",
        "chore_type": "scheduled",
        "schedule": {
          "time": "08:00:00",
          "active_days": ["mon", "tue", "wed", "thu", "fri"]
        },
        "pending_period_mins": 180,
        "grace_period_mins": 60,
        "terminal": false,
        "trigger_tag_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "assigned_to": ["person.claire"],
        "created_at": "2026-03-01T10:00:00+00:00",
        "last_completed": "2026-03-22T07:52:00+00:00",
        "last_completed_by": "person.claire",
        "previous_last_completed": null,
        "previous_last_completed_by": null,
        "skipped_until": null
      },
      {
        "uid": "7f3a9c12-b456-4def-8901-abcdef123456",
        "chore_name": "Change Water Filter",
        "chore_type": "interval",
        "schedule": {
          "interval_mins": 259200
        },
        "pending_period_mins": 180,
        "grace_period_mins": 20160,
        "terminal": false,
        "trigger_tag_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "assigned_to": [],
        "created_at": "2026-01-01T12:00:00+00:00",
        "last_completed": "2026-01-15T10:30:00+00:00",
        "last_completed_by": null,
        "previous_last_completed": null,
        "previous_last_completed_by": null,
        "skipped_until": null
      },
      {
        "uid": "c8d9e0f1-2345-6789-abcd-ef0123456789",
        "chore_name": "File Taxes",
        "chore_type": "oneshot",
        "schedule": {
          "due_datetime": "2026-04-15T10:00:00-04:00",
          "persist": false
        },
        "pending_period_mins": 10080,
        "grace_period_mins": 0,
        "terminal": false,
        "trigger_tag_id": null,
        "assigned_to": ["person.tom"],
        "created_at": "2026-03-15T09:00:00+00:00",
        "last_completed": null,
        "last_completed_by": null,
        "previous_last_completed": null,
        "previous_last_completed_by": null,
        "skipped_until": null
      }
    ]
  }
}
```

`completed_cleared_at` is a per-list field (alongside `items`) holding the cutoff set by `hide_completed_items`. New keys default to `null` for backward-compat — older stores that omit them load cleanly without a version bump.

`pending_period_mins` and `grace_period_mins` are top-level item fields (not nested in `schedule`) since both windows apply uniformly across chore types. The v2→v3 migration lifts both keys out of the per-type `schedule` dict; interval items that lacked `early_window_mins` in v2 get the 3h default (`pending_period_mins: 180`) injected explicitly.

`terminal` is a top-level item field (default `false`) introduced in v3 alongside the period promotion. It encodes "current occurrence is satisfied and won't roll forward" — set by `apply_completion` for `OneshotChore` today, reserved for `ScheduledChore` once the recurrence-model RRULE work lands. Stores written before the flag existed are backfilled at load time: a oneshot whose `last_completed` falls inside the current cycle's pending window comes back `terminal=true`. The legacy `previous_due_datetime` slot (used by an earlier "synthesize due_datetime on completion" rule) was dropped at the same time and is ignored on load.

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

Empty sections are hidden. When `hide_completed` is `true`, the Completed section is hidden entirely. The `completed_period` option trims the section to items completed within a recent duration (e.g. `{days: 7}`); omitting it shows all completed items. The `due_date_period` option analogously trims the Upcoming section to pending items due within a relative window — overdue and due chores are always shown regardless. Pending items with no `next_due` (unscheduled) are also hidden when `due_date_period` is set, matching HA's native `todo-list-card` (the filter means "items due within this window," and undated items aren't in any window).

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
  uid: string;
  chore_name: string;
  chore_type: 'scheduled' | 'interval' | 'oneshot';
  status: 'completed' | 'pending' | 'due' | 'overdue';
  next_due: string | null;       // ISO 8601
  last_completed: string | null; // ISO 8601
  last_completed_by: string | null;
  assigned_to: string[];
  trigger_entity: string | null;
  schedule: string | Record<string, unknown>;  // Type-specific dict; see Storage Schema
}
```

The full `get_items` response also includes `completed_cleared_at: string | null` at the top level (the per-list cutoff from `hide_completed_items`) so the card can apply the visibility filter client-side.

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

Non-completed chores show "Skip" (plain, left) and "Complete" (primary, right) buttons in the dialog footer. Completed chores show an "Uncomplete" button when `allow_uncomplete` is enabled.
