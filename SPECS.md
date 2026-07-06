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
- **Operative due**: zero-duration event at the current period's `due_at` (pinned/skip-aware)
- **Future occurrences** (scheduled chores only): every grid occurrence in the queried window beyond the operative marker, flattened per the HA calendar contract. Each series instance carries `uid`, the series `rrule`, and a `recurrence_id` in the compact `local_calendar` form (`20260615T080000`, floating local). Interval/oneshot chores have no grid and keep a single due event.

All event types are point-in-time markers rather than spans — a long `grace_period` would otherwise render as a multi-day block on the calendar. HA's default `state` logic depends on `event.start <= now < event.end`, which can never hold for a zero-duration event, so the calendar entity overrides `state` directly: it reads `on` while any chore in the list is `due` or `overdue`, and `off` otherwise.

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

- The recurrence is an RFC 5545 RRULE (`FREQ` limited to `DAILY|WEEKLY|MONTHLY|YEARLY`) plus a `dtstart` anchor in floating local time. The rrule string is parsed once at construction and cached; per-query enumeration re-anchors the cached rule via `rrule.replace(dtstart=...)` rather than re-parsing. Occurrence enumeration runs in naive local wall clock (DST reads as wall time); the grid is treated as bi-infinite, with `created_at` pinning — not `dtstart` — governing the first valid period.
- Period rolls forward at `pending_at` (= `period_due - pending_period`)
- Between occurrences, stays `completed` until the next occurrence's `pending_at`
- **Initial state (never-completed)**: pins to the first occurrence's `period_due` at or after `created_at` (the chore couldn't have been done before it existed). The state machine runs `pending → due → overdue` against that pinned period and **stays `overdue`** until first completion — the cycle does not silently roll forward past a missed initial period. Creating a chore mid-day after its scheduled time pins to the next occurrence (so the chore reads `pending`, not immediately `due`).
- **Finite rules** (`UNTIL`/`COUNT`): completing or skipping past the final occurrence sets `terminal` — the chore reports `completed` permanently and is swept by `hide_completed_items` unless `persist` is set. Uncompleting or a recurrence update reopens it.
- **Overdue pinning** (post-first-completion): walks back from the candidate period to find the earliest uncompleted period using `last_completed` as anchor. An overdue chore stays pinned to the uncompleted period — `next_due` does not advance until the chore is completed.

**Interval Chores** — 4 states:

```text
completed → pending → due → overdue → (trigger) → completed
```

- `due_at` = `last_completed` plus `interval` `freq`-units (`minutely`–`yearly`), stepped via `relativedelta` so month/year intervals track the calendar
- With a `bymonth` season window, out-of-season months are excised from the interval clock: sub-monthly freqs accumulate elapsed time only inside allowed months, and monthly counts allowed months only (day clamped); an out-of-season completion starts the clock at the next season opening. `yearly` is not an excision clock — it reads as "once per `interval` years in the allowed month" (an in-season completion steps `interval` years; an out-of-season one resumes at the next opening without skipping a year), so a plain "always in March" chore is better expressed as a `ScheduledChore`
- `pending_at` = `due_at - pending_period`, `overdue_at` = `due_at + grace_period`
- **Initial state (never-completed)**: reports unscheduled `pending` with `next_due = None` and `due_range = None`. The cycle has no anchor until first completion — completing the chore (manually or via tag scan) anchors it.
- **Lifecycle** (`until`/`count`): `until` ends the series once the season-filtered next due exceeds it; `count` ends it after N completions (read from the cross-type `completion_count`, deliberately not RFC COUNT). Same "ends after N occurrences" definition as the scheduled `count` — but an interval occurrence exists only once completed, so the count is spent by completing, where the scheduled grid count is spent by the calendar advancing (a skipped or missed occurrence still counts). Both set `terminal` with the shared `persist` sweep semantics.

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

