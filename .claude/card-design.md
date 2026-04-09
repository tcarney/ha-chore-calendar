# Chore Calendar Card — Design Spec

## Overview

A custom Lovelace card (`chore-calendar-card`) that displays chores from one or more `chore_calendar` lists in a unified timeline view. Built with **Lit 3** + **TypeScript** + native `Intl` APIs, bundled with **Rollup** into a single JS file. Lives in this monorepo under `card/` — tightly coupled to the integration for simpler distribution and versioning.

---

## Visual Design

### Timeline View

Chores from all configured lists are merged into a single timeline, sorted by urgency. When multiple lists are configured, a colored left bar distinguishes which list each chore belongs to.

```
┌─────────────────────────────────────────────────────┐
│  Chores                                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ── Overdue ────────────────────────────────────── │
│  ▌ ● Morning Medicine                 2 hours ago  │
│  ▌ ● Clean Bathroom                   1 day ago    │
│                                                     │
│  ── Due ────────────────────────────────────────── │
│  ▌ ● Take Out Trash                   now          │
│                                                     │
│  ── Upcoming ───────────────────────────────────── │
│  ▌ ○ Evening Vitamins                 in 4 hours   │
│  ▌ ○ Vacuum Living Room              in 2 days     │
│                                                     │
│  ── Completed ──────────────────────────────────── │
│  ▌ ✓ Make Bed                         8:15 AM      │
│  ▌ ✓ Mow Lawn                        Yesterday    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Row Anatomy

```
┌──┬───┬──────────────────────────┬──────────────┐
│▌ │ ● │ Chore Name               │ relative time│
│  │   │                          │              │
└──┴───┴──────────────────────────┴──────────────┘
 3px  icon   primary text            secondary text
 bar  16px   (flex: 1)              (right-aligned)
```

- **Left color bar** (3px): only rendered when `entities` has 2+ lists. Color is configurable per list, auto-assigned from a default palette if omitted.
- **Status indicator**: small colored dot/icon (no MDI icon import — pure CSS circles/SVG check).
- **Chore name**: primary text, single line with ellipsis overflow.
- **Relative time**: secondary text, right-aligned, muted color.
  - Overdue: "2 hours ago", "1 day ago" (via `Intl.RelativeTimeFormat`)
  - Due: "now"
  - Pending: "in 4 hours", "in 2 days"
  - Completed: time if today ("8:15 AM"), "Yesterday", or date ("Mar 28")
- **Completed rows**: reduced opacity (0.6), strikethrough optional.

### Section Headers

Chores are grouped under status section headers:

| Section       | Contains           | Header style            | Sort                                          |
|---------------|--------------------|-------------------------|-----------------------------------------------|
| **Overdue**   | `overdue` chores   | Red text, bold          | `next_due` ascending (most overdue first)     |
| **Due**       | `due` chores       | Amber text              | `next_due` ascending                          |
| **Upcoming**  | `pending` chores   | Default secondary text  | `next_due` ascending (soonest first)          |
| **Completed** | `completed` chores | Muted                   | `last_completed` descending (most recent first) |

Empty sections are hidden. The Completed section is capped at `completed_limit` rows (default 3); items beyond the limit are not shown. Set `completed_limit` to `0` to show all completed items. When `show_completed` is `false`, the entire section is hidden.

### Status Indicators (CSS-only)

| Status    | Indicator                    | Color                          |
|-----------|------------------------------|--------------------------------|
| Overdue   | Filled circle                | `var(--error-color)`           |
| Due       | Filled circle                | `var(--warning-color)`         |
| Pending   | Hollow circle (ring)         | `var(--secondary-text-color)`  |
| Completed | Checkmark (SVG inline)       | `var(--success-color)`         |

### Theming

- All colors via HA CSS custom properties — automatic dark/light mode support.
- `ha-card` wrapper for standard HA card appearance.
- Container queries for responsive behavior (compact row height on narrow columns).

---

## Data Source

### Primary: `chore_calendar.get_items` service

Called via `hass.callWS` (WebSocket service call with response):

```typescript
const response = await hass.callService(
  'chore_calendar', 'get_items',
  { entity_id: 'calendar.daily_chores' },
  undefined, false, true  // returnResponse
);
// response = { items: [...] }
```

Called once per configured entity. Results merged client-side into the unified timeline.

Response shape per item:
```typescript
interface ChoreItem {
  chore_id: string;
  chore_name: string;
  chore_type: 'scheduled' | 'interval';
  status: 'completed' | 'pending' | 'due' | 'overdue';
  next_due: string | null;       // ISO 8601
  last_completed: string | null; // ISO 8601
  last_completed_by: string | null;
  assigned_to: string[];
  trigger_entity: string | null;
  schedule: string;              // Human-readable description
}
```

### Refresh Strategy

1. **Poll**: every `update_interval` seconds (default 60, matches coordinator cycle).
2. **Event-driven**: subscribe to `state_changed` events filtered to configured entity IDs for instant updates on state transitions.
3. **Post-action**: force refresh after any service call from the card (Phase B+).

### Why `get_items` over entity states?

- Single call per list returns all chores with pre-computed status and next_due.
- No need to subscribe to N individual sensor entities.
- Returns schedule descriptions and completion metadata.
- Server-side status filtering for single-status queries.

---

## Configuration

### Minimal
```yaml
type: custom:chore-calendar-card
entities:
  - calendar.daily_chores
