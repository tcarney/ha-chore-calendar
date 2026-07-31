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
- **Internal models**: "chore" (`BaseChore`, `ScheduledChore`, `IntervalChore`, `OneshotChore`) — domain-specific
- **Domain**: `chore_calendar`, **Class prefix**: `ChoreCalendar`
- **Entities** (per config entry / list): `calendar.daily_chores` (one per list), `todo.daily_chores` (one per list), `sensor.daily_chores_<chore_name>` (one per chore). Sensor unique_id: `{entry_id}_{uid}` where uid is a standard UUID. Calendar/todo unique_id: `{entry_id}` / `{entry_id}_todo`.
- **Services over entities** for all mutations. Single-chore services accept either a sensor entity_id (chore inferred) or calendar entity_id + explicit `item` (name or UID). List-level services require the calendar entity.
- Flat modules where practical; the only sub-package is `models/` (one file per chore type). Services registered in `async_setup()`, not `async_setup_entry()`. Card source in `card/`, built JS copied to `custom_components/chore_calendar/www/`.

### Key HA Patterns

- **Services registration:** `async_setup()`, NOT `async_setup_entry()` (Quality Scale requirement)
- **Config entry data access:** `entry.runtime_data` (typed `ChoreCalendarData`)
- **Entity MRO:** `(CoordinatorEntity[ChoreCalendarCoordinator], <PlatformEntity>)` — `CoordinatorEntity` first so coordinator updates drive state; concrete platform (`CalendarEntity`, `SensorEntity`, `TodoListEntity`) second.

## Workflow Rules

- **Tests:** Write tests for new features and bug fixes. Follow existing test patterns in the `tests/` directory.
- **Docs:** Do NOT create markdown files without explicit permission. Extend existing docs rather than creating new files.
- **Translations:** Business logic first; update `translations/en.json` only when asked or at feature completion. `strings.json` and `translations/en.json` must stay byte-for-byte identical — `script/check` diffs them and fails on drift. Never update other language files automatically — ask first.
- **Scope:** Implement features completely (e.g., new sensor needs entity class + platform init + descriptions — all at once). For multiple independent features, do one at a time and suggest a commit between each.
- **Large changes:** For refactors touching >10 files or architectural changes, propose a plan and get explicit confirmation before starting.
- **Research first:** Don't guess HA patterns — look them up at [developers.home-assistant.io](https://developers.home-assistant.io/). HA evolves rapidly; verify current best practices.

## AI Contribution Policy

This project follows the [Open Home Foundation AI policy](https://developers.home-assistant.io/docs/ai_policy/). It applies to work in this repo and to anything upstreamed to Home Assistant core, HACS, or other OHF projects.

- **Human in the loop.** Every change must be reviewed and understood by the maintainer before it ships — they have to be able to explain each one in their own words. Keep diffs small and reviewable; surface non-obvious decisions and trade-offs in the summary instead of burying them in the diff.
- **No autonomous GitHub activity.** Never open or update issues, PRs, comments, or reviews without explicit approval for that specific action. Draft the text, hand it over for review — the maintainer posts it. This holds even when a `gh` command would obviously work.
- **PR descriptions and comments:** written in the maintainer's voice, as short as the intent allows, technically accurate. No AI boilerplate, no filler headings, no marketing tone. If a summary is AI-drafted, flag that it needs a technical-accuracy pass before posting.
- **Never draft answers to maintainer questions.** Supply the facts and reasoning; the maintainer writes the reply. Grammar and clarity help is fine — substance must be theirs.
- **Disclose quoted AI output.** If AI output belongs in a comment, keep it short, put it in a `>` quote block, label it as AI-generated, and pair it with the maintainer's own commentary on why it matters.
- **Treat AI review comments as fallible** — including bots on this repo's PRs. Verify each claim against the code before acting on it; a brief explanation is enough to push back. Maintainers have the final say.
- **Upstream contributions** follow the target repo's issue/PR templates rather than bypassing them — bypassing a template is itself treated as a sign of automation.

Commits keep the `Co-Authored-By` trailer: attribution is disclosure, not a substitute for review.
