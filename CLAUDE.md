# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Home Assistant custom integration called **Chore Calendar** (domain: `chore_calendar`) that manages recurring household chores. Each chore list is added through Settings > Integrations (like `local_calendar` or `local_todo`), with chores managed via services. Replaces existing template blueprints with native sensor/calendar entities, service-based CRUD, and built-in trigger handling. Intended for HACS distribution.

**Current state:** Phase 2 (Calendar + Tag Triggers) is complete, plus a custom Lovelace card (Phase A). Implemented: config flow with reconfigure (no options flow), models with state machine logic (including `compute_due_range`, `trigger_tag_id`, `created_at`, overdue period pinning), persistent storage, coordinator with 60s polling, sensor entities (per chore), calendar entity (per list, full event generation), five service actions (create, update, delete, complete, get_items), status change events, tag scan auto-completion, and a custom Lovelace card (Lit 3.x, auto-registered via `add_extra_js_url`). Services that operate on a single chore (complete, update, delete) accept either a sensor entity_id (chore_id inferred) or calendar entity_id + explicit chore_id. The manifest declares `dependencies: ["frontend", "http"]` for card serving. All 96 tests pass. Remaining phases: polish (Phase 3), skip action and oneshot chores (Phase 4).

**Key files:**

- `.claude/specs.md` — Full design specification (architecture, models, service schemas, implementation phases, storage schema, state machines)
- `.claude/card-design.md` — Custom Lovelace card design spec

**Path-specific instructions** in `.github/instructions/*.instructions.md` provide guidance for specific file types:

- `python.instructions.md` — Python style, async patterns, HA imports
- `entities.instructions.md` — Entity platform patterns, inheritance
- `config_flow.instructions.md` — Config flow, reauth, discovery
- `coordinator.instructions.md` — DataUpdateCoordinator patterns
- `services_yaml.instructions.md` — Service action definitions
- `translations.instructions.md` — Translation file structure

## Development Commands

Always use project scripts — never run `hass`, `pip`, `pytest` directly.

```bash
script/check                          # Full validation (type-check + lint + spell) — run before committing
script/lint                           # Auto-format and fix linting issues
script/type-check                     # Pyright type checking only
script/test                           # Run all tests
script/test -k test_name              # Run specific test by name
script/test tests/test_models.py      # Run specific test file
script/test --cov                     # With terminal coverage report
script/test --cov-html                # With HTML coverage report
script/test --snapshot-update         # Update Syrupy snapshots
script/develop                        # Start local HA instance (port 8123)
script/hassfest                       # Validate manifest, translations, services against HA standards
script/card/bootstrap                 # Install card npm dependencies
script/card/build                     # Build card JS (auto-bootstraps if needed)
script/card/dev                       # Watch mode — rebuild card on source changes
script/card/clean                     # Remove card node_modules/ and dist/
```

Restart HA after modifying Python files, `manifest.json`, `services.yaml`, translations, or config flow. Force restart: `pkill -f "hass --config" || true && pkill -f "debugpy.*5678" || true && ./script/develop`

Logs: live in terminal running `./script/develop`, or `config/home-assistant.log`. Set `custom_components.chore_calendar: debug` in `config/configuration.yaml`.

## Code Style

- Python 3.13+, 4 spaces, 120 char lines, double quotes, full type hints, async for all I/O
- YAML: 2 spaces, modern HA syntax (no legacy `platform:` style). JSON: 2 spaces, no trailing commas
- Ruff for linting (matches HA core config), Pyright basic mode for type checking
- Google-style docstrings; comments as complete sentences with capitalization and ending period
- Import aliases: `voluptuous` as `vol`, `homeassistant.helpers.config_validation` as `cv`, `homeassistant.util.dt` as `dt_util`
- Import order: `from __future__ import annotations` → stdlib → third-party → HA core → local
- Commit messages: Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`)
- Tests: `pytest` with `asyncio_mode = auto`, use `pytest-homeassistant-custom-component` fixtures
- **File size:** target 200–400 lines, max ~500 before splitting

**Never suppress checks with blanket ignores.** Use specific codes with reasons: `# noqa: F401 - reason` or `# type: ignore[attr-defined] - reason`.

## Architecture

### Data Flow