```

### Full
```yaml
type: custom:chore-calendar-card
title: "Chores"
entities:
  - entity: calendar.daily_chores
    color: "#4285F4"
    exclude:                  # Per-entity status filter (default: [] — show all)
      - completed
  - entity: calendar.weekly_chores
    color: "#EA4335"
show_header: true           # Show card title bar (default: true)
show_completed: true        # Show completed section (default: true)
completed_limit: 3          # Max completed chores shown; 0 = unlimited (default: 3)
show_sections: true         # Show section headings (default: true)
no_card_background: false   # Transparent card background (default: false)
update_interval: 60         # Seconds between data refreshes (default: 60)
compact: false              # Compact row height for narrow columns (default: false)
tap_action:                 # Action on row tap (default: details)
  action: details
hold_action:                # Action on row hold (default: none)
  action: none
double_tap_action:          # Action on row double-tap (default: none)
  action: none
```

### Action Configuration

Standard HA-style action configuration for chore row interactions. Uses a gesture handler directive adapted from lovelace-mushroom for tap, hold (500ms), and double-tap detection.

| Action         | Behavior                                               |
|----------------|--------------------------------------------------------|
| `details`      | Open the chore detail dialog (default for tap)         |
| `complete`     | Call `complete_item` directly, no dialog               |
| `more-info`    | Open HA more-info panel for the source calendar entity |
| `call-service` | Call an arbitrary service with configured data         |
| `navigate`     | Navigate to a dashboard path                           |
| `url`          | Open an external URL                                   |
| `none`         | Do nothing (default for hold and double-tap)           |

Custom actions (`details`, `complete`) are handled by the card. Standard HA actions are delegated via `hass-action` events.

### Default Color Palette

When `color` is omitted, auto-assigned from HA theme color names:
```
blue, red, amber, green, orange, cyan, purple, pink
```

Colors are HA theme names (e.g. `"red"` → `var(--red-color)`) which adapt to light/dark themes automatically. Raw CSS values (hex codes, `rgb()`, etc.) are also accepted for backwards compatibility. The `themeColorToCss()` utility in `utils.ts` handles the conversion.

Only visible when 2+ entities are configured.

### Visual Editor

A Lit-based `chore-calendar-card-editor` element:
- **Entity section**: each entity is an expandable `ha-expansion-panel`. Collapsed view shows a color dot and the entity's friendly name. Expanded view reveals:
  - Entity picker (filtered to `calendar.chore_calendar` domain)
  - Color picker (HA `ui_color` selector via `ha-form` — dropdown with standard theme colors and custom entry)
  - Exclude statuses multi-select (overdue, due, pending, completed)
  - Remove button
- Empty entity config (no entities) renders an inline error message instead of throwing, preventing dashboard editor crashes
- Newly added entities auto-expand. The "+ Add entity" button appends a new expanded entry.
- Toggle switches for show_header, show_completed, show_sections, no_card_background
- Number input for completed_limit and update_interval
- Action type dropdowns for tap_action, hold_action, double_tap_action (includes custom "Chore Details" and "Complete Chore" options)

---

## Filter Behavior

Filtering is configured per entity via the `exclude` option rather than a runtime dropdown. Each entity can exclude any combination of statuses (`overdue`, `due`, `pending`, `completed`). Items matching excluded statuses are filtered out at fetch time, before merging into the timeline. Default is no exclusions (all statuses shown).

The `show_completed` and `completed_limit` card-level options provide additional control over the completed section across all entities.

---

## Detail Dialog (Phase A)

Tapping a chore row opens a pop-up dialog using HA's `ha-dialog` component for native theme/styling consistency. The dialog shows chore details with MDI icons and will host action buttons (complete, etc.) in future phases.

```
┌─────────────────────────────────────────────┐
│  Morning Medicine                       [✕] │
├─────────────────────────────────────────────┤
│  📅  Daily Chores                           │
│  🕐  Daily at 08:00                         │
│  👤  Tom                                    │
│  📱  Morning Medicine NFC                   │
│  ✓   8:15 AM by Tom                         │
└─────────────────────────────────────────────┘
```

### Detail rows

Each detail row has an MDI icon and a value. No labels or dividers — icon conveys the meaning. Rows are only rendered when the item has data for that field.

| Row            | Icon                                   | Shows                                                |
|----------------|----------------------------------------|------------------------------------------------------|
| **List**       | `<ha-state-icon>` from calendar entity | Calendar entity friendly name — always first         |
| **Schedule**   | `mdi:calendar-clock`                   | Human-readable schedule from `formatSchedule()`      |
| **Assigned**   | `mdi:account` / `mdi:account-multiple` | Resolved person names, comma-separated               |
| **Trigger**    | `mdi:nfc-tap`                          | Resolved trigger entity name                         |
| **Last done**  | `mdi:check-circle-outline`             | Formatted completion time + "by {person}" if present |

### Implementation

- Component: `chore-detail-dialog` (`card/src/components/chore-detail-dialog.ts`)
- Uses `<ha-dialog>`, `<ha-icon>`, and `<ha-state-icon>` for native HA look and feel
- **Minimum HA version: 2026.3.0** — uses the new `ha-dialog` slot-based API (`wa-dialog` / `ha-dialog-header`)
- Title via `<span slot="headerTitle">`, close button via `<ha-icon-button slot="headerNavigationIcon" data-dialog="close">`
- Row tap (or configured action) fires `chore-detail` CustomEvent — handled by the main card
- Main card manages `_dialogItem` and `_dialogOpen` state
- Dialog fires `detail-dialog-closed` on dismiss
- Complete button in `footer` slot — `<ha-button variant="brand" appearance="accent" size="medium">`, hidden for already-completed chores, calls `complete_item` service. Footer has `16px` padding and a top border matching HA more-info dialog style.
- Future phases may add edit/delete buttons to the dialog

---

## Interaction Phases

### Phase A: Read-only (initial release)
- Display chores in timeline view with status sections
- Per-entity status filtering via `exclude` config
- Tap-to-open detail dialog
- Color bars for multi-list
- Visual editor with expandable per-entity configuration
- `getCardSize()` returns approximate row count for dashboard grid

### Phase B: Complete action ✅
- **Complete button** in the detail dialog — `<ha-button variant="brand" appearance="accent">` in `footer` slot, disabled when already completed or loading
- Calls `chore_calendar.complete_item` via `hass.callWS` with `entity_id` + `chore_id`
- `completed_by` omitted for now (no HA user context in card); `completed_at` defaults to `now()` server-side
- On success: fires `chore-completed` event, main card closes dialog and force-refreshes data
- On error: logs to console, button re-enables for retry
- Auto-refresh also triggered by existing `chore_calendar_status_changed` event subscription
- **Future enhancements**: `completed_by` via card config, optimistic UI, haptic feedback, confirmation option

### Phase C: Create / Update / Delete UI
- **"+" button** in card header → opens a `ha-dialog` overlay with form fields:
  - Chore name (text input)
  - Type toggle: Scheduled / Interval (radio or segmented button)
  - Scheduled fields: time picker, day-of-week multi-select chips, early window duration
  - Interval field: duration picker
  - Grace period: duration picker
  - Trigger entity: entity picker (tag domain filter)
  - Assigned to: entity picker (person domain, multi-select)
  - Target list: dropdown (when multiple entities configured)
- Form calls `chore_calendar.create_item` on submit.
- **Edit**: long-press or edit icon on expanded row → same dialog pre-filled, calls `update_item`.
- **Delete**: trash icon in edit dialog → confirmation prompt → calls `delete_item`.

---

## Tech Stack

| Layer         | Choice                  | Rationale                                    |
|---------------|-------------------------|----------------------------------------------|
| Components    | **Lit 3.x**             | HA standard, tiny bundle, reactive properties |
| Language      | **TypeScript**          | Type safety, better DX                       |
| Date/time     | **Native `Intl`**       | `Intl.RelativeTimeFormat` + `Intl.DateTimeFormat` — zero dependency, < 15KB bundle |
| Bundler       | **Rollup**              | Single-file output, tree-shaking, `@rollup/plugin-json` for version import |
| Package mgr   | **npm**                 | Standard                                     |

### Bundle Size Budget

Target: **< 20KB gzipped**
- Lit 3 core: ~7KB
- Application code: ~8-10KB
- No external date library

---

## Project Structure

```
card/
├── src/
│   ├── chore-calendar-card.ts       # Main card element (LitElement)
│   ├── chore-calendar-card-editor.ts # Visual config editor
│   ├── components/
│   │   ├── chore-detail-dialog.ts   # Detail pop-up dialog (ha-dialog)
│   │   └── chore-row.ts             # Single chore row component
│   ├── action-handler.ts            # Gesture directive (tap/hold/double-tap)
│   ├── define.ts                    # safeDefine() — guarded customElements.define
│   ├── fire-event.ts                # Typed fireEvent utility
│   ├── types.ts                     # TypeScript interfaces
│   └── utils.ts                     # Time formatting, sorting, colors, action handling
├── rollup.config.mjs
├── tsconfig.json
├── package.json
└── README.md
```

Built output: `card/dist/chore-calendar-card.js` — loaded as a Lovelace resource.

### HA Registration

All custom elements use `safeDefine()` (from `define.ts`) instead of Lit's `@customElement` decorator. This guards against `DOMException` when the script loads twice (e.g. cached + cache-busted versions both execute). Version is logged on module load via `@rollup/plugin-json` importing `package.json`.

```typescript
// card/src/chore-calendar-card.ts
import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { safeDefine } from './define';
import { version } from '../package.json';

