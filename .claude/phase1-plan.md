# Phase 1 Implementation Plan — Core MVP

## Context

The chore_calendar integration has a complete config flow and scaffold but no business logic. Phase 1 delivers the core MVP: chore models with state machine logic, persistent storage, a coordinator for periodic status evaluation, sensor entities per chore, and service actions for CRUD + completion. Calendar entities and trigger listeners are deferred to Phase 2.

**Prerequisite bug:** The reconfigure flow errors with "Config flow could not be loaded: Invalid handler specified" when triggered from Settings > Helpers. This is because the Helpers UI opens an **options flow** (not a reconfigure flow), and the integration has no `OptionsFlowHandler`. This must be fixed first.

## Implementation Steps

Each step produces a committable unit. Steps must be done in order (each depends on the previous).

---

### Step 0: Fix config flow — Add options flow for helper UI rename

**Files:** `custom_components/chore_calendar/config_flow.py`, `custom_components/chore_calendar/translations/en.json`

**Problem:** Helper integrations are configured via Settings > Helpers, which uses the **options flow** (gear icon), not the reconfigure flow (three-dot menu in Settings > Integrations). The current integration only implements `async_step_reconfigure`, so the Helpers UI fails with "Invalid handler specified".

**Fix:**
- Add `ChoreCalendarOptionsFlow(OptionsFlow)` class with an `async_step_init()` method
  - Shows the same rename form as reconfigure
  - Updates the config entry title and data on submit
- Add `async_get_options_flow()` classmethod on `ChoreCalendarConfigFlow` that returns the options flow handler
- Keep the existing `async_step_reconfigure()` as well (it works from Settings > Integrations)
- Add `options_step` translations in `en.json` alongside the existing config step translations

---

### Step 1: `const.py` + `models.py` — Enums, constants, and chore models

**Files:** `custom_components/chore_calendar/const.py`, `custom_components/chore_calendar/models.py` (new)

**const.py additions:**
- `ChoreStatus(StrEnum)`: `COMPLETED`, `PENDING`, `DUE`, `OVERDUE`
- `ChoreType(StrEnum)`: `SCHEDULED`, `INTERVAL`
- Attribute key constants: `ATTR_CHORE_ID`, `ATTR_CHORE_TYPE`, `ATTR_NEXT_DUE`, `ATTR_LAST_COMPLETED`, etc.
- Service name constants: `SERVICE_CREATE_ITEM`, `SERVICE_UPDATE_ITEM`, etc.
- Default values: `DEFAULT_EARLY_WINDOW_MINS = 180`, `DEFAULT_GRACE_PERIOD_MINS = 60`, `DEFAULT_UPDATE_INTERVAL = 60`
- Event name: `EVENT_STATUS_CHANGED = "chore_calendar_status_changed"`
- Platform list: `PLATFORMS = [Platform.SENSOR]`

**models.py (~300 lines):**
- `BaseChore` abstract dataclass with shared fields (`chore_id`, `chore_name`, `chore_type`, `trigger_entity`, `assigned_to`, `last_completed`, `last_completed_by`, `skipped_until`)
- Abstract methods: `compute_status(now) -> ChoreStatus`, `compute_next_due(now) -> datetime | None`
- Concrete: `is_in_completion_window(timestamp) -> bool`, `to_dict() -> dict`, `from_dict(data) -> BaseChore` factory
- `ScheduledChore(BaseChore)`: `time`, `active_days`, `early_window`, `grace_period`
  - `compute_status()` implements the blueprint state machine logic (4 states)
  - `find_current_period(now) -> datetime` helper
  - `_find_previous_active_day()` / `_is_active_day()` helpers
- `IntervalChore(BaseChore)`: `interval`, `grace_period`
  - `compute_status()` implements 3-state logic (never-completed → DUE immediately)
  - `compute_next_due()` returns `last_completed + interval`

All datetimes are timezone-aware. Use `homeassistant.util.dt` for timezone handling.

---

### Step 2: `store.py` — Persistent storage

**Files:** `custom_components/chore_calendar/store.py` (new)

**ChoreStore class (~150 lines):**
- Wraps `homeassistant.helpers.storage.Store` with `STORAGE_VERSION = 1`
- Storage key: `f"{DOMAIN}.{entry_id}"`
- `async_load() -> dict[str, BaseChore]` — loads and deserializes via `BaseChore.from_dict()`
- `async_save()` — serializes all chores via `to_dict()` and calls `self._store.async_save()`
- In-memory `_chores: dict[str, BaseChore]` cache
- CRUD helpers: `async_create_chore()`, `async_update_chore()`, `async_delete_chore()`, `async_get_chore()`, `get_all_chores()`
- Each mutation calls `async_save()` after modifying the in-memory dict

---

### Step 3: `coordinator.py` — DataUpdateCoordinator

**Files:** `custom_components/chore_calendar/coordinator.py` (new)

**ChoreCalendarCoordinator(DataUpdateCoordinator) (~120 lines):**
- `update_interval = timedelta(seconds=DEFAULT_UPDATE_INTERVAL)` (60s)
- Holds reference to `ChoreStore`
- `_previous_statuses: dict[str, ChoreStatus]` for transition detection
- `_async_update_data()`:
  1. Get all chores from store
  2. For each chore, call `compute_status(dt_util.now())`
  3. Compare with `_previous_statuses`, fire `EVENT_STATUS_CHANGED` bus events on transitions
  4. Update `_previous_statuses`
  5. Return `dict[str, BaseChore]` (the chores keyed by chore_id)
- After service mutations, call `async_refresh()` for immediate entity updates

