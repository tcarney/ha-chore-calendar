# SPECS.md — Chore Calendar Custom Integration for Home Assistant

## Project Overview

Build a Home Assistant custom integration called **Chore Calendar** (domain: `chore_calendar`) that manages recurring household chores. Each chore list is created as a Helper (like `todo` or `local_calendar`), with chores managed via services (like `calendar.create_event` or `todo.add_item`).

This replaces a working set of template blueprints with a proper Python integration providing native sensor and calendar entities, service-based CRUD, and built-in trigger handling.

Intended for HACS distribution. Target the platinum quality scale where feasible from the start.

## Key Design Decisions

### Helper Model (One List = One Config Entry)

Each chore list is created through Settings → Helpers → "Chore Calendar". This matches how `todo` and `local_calendar` work — one helper instance per list. Each list gets its own config entry, storage file, coordinator, calendar entity, and set of chore sensor entities.

**User workflow:**

1. Settings → Helpers → Create → "Chore Calendar" → name: "Daily Chores"
2. Call `chore_calendar.create_item` targeting the list
3. Calendar card shows chore events, sensors track status
4. Tag/button triggers handle completion automatically

### Naming Convention

- **Public API (services, events)**: uses "item" — matches `todo` pattern (`create_item`, `complete_item`, etc.)
- **Internal models**: uses "chore" — more descriptive for the domain (`BaseChore`, `ScheduledChore`, etc.)
- **Domain**: `chore_calendar`

### Services Over Entities for Mutations

All chore management goes through services, matching how native `calendar` and `todo` entities work. No button entities, no options flow for chore CRUD. A future custom dashboard card could wrap these services in a UI.

### Calendar is Read-Only

The calendar entity generates events dynamically from chore data — no stored calendar events. Events shown:

- **Last completed**: short event at `last_completed` time, only if within the last 24 hours
- **Next due**: event spanning from `next_due` to `overdue_at`
- At most 2 events per chore at any time

### Built-in Trigger Handling

When `trigger_entity` is set on a chore (tag or input_button), the integration listens for state changes internally. For shared triggers (multiple chores using the same tag), the listener determines which chore's completion window the timestamp falls into and only completes that one.

### Status Transition Events

The integration fires events on status changes for external automation (e.g., notifications):

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

## Architecture

### Data Flow

```text
Services (CRUD, complete, skip)  ──▶  Store (.storage)  ──▶  Coordinator (60s eval)
                                                                     │
Tag/Button Listener [Phase 2]  ─────────────────────────────────────▶│
                                                                     │
                                                           ┌─────────┼──────────┐
                                                           ▼         ▼          ▼
                                                     Sensor      Calendar    Events
                                                     Entities    Entity      (status
                                                     (per chore) (per list)  changed)
```

### Entity Model

```text
calendar.daily_chores                           — the list (one per helper instance)
sensor.chore_calendar_morning_medicine          — one per chore (state = status)
```

### State Machine

**Scheduled Chores** — 4 states:

```text
completed → pending → due → overdue → (trigger) → completed
```

- Period rolls forward at `pending_at` (= `period_due - early_window`)
- Active days filter controls which days the chore is active
- On non-active days, stays `completed` until next active day's `pending_at`

**Interval Chores** — 3 states:

```text
completed → due → overdue → (trigger) → completed
```

- `due_at` = `last_completed + interval`
- `overdue_at` = `due_at + grace_period`

**Oneshot Chores** (Phase 4) — 4 states, same window as scheduled, no recurrence:

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
        "trigger_entity": "tag.morning_medicine",
        "assigned_to": ["person.claire"],
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
        "trigger_entity": "tag.water_filter",
        "assigned_to": [],
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
        "trigger_entity": null,
        "assigned_to": ["person.tom"],
        "last_completed": null,
        "last_completed_by": null,
        "skipped_until": null
      }
    }
  }
}
```

## Target Repository Structure

```text
custom_components/chore_calendar/
    __init__.py           # Integration setup, service registration
    manifest.json         # Integration metadata
    config_flow.py        # Config flow (list name — helper creation)
    const.py              # Constants, enums, defaults
    coordinator.py        # DataUpdateCoordinator — state computation
    sensor.py             # ChoreSensorEntity platform
    calendar.py           # ChoreCalendarEntity platform (read-only)
    services.py           # Service handlers (CRUD, complete, skip)
    services.yaml         # Service descriptions
    triggers.py           # Internal trigger listener (Phase 2)
    store.py              # Persistent storage (.storage)
    models.py             # BaseChore, ScheduledChore, IntervalChore
    strings.json          # Translations
    quality_scale.yaml    # Quality scale tracking
    translations/en.json
