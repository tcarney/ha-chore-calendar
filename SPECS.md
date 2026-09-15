# Chore Calendar Design Spec

Design decisions and internals for the Chore Calendar integration and card. User-facing behavior, service arguments, card options, and event payload examples live in `README.md`. This document explains why things work the way they do and how they are implemented.

## Key Design Decisions

### Integration Model (One List = One Config Entry)

Each chore list is one config entry, matching `local_calendar` and `local_todo`. Each list gets its own storage file, coordinator, calendar entity, todo entity, and set of chore sensor entities. All entities are grouped under a `DeviceEntryType.SERVICE` device per list.

### Naming Convention

- **Public API (services, events)** uses "item", matching the `todo` pattern (`create_item`, `complete_item`).
- **Internal models** use "chore", which is more descriptive for the domain (`BaseChore`, `ScheduledChore`, `IntervalChore`, `OneshotChore`).
- **Domain** is `chore_calendar`. Class prefix is `ChoreCalendar`.

### Services Over Entities for Mutations

All chore management goes through services, matching how native `calendar` and `todo` entities work. There are no button entities and no options flow for chore CRUD.

### Calendar is Read-Only

The calendar entity generates events dynamically from chore data. No calendar events are stored. Events shown:

- **Last completed**: zero-duration event at `last_completed` (always shown for history).
- **Operative due**: zero-duration event at the current period's `due_at` (pinned and skip-aware).
- **Future occurrences** (scheduled chores only): every grid occurrence in the queried window beyond the operative marker, flattened per the HA calendar contract. Each series instance carries `uid`, the series `rrule`, and a `recurrence_id` in the compact `local_calendar` form (`20260615T080000`, floating local). Interval and oneshot chores have no grid and keep a single due event.

All events are point-in-time markers. A span would render a long `grace_period` as a multi-day block on the calendar. HA's default `state` logic depends on `event.start <= now < event.end`, which can never hold for a zero-duration event, so the calendar entity overrides `state` directly. It reads `on` while any chore in the list is `due` or `overdue`, and `off` otherwise.

### Built-in Trigger Handling

When `trigger_entity` (a `tag.*` entity) is provided, its tag UUID is resolved and stored as `trigger_tag_id` on the chore model. The integration listens for `tag_scanned` events and matches by `tag_id`. The gate is per type: an interval chore is completed on every scan unless `terminal`, since its clock derives from the last completion; a scheduled or oneshot chore is completed only when its status is not `completed`. A scan within `TAG_SCAN_DEBOUNCE` (one minute) of `last_completed` is a repeat read of the same tap and is dropped, which is what protects interval chores, `completion_count`, and the undo slot now that the status gate no longer applies to them. For shared triggers, each chore is evaluated independently.

On creation, the tag entity's last-scanned timestamp seeds `last_completed`, so migration from an existing tag-based system keeps the most recent completion.

## Architecture

### Data Flow

```text
Services (CRUD, complete, skip)  ──▶  Store (.storage)  ──▶  Coordinator (60s eval)
Todo entity writes  ──────────────▶                                  │
Tag Scan Listener  ─────────────────────────────────────────────────▶│
                                                                     │
                                                 ┌─────────┬─────────┼──────────┐
                                                 ▼         ▼         ▼          ▼
                                            Sensor     Calendar    Todo       Events
                                            Entities   Entity      Entity     (created,
                                            (per chore) (per list) (per list)  status
                                                                               changed,
                                                                               deleted)
```

### Entity Model

```text
calendar.daily_chores                    the list (one per config entry)
todo.daily_chores                        the list's actionable chores (one per config entry)
sensor.daily_chores_morning_medicine     one per chore, prefixed with the list name (state = status)
```

Unique IDs: calendar `{entry_id}`, todo `{entry_id}_todo`, sensor `{entry_id}_{uid}` where `uid` is the chore's UUID.

### State Machine

All four states use the same window math across types: `pending_at = due_at - pending_period` and `overdue_at = due_at + grace_period`. Both window fields live on `BaseChore` and apply uniformly. The type-specific subclass only supplies the `due_at` anchor.

