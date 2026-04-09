# Phase 2 Plan — Calendar Events + Tag Trigger Handling

## Step 1: Model additions

Add `compute_due_range(now) -> tuple[datetime, datetime] | None` to `BaseChore` — returns `(due_at, overdue_at)` for calendar event time spans.

- `ScheduledChore`: `(period_due, period_due + grace_period)`
- `IntervalChore`: `(last_completed + interval, last_completed + interval + grace_period)` or `None` if never completed

## Step 2: Calendar event generation

Flesh out the stub in `calendar.py`.

**`event` property** (determines calendar on/off state, shows "next up"):
- Look across all chores for the nearest active (non-completed) due event
- Return a `CalendarEvent` for the soonest due chore, or `None` if all completed

**`async_get_events(start_date, end_date)`** (populates calendar cards):
- For each chore, generate up to 2 events:
  - **Completed event**: 0-duration event at `last_completed` if within query range and last 24 hours
  - **Next due event**: event spanning `due_at` to `overdue_at` (from `compute_due_range`)
- Filter to events overlapping `[start_date, end_date]`

## Step 3: Trigger listener (`triggers.py`)

New file handling tag-based auto-completion.

**Tag ID resolution at config time (services.py):**
- When `create_item` or `update_item` provides a `trigger_entity` like `tag.morning_medicine`, resolve it to the tag's UUID (`tag_id`) via entity registry / state attributes
- Store both on the chore model:
  - `trigger_entity`: kept as-is for display in sensor attributes
  - `trigger_tag_id`: the resolved UUID for fast event matching
- Add `trigger_tag_id: str | None` field to `BaseChore`

**Listener:**
- Single `hass.bus.async_listen("tag_scanned", callback)` registered during `async_setup_entry`
- On `tag_scanned` event:
  1. Get `tag_id` from event data
  2. Look up chores where `trigger_tag_id == tag_id` (direct match, no registry lookup)
  3. Check `is_in_completion_window(now)` for each match
  4. Auto-complete matching chore(s)
- No re-subscription needed — one bus listener covers all tags for the entry
- Reuses completion logic (update store + refresh coordinator)

## Step 4: Wire into `__init__.py`

- Call trigger setup in `async_setup_entry` after coordinator first refresh
- Store the unsubscribe callback via `entry.async_on_unload()`
- Trigger auto-completion refreshes the coordinator after updating the store