tests/
    conftest.py               # Shared fixtures
    test_init.py              # Setup/unload tests
    test_config_flow.py       # Config flow tests
    test_models.py            # Chore model unit tests
    test_store.py             # Storage tests
    test_coordinator.py       # State computation tests
    test_sensor.py            # Sensor entity tests
    test_calendar.py          # Calendar entity tests
    test_services.py          # Service handler tests
    fixtures/                 # Test fixture data
```

## Development Environment

**DevContainer** — use the HA custom integration devcontainer pattern:

- Base image: `homeassistant/devcontainer` or Python 3.12+ with HA installed via pip
- Pre-install: `pytest`, `pytest-homeassistant-custom-component`, `pytest-asyncio`, `ruff`, `mypy`
- Forward port 8123 for live testing
- Mount `custom_components/chore_calendar` into HA's `custom_components` directory

**pyproject.toml** — configure:

- `ruff` for linting (match HA core settings)
- `mypy` with strict mode
- `pytest` with asyncio_mode = auto

**requirements_test.txt**:

```text
pytest
pytest-homeassistant-custom-component
pytest-asyncio
pytest-cov
syrupy
```

**CI/CD** — GitHub Actions:

- **lint.yml**: Run ruff, mypy on every push/PR
- **tests.yml**: Run pytest on every push/PR, generate coverage report
- **hacs.yml**: HACS validation (hassfest)

## Implementation Phases

### Phase 0 — Repository & Scaffold

- [ ] Create repository from `jpawlowski/hacs.integration_blueprint` template
- [ ] Configure devcontainer for HA development
- [ ] Set up pyproject.toml with ruff, mypy, pytest config
- [ ] Set up CI workflows (lint, test, hacs validation)
- [ ] Create manifest.json (domain: `chore_calendar`, name: "Chore Calendar")
- [ ] Implement config_flow.py as Helper creation (list name input)
- [ ] Write test_config_flow.py
- [ ] Verify integration loads and creates a helper in devcontainer HA instance

### Phase 1 — Core (MVP)

Models, storage, coordinator, sensors, and services for scheduled and interval chores.

- [ ] `models.py` — BaseChore, ScheduledChore, IntervalChore dataclasses
  - BaseChore abstract base with shared fields and abstract methods
  - `compute_status(now) -> ChoreStatus`
  - `find_current_period(now) -> datetime` (scheduled)
  - `compute_next_due(now) -> datetime`
  - `is_in_completion_window(timestamp) -> bool`
  - Serialization to/from dict via BaseChore.from_dict factory
- [ ] `store.py` — ChoreStore wrapping `homeassistant.helpers.storage.Store`
  - One storage file per list: `.storage/chore_calendar.{entry_id}`
  - Load on startup, save on every mutation
  - Version migration support
- [ ] `coordinator.py` — DataUpdateCoordinator (one per list)
  - 60-second update interval
  - Iterate all chores in the list, compute status
  - Compare with previous status, fire events on transition
- [ ] `sensor.py` — ChoreSensorEntity
  - State: completed/pending/due/overdue
  - Attributes: chore_id, chore_type, trigger_entity, last_completed, last_completed_by, next_due, assigned_to, schedule
  - Icon: dynamic based on state
  - unique_id: `{entry_id}_{chore_id}`
- [ ] `services.py` — Service handlers
  - `chore_calendar.create_item` (scheduled and interval types)
  - `chore_calendar.update_item`
  - `chore_calendar.delete_item`
  - `chore_calendar.complete_item`
  - `chore_calendar.get_items` (response data)
- [ ] `services.yaml` — Service descriptions for HA UI
- [ ] `__init__.py` — Wire it all together
  - async_setup_entry: init store, coordinator, register services, set up platforms
  - async_unload_entry: clean teardown
- [ ] Events: fire `chore_calendar_status_changed` on transitions
- [ ] Tests for all of the above

### Phase 2 — Calendar + Triggers

Calendar entities for dashboard/week-planner display and built-in trigger handling.

- [ ] `calendar.py` — ChoreCalendarEntity (read-only)
  - One calendar entity per list (is the list's primary entity)
  - `async_get_events()` generates events from chore data:
    - Completed: event from `last_completed` for short duration, only if within last 24 hours
    - Next due: event from `next_due` to `overdue_at`
    - At most 2 events per chore at any time
  - No CREATE_EVENT/DELETE_EVENT/UPDATE_EVENT support
- [ ] `triggers.py` — Internal trigger listener
  - `async_track_state_change_event` for each trigger entity across all lists
  - On tag scan: find matching chore(s) by trigger_entity, check which chore's window the timestamp falls in, complete the correct one
  - On input_button press: same logic
  - Solves shared-trigger problem (only completes the chore whose window matches)
- [ ] Tests for calendar and triggers

### Phase 3 — Polish

Translations, diagnostics, quality scale compliance.

- [ ] Translations (strings.json, en.json)
- [ ] quality_scale.yaml tracking
- [ ] Diagnostics platform (for debugging)
- [ ] Documentation (README with setup, service reference, examples)

### Phase 4 — Skip Action + Oneshot Chores

Adds chore deferral and one-time chore support.

#### Skip Action

- [ ] Add `skipped_until: datetime | None` field to BaseChore model
- [ ] Update status computation in all chore types:
  - If `skipped_until` is set and `now() < skipped_until`, return `completed`
  - Clear `skipped_until` when the skip period has passed
- [ ] `chore_calendar.skip_item` service
  - Accepts `chore_id` + list entity (single chore) or list entity alone (all chores)
  - Optional `until` datetime parameter
  - **Scheduled, no `until`**: skip current occurrence, advance to next active day
  - **Scheduled, with `until`**: skip all occurrences until datetime
  - **Interval, no `until`**: reset `due_at` to `now() + interval` without updating `last_completed`
  - **Interval, with `until`**: set `due_at` to `until + interval`
  - **Oneshot**: set `skipped_until` (defers the chore)
  - **List-level skip**: applies same skip to every chore in the list
- [ ] Fire `chore_calendar_item_skipped` event with `chore_id`, `skipped_until`, list entity
- [ ] Update `services.yaml` with skip_item schema
- [ ] Update storage schema (version migration to add `skipped_until`)
- [ ] Tests for skip logic across all chore types

#### Oneshot Chore Type

- [ ] Add OneshotChore model inheriting from BaseChore
  - Fields: `due_datetime`, `early_window`, `grace_period`, `auto_delete`
  - Same window logic as scheduled: `pending_at = due_datetime - early_window`, `overdue_at = due_datetime + grace_period`
  - No recurrence — once completed, stays completed (or auto-deletes)
  - `compute_status`: pending → due → overdue → completed (terminal)
  - `compute_next_due`: returns `due_datetime` (no next occurrence)
- [ ] Update `create_item` service to accept `chore_type: "oneshot"`
  - Schedule config: `{due_datetime, early_window_mins, grace_period_mins, auto_delete}`
- [ ] Auto-delete behavior on completion:
  - If `auto_delete: true`: remove sensor entity, delete from storage
  - Fire `chore_calendar_item_deleted` event before removal
  - If `auto_delete: false`: entity stays in `completed` state indefinitely
- [ ] Calendar integration:
  - Single event at `due_datetime` spanning to `overdue_at`
  - Completed oneshot chores with `auto_delete: false` show as completed (24h window)
  - Auto-deleted chores disappear from calendar
- [ ] Update BaseChore.from_dict to handle `chore_type: "oneshot"`
- [ ] Tests for oneshot status computation, auto-delete, and calendar events

## Models Reference

### BaseChore (Abstract)

```python
@dataclass
class BaseChore:
    chore_id: str
    chore_name: str
    chore_type: str                     # "scheduled", "interval", "oneshot"
    trigger_entity: str | None
    assigned_to: list[str]              # person entity IDs
    last_completed: datetime | None
    last_completed_by: str | None
    skipped_until: datetime | None      # Phase 4

    @abstractmethod
    def compute_status(self, now: datetime) -> ChoreStatus: ...

    @abstractmethod
    def compute_next_due(self, now: datetime) -> datetime | None: ...

    def is_in_completion_window(self, timestamp: datetime) -> bool: ...
    def to_dict(self) -> dict: ...

    @classmethod
    def from_dict(cls, data: dict) -> BaseChore: ...