```text
Services (CRUD, complete, skip)  -->  Store (.storage)  -->  Coordinator (60s eval)
                                                                     |
Tag Scan Listener [Phase 2]  ------------------------------------------>|
                                                                     |
                                                           Sensor    Calendar    Events
                                                           Entities  Entity      (status
                                                           (per chore)(per list)  changed)
```

### Entity Model

- `calendar.daily_chores` — one calendar entity per list (config entry)
- `sensor.daily_chores_morning_medicine` — one sensor per chore, prefixed with list name (state = status enum)
- unique_id: `{entry_id}_{chore_id}`

### Key Conventions

- **Public API**: "item" (`create_item`, `complete_item`) — matches HA `todo` pattern
- **Internal models**: "chore" (`BaseChore`, `ScheduledChore`) — domain-specific
- **Domain**: `chore_calendar`, **Class prefix**: `ChoreCalendar`
- **Integration model**: one config entry per chore list (via Settings > Integrations), each with own storage/coordinator/entities. All entities grouped under a `DeviceEntryType.SERVICE` device per list.
- **Services over entities** for all mutations (no button entities, no CRUD via config UI). Single-chore services (complete, update, delete) accept either a sensor entity_id (chore_id inferred from unique_id) or calendar entity_id + explicit chore_id. List-level services (create, get_items) require the calendar entity.
- **Calendar is read-only** — events generated dynamically, no stored calendar events
- **Status events**: fires `chore_calendar_status_changed` on state transitions

### State Machine

- **Scheduled**: `completed -> pending -> due -> overdue -> completed` (4 states, active days filter)
  - Newly created chores start as `completed` until the first pending window opens
  - Overdue chores stay pinned to the uncompleted period — `next_due` does not advance until completed
- **Interval**: `completed -> due -> overdue -> completed` (3 states)
  - Never-completed chores are always `due`
- **Oneshot** (Phase 4): `pending -> due -> overdue -> completed [terminal]`

### Target Module Layout

This integration uses **flat modules** rather than the template's sub-package structure, because there is no external API client — all data is local `.storage/` files.

```text
custom_components/chore_calendar/
    __init__.py       # Integration setup; register services in async_setup() (not async_setup_entry)
    config_flow.py    # Config flow + reconfigure flow — list name only (no credentials)
    const.py          # Constants, enums, defaults
    models.py         # BaseChore, ScheduledChore, IntervalChore dataclasses
    store.py          # Persistent storage (.storage/chore_calendar.{entry_id})
    coordinator.py    # DataUpdateCoordinator — 60s state computation
    sensor.py         # ChoreSensorEntity platform
    calendar.py       # ChoreCalendarListEntity platform (read-only event generation)
    services.py       # Service handlers (CRUD, complete, skip)
    services.yaml     # Service descriptions for HA UI
    triggers.py       # Internal trigger listener (Phase 2)
    manifest.json
    translations/en.json
    www/              # Built Lovelace card JS (copied from card/ build)
card/                 # Lovelace card source (Lit 3.x, TypeScript, Rollup)
    src/              # Card source files
    package.json      # npm dependencies and build script
    rollup.config.mjs # Rollup bundler config
    tsconfig.json     # TypeScript config
```

The template generated sub-packages (`api/`, `config_flow_handler/`, `coordinator/`, `entity/`, `service_actions/`) — those do **not** apply here.

### Key HA Patterns to Follow

- **Services registration:** `async_setup()`, NOT `async_setup_entry()` (Quality Scale requirement)
- **Config entry data access:** `entry.runtime_data` (typed `ChoreCalendarData`)
- **Entity MRO:** `(PlatformEntity, ChoreCalendarEntity)` — order matters
- **Unique ID:** `{entry_id}_{chore_id}` (chore sensors); base entity sets `_attr_unique_id`

## Workflow Rules

- **Tests:** Do NOT write tests unless explicitly requested.
- **Docs:** Do NOT create markdown files without explicit permission. Extend existing docs rather than creating new files.
- **Translations:** Business logic first; update `translations/en.json` only when asked or at feature completion. Never update other language files automatically — ask first.
- **Scope:** Implement features completely (e.g., new sensor needs entity class + platform init + descriptions — all at once). For multiple independent features, do one at a time and suggest a commit between each.
- **Large changes:** For refactors touching >10 files or architectural changes, propose a plan and get explicit confirmation before starting.
- **Research first:** Don't guess HA patterns — look them up at [developers.home-assistant.io](https://developers.home-assistant.io/). HA evolves rapidly; verify current best practices.
