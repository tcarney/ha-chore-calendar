# Chore Calendar Card — Design Spec

## Overview

A custom Lovelace card (`chore-calendar-card`) that displays chores from one or more `chore_calendar` lists in a unified timeline view. Built with **Lit 3** + **TypeScript** + native `Intl` APIs, bundled with **Rollup** into a single JS file. Lives in this monorepo under `card/` — tightly coupled to the integration for simpler distribution and versioning.

---

## Visual Design

### Timeline View

Chores from all configured lists are merged into a single timeline, sorted by urgency. When multiple lists are configured, a colored left bar distinguishes which list each chore belongs to.

```
┌─────────────────────────────────────────────────────┐
│  Chores                                  [▼ Active] │
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

Empty sections are hidden. The Completed section is capped at `completed_limit` rows (default 3) with a "Show N more" link to expand. When `show_completed` is `false`, the section is hidden entirely.

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
2. **Event-driven**: subscribe to `chore_calendar_status_changed` for instant updates on state transitions.
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
  - entity: calendar.weekly_chores
    color: "#EA4335"
show_header: true           # Show card title bar (default: true)
show_completed: true        # Show completed section (default: true)
completed_limit: 3          # Max completed chores shown before "show more" (default: 3)
hide_filter: false          # Hide the status filter dropdown (default: false)
update_interval: 60         # Seconds between data refreshes (default: 60)
compact: false              # Compact row height for narrow columns (default: false)
```

### Default Color Palette

When `color` is omitted, auto-assigned from:
```
#4285F4, #EA4335, #FBBC04, #34A853, #FF6D01, #46BDC6, #7B1FA2, #C2185B
```

Only visible when 2+ entities are configured.

### Visual Editor

A Lit-based `chore-calendar-card-editor` element:
- Entity picker (multi-select, filtered to `calendar.chore_calendar` domain)
- Color picker per entity
- Toggle switches for show_header, show_completed, hide_filter, compact
- Number input for completed_limit and update_interval

---

## Filter Behavior

Dropdown in the card header (right side):

| Filter       | Shows                              | Implementation        |
|-------------|------------------------------------|-----------------------|
| **All**     | All chores                         | No filter             |
| **Active**  | Overdue + Due + Pending            | Client-side filter    |
| **Overdue** | Overdue only                       | `get_items(status=overdue)` |
| **Due**     | Due only                           | `get_items(status=due)` |
| **Pending** | Pending only                       | `get_items(status=pending)` |
| **Completed**| Completed only                    | `get_items(status=completed)` |

Default: **Active** (most useful day-to-day view — completed chores shown on demand).

Filter state is per-card instance, not persisted across page reloads. Single-status filters use server-side filtering via the `get_items` `status` parameter. Multi-status filters ("All", "Active") fetch everything and filter client-side.

---

## Expandable Row Details (Phase A)

Tapping a chore row expands it inline to show additional details:

```
┌──┬───┬──────────────────────────┬──────────────┐
│▌ │ ● │ Morning Medicine          │ 2 hours ago  │
│  │   ├──────────────────────────┴──────────────┤
│  │   │ Schedule: Daily at 08:00                │
│  │   │ Trigger:  tag.morning_medicine          │
│  │   │ Assigned: person.tom                    │
│  │   │ Last:     Apr 3, 8:15 AM by Tom         │
└──┴───┴─────────────────────────────────────────┘
```

Only one row expanded at a time (accordion behavior). Tap again to collapse.

---

## Interaction Phases

### Phase A: Read-only (initial release)
- Display chores in timeline view with status sections
- Filter dropdown
- Tap-to-expand row details
- Color bars for multi-list
- Visual editor for configuration
- `getCardSize()` returns approximate row count for dashboard grid

### Phase B: Complete action
- **Tap**: non-completed row → call `chore_calendar.complete_item`:
  ```typescript
  await hass.callService('chore_calendar', 'complete_item', {
    entity_id: calendarEntityId,
    chore_id: item.chore_id,
  });
  ```
- **Optimistic UI**: immediately move row to completed section with fade animation.
- **Undo toast**: brief "Completed — Undo" toast (undo = no backend support yet, just re-fetch to restore actual state). Future: add `uncomplete_item` service.
- **Haptic**: `navigator.vibrate(50)` on mobile for tactile feedback.
- **Confirmation option**: config flag `confirm_complete: true` to show "Complete {name}?" dialog before calling service.

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
| Bundler       | **Rollup**              | Single-file output, tree-shaking             |
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
│   │   ├── chore-row.ts             # Single chore row component
│   │   └── status-filter.ts         # Filter dropdown component
│   ├── styles.ts                    # Shared CSS (tagged template literals)
│   ├── types.ts                     # TypeScript interfaces
│   └── utils.ts                     # Relative time formatting, sorting, colors
├── rollup.config.mjs
├── tsconfig.json
├── package.json
└── README.md
```

Built output: `card/dist/chore-calendar-card.js` — loaded as a Lovelace resource.

### HA Registration

```typescript
// card/src/chore-calendar-card.ts
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('chore-calendar-card')
export class ChoreCalendarCard extends LitElement {
  static getConfigElement() {
    return document.createElement('chore-calendar-card-editor');
  }

  static getStubConfig() {
    return { entities: [] };
  }

  getCardSize(): number {
    return Math.max(3, this._items.length + 1);
  }
  // ...
}

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

Since the card lives alongside the integration, HACS needs to find both. Options:

1. **Integration**: standard HACS custom integration (`hacs.json` in repo root with `"content_in_root": false`).
2. **Card**: add `card/dist/chore-calendar-card.js` to the repo. Users manually add the resource URL, or we provide a `hacs.json` with a secondary content path.

Alternatively, the integration's `async_setup` can auto-register the card resource from `custom_components/chore_calendar/www/chore-calendar-card.js` using HA's `frontend.async_register_built_in_panel` or by serving static files. This gives zero-config card loading for users who install the integration.

**Recommended approach**: copy the built JS into `custom_components/chore_calendar/www/` during the build step, then register it in `__init__.py`:

```python
# In async_setup()
hass.http.register_static_path(
    "/chore_calendar/chore-calendar-card.js",
    hass.config.path("custom_components/chore_calendar/www/chore-calendar-card.js"),
    cache_headers=True,
)
# Auto-add as Lovelace resource
await hass.components.frontend.async_register_built_in_panel(...)
```

This way installing the integration automatically makes the card available — no separate HACS card install or manual resource configuration.