```

### ScheduledChore

```python
@dataclass
class ScheduledChore(BaseChore):
    time: time                          # daily scheduled time
    active_days: list[str]              # ['mon','tue',...] or [] for all
    early_window: timedelta
    grace_period: timedelta

    def compute_status(self, now: datetime) -> ChoreStatus: ...
    def find_current_period(self, now: datetime) -> datetime: ...
    def compute_next_due(self, now: datetime) -> datetime: ...
```

### IntervalChore

```python
@dataclass
class IntervalChore(BaseChore):
    interval: timedelta
    grace_period: timedelta

    def compute_status(self, now: datetime) -> ChoreStatus: ...
    def compute_next_due(self, now: datetime) -> datetime | None: ...
```

### OneshotChore (Phase 4)

```python
@dataclass
class OneshotChore(BaseChore):
    due_datetime: datetime | None       # optional due date
    early_window: timedelta             # same window config as scheduled
    grace_period: timedelta
    auto_delete: bool                   # if True, delete on completion

    def compute_status(self, now: datetime) -> ChoreStatus: ...
    def compute_next_due(self, now: datetime) -> datetime | None: ...
```

### ChoreStatus

```python
class ChoreStatus(StrEnum):
    COMPLETED = "completed"
    PENDING = "pending"      # scheduled and oneshot only
    DUE = "due"
    OVERDUE = "overdue"