The pre-`pending_at` fallthrough (`now < pending_at` and no completion in the current cycle) is also unified. A chore with a previous completion on record reads `completed`, since the previous cycle remains satisfied until the next pending window opens. A never-completed chore reads `pending` so it stays visible in upcoming-task views before its first cycle is due.

**Scheduled Chores**

```text
completed → pending → due → overdue → (trigger) → completed
```

- The recurrence is an RFC 5545 RRULE (`FREQ` limited to `DAILY|WEEKLY|MONTHLY|YEARLY`) plus a `dtstart` anchor in floating local time. The rrule string is parsed once at construction and cached. Per-query enumeration re-anchors the cached rule via `rrule.replace(dtstart=...)` instead of re-parsing. Occurrence enumeration runs in naive local wall clock (DST reads as wall time). The grid is treated as bi-infinite, and `created_at` pinning governs the first valid period. `dtstart` does not.
- The period rolls forward at `pending_at` (`period_due - pending_period`).
- Between occurrences the chore stays `completed` until the next occurrence's `pending_at`.
- **Initial state (never completed)**: pins to the first occurrence's `period_due` at or after `created_at`, since the chore could not have been done before it existed. The state machine runs `pending → due → overdue` against that pinned period and stays `overdue` until the first completion. The cycle never silently rolls forward past a missed initial period. Creating a chore after its scheduled time on the same day pins to the next occurrence, so the chore reads `pending` instead of `due`.
- **Finite rules** (`UNTIL` or `COUNT`): completing or skipping past the final occurrence sets `terminal`. The chore reports `completed` permanently and is swept by `hide_completed_items` unless `persist` is set. Uncompleting, or updating the recurrence, reopens it.
- **Overdue pinning** (after the first completion): walks back from the candidate period to find the earliest uncompleted period, using `last_completed` as the anchor. An overdue chore stays pinned to the uncompleted period. `next_due` does not advance until the chore is completed.
- **Missed occurrences** (`compute_missed_occurrences`): the uncompleted periods whose `overdue_at` has passed, ascending from the operative anchor and stepping the grid while `period_due + grace_period <= now`. Every period after the anchor is uncompleted by construction, since the anchor is the oldest unsatisfied one. The list is empty unless the status is `overdue`, so a non-empty list and the `overdue` status are equivalent. The walk shares the 365-step guard (`PERIOD_WALK_LIMIT`) with the pinning walk-back. Interval and oneshot chores have no grid to step, so their list is the single operative due while overdue.
- **Upcoming due** (`compute_upcoming_due`, scheduled only): the grid occurrence after the last missed period, or `compute_next_due` when nothing is missed. It is the period currently pending, due, or still ahead. A completion before its pending window leaves `next_due` there. A completion inside the window satisfies it too and `next_due` advances past it. `None` when the series is terminal or the last missed period is the final occurrence of a finite rule. The sensor exposes `missed_count`, `missed_occurrences` (the ten most recent, `MISSED_OCCURRENCES_LIMIT`, kept out of the recorder), and `upcoming_due`. `get_items` carries the same three fields.

**Interval Chores**

```text
completed → pending → due → overdue → (trigger) → completed
```

- `due_at` is `last_completed` plus `interval` `freq`-units (`minutely` through `yearly`), stepped via `relativedelta` so month and year intervals track the calendar.
- With a `bymonth` season window, out-of-season months are excised from the interval clock. Sub-monthly frequencies accumulate elapsed time only inside allowed months. Monthly counts allowed months only, with the day clamped. An out-of-season completion starts the clock at the next season opening. `yearly` is different: it reads as "once per `interval` years in the allowed month". An in-season completion steps `interval` years, and an out-of-season one resumes at the next opening without skipping a year. A plain "always in March" chore is better expressed as a `ScheduledChore`.
- **Initial state (never completed)**: reports unscheduled `pending` with `next_due = None` and `due_range = None`. The cycle has no anchor until the first completion, manual or via tag scan.
- **Lifecycle** (`until` or `count`): `until` ends the series once the season-filtered next due exceeds it. `count` ends it after N completions, read from the cross-type `completion_count`, deliberately not RFC COUNT. Both types define `count` as "ends after N occurrences". An interval occurrence exists only once completed, so the count is spent by completing. The scheduled grid count is spent by the calendar advancing, so a skipped or missed occurrence still counts. Both set `terminal` with the shared `persist` sweep semantics.

