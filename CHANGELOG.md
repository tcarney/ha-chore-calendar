<!-- markdownlint-disable MD012 MD024 -->

# Changelog

## [0.11.0](https://github.com/tcarney/ha-chore-calendar/compare/v0.10.1...v0.11.0) (2026-07-05)


### ⚠ BREAKING CHANGES

* create_item/update_item require the structured scheduled:/ interval: selectors; the legacy {time, active_days} and {days: N} shapes are rejected. Stored data is migrated automatically. The calendar entity now emits future occurrences of scheduled chores instead of only the next due marker.

### Features

* chore create/edit/delete from the lovelace card ([#30](https://github.com/tcarney/ha-chore-calendar/issues/30)) ([cfdb5f7](https://github.com/tcarney/ha-chore-calendar/commit/cfdb5f7e64446fc46ba7be2c82545ed6991b5c9b))
* RRULE-based recurrence model ([#29](https://github.com/tcarney/ha-chore-calendar/issues/29)) ([f8e1929](https://github.com/tcarney/ha-chore-calendar/commit/f8e19291c3ae677d9f555895b033f253327248dc))


### Documentation

* updated dashboard image to use theme, added a chore-calendar only card image ([39a1bf2](https://github.com/tcarney/ha-chore-calendar/commit/39a1bf2b97352e5d35cbd78abbf449a3d270231f))


### Miscellaneous Chores

* release v0.11.0 ([c7a4783](https://github.com/tcarney/ha-chore-calendar/commit/c7a478317c3cdc4b27b54e0081d74c30057430b3))

## [0.10.1](https://github.com/tcarney/ha-chore-calendar/compare/v0.10.0...v0.10.1) (2026-05-28)


### Bug Fixes

* follow-up default skip during pending advances by one occurrence ([#24](https://github.com/tcarney/ha-chore-calendar/issues/24)) ([555f27b](https://github.com/tcarney/ha-chore-calendar/commit/555f27b94989781e31d07da11a15b05bdb5b1475))
* migrate card editor period inputs from ha-textfield to ha-input ([#25](https://github.com/tcarney/ha-chore-calendar/issues/25)) ([0470ae2](https://github.com/tcarney/ha-chore-calendar/commit/0470ae2fc5421b39d645761225e29525264057f9))


### Documentation

* add README screenshots with demo data scripts ([#26](https://github.com/tcarney/ha-chore-calendar/issues/26)) ([cb8b79a](https://github.com/tcarney/ha-chore-calendar/commit/cb8b79aa520faf98c095629dd5712fb654512f13))

## [0.10.0](https://github.com/tcarney/ha-chore-calendar/compare/v0.9.0...v0.10.0) (2026-05-22)


### Features

* **card:** render placeholder row when no chores are visible ([#21](https://github.com/tcarney/ha-chore-calendar/issues/21)) ([3004421](https://github.com/tcarney/ha-chore-calendar/commit/3004421ded00a4c4d1753922a43fa720d80ae8ee))


### Bug Fixes

* keep skipped_until as operative anchor through OVERDUE ([#20](https://github.com/tcarney/ha-chore-calendar/issues/20)) ([8e0d087](https://github.com/tcarney/ha-chore-calendar/commit/8e0d087b2485e793009f72ba520ecc5e78b2bd60))

## 0.9.0 (2026-05-01)


### Features

* Add `chore_calendar_item_created` event mirroring `chore_calendar_item_deleted` so the CRUD lifecycle pair is symmetric.
* Add `source` field on `chore_calendar_status_changed` describing why the status changed (`schedule`, `complete`, `uncomplete`, `skip`, `update`, `tag`), replacing the prior `uncomplete: true` boolean.
* Add `entity_id` field on `chore_calendar_status_changed`.


### Bug Fixes

* Drop unsupported keys (`iot_class`, `render_readme`) from `hacs.json` so the HACS validator accepts the integration.


### Build System

* Source card version from the integration manifest at build time, keeping the two in lockstep.


### Continuous Integration

* Add release-please automation that opens release PRs from conventional commits, auto-bumps `manifest.json`, and maintains this changelog.
* Add `validate` workflow running hassfest and HACS validation on push, PR, and a daily schedule.

## 0.8.0 (2026-04-29)


### Features

* Initial `pending` state for interval and scheduled chores. Never-completed interval chores read as unscheduled `pending` until first completion anchors the cycle; never-completed scheduled chores pin to the first active-day period at or after creation and progress `pending → due → overdue` until first completion.
* Promote `pending_period` (renamed from `early_window`) and `grace_period` to top-level `BaseChore` fields with a uniform 3-hour default across all chore types. Storage schema migrates to v3 to lift the keys.


### Code Refactoring

* `update_item` rejects requests that would change a chore's type and points users at delete + re-create.
* Replace oneshot synth-due rule with an explicit `terminal` flag; setting `due_datetime` via `update_item` clears the flag and re-enters the cycle.

## 0.7.0 (2026-04-26)


### Features

* Add `OneshotChore` chore type — a non-recurring chore with an optional `due_datetime` that can be rescheduled via `update_item`.
* Add `chore_calendar.hide_completed_items` service with mutually exclusive `at` (specific cutoff) and `keep_for` (now − duration) parameters. Sets a per-list `completed_cleared_at` cutoff; calendar and todo entities omit completed items whose `last_completed` precedes it.
* Add oneshot `persist` option (default `false`). On a hide-completed sweep, `persist=false` oneshots are removed from storage; `persist=true` oneshots are merely hidden so they remain reactivatable via `update_item`. Recurring chores ignore the option.
* Add `chore_calendar_item_deleted` event fired when chores are removed.
* Todo entity advertises `DELETE_TODO_ITEM`: `todo.remove_completed_items` triggers a `persist=false` sweep at the current time, and `todo.remove_item` maps to `chore_calendar.delete_item`.
* Calendar events refresh without a browser reload after CRUD actions, via `CalendarEntity.async_update_event_listeners` (Home Assistant 2026.3.1+; no-op on older releases).

## 0.6.0 (2026-04-25)


### Features

* Add todo entity platform — each chore list now exposes a `todo.<name>` entity alongside its calendar and per-chore sensors. Pending, due, and overdue chores map to `needs_action`; completed chores map to `completed`. Bucket order is overdue → due → pending → completed, sorted by `next_due`. Toggling an item routes through the same paths as `complete_item` / `uncomplete_item`. Schedule editing stays on the `chore_calendar.*` services (not advertised as `UPDATE_TODO_ITEM`).
* Add card filters `due_date_period` and `completed_period` (`{days, hours}` durations). `due_date_period` hides pending chores whose `next_due` is further out than the period (overdue/due always shown, unscheduled pending hidden when set); `completed_period` hides completed chores whose `last_completed` is older than the period.
* Calendar due events are now zero-duration markers at the due time, not spans from `due_at` to `overdue_at`. The list entity overrides `state` to report `on` whenever any chore is `due` or `overdue`, keeping the entity usable as an automation condition.

## 0.5.0 (2026-04-21)


### Features

* Add `chore_calendar.skip_item` service — defers a chore's next occurrence without touching `last_completed`. `skipped_until` becomes the operative next-due anchor; the existing pending/grace state machine runs around it.
* Add Skip button to the card detail dialog, alongside Complete.
* Add `keep_skip` option on `complete_item` to preserve an active skip through an early completion. `uncomplete_item` symmetrically restores a cleared skip.
* `script/check` enforces byte-for-byte parity between `strings.json` and `translations/en.json`.

## 0.4.0 (2026-04-14)


### Features

* Add `chore_calendar.uncomplete_item` service — one-level undo for completions. The chore stores a `previous_last_completed` slot refreshed on every complete and cleared on uncomplete.
* Add card `allow_uncomplete` option that surfaces an Uncomplete button on completed rows in the detail dialog.


### Continuous Integration

* Add GitHub Actions workflow.

## 0.3.0 (2026-04-14)


### Features

* Chore identifiers are now system-generated UUIDs (standard dashed format) instead of user-provided or auto-slugified slugs. The `chore_id` service parameter is replaced by `item`, which accepts either a chore name or a UID. Entity-registry `unique_id`s are migrated automatically so existing entity IDs and automations are preserved.


### Code Refactoring

* Card config options follow a `hide_*` naming convention, aligning with native HA todo card conventions. Header visibility is now driven by the `title` field.

## 0.2.0 (2026-04-09)


### Documentation

* Restructure README around new-user onboarding; trim SPECS of completed phases and recast as a roadmap.
* Add branding assets.

## 0.1.0 (2026-04-09)


### Features

* Core integration with **scheduled** and **interval** chore types, status state machines, persistent storage, a 60-second coordinator cycle, per-chore sensor entities, a per-list calendar entity, service-based CRUD, tag-scan auto-completion, status-transition events, translations, and diagnostics.
* Lovelace card built with Lit 3 + TypeScript: unified timeline with status sections, per-entity color bars and exclude filters, `ha-dialog` detail pop-up with a complete button, tap/hold/double-tap gesture handling, and a full visual config editor.