---

### Step 4: `sensor.py` + `__init__.py` updates — Sensor entities and integration wiring

**Files:** `custom_components/chore_calendar/sensor.py` (new), `custom_components/chore_calendar/__init__.py` (modify)

**__init__.py updates:**
- Define `ChoreCalendarData(NamedTuple)` with `store: ChoreStore` and `coordinator: ChoreCalendarCoordinator`
- Type alias: `type ChoreCalendarConfigEntry = ConfigEntry[ChoreCalendarData]`
- `async_setup_entry()`:
  1. Create `ChoreStore`, call `await store.async_load()`
  2. Create `ChoreCalendarCoordinator(hass, store)`
  3. Call `await coordinator.async_config_entry_first_refresh()`
  4. Set `entry.runtime_data = ChoreCalendarData(store, coordinator)`
  5. `await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)`
- `async_unload_entry()`:
  1. `return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)`

**sensor.py (~200 lines):**
- `ChoreCalendarEntity` base mixin (or just inline in sensor for now since it's the only platform in Phase 1) — sets `_attr_has_entity_name = True`, device_info pointing to the config entry
- `ChoreSensorEntity(SensorEntity)`:
  - `__init__(coordinator, entry, chore_id)` — sets `_attr_unique_id = f"{entry.entry_id}_{chore_id}"`
  - `native_value` property: `coordinator.data[chore_id].compute_status(dt_util.now())`
  - `extra_state_attributes` property: chore_id, chore_type, trigger_entity, last_completed, last_completed_by, next_due, assigned_to, schedule
  - `icon` property: dynamic based on status (mdi:check-circle, mdi:clock-outline, mdi:alert, mdi:alert-circle)
  - `available` property: check chore_id exists in coordinator.data
- `async_setup_entry()` platform function:
  - Creates sensors for all chores currently in coordinator.data
  - Registers a listener on coordinator for dynamically adding/removing sensors when chores are created/deleted
  - Use `async_add_entities()` with the initial set
  - Store a callback reference so services can trigger entity addition/removal

**Dynamic entity management approach:**
- The coordinator's data dict is the source of truth
- After a service creates/deletes a chore, it calls `coordinator.async_refresh()`
- The sensor platform listens to coordinator updates and compares current entity set vs coordinator.data keys
- New chore_ids get new entities via `async_add_entities()`
- Deleted chore_ids get removed via `entity_registry.async_remove()`

---

### Step 5: `services.py` + `services.yaml` + translations — Service actions

**Files:** `custom_components/chore_calendar/services.py` (new), `custom_components/chore_calendar/services.yaml` (rewrite), `custom_components/chore_calendar/translations/en.json` (update), `custom_components/chore_calendar/__init__.py` (add `async_setup()`)

**services.py (~250 lines):**
- `async_register_services(hass)` called from `async_setup()`
- Voluptuous schemas for each service (validate chore_type, schedule fields, etc.)
- Service handlers:
  - `_async_create_item(call)`: validate, create chore via store, refresh coordinator
  - `_async_update_item(call)`: validate, update chore via store, refresh coordinator
  - `_async_delete_item(call)`: delete from store, refresh coordinator, remove sensor entity
  - `_async_complete_item(call)`: set `last_completed`/`last_completed_by`, save, refresh
  - `_async_get_items(call)`: return response data (filtered by status if provided)
- Target resolution: services accept `entity_id` of the calendar/list entity → resolve to config entry → get runtime_data
- `get_items` uses `SupportsResponse.ONLY` for response data

**services.yaml:**
- Full service definitions matching `.claude/specs.md` schemas for: `create_item`, `update_item`, `delete_item`, `complete_item`, `get_items`

**__init__.py — add `async_setup()`:**
- `async def async_setup(hass, config) -> bool:` that calls `async_register_services(hass)`
- This ensures services are registered once globally, not per config entry

**translations/en.json:**
- Add `services` section with titles and descriptions for all 5 services and their fields

---

## Dependency Graph

```
const.py (enums, constants)
    └── models.py (chore dataclasses)
            └── store.py (persistence)
                    └── coordinator.py (status eval + events)
                            ├── sensor.py (entities)
                            └── services.py (CRUD handlers)
                                    └── __init__.py (wiring)
```

## Key Design Decisions

1. **No base entity sub-package** — Since sensor is the only Phase 1 platform, the base entity mixin lives in sensor.py. When calendar.py arrives in Phase 2, extract a shared `ChoreCalendarEntity` base if needed.

2. **Dynamic sensor management** — Sensors are added/removed in response to coordinator data changes, not directly from service handlers. Services mutate the store and refresh the coordinator; the sensor platform reacts to coordinator updates.

3. **Service target resolution** — Services target the config entry via entity_id of any entity in the entry. Use `hass.config_entries.async_entries(DOMAIN)` + match by entity to find the right `runtime_data`.

4. **Status computed on read** — `native_value` calls `compute_status(now)` each time HA reads the state, so sensor states are always current between coordinator refreshes too.

## Verification

After each step:
- `script/check` (type-check + lint + spell)
- `script/test` (existing tests should still pass)

After Step 5 (full integration):
- `script/develop` to start HA
- Create a chore list via Settings > Helpers > Chore Calendar
- Call `chore_calendar.create_item` via Developer Tools > Services
- Verify sensor entity appears with correct state and attributes
- Call `chore_calendar.complete_item`, verify state changes to "completed"
- Call `chore_calendar.delete_item`, verify sensor entity is removed
- `script/hassfest` to validate manifest, services, translations