**Oneshot Chores** (same window math, no built-in recurrence)

```text
pending → due → overdue → (trigger) → completed [terminal for current occurrence]
```

- `due_datetime` is optional. `None` represents an unscheduled chore that reports `pending` (actionable, no action required) until a date is set via `update_item` or the chore is completed directly.
- Completion sets the cross-type `terminal` flag and leaves `due_datetime` untouched. `compute_status` short-circuits to `completed` while `terminal=True`, and `compute_due_range` and `compute_next_due` return `None`. This keeps `due_datetime` historically accurate (a never-scheduled completion stays `None`, a scheduled completion keeps its original date) and gives the state machine one explicit signal for "current occurrence is satisfied".
- `update_item` can rewrite `due_datetime` at any time, including on a completed oneshot. Any change to `due_datetime` clears `terminal`, re-entering the cycle so the window math evaluates against the new anchor. This supports ad-hoc and automation-driven workflows where an external script computes the next occurrence. A new `due_datetime` whose `pending_at` is at or before `last_completed` keeps the chore `completed`, which guards against accidental reactivation by past dates.
- Skip default clears `due_datetime`, leaving the chore unscheduled. Skip with an explicit `until` uses the standard `skipped_until` anchor. Skipping a terminal-completed oneshot raises `ServiceValidationError`.

### Cross-Type Conversion

`update_item` converts a chore in place when it receives a sub-dict for a type other than the chore's current type. The service builds the target chore from `_convert_chore_type`, which copies only identity and assignment fields: `uid`, name, description, tag trigger, assignees, `created_at`, and the pending and grace windows. The schedule is rebuilt from the new selector.

Completion history (`last_completed`, `last_completed_by`, `completion_count`), the undo slots, `terminal`, and any active skip are dropped, so the converted chore starts a fresh cycle. Those values carry no meaning across schedule types. An interval chore anchors its next due on `last_completed`, so a stale timestamp would read as immediately overdue, and a carried `completion_count` could end a new `count` series early.

Only one type sub-dict is accepted per call. Converting to a oneshot requires a `due_datetime` key, which may be `null` for an unscheduled oneshot. Without it the conversion would silently wipe the recurrence. This mirrors the "requires `frequency`" guard on scheduled and interval conversions. The preserved-key allowlist is deliberate: a field added to a chore type later is dropped on conversion by default instead of leaking onto an incompatible type.

### Completion Undo Slot

Each chore carries a one-level undo slot (`previous_last_completed` and `previous_last_completed_by`). Completing saves the prior `last_completed` and `last_completed_by` into the slot. `uncomplete_item` restores them and clears the slot. There is no history log. Exactly one completion is undoable at any time, and the slot is refreshed on every completion.