A parallel `previous_skipped_until` slot holds any `skipped_until` value that a completion cleared (see [Skip](#skip)); `uncomplete_item` restores it in the same step.

### Skip

`skip_item` reschedules a chore's current occurrence without touching `last_completed` — skipping is distinct from completing, preserving an accurate record of when the task was really done. The only argument is an optional `until`. With no `until` it delegates to the type's `apply_default_skip` (see *Defaults* below); with an explicit `until` it sets `skipped_until` to that datetime (a naive value is coerced to local tz) in **either direction** — later defers the occurrence, earlier advances it ("do it tomorrow instead of Monday"), and re-skipping with a new value moves an existing skip. There is no per-occurrence `range` / `recurrence_id` surface — the integration is a chore tracker, not a calendar editor.

- **`skipped_until` acts as the operative anchor** for scheduled and interval state machines:
  - *Scheduled*: `pending_at = skipped_until − pending_period`, `overdue_at = skipped_until + grace_period`
  - *Interval*: `due_at = skipped_until`, `pending_at = skipped_until − pending_period`, `overdue_at = skipped_until + grace_period`
  - *Oneshot*: same window math when `until` is provided (overrides `due_datetime`); when omitted, default skip clears `due_datetime` instead of advancing an anchor
- **No new status** — a skipped chore reports as `completed` while `now < pending_at` (scheduled / oneshot with explicit `until`) or `now < skipped_until` (interval). Once past that threshold, it transitions through `pending`/`due`/ etc. against the skipped anchor.
- **Unconditional override**: `skipped_until`, while set, *is* the operative anchor — it holds in both directions (a value earlier than the natural anchor is honored, not ignored) and does not lapse when the natural cadence catches up. It is released only by a completion (`apply_completion`), an explicit clear (todo due-date cleared), or a schedule change via `update_item` (the override rescheduled the *old* occurrence, so a recurrence / `due_datetime` change resets it). This keeps `compute_next_due` pinned to `skipped_until` after the chore goes overdue, so consumers (e.g. the card's "overdue by" reading) measure the overdue duration from `skipped_until + grace_period` instead of snapping back to a stale natural anchor. The natural anchor cannot organically overtake an override — scheduled pins to the oldest uncompleted period, and interval/oneshot anchors are fixed until completion — so there is no fallthrough case.
- **Undoing a skip**: re-skip with a new (possibly earlier) `until`, or clear the item's due date from the todo surface (see *Todo Item Writes*) to release the override entirely and resume the natural cadence.
- **Defaults when `until` is omitted** — handled type-specifically via `apply_default_skip`:
  - *Scheduled*: the next occurrence's period-due strictly after now. Walks forward past the pinned overdue period so the skip cannot land in the past.
  - *Interval*: `now + interval`, season-filtered.
  - *Oneshot*: clears `due_datetime` (the chore enters the unscheduled `pending` state). Skipping a terminal-completed oneshot raises `ServiceValidationError`.
- **`complete_item` clears the skip** by default. Pass `keep_skip: true` to preserve it — internally mapped to `apply_completion(clear_skip=False)`. The cleared value is saved to `previous_skipped_until` and restored by `uncomplete_item`.
- **Surfaces via `chore_calendar_status_changed`** with `source=skip` on the resulting transition (e.g. `due → completed` when `skipped_until` lands inside the skip-anchor's pending window). Skipping a chore already in `completed` (e.g. early-completed scheduled chore deferring its next cycle further) doesn't fire the event because the transition is `completed → completed`; the chore's `skipped_until` is still observable via the sensor's `state_changed`.
- **Scope**: per-chore only; list-level skip is deferred.

### Todo Item Writes

The todo entity advertises `CREATE_TODO_ITEM | UPDATE_TODO_ITEM | SET_DESCRIPTION_ON_ITEM | SET_DUE_DATETIME_ON_ITEM`, making chores creatable and editable from HA's native todo card. For updates, HA always submits the full `TodoItem` (the card's edit dialog sends the whole form), so the handler diffs each field against what `todo_items` reported and applies only real changes:

- **`status`** — routes through the shared complete/uncomplete helpers, identical to `complete_item` / `uncomplete_item`.
- **`rename` / `description`** — written straight onto the chore; an empty description clears it (matching `update_item`).
- **`due_datetime`** — *reschedules the current occurrence*, never the series (schedule edits remain `chore_calendar.update_item`):
  - *Oneshot*: writes `due_datetime` directly (the occurrence is the series). `null` makes the chore unscheduled; setting a due on a terminal-completed oneshot reopens it, matching `update_item` reschedule semantics.
  - *Scheduled / interval*: sets the `skipped_until` override — later defers, earlier advances. `null` releases an active override (the "undo skip" path); with no override active the clear is rejected (the due derives from the schedule and would silently snap back in the UI). Due edits on a terminal (`until`/`count`-exhausted) series are rejected.
  - A due edit submitted together with a completion is applied with `keep_skip` semantics, so "done, and next one at X" survives the completion's skip-clearing.
- **Skip visibility** — a skip-deferred chore reads `completed` (dormant) but its todo item carries `due = skipped_until`: "deferred until X" is what the row means, and exposing the date is what makes the skip movable/clearable from the native card. A genuinely done item carries no due.
- **`SET_DUE_DATE_ON_ITEM` (date-only) stays off** — every reported due is a datetime; accepting a bare date would mean inventing a time-of-day.
- **`todo.add_item` creates a oneshot chore** — the todo surface is quick capture, and a one-off is the only chore type with 1:1 todo semantics (summary / optional due / description carry straight over; nobody expects HA's add dialog to configure recurrence — native `local_todo` can't either). `persist` defaults false, so a todo-created oneshot is swept by `hide_completed_items` after completion — it lives and dies entirely within todo semantics. Creation persists and announces through the same helper as `create_item` (`async_register_chore`), so `chore_calendar_item_created` fires with the identical payload, carrying the list's calendar entity as `entity_id`. Recurring chores keep their doorway in `chore_calendar.create_item` and the card.
- **`DELETE_TODO_ITEM` stays off** — deletes are ambiguous between occurrence and series (see *Hide Completed Items* for the bulk-clear rationale).

### Hide Completed Items

`hide_completed_items` is a per-list visibility filter for completed items. The recurring-chore use case (where `last_completed` must be preserved for state computation) makes a true "delete completed" semantic infeasible — instead, a per-list cutoff (`completed_cleared_at`) hides items whose `last_completed` precedes it.

- **Cutoff is set by `chore_calendar.hide_completed_items`** — accepts no args (cutoff = now), `before: <datetime>` (specific cutoff), or `keep_for: <duration>` (cutoff = now − duration). `before` and `keep_for` are mutually exclusive.
- **Filtering** applies in `_make_completed_event` (calendar) and `todo_items` (todo). `last_completed` is never modified — `compute_status`, history, and per-chore sensors are unaffected. Items completed *after* the cutoff (next cycle of a recurring chore, or a re-completed oneshot) reappear naturally.
- **Persist option**: every chore type carries `persist` (default `false`), controlling whether a *finished* chore is deleted on the cutoff sweep — terminal-completed oneshots, and recurring chores whose `until`/`count` series has ended (`terminal=true`). With `persist=false`, finished chores whose `last_completed < cleared_at` are removed from storage and fire `chore_calendar_item_deleted`. With `persist=true`, they are merely hidden and remain re-enterable via `update_item`. A recurring chore that is merely completed for the current cycle is never swept — only the `terminal` flag makes it eligible.
- **`get_items` exposes `completed_cleared_at`** at the response top level so the card can apply the filter client-side. The response composes with the card's existing `completed_period` filter as AND (whichever is more restrictive wins).
- **Native `todo.remove_completed_items` is intentionally unavailable** — the todo entity does not advertise `DELETE_TODO_ITEM`. HA's bulk-clear path would route through `async_delete_todo_items` per-uid with no clean way to distinguish a "permanently delete this chore" intent from a "clear from completed view" intent, and the native card's "permanently deleted" warning would be misleading for recurring chores. The `chore_calendar.hide_completed_items` service is the supported path.

### Events Vocabulary

Three events make up the public automation surface; lifecycle CRUD pairs (created/deleted) are dedicated events, status transitions are unified under `_status_changed` with a `source` field describing the cause.

**`chore_calendar_status_changed`** — fires whenever a chore's status transitions. Payload: `uid`, `chore_name`, `entity_id`, `from_status`, `to_status`, `next_due`, `assigned_to`, `source`. The required `source` field is one of:

| `source`     | When fired                                                                                  |
|--------------|---------------------------------------------------------------------------------------------|
| `schedule`   | Coordinator tick crossed a threshold (default — natural progression).                       |
| `complete`   | `complete_item` service or todo entity `needs_action → completed` toggle.                   |
| `uncomplete` | `uncomplete_item` service or todo entity `completed → needs_action` toggle.                 |
| `skip`       | `skip_item` service, or a todo-item due edit (occurrence reschedule).                       |
| `update`     | `update_item` (or todo rename/description edit) whose field change altered the status.      |
| `tag`        | `tag_scanned` listener auto-completion.                                                     |

The coordinator stores per-uid source overrides in `_pending_sources`, populated by service handlers via `mark_source(uid, source)` and consumed exactly once per refresh tick. Pending sources are dropped after each tick whether or not a transition fired, so a service action that doesn't flip status doesn't bleed its source into a later natural transition.

**`chore_calendar_item_created`** — fires from `create_item` after the chore is persisted and the coordinator has refreshed. Payload: `uid`, `chore_name`, `chore_type`, `entity_id`, `status`, `next_due`, `assigned_to`. `status` reflects the chore at creation; tag-seeded creation surfaces `completed` rather than the standard `pending` because the seeded `last_completed` lands inside the current cycle's pending window.

**`chore_calendar_item_deleted`** — fires on every actual storage deletion. Payload: `uid`, `chore_name`, `chore_type`, `entity_id`. Sources:

- `chore_calendar.delete_item` — the explicit delete service.
- The `persist=false` sweep during `hide_completed_items`.

### Storage Schema

File: `.storage/chore_calendar.{entry_id}` (one per list)

```json
{
  "version": 5,
  "data": {
    "completed_cleared_at": null,
    "items": [
      {
        "uid": "01244b28-e604-11ee-a0a4-e45f0197c057",
        "chore_name": "Morning Medicine",
        "chore_type": "scheduled",
        "description": "Take with food.",
        "schedule": {
          "rrule": "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
          "dtstart": "2026-03-01T08:00:00",
          "persist": false
        },
        "pending_period_mins": 180,
        "grace_period_mins": 60,
        "terminal": false,
        "completion_count": 12,
        "trigger_tag_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "assigned_to": ["person.alice"],
        "created_at": "2026-03-01T10:00:00+00:00",
        "last_completed": "2026-03-22T07:52:00+00:00",
        "last_completed_by": "person.alice",
        "skipped_until": null
      },
      {
        "uid": "7f3a9c12-b456-4def-8901-abcdef123456",
        "chore_name": "Change Furnace Filter",
        "chore_type": "interval",
        "description": null,
        "schedule": {
          "freq": "monthly",
          "interval": 3,
          "persist": false,
          "bymonth": [10, 11, 12, 1, 2, 3]
        },
        "pending_period_mins": 180,
        "grace_period_mins": 20160,
        "terminal": false,
        "completion_count": 2,
        "trigger_tag_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "assigned_to": [],
        "created_at": "2026-01-01T12:00:00+00:00",
        "last_completed": "2026-01-15T10:30:00+00:00",
        "last_completed_by": null,
        "skipped_until": null
      },
      {
        "uid": "c8d9e0f1-2345-6789-abcd-ef0123456789",
        "chore_name": "File Taxes",
        "chore_type": "oneshot",
        "description": null,
        "schedule": {
          "due_datetime": "2026-04-15T10:00:00-04:00",
          "persist": false
        },
        "pending_period_mins": 10080,
        "grace_period_mins": 0,
        "terminal": false,
        "completion_count": 0,
        "trigger_tag_id": null,
        "assigned_to": ["person.tom"],
        "created_at": "2026-03-15T09:00:00+00:00",
        "last_completed": null,
        "last_completed_by": null,
        "skipped_until": null
      }
    ]
  }
}
```

Each item also carries the internal undo-slot fields (`previous_last_completed`, `previous_last_completed_by`, `previous_skipped_until`), omitted above for brevity. The interval `schedule` keys `bymonth`/`until`/`count` are serialized sparsely (only when set); `persist` is a cross-type `BaseChore` field serialized within each type's `schedule` sub-dict, always present on all three types.

`completed_cleared_at` is a per-list field (alongside `items`) holding the cutoff set by `hide_completed_items`. New keys default to `null` for backward-compat — older stores that omit them load cleanly without a version bump.

`pending_period_mins` and `grace_period_mins` are top-level item fields (not nested in `schedule`) since both windows apply uniformly across chore types. The v2→v3 migration lifts both keys out of the per-type `schedule` dict; interval items that lacked `early_window_mins` in v2 get the 3h default (`pending_period_mins: 180`) injected explicitly.

`terminal` is a top-level item field (default `false`) introduced in v3 alongside the period promotion. It encodes "current occurrence is satisfied and won't roll forward" — set by `apply_completion` for `OneshotChore`, and by `until`/`count` exhaustion for the recurring types. Stores written before the flag existed are backfilled at load time: a oneshot whose `last_completed` falls inside the current cycle's pending window comes back `terminal=true`. The legacy `previous_due_datetime` slot (used by an earlier "synthesize due_datetime on completion" rule) was dropped at the same time and is ignored on load.

The recurrence-model work bumped storage twice: v3→v4 rewrote scheduled schedules from `{time, active_days}` to `{rrule, dtstart}` (the dtstart date anchored to `created_at`), and v4→v5 rewrote interval schedules from `{interval_mins}` to `{freq, interval}` via the largest exactly-dividing unit (lossless). All other recurrence-era fields (`description`, `completion_count`, `persist`, and the interval season/lifecycle keys) ride on load-time defaults with no further bumps.

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
