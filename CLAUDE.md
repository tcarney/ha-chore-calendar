# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Project Overview

**Chore Calendar** (domain `chore_calendar`) is a Home Assistant custom integration for recurring household chores, distributed through HACS. Core integration and card are complete.

- `README.md`: user-facing documentation. Features, install, chore model, services, card configuration, events.
- `SPECS.md`: design specification. Design decisions, state machines, storage schema, card internals.

Do not restate the contents of those files here. Point to them.

## Development Commands

Always use project scripts. Never run `hass`, `pip`, or `pytest` directly.

```bash
script/check                          # Full validation (type-check + lint + spell). Run before committing.
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
script/card/dev                       # Watch mode: rebuild card on source changes
script/card/clean                     # Remove card node_modules/ and dist/
```

Restart HA after modifying Python files, `manifest.json`, `services.yaml`, translations, or the config flow. Force restart:

```bash
pkill -f "hass --config" || true && pkill -f "debugpy.*5678" || true && ./script/develop
```

Logs appear in the terminal running `./script/develop` and in `config/home-assistant.log`. Debug logging is enabled by the `logger` block shown in the README's Troubleshooting section, added to `config/configuration.yaml`.

## Code Style

- Target the HA [Integration Quality Scale](https://developers.home-assistant.io/docs/core/integration-quality-scale/) platinum tier
- Python 3.14+, 4 spaces, 120 char lines, double quotes, full type hints, async for all I/O
- YAML: 2 spaces, modern HA syntax (no legacy `platform:` style). JSON: 2 spaces, no trailing commas
- Ruff for linting (matches HA core config), Pyright basic mode for type checking
- Google-style docstrings. Comments are complete sentences with capitalization and an ending period
- Import aliases: `voluptuous` as `vol`, `homeassistant.helpers.config_validation` as `cv`, `homeassistant.util.dt` as `dt_util`
- Import order: `from __future__ import annotations`, then stdlib, third-party, HA core, local
- Commit messages: Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`)
- Tests: `pytest` with `asyncio_mode = auto`, using `pytest-homeassistant-custom-component` fixtures
- File size: target 200 to 400 lines, split at about 500

**Never suppress checks with blanket ignores.** Use specific codes with reasons: `# noqa: F401 - reason` or `# type: ignore[attr-defined] - reason`.

## Architecture

`SPECS.md` is the reference for architecture, naming, entity model, and storage. The rules below are the ones most often needed while writing code.

- **Naming:** public API (services, events) says "item" (`create_item`, `complete_item`). Internal models say "chore" (`BaseChore`, `ScheduledChore`, `IntervalChore`, `OneshotChore`). Class prefix is `ChoreCalendar`.
- **Mutations go through services**, never entities. Single-chore services accept a sensor entity_id (chore inferred) or a calendar entity_id plus `item` (name or UID). List-level services require the calendar entity.
- **Layout:** flat modules. The only sub-package is `models/` (one file per chore type). Card source lives in `card/`, and the built JS is copied to `custom_components/chore_calendar/www/`.
- **Service registration:** in `async_setup()`, never `async_setup_entry()` (Quality Scale requirement).
- **Config entry data:** `entry.runtime_data`, typed `ChoreCalendarData`.
- **Entity MRO:** `(CoordinatorEntity[ChoreCalendarCoordinator], <PlatformEntity>)`. `CoordinatorEntity` comes first so coordinator updates drive state. The concrete platform (`CalendarEntity`, `SensorEntity`, `TodoListEntity`) comes second.

## Workflow Rules

- **Tests:** write tests for new features and bug fixes. Follow the existing patterns in `tests/`.
- **Docs:** do not create markdown files without explicit permission. Extend existing docs.
- **Translations:** business logic first. Update `translations/en.json` only when asked or at feature completion. `strings.json` and `translations/en.json` must stay byte-for-byte identical. `script/check` diffs them and fails on drift. Never update other language files without asking first.
- **Scope:** implement features completely. A new sensor needs the entity class, platform init, and descriptions in one change. For multiple independent features, do one at a time and suggest a commit between each.
- **Large changes:** for refactors touching more than 10 files, or architectural changes, propose a plan and get explicit confirmation before starting.
- **Research first:** do not guess HA patterns. Look them up at [developers.home-assistant.io](https://developers.home-assistant.io/). HA evolves rapidly, so verify current best practices.

## AI Contribution Policy

This project follows the [Open Home Foundation AI policy](https://developers.home-assistant.io/docs/ai_policy/). It applies to work in this repo and to anything upstreamed to Home Assistant core, HACS, or other OHF projects.

- **Human in the loop.** The maintainer reviews and understands every change before it ships, and must be able to explain each one in their own words. Keep diffs small and reviewable. Surface non-obvious decisions and trade-offs in the summary, never only in the diff.
- **No autonomous GitHub activity.** Never open or update issues, PRs, comments, or reviews without explicit approval for that specific action. Draft the text and hand it over. The maintainer posts it. This holds even when a `gh` command would obviously work.
- **PR descriptions and comments** are written in the maintainer's voice, as short as the intent allows, and technically accurate. No AI boilerplate, no filler headings, no marketing tone. If a summary is AI-drafted, flag that it needs a technical-accuracy pass before posting.
- **Never draft answers to maintainer questions.** Supply the facts and reasoning. The maintainer writes the reply. Grammar and clarity help is fine. The substance must be theirs.
- **Disclose quoted AI output.** If AI output belongs in a comment, keep it short, put it in a `>` quote block, label it as AI-generated, and pair it with the maintainer's own commentary on why it matters.
- **Treat AI review comments as fallible**, including bots on this repo's PRs. Verify each claim against the code before acting on it. A brief explanation is enough to push back. Maintainers have the final say.
- **Upstream contributions** follow the target repo's issue and PR templates. Bypassing a template is itself treated as a sign of automation.

Commits keep the `Co-Authored-By` trailer. Attribution is disclosure, and never a substitute for review.