A parallel `previous_skipped_until` slot holds any `skipped_until` value that a completion cleared (see [Skip](#skip)). `uncomplete_item` restores it in the same step.

### Skip

`skip_item` reschedules a chore's current occurrence without touching `last_completed`. Skipping is distinct from completing, which preserves an accurate record of when the task was really done. The only argument is an optional `until`. With no `until` the service delegates to the type's `apply_default_skip`. With an explicit `until` it sets `skipped_until` to that datetime (a naive value is coerced to local time) in either direction. There is no per-occurrence `range` or `recurrence_id` surface. The integration is a chore tracker, and calendar editing is out of scope.

- **`skipped_until` is the operative anchor** for the state machine:
  - *Scheduled*: `pending_at = skipped_until - pending_period`, `overdue_at = skipped_until + grace_period`.
  - *Interval*: `due_at = skipped_until`, with the same window math.
  - *Oneshot*: same window math when `until` is provided (it overrides `due_datetime`). When omitted, the default skip clears `due_datetime` instead of advancing an anchor.
- **No new status.** A skipped chore reports `completed` while `now < pending_at` (scheduled, or oneshot with explicit `until`) or `now < skipped_until` (interval). Past that threshold it transitions through `pending`, `due`, and `overdue` against the skipped anchor.
- **Unconditional override.** While set, `skipped_until` holds in both directions (an earlier value is honored) and does not lapse when the natural cadence catches up. It is released only by a completion (`apply_completion`), an explicit clear (todo due date cleared), or a schedule change via `update_item`. The override rescheduled the old occurrence, so a recurrence or `due_datetime` change resets it. This keeps `compute_next_due` pinned to `skipped_until` after the chore goes overdue, so consumers such as the card's "overdue by" reading measure from `skipped_until + grace_period` instead of a stale natural anchor. The natural anchor cannot overtake an override on its own. Scheduled pins to the oldest uncompleted period, and interval and oneshot anchors are fixed until completion, so there is no fallthrough case.
- **Defaults when `until` is omitted**, via `apply_default_skip`:
  - *Scheduled*: the next occurrence's period-due strictly after now. Walks forward past the pinned overdue period so the skip cannot land in the past. Skipping while overdue therefore discards the missed run, the same as completing does.
- **Missed occurrences start at `skipped_until`.** Periods between the natural anchor and the skip target were deferred, so they count as skipped rather than missed. Once the skip target's grace period lapses, the missed walk runs from `skipped_until` along the natural grid after it.
  - *Interval*: `now + interval`, season-filtered.
  - *Oneshot*: clears `due_datetime`.
- **Completion resolves the skip from the completion time.** `apply_completion` keeps `skipped_until` only when it is later than the natural next due computed with the override lifted (`_skip_outlives_completion`); otherwise the skip clears. A terminal completion never keeps it. For a scheduled chore this means an early completion (before the skipped occurrence's pending window) leaves the deferral in place, while an in-window completion satisfies the occurrence and clears it. Keeping the skip after an in-window completion would pin the chore at `skipped_until` as `completed` forever, because `last_completed >= pending_at` holds against the override, so the caller cannot choose. The pre-completion value is always saved to `previous_skipped_until` and restored by `uncomplete_item`. The `complete_item` field `keep_skip` is a deprecated no-op that logs a warning; it is removed in 1.0.0.
- **Events**: the resulting transition fires `chore_calendar_status_changed` with `source=skip`. A skip whose transition is `completed → completed` fires nothing.
- **Scope**: per chore only. List-level skip is deferred.

### Todo Item Writes

The todo entity advertises `CREATE_TODO_ITEM | UPDATE_TODO_ITEM | SET_DESCRIPTION_ON_ITEM | SET_DUE_DATETIME_ON_ITEM`. HA always submits the full `TodoItem` on update (the card's edit dialog sends the whole form), so the handler diffs each field against what `todo_items` reported and applies only real changes.

- **`status`** routes through the shared complete and uncomplete helpers, identical to `complete_item` and `uncomplete_item`.
- **`rename` and `description`** are written straight onto the chore. An empty description clears it, matching `update_item`.
- **`due_datetime`** reschedules the current occurrence, never the series. Schedule edits stay in `chore_calendar.update_item`.
  - *Oneshot*: writes `due_datetime` directly, since the occurrence is the series. `null` makes the chore unscheduled. Setting a due on a terminal-completed oneshot reopens it, matching `update_item` reschedule semantics.
  - *Scheduled and interval*: sets the `skipped_until` override. `null` releases an active override (the "undo skip" path). With no override active the clear is rejected, because the due derives from the schedule and would silently snap back in the UI. Due edits on a terminal (`until` or `count` exhausted) series are rejected.
  - A due edit submitted together with a completion is applied after it for recurring chores, so "done, and next one at X" holds regardless of how the completion resolved the prior skip. For a oneshot the due is written first, because a due edit after the terminal completion would reopen it.
- **Skip visibility.** A skip-deferred chore reads `completed` (dormant) but its todo item carries `due = skipped_until`. "Deferred until X" is what the row means, and exposing the date is what makes the skip movable and clearable from the native card. A genuinely done item carries no due.
- **`SET_DUE_DATE_ON_ITEM` (date only) stays off.** Every reported due is a datetime. Accepting a bare date would mean inventing a time of day.
- **`todo.add_item` creates a oneshot chore.** The todo surface is quick capture, and a one-off is the only chore type with 1:1 todo semantics (summary, optional due, and description carry straight over). Nobody expects HA's add dialog to configure recurrence, and native `local_todo` cannot either. `persist` defaults to false, so a todo-created oneshot is swept by `hide_completed_items` after completion and lives entirely within todo semantics. Creation persists and announces through the same helper as `create_item` (`async_register_chore`), so `chore_calendar_item_created` fires with the identical payload, carrying the list's calendar entity as `entity_id`. Recurring chores keep their doorway in `chore_calendar.create_item` and the card.
- **`DELETE_TODO_ITEM` stays off.** Deletes are ambiguous between occurrence and series (see [Hide Completed Items](#hide-completed-items)).

### Hide Completed Items

`hide_completed_items` is a per-list visibility filter for completed items. A true "delete completed" semantic is infeasible for recurring chores, whose `last_completed` must be preserved for state computation. A per-list cutoff (`completed_cleared_at`) hides items whose `last_completed` precedes it.

- **Filtering** applies in `_make_completed_event` (calendar) and `todo_items` (todo). `last_completed` is never modified, so `compute_status`, history, and per-chore sensors are unaffected. Items completed after the cutoff (the next cycle of a recurring chore, or a re-completed oneshot) reappear naturally.
- **Persist option.** Every chore type carries `persist` (default `false`), controlling whether a finished chore is deleted on the cutoff sweep. Finished means a terminal-completed oneshot, or a recurring chore whose `until` or `count` series has ended (`terminal=true`). With `persist=false`, finished chores whose `last_completed < cleared_at` are removed from storage and fire `chore_calendar_item_deleted`. With `persist=true` they are hidden and remain re-enterable via `update_item`. A recurring chore that is merely completed for the current cycle is never swept. Only the `terminal` flag makes it eligible.
- **`get_items` exposes `completed_cleared_at`** at the response top level so the card can apply the filter client-side. It composes with the card's `completed_period` filter as AND, so the more restrictive one wins.
- **Native `todo.remove_completed_items` is intentionally unavailable.** The todo entity does not advertise `DELETE_TODO_ITEM`. HA's bulk-clear path would route through `async_delete_todo_items` per uid with no clean way to distinguish "permanently delete this chore" from "clear from the completed view", and the native card's "permanently deleted" warning would be misleading for recurring chores. `chore_calendar.hide_completed_items` is the supported path.

### Events Vocabulary

Three events make up the public automation surface. Lifecycle CRUD pairs (created, deleted) are dedicated events. Status transitions are unified under `chore_calendar_status_changed` with a `source` field describing the cause. Payloads, examples, and the `source` table are in the README's Automation Events section.

The coordinator stores per-uid source overrides in `_pending_sources`, populated by service handlers via `mark_source(uid, source)` and consumed exactly once per refresh tick. Pending sources are dropped after each tick whether or not a transition fired, so a service action that does not flip status cannot bleed its source into a later natural transition.

`chore_calendar_item_created` fires from `async_register_chore` after the chore is persisted and the coordinator has refreshed, for both `create_item` and `todo.add_item`. `chore_calendar_item_deleted` fires on every actual storage deletion: `delete_item` and the `persist=false` sweep during `hide_completed_items`.

### Storage Schema

File: `.storage/chore_calendar.{entry_id}` (one per list). Current version is 5.

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

Each item also carries the undo-slot fields (`previous_last_completed`, `previous_last_completed_by`, `previous_skipped_until`), omitted above for brevity. The interval `schedule` keys `bymonth`, `until`, and `count` are serialized only when set. `persist` is a cross-type `BaseChore` field serialized inside each type's `schedule` sub-dict and always present on all three types.

`completed_cleared_at` is a per-list field alongside `items`, holding the cutoff set by `hide_completed_items`. New keys default to `null` for backward compatibility, so older stores that omit them load cleanly without a version bump.

`pending_period_mins` and `grace_period_mins` are top-level item fields, since both windows apply uniformly across chore types. The v2 to v3 migration lifts both keys out of the per-type `schedule` dict. Interval items that lacked `early_window_mins` in v2 get the 3h default (`pending_period_mins: 180`) injected explicitly.

`terminal` is a top-level item field (default `false`) introduced in v3 alongside the period promotion. It encodes "current occurrence is satisfied and will not roll forward". It is set by `apply_completion` for `OneshotChore`, and by `until` or `count` exhaustion for the recurring types. Stores written before the flag existed are backfilled at load time: a oneshot whose `last_completed` falls inside the current cycle's pending window comes back `terminal=true`. The legacy `previous_due_datetime` slot, used by an earlier "synthesize due_datetime on completion" rule, was dropped at the same time and is ignored on load.

The recurrence-model work bumped storage twice. v3 to v4 rewrote scheduled schedules from `{time, active_days}` to `{rrule, dtstart}`, with the dtstart date anchored to `created_at`. v4 to v5 rewrote interval schedules from `{interval_mins}` to `{freq, interval}` via the largest exactly-dividing unit, which is lossless. All other recurrence-era fields (`description`, `completion_count`, `persist`, and the interval season and lifecycle keys) ride on load-time defaults with no further bumps.

## Lovelace Card

The custom card (`chore-calendar-card`) displays chores from one or more `chore_calendar` lists in a unified timeline. It lives in this monorepo under `card/`, tightly coupled to the integration for simpler distribution and versioning. Configuration options, YAML examples, action types, and dialog behavior are documented in the README's Dashboard Card section.

### Timeline View

Chores from all configured lists are merged into a single timeline, sorted by urgency. With more than one list configured, a colored left bar shows which list each chore belongs to.

```text
┌─────────────────────────────────────────────────────┐
│  Chores                                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ── Overdue ──────────────────────────────────────  │
│  ▌ ✗ Morning Medicine                 2 hours ago   │
│  ▌ ✗ Clean Bathroom                   1 day ago     │
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

### Row Anatomy

```text
┌──┬───┬──────────────────────────┬──────────┬───────────────┐
│▌ │ ● │ Chore Name               │ avatars  │ relative time │
└──┴───┴──────────────────────────┴──────────┴───────────────┘
 3px  icon   primary text          assignee   secondary text
 bar         (flex: 1)             badges     (right-aligned)
```

- **Left color bar** (3px): rendered only when `entities` has two or more lists. Color is configurable per list and auto-assigned from the default palette when omitted.
- **Status indicator**: a Unicode glyph per status (`✗` overdue, `●` due, `○` pending, `✓` completed), colored via CSS. No icon library import.
- **Chore name**: primary text, single line with ellipsis overflow.
- **Assignee badges**: one small avatar per assignee, using the person's `entity_picture` and falling back to their icon. The name shows as a tooltip.
- **Relative time**: secondary text, right-aligned, muted color.
  - Overdue: "2 hours ago", "1 day ago" (via `Intl.RelativeTimeFormat`)
  - Due: "now"
  - Pending: "in 4 hours", "in 2 days"
  - Completed: time if today ("8:15 AM"), "Yesterday", or date ("Mar 28")
- **Completed rows**: reduced opacity (0.6).

### Section Headers

| Section       | Contains           | Header style           | Sort                                            |
|---------------|--------------------|------------------------|-------------------------------------------------|
| **Overdue**   | `overdue` chores   | Red text, bold         | `next_due` ascending (most overdue first)       |
| **Due**       | `due` chores       | Amber text             | `next_due` ascending                            |
| **Upcoming**  | `pending` chores   | Default secondary text | `next_due` ascending (soonest first)            |
| **Completed** | `completed` chores | Muted                  | `last_completed` descending (most recent first) |

Empty sections are hidden. Pending items with no `next_due` (unscheduled) are hidden when `due_date_period` is set, matching HA's native `todo-list-card`: the filter means "items due within this window", and undated items are in no window.

### Status Colors

| Status    | Color                          |
|-----------|--------------------------------|
| Overdue   | `var(--error-color)`           |
| Due       | `var(--warning-color)`         |
| Pending   | `var(--secondary-text-color)`  |
| Completed | `var(--success-color)`         |

### Theming

- All colors come from HA CSS custom properties, so dark and light modes work automatically.
- `ha-card` wrapper for standard HA card appearance.
- Container queries for responsive behavior (compact row height on narrow columns).
- Stable `part` attributes on the main elements so `card_mod` users can target them with `::part()`.

### Data Source

The card fetches data via `chore_calendar.get_items` (one call per configured entity) and merges the results client-side.

Response shape per item:

```typescript
interface ChoreItem {
  uid: string;
  chore_name: string;
  description: string | null;
  chore_type: 'scheduled' | 'interval' | 'oneshot';
  status: 'completed' | 'pending' | 'due' | 'overdue';
  next_due: string | null;       // ISO 8601
  upcoming_due: string | null;   // ISO 8601; scheduled only
  missed_count: number;
  missed_occurrences: string[];  // ISO 8601, ten most recent, ascending
  last_completed: string | null; // ISO 8601
  last_completed_by: string | null;
  assigned_to: string[];
  trigger_entity: string | null;
  schedule: string | Record<string, unknown>;  // Type-specific dict; see Storage Schema
  selector?: ChoreSelector;      // Structured recurrence fields for display and editing
}
```

The full response also includes `completed_cleared_at: string | null` at the top level (see [Hide Completed Items](#hide-completed-items)).

### Default Color Palette

When `color` is omitted, colors are auto-assigned from HA theme color names:

```text
blue, red, amber, green, orange, cyan, purple, pink
```

A theme name such as `"red"` maps to `var(--red-color)` and adapts to light and dark themes. Raw CSS values (hex codes, `rgb()`) are also accepted. The bar is only visible when two or more entities are configured.

### Detail Dialog

Each row has an MDI icon and a value, with no labels or dividers. Rows render only when the item has data for that field.

| Row            | Icon                                   | Shows                                                |
|----------------|----------------------------------------|------------------------------------------------------|
| **List**       | `<ha-state-icon>` from calendar entity | Calendar entity friendly name, always first          |
| **Schedule**   | `mdi:calendar-clock`                   | Human-readable schedule description                  |
| **Assigned**   | `mdi:account` / `mdi:account-multiple` | Resolved person names, comma-separated               |
| **Trigger**    | `mdi:nfc-tap`                          | Resolved trigger entity name                         |
| **Missed**     | `mdi:calendar-alert`                   | Overdue only: "{missed_count} missed: {dates}", leading ellipsis when the count exceeds the list. The one row that wraps. |
| **Upcoming**   | `mdi:calendar-arrow-right`             | Overdue only: `upcoming_due` labeled by its own window state, "Upcoming" before `pending_at`, "Pending" inside the pending window, "Due" past the due time (computed client-side from `pending_period_mins`) |
| **Last done**  | `mdi:check-circle-outline`             | Formatted completion time + "by {person}" if present |
| **Description**| none                                   | The chore's free-text description                    |

The footer has an "Edit" button (hidden by `hide_edit_button`). Non-completed chores also get "Skip" (plain, left) and "Complete" (primary, right). Completed chores get "Uncomplete" when `allow_uncomplete` is enabled. Holding "Skip" or "Complete" opens a secondary dialog exposing the service's optional fields.
