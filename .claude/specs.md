# Chore Calendar Custom Integration for Home Assistant — Design Spec

## Project Overview

Build a Home Assistant custom integration called **Chore Calendar** (domain: `chore_calendar`) that manages recurring household chores. Each chore list is added through Settings > Integrations (like `local_calendar` or `local_todo`), with chores managed via services (like `calendar.create_event` or `todo.add_item`).

This replaces a working set of template blueprints with a proper Python integration providing native sensor and calendar entities, service-based CRUD, and built-in trigger handling.

Intended for HACS distribution. Target the platinum quality scale where feasible from the start.

## Key Design Decisions

### Integration Model (One List = One Config Entry)

Each chore list is added through Settings → Integrations → "Chore Calendar". This matches how `local_calendar` and `local_todo` work — one config entry per list. Each list gets its own config entry, storage file, coordinator, calendar entity, and set of chore sensor entities. All entities are grouped under a `DeviceEntryType.SERVICE` device per list.

**User workflow:**

1. Settings → Integrations → Add → "Chore Calendar" → name: "Daily Chores"
2. Call `chore_calendar.create_item` targeting the calendar entity
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

- **Last completed**: zero-duration event at `last_completed` time (always shown for history)
- **Next due**: event spanning from `due_at` to `overdue_at`
- At most 2 events per chore at any time

### Built-in Trigger Handling

When `trigger_entity` (a `tag.*` entity) is provided via the service call, its tag UUID is resolved and stored as `trigger_tag_id` on the chore model. The integration listens for `tag_scanned` events and matches by `tag_id`. For shared triggers (multiple chores using the same tag), the listener determines which chore's completion window the timestamp falls into and only completes that one.

On creation, the tag entity's last-scanned timestamp is also used to seed `last_completed`, allowing migration from existing tag-based systems without losing the most recent completion state.

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
Tag Scan Listener [Phase 2]  ───────────────────────────────────────▶│
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
- **Overdue pinning**: `_find_current_period` walks back from the candidate period to find the earliest uncompleted period, using `last_completed` or `created_at` as anchor. An overdue chore stays pinned to the uncompleted period — `next_due` does not advance until the chore is completed

**Interval Chores** — 3 states:

```text
completed → due → overdue → (trigger) → completed
```

- `due_at` = `last_completed + interval`
- `overdue_at` = `due_at + grace_period`
- Never-completed interval chores are always `due` (no pending state)

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

## Target Repository Structure

