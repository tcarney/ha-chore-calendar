# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Home Assistant custom integration called **Chore Calendar** (domain: `chore_calendar`) that manages recurring household chores. Each chore list is added through Settings > Integrations (like `local_calendar` or `local_todo`), with chores managed via services. Provides native sensor/calendar entities, service-based CRUD, and built-in trigger handling. Intended for HACS distribution.

**Current state:** Core integration and card complete. See `README.md` for features and usage.

**Key files:**

- `README.md` — User-facing documentation (features, install, service examples, card config)
- `SPECS.md` — Design specification (architecture, state machines, storage schema, card design)

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

- Target the HA [Integration Quality Scale](https://developers.home-assistant.io/docs/core/integration-quality-scale/) platinum tier
- Python 3.14+, 4 spaces, 120 char lines, double quotes, full type hints, async for all I/O
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

See `SPECS.md` for full architecture details (data flow, state machines, storage schema).

### Key Conventions

- **Public API**: "item" (`create_item`, `complete_item`) — matches HA `todo` pattern
- **Internal models**: "chore" (`BaseChore`, `ScheduledChore`) — domain-specific
- **Domain**: `chore_calendar`, **Class prefix**: `ChoreCalendar`
- **Entities**: `calendar.daily_chores` (one per list), `sensor.daily_chores_morning_medicine` (one per chore). Unique ID: `{entry_id}_{chore_id}`.
- **Services over entities** for all mutations. Single-chore services accept either a sensor entity_id (chore_id inferred) or calendar entity_id + explicit chore_id. List-level services require the calendar entity.
- Flat modules (no sub-packages). Services registered in `async_setup()`, not `async_setup_entry()`. Card source in `card/`, built JS copied to `custom_components/chore_calendar/www/`.

### Key HA Patterns

- **Services registration:** `async_setup()`, NOT `async_setup_entry()` (Quality Scale requirement)
- **Config entry data access:** `entry.runtime_data` (typed `ChoreCalendarData`)
- **Entity MRO:** `(PlatformEntity, ChoreCalendarEntity)` — order matters
- **Unique ID:** `{entry_id}_{chore_id}` (chore sensors); base entity sets `_attr_unique_id`

## Workflow Rules

- **Tests:** Write tests for new features and bug fixes. Follow existing test patterns in the `tests/` directory.
- **Docs:** Do NOT create markdown files without explicit permission. Extend existing docs rather than creating new files.
- **Translations:** Business logic first; update `translations/en.json` only when asked or at feature completion. Never update other language files automatically — ask first.
- **Scope:** Implement features completely (e.g., new sensor needs entity class + platform init + descriptions — all at once). For multiple independent features, do one at a time and suggest a commit between each.
- **Large changes:** For refactors touching >10 files or architectural changes, propose a plan and get explicit confirmation before starting.
- **Research first:** Don't guess HA patterns — look them up at [developers.home-assistant.io](https://developers.home-assistant.io/). HA evolves rapidly; verify current best practices.
