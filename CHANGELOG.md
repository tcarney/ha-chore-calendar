<!-- markdownlint-disable MD012 MD024 -->

# Changelog

## [0.10.0](https://github.com/tcarney/ha-chore-calendar/compare/chore_calendar-v0.9.0...chore_calendar-v0.10.0) (2026-05-02)


### Features

* 'pending' initial state for interval and scheduled chores ([a80e927](https://github.com/tcarney/ha-chore-calendar/commit/a80e927bde2658f516ddbb2fd2e01ea45c0d8b43))
* bump version to v0.6.0 for todo-entity ([6760901](https://github.com/tcarney/ha-chore-calendar/commit/6760901f86a0c73d2c6dd0d7b3c04f31556d5655))
* card due_date_period and completed_period filters ([733c813](https://github.com/tcarney/ha-chore-calendar/commit/733c813dd789fae47253e1f39733b6072bb26573))
* chore_calendar_item_deleted event ([45151f8](https://github.com/tcarney/ha-chore-calendar/commit/45151f8ad8b4fd81d6a2947ed272a0db8c3e4dd5))
* Core integration — models, store, coordinator, sensors, calendar, services, tag triggers ([3b283e9](https://github.com/tcarney/ha-chore-calendar/commit/3b283e9f6fc869dd3601d3a8958b19d00e6873d0))
* events definition cleanup ([110ecfa](https://github.com/tcarney/ha-chore-calendar/commit/110ecfa8e123ab675dbe229bb036c55f1c26e626))
* events vocabulary cleanup ([0a40970](https://github.com/tcarney/ha-chore-calendar/commit/0a40970027dfa7afe285b6ba00d5a0c8d93d31de))
* hide_completed_items service and oneshot persist option ([c6cc2ba](https://github.com/tcarney/ha-chore-calendar/commit/c6cc2ba9668268800ffd92d14acd1094661fee75))
* include pending chores in todo list ([e5ed700](https://github.com/tcarney/ha-chore-calendar/commit/e5ed7004a921261eeacf636f67cec8db42778ff2))
* Lovelace card — timeline view, detail dialog, configurable actions, visual editor ([3812833](https://github.com/tcarney/ha-chore-calendar/commit/3812833e1090b8e104844b129779b2cc8768d9d7))
* oneshot chore type ([fb80f8a](https://github.com/tcarney/ha-chore-calendar/commit/fb80f8a5c0615895ef4815ec9a1ab8dabbb02864))
* Oneshot Chore Type ([b08e9b7](https://github.com/tcarney/ha-chore-calendar/commit/b08e9b7f6026c172f255b0550278fd8839074765))
* promote pending_period to BaseChore ([c7f37c6](https://github.com/tcarney/ha-chore-calendar/commit/c7f37c617f8549cf8bef6684bf7209df2d0582b8))
* push calendar event updates after CRUD actions ([c7932d6](https://github.com/tcarney/ha-chore-calendar/commit/c7932d6a0f6553e514775f33cc6ce5c17a0d84df))
* replace chore_id with system-generated UUID ([25a6dbb](https://github.com/tcarney/ha-chore-calendar/commit/25a6dbb5b46e8e4f3f5cee0c5bd93d764bd8ce9a))
* Skip Action ([1db969a](https://github.com/tcarney/ha-chore-calendar/commit/1db969a2b569fc396cb592c48cde979a9d0d1feb))
* skip_item service, card affordance, and keep_skip on complete ([4780ee1](https://github.com/tcarney/ha-chore-calendar/commit/4780ee118e4f20b882b1d49c46b44e5eb8b3d849))
* Todo Entity ([ab09477](https://github.com/tcarney/ha-chore-calendar/commit/ab094770c5cba1a640725a4bf13a3bb86904a0f6))
* todo entity platform ([42abdb0](https://github.com/tcarney/ha-chore-calendar/commit/42abdb01403d2c27c7f3f72e87d5bfb647ad2933))
* uncomplete_item service and card affordance ([9f07713](https://github.com/tcarney/ha-chore-calendar/commit/9f077134f8729acfd0cf8901f6450619909cb574))
* uncomplete_item service and card affordance ([39f6d8f](https://github.com/tcarney/ha-chore-calendar/commit/39f6d8f3f1a15c46c3962dd8600689bb07ea4740)), closes [#1](https://github.com/tcarney/ha-chore-calendar/issues/1)
* unified initial state, pending period, clean-up ([e1496f3](https://github.com/tcarney/ha-chore-calendar/commit/e1496f384f09dc18ef2c93da435d41bb824a2f4c))
* zero-duration calendar events with state override ([f933a24](https://github.com/tcarney/ha-chore-calendar/commit/f933a2408c086921bcd23b678b9449a1fc79264f))


### Bug Fixes

* await event delivery in oneshot default-skip test ([02b92d9](https://github.com/tcarney/ha-chore-calendar/commit/02b92d95ccc7519e99079198f8ae19332cdbe0f1))
* drop unsupported keys from hacs.json ([15f1b9a](https://github.com/tcarney/ha-chore-calendar/commit/15f1b9a20a954323a159c1c90a67ccfb11f05768))
* drop unused locale parameter from getTimeText ([fb63301](https://github.com/tcarney/ha-chore-calendar/commit/fb6330159dda7f2c7666a59fabcf6be14c0362c8))
* route tag-scan through apply_completion, validate update_item type, drop NotImplementedError trap ([4569c79](https://github.com/tcarney/ha-chore-calendar/commit/4569c79c72b7473134216345e8135d5db92c7790))


### Code Refactoring

* bind calendar listener notifier to coordinator update lifecycle ([0f18ae2](https://github.com/tcarney/ha-chore-calendar/commit/0f18ae2888d0d7c4b334dd17d5bcbcb688119123))
* consolidate chore window math into BaseChore ([fe112a2](https://github.com/tcarney/ha-chore-calendar/commit/fe112a200593a814794540d1aff19c5b4eec706e))
* datetime selectors + polish service strings ([789785a](https://github.com/tcarney/ha-chore-calendar/commit/789785a8b4a7e373535dd451db14f500b193d9bd))
* dedupe DeviceInfo construction and tag entity_id resolution ([dbcdef0](https://github.com/tcarney/ha-chore-calendar/commit/dbcdef0f0fe05837301e74f85903195e624482e9))
* deduplicate skip-anchor, schedule_description, and update_item overlay ([55e378f](https://github.com/tcarney/ha-chore-calendar/commit/55e378ffb72f5afa0e0bf4e93ab8b9c954f3a853))
* drop card options completed_limit and hide_pending ([75b1809](https://github.com/tcarney/ha-chore-calendar/commit/75b1809ada6a4d69380b6e2b0e4bde9912378a95))
* drop unused _RESOURCE_TRACKER hass.data key ([b9afbfb](https://github.com/tcarney/ha-chore-calendar/commit/b9afbfb54228cddcf419a5f2bc6d55175db59ecf))
* extract chore-mutation primitives into actions.py ([00d25bf](https://github.com/tcarney/ha-chore-calendar/commit/00d25bf8f152c7aa4a26c51dcf29359e394efd66))
* introduce apply_default_skip for type-specific skip behavior ([67d59a4](https://github.com/tcarney/ha-chore-calendar/commit/67d59a4acac67caa2848dd2b0b65fb2a4d09c8b2))
* notifier lifecycle, dead code, docs ([57f0689](https://github.com/tcarney/ha-chore-calendar/commit/57f068964ad843d2bc26208e0b876aeec3a1d797))
* rename card config options from show_* to hide_* pattern ([010a9ff](https://github.com/tcarney/ha-chore-calendar/commit/010a9ff0527f14ef51c11d14b12c2db960b65774))
* replace oneshot synth-due rule with explicit terminal flag ([cf0daae](https://github.com/tcarney/ha-chore-calendar/commit/cf0daae1847b61928033897e96d6e3b4301efa0f))
* restructure models + cleanup ([d6ffe88](https://github.com/tcarney/ha-chore-calendar/commit/d6ffe88350c08eefc484ed11372fea4d8ad49f64))
* split models.py into models/ sub-package ([2d6b63f](https://github.com/tcarney/ha-chore-calendar/commit/2d6b63f1a6e7b3af8641c81a71fd6fd745d5896c))


### Build System

* source card version from integration manifest ([bd1b8f6](https://github.com/tcarney/ha-chore-calendar/commit/bd1b8f656aa4bb8b88a2e06b3d45ebc89c84cde2))


### Continuous Integration

* add release-please automation and HACS validation ([9e08304](https://github.com/tcarney/ha-chore-calendar/commit/9e083046b2dcc68e0f198fb6f2e4c70035299d77))
* add release-please automation and HACS validation ([8ec878a](https://github.com/tcarney/ha-chore-calendar/commit/8ec878ad98789426ecbf78723ba8f501b1f0090f))
* simplify pre-commit + add GitHub Actions workflow ([634b70a](https://github.com/tcarney/ha-chore-calendar/commit/634b70ab9ca08dd1560f9d0d68e58d6af42e774a))


### Documentation

* add icon to README for release ([8ec878a](https://github.com/tcarney/ha-chore-calendar/commit/8ec878ad98789426ecbf78723ba8f501b1f0090f))
* clarify tag-seeded chore initial status ([9ed5413](https://github.com/tcarney/ha-chore-calendar/commit/9ed54137604d1f8f1a6cbdaa8e5a552db737857d))
* Documentation cleanup, branding, and version bump to 0.2.0 ([37167bc](https://github.com/tcarney/ha-chore-calendar/commit/37167bcc883fa7ce956fb368a56546cd5d5f60e2))
* fix stale entity / TypeScript references in CLAUDE and SPECS ([4e9cdf3](https://github.com/tcarney/ha-chore-calendar/commit/4e9cdf34ac09a07e675331039b71f72fb6d6c689))
* refresh for pending_period, initial-state, and update_item type-lock ([c8fcaae](https://github.com/tcarney/ha-chore-calendar/commit/c8fcaae3064583780262b2247745a999a9e843c8))

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