console.info(`%c CHORE-CALENDAR-CARD %c v${version} `, ...);

export class ChoreCalendarCard extends LitElement {
  static getConfigElement() {
    return document.createElement('chore-calendar-card-editor');
  }
  // ...
}

safeDefine('chore-calendar-card', ChoreCalendarCard);

// Self-registration for HACS / card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'chore-calendar-card',
  name: 'Chore Calendar',
  description: 'Timeline view of chores from Chore Calendar lists',
  preview: true,
});
```

### Development Workflow

```bash
cd card
npm install
npm run dev      # Rollup watch mode → dist/chore-calendar-card.js
npm run build    # Production build (minified)
```

For local HA development, symlink or copy `dist/chore-calendar-card.js` to `config/www/` and add as a Lovelace resource:
```yaml
resources:
  - url: /local/chore-calendar-card.js
    type: module
```

---

## Event Subscription

```typescript
// Subscribe for real-time status change updates
private _unsubscribe?: () => void;

connectedCallback() {
  super.connectedCallback();
  this._unsubscribe = this.hass.connection.subscribeEvents(
    () => this._refreshData(),
    'chore_calendar_status_changed'
  );
}

disconnectedCallback() {
  super.disconnectedCallback();
  this._unsubscribe?.();
}
```

---

## HACS Distribution (Monorepo)

The card JS is auto-registered by the integration as a proper Lovelace resource via `ResourceStorageCollection` (see `_async_register_card_resource` in `__init__.py`). This ensures the card is loaded by HA's lovelace module before cards render, avoiding race conditions in the dashboard editor. A cache-busting `?v=` parameter ensures browsers pick up new versions. Falls back to `add_extra_js_url` when the Lovelace storage collection is unavailable (e.g. YAML-managed dashboards). No separate HACS card install or manual resource configuration needed.