```

## Service Schemas

### create_item

```yaml
chore_calendar.create_item:
  fields:
    entity_id:
      required: true
      description: "The chore calendar list to add the item to"
      selector:
        entity:
          domain: chore_calendar
    chore_id:
      required: true
      example: "morning_medicine"
      selector:
        text:
    chore_name:
      required: true
      example: "Morning Medicine"
      selector:
        text:
    chore_type:
      required: true
      selector:
        select:
          options:
            - scheduled
            - interval
            - oneshot
    schedule:
      required: true
      description: >
        For scheduled: {time: "08:00:00", active_days: ["mon","tue"], early_window_mins: 180, grace_period_mins: 60}
        For interval: {interval_mins: 259200, grace_period_mins: 20160}
        For oneshot: {due_datetime: "2026-04-15T10:00:00", early_window_mins: 10080, grace_period_mins: 0, auto_delete: false}
      selector:
        object:
    trigger_entity:
      selector:
        entity:
          filter:
            - domain: tag
            - domain: input_button
    assigned_to:
      selector:
        entity:
          domain: person
          multiple: true
```

### complete_item

```yaml
chore_calendar.complete_item:
  fields:
    entity_id:
      required: true
      description: "The chore calendar list"
      selector:
        entity:
          domain: chore_calendar
    chore_id:
      required: true
      selector:
        text:
    completed_by:
      selector:
        entity:
          domain: person
    completed_at:
      description: "ISO datetime, defaults to now()"
      selector:
        text:
```

### skip_item (Phase 4)

```yaml
chore_calendar.skip_item:
  fields:
    entity_id:
      required: true
      description: "The chore calendar list"
      selector:
        entity:
          domain: chore_calendar
    chore_id:
      description: "Chore to skip. If omitted, skips all chores in the list."
      selector:
        text:
    until:
      description: >
        Skip until this datetime. If omitted, skips the current
        occurrence only.
      selector:
        datetime:
```

### update_item

Same fields as create_item, but only `entity_id` and `chore_id` are required. All other fields are optional and only update the specified fields.

### delete_item

```yaml
chore_calendar.delete_item:
  fields:
    entity_id:
      required: true
      selector:
        entity:
          domain: chore_calendar
    chore_id:
      required: true
      selector:
        text:
```

### get_items

```yaml
chore_calendar.get_items:
  fields:
    entity_id:
      required: true
      selector:
        entity:
          domain: chore_calendar
    status:
      selector:
        select:
          options:
            - completed
            - pending
            - due
            - overdue
```

Returns response data with matching chores.

## Testing Strategy

### Unit Tests (test_models.py)

Test the core state computation logic exhaustively:

- Scheduled chore status at various times relative to due time
- Active days filtering (weekdays only, specific days)
- Period rollover at pending_at boundary
- Shared-trigger window matching
- Interval chore status computation
- Oneshot chore status with early_window and grace_period (Phase 4)
- Oneshot auto-delete behavior (Phase 4)
- Skip logic: skipped_until overriding status across all chore types (Phase 4)
- Edge cases: never completed, timezone boundaries, DST transitions

### Integration Tests

- **test_config_flow.py**: Helper creation flow, duplicate detection
- **test_init.py**: Setup/unload, store loading, service registration
- **test_store.py**: Save/load, version migration, corruption recovery
- **test_coordinator.py**: Status updates, event firing on transitions
- **test_sensor.py**: Entity creation, state updates, attribute correctness
- **test_calendar.py**: Event generation, date range queries, oneshot events (Phase 4)
- **test_services.py**: CRUD operations, complete, skip (Phase 4), validation, error handling

### Fixtures

Use `pytest-homeassistant-custom-component` fixtures:

- `hass` — HA instance
- `enable_custom_integrations` — required for custom component loading
- Create helper fixtures for common chore configurations

## Quality Scale Target

Target bronze for Phase 1, work toward platinum incrementally.

### Bronze (Phase 0-1)

- Config flow UI setup (helper creation)
- Entity unique IDs
- Automated tests for config flow

### Silver (Phase 1-2)

- Entity unavailable handling
- Parallel updates configured
- Reconfiguration support (rename list)

### Gold (Phase 2-3)

- Diagnostics platform
- Entity categories
- Stale data handling

### Platinum (Phase 3+)

- Strict typing throughout
- Full async codebase
- Efficient data handling
- Complete test coverage

## Context from Blueprint Implementation

The existing template blueprints contain battle-tested logic for scheduled chore period computation:

```python
# Period rolls forward when we enter the early window
today_sched = now.replace(hour=sched_h, minute=sched_m, second=0, microsecond=0)
today_pending = today_sched - early_window

if now >= today_pending:
    if is_active_day(today_sched):
        period_due = today_sched
    else:
        period_due = find_previous_active_day(today_sched)
else:
    period_due = find_previous_active_day(today_sched - timedelta(days=1))

pending_at = period_due - early_window
overdue_at = period_due + grace_period

if last_completed and last_completed >= pending_at:
    status = COMPLETED
elif now >= overdue_at:
    status = OVERDUE
elif now >= period_due:
    status = DUE
else:
    status = PENDING
```

### Known Limitations in Blueprints (Solved by Integration)

1. **Shared-trigger last_completed inaccuracy**: All sensors sharing a trigger see the same timestamp. The integration's trigger listener only updates `last_completed` on the chore whose window matches.

2. **No completion history**: Blueprints only track `last_completed`. The integration's storage can be extended for history later.

3. **YAML-only chore management**: The integration provides services for full CRUD.

4. **No calendar display without workarounds**: The integration provides native calendar entities.

5. **Dashboard complexity**: With proper sensor entities and calendar, standard HA cards work without card_mod hacking.