```text
custom_components/chore_calendar/
    __init__.py           # Integration setup, service registration, card serving
    manifest.json         # Integration metadata (deps: frontend, http)
    config_flow.py        # Config flow + reconfigure flow (list name)
    const.py              # Constants, enums, defaults
    coordinator.py        # DataUpdateCoordinator — state computation
    sensor.py             # ChoreSensorEntity platform
    calendar.py           # ChoreCalendarEntity platform (read-only)
    services.py           # Service handlers (CRUD, complete, skip)
    services.yaml         # Service descriptions
    triggers.py           # Internal trigger listener (tag scan)
    store.py              # Persistent storage (.storage)
    models.py             # BaseChore, ScheduledChore, IntervalChore
    strings.json          # Translations
    quality_scale.yaml    # Quality scale tracking
    translations/en.json
    www/                  # Built Lovelace card JS (from card/ build)
card/                     # Lovelace card source (Lit 3.x, TypeScript, Rollup)
    src/                  # Card components, utils, types
    package.json
    rollup.config.mjs
    tsconfig.json
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

### Phase 0 — Repository & Scaffold ✅

- [x] Create repository from `jpawlowski/hacs.integration_blueprint` template
- [x] Configure devcontainer for HA development
- [x] Set up pyproject.toml with ruff, mypy, pytest config
- [x] Set up CI workflows (lint, test, hacs validation)
- [x] Create manifest.json (domain: `chore_calendar`, name: "Chore Calendar")
- [x] Implement config_flow.py with reconfigure flow (list name input)
- [x] Write test_config_flow.py
- [x] Verify integration loads in devcontainer HA instance

### Phase 1 — Core (MVP) ✅

Models, storage, coordinator, sensors, and services for scheduled and interval chores.

- [x] `models.py` — BaseChore, ScheduledChore, IntervalChore dataclasses
  - BaseChore abstract base with shared fields and abstract methods
  - `compute_status(now) -> ChoreStatus`
  - `find_current_period(now) -> datetime` (scheduled)
  - `compute_next_due(now) -> datetime`
  - `is_in_completion_window(timestamp) -> bool`
  - Serialization to/from dict via BaseChore.from_dict factory
- [x] `store.py` — ChoreStore wrapping `homeassistant.helpers.storage.Store`
  - One storage file per list: `.storage/chore_calendar.{entry_id}`
  - Load on startup, save on every mutation
- [x] `coordinator.py` — DataUpdateCoordinator (one per list)
  - 60-second update interval
  - Iterate all chores in the list, compute status
  - Compare with previous status, fire events on transition
- [x] `sensor.py` — ChoreSensorEntity
  - State: completed/pending/due/overdue
  - Attributes: chore_id, chore_type, trigger_entity, last_completed, last_completed_by, next_due, assigned_to, schedule
  - Icon: dynamic based on state
  - unique_id: `{entry_id}_{chore_id}`, entity_id: `sensor.{list_name}_{chore_id}`
- [x] `calendar.py` — ChoreCalendarListEntity (stub; event generation in Phase 2)
  - One calendar entity per list, serves as service target
  - entity_id: `calendar.{list_name}`
- [x] `services.py` — Service handlers
  - `chore_calendar.create_item` (scheduled and interval types; chore_id auto-generated from name if omitted; when `trigger_entity` is a tag, seeds `last_completed` from the tag's last-scanned time)
  - `chore_calendar.update_item`
  - `chore_calendar.delete_item`
  - `chore_calendar.complete_item`
  - `chore_calendar.get_items` (response data)
- [x] `services.yaml` — Service descriptions for HA UI
- [x] `__init__.py` — Wire it all together
  - async_setup: register services globally
  - async_setup_entry: init store, coordinator, forward platforms
  - async_unload_entry: clean teardown
- [x] Events: fire `chore_calendar_status_changed` on transitions
- [x] Tests: 68 tests across models, store, coordinator, sensor, calendar, services

### Phase 2 — Calendar + Tag Triggers ✅

Calendar event generation for dashboard/week-planner display and tag-based auto-completion.

Detailed plan: `.claude/phase2-plan.md`

- [x] Model additions — `compute_due_range(now)` returning `(due_at, overdue_at)` for calendar events; add `trigger_tag_id: str | None` and `created_at: datetime | None` fields to `BaseChore`; removed `trigger_entity` from model (resolved dynamically from `trigger_tag_id` via entity registry)
- [x] `calendar.py` — ChoreCalendarListEntity event generation (read-only)
  - `event` property: nearest active (non-completed) chore as next event
  - `async_get_events()` generates up to 2 events per chore:
    - Completed: 0-duration event at `last_completed` (always shown for history)
    - Next due: event spanning `due_at` to `overdue_at`
  - Completed chores show the next period's due event (including interval chores with future due windows)
  - No CREATE_EVENT/DELETE_EVENT/UPDATE_EVENT support
- [x] `triggers.py` — Tag scan listener
  - Single `hass.bus.async_listen("tag_scanned", callback)` per entry
  - `trigger_tag_id` (UUID) resolved from `trigger_entity` at chore creation/update time and stored on the model — enables direct match on scan with no runtime entity registry lookup
  - On scan: match `tag_id` → check `is_in_completion_window(now)` → auto-complete
  - Solves shared-trigger problem (only completes the chore whose window matches)
- [x] Wire triggers into `__init__.py`, unsubscribe on unload
- [x] Tests for calendar events and tag triggers (96 total tests)

### Phase A — Custom Lovelace Card ✅

Read-only timeline card built with Lit 3.x and TypeScript, bundled via Rollup.

- [x] Data fetching via `hass.callWS` calling `get_items` service with `return_response: true`
- [x] Multi-entity support with per-entity color configuration (HA theme color names via `ui_color` selector)
- [x] Status filtering (all, active, overdue, due, pending, completed) with configurable default
- [x] Sorting: completed by `last_completed` desc, others by `next_due` asc
- [x] Detail dialog (schedule, assigned persons, trigger tag, last completed) via `ha-dialog`
- [x] Native `ha-form` config editor with entity picker, `ui_color` color picker, and options
- [x] Graceful empty-entity config — renders inline error instead of throwing
- [x] Auto-registered via `add_extra_js_url` — no manual resource setup
- [x] Config options: title, show_header, show_completed, show_sections, default_filter, no_card_background, completed_limit, update_interval
- [x] Build tooling: `script/card/` scripts (bootstrap, build, dev, clean) and pre-commit hook for build freshness

Detailed design: `.claude/card-design.md`

### Phase B — Card Complete Action + Row Actions ✅

- [x] Complete button in detail dialog (`primaryAction` slot), hidden for completed chores
- [x] Configurable `tap_action`, `hold_action`, `double_tap_action` on chore rows
- [x] Custom actions: `details` (open dialog), `complete` (direct completion)
- [x] Standard HA actions: `more-info`, `call-service`, `navigate`, `url`, `none`
- [x] Action handler directive adapted from lovelace-mushroom (tap, 500ms hold, double-tap)
- [x] `fireEvent` utility and `handleChoreAction` executor
- [x] Visual editor with action type dropdowns

### Phase 3 — Polish ✅

Translations, diagnostics, quality scale compliance.

- [x] Translations (strings.json as source of truth, en.json for runtime)
- [x] quality_scale.yaml tracking (bronze/silver done, gold mostly exempt as custom integration)
- [x] Diagnostics platform (chore data with person entity redaction)
- [x] Documentation (README with service examples, card config, troubleshooting)

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
    trigger_tag_id: str | None          # resolved tag UUID; entity_id derived at read time
    assigned_to: list[str]              # person entity IDs
    created_at: datetime | None         # set on creation; used by interval for initial due
    last_completed: datetime | None
    last_completed_by: str | None
    skipped_until: datetime | None      # Phase 4

    @abstractmethod
    def compute_status(self, now: datetime) -> ChoreStatus: ...

    @abstractmethod
    def compute_next_due(self, now: datetime) -> datetime | None: ...

    @abstractmethod
    def compute_due_range(self, now: datetime) -> tuple[datetime, datetime] | None: ...

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

Chore type is determined by which schedule field is provided: `scheduled` (object) for scheduled chores, `interval` (duration) for interval chores. No explicit `chore_type` or `schedule` object field — the typed selectors replace the old generic object approach.

When `trigger_entity` is a `tag.*` entity, the tag's last-scanned timestamp is read from the entity state and used to seed `last_completed`. This allows existing tag-based chore systems to transfer state into chore calendar automatically — the new chore starts with a realistic completion history.

```yaml
chore_calendar.create_item:
  fields:
    entity_id:
      required: true
      selector:
        entity:
          filter:
            - domain: calendar
              integration: chore_calendar
    chore_id:
      example: "morning_medicine"
      selector:
        text:
    chore_name:
      required: true
      example: "Morning Medicine"
      selector:
        text:
    trigger_entity:
      selector:
        entity:
          filter:
            - domain: tag
    assigned_to:
      selector:
        entity:
          filter:
            - domain: person
          multiple: true
    scheduled:
      selector:
        object:
          fields:
            time:
              required: true
              selector:
                time:
            active_days:
              selector:
                select:
                  multiple: true
                  options: [mon, tue, wed, thu, fri, sat, sun]
            early_window:
              selector:
                duration:
    interval:
      selector:
        duration:
    grace_period:
      selector:
        duration:
```

### complete_item

```yaml
chore_calendar.complete_item:
  fields:
    entity_id:
      required: true
      description: "A chore sensor entity or the calendar entity for the list"
      selector:
        entity:
          filter:
            - domain: calendar
              integration: chore_calendar
            - domain: sensor
              integration: chore_calendar
    chore_id:
      description: "Required when targeting calendar entity; inferred from sensor entity"
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
          filter:
            - domain: calendar
              integration: chore_calendar
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

Same fields as create_item, but only `entity_id` is required. `chore_id` is required when targeting the calendar entity; inferred when targeting a sensor entity. All other fields are optional and only update the specified fields. Uses the same typed selectors (`scheduled`, `interval`, `grace_period`) as create_item.

### delete_item

```yaml
chore_calendar.delete_item:
  fields:
    entity_id:
      required: true
      description: "A chore sensor entity or the calendar entity for the list"
      selector:
        entity:
          filter:
            - domain: calendar
              integration: chore_calendar
            - domain: sensor
              integration: chore_calendar
    chore_id:
      description: "Required when targeting calendar entity; inferred from sensor entity"
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
          filter:
            - domain: calendar
              integration: chore_calendar
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

### Bronze (Phase 0-1) ✅

- Config flow UI setup (Settings > Integrations)
- Entity unique IDs
- Automated tests (96 tests covering all Phase 1-2 modules)
- Reconfiguration support (rename list)

### Silver (Phase 1-2)

- Entity unavailable handling
- Parallel updates configured

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

5. **Dashboard complexity**: The custom Lovelace card provides a purpose-built timeline view — no card_mod hacking needed.
