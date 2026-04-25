import { fireEvent } from "./fire-event";
import type {
  ActionConfig,
  ChoreStatus,
  DurationConfig,
  EnrichedChoreItem,
  EntityConfig,
  HomeAssistant,
} from "./types";

/** Default color palette for multi-list color bars (HA theme color names). */
const DEFAULT_COLORS = [
  "blue",
  "red",
  "amber",
  "green",
  "orange",
  "cyan",
  "purple",
  "pink",
];

/**
 * HA theme color names that map to CSS custom properties (e.g. "red" → "--red-color").
 * Used to distinguish theme names from raw CSS values like hex codes.
 */
const THEME_COLORS = new Set([
  "primary", "accent", "red", "pink", "purple", "deep-purple", "indigo",
  "blue", "light-blue", "cyan", "teal", "green", "light-green", "lime",
  "yellow", "amber", "orange", "deep-orange", "brown", "light-grey",
  "grey", "dark-grey", "blue-grey", "black", "white",
]);

/** Convert an HA theme color name to a CSS value; pass through raw CSS values. */
export function themeColorToCss(color: string): string {
  return THEME_COLORS.has(color) ? `var(--${color}-color)` : color;
}

/** Resolve a normalized EntityConfig with a color assigned. */
export function resolveEntityConfig(
  entry: string | EntityConfig,
  index: number,
): EntityConfig & { color: string } {
  const cfg = typeof entry === "string" ? { entity: entry } : entry;
  return {
    ...cfg,
    color: cfg.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  };
}

/** Status sort priority — lower = more urgent. */
const STATUS_ORDER: Record<ChoreStatus, number> = {
  overdue: 0,
  due: 1,
  pending: 2,
  completed: 3,
};

/** Sort chores into display order: by status group, then by time within group. */
export function sortChores(items: EnrichedChoreItem[]): EnrichedChoreItem[] {
  return [...items].sort((a, b) => {
    const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;

    if (a.status === "completed") {
      // Most recently completed first.
      const aTime = a.last_completed ? new Date(a.last_completed).getTime() : 0;
      const bTime = b.last_completed ? new Date(b.last_completed).getTime() : 0;
      return bTime - aTime;
    }

    // All other statuses: earliest next_due first.
    const aDue = a.next_due ? new Date(a.next_due).getTime() : Infinity;
    const bDue = b.next_due ? new Date(b.next_due).getTime() : Infinity;
    return aDue - bDue;
  });
}

/** Group sorted chores by their status section. */
export function groupByStatus(
  items: EnrichedChoreItem[],
): Map<ChoreStatus, EnrichedChoreItem[]> {
  const groups = new Map<ChoreStatus, EnrichedChoreItem[]>();
  for (const item of items) {
    let group = groups.get(item.status);
    if (!group) {
      group = [];
      groups.set(item.status, group);
    }
    group.push(item);
  }
  return groups;
}

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

/**
 * Convert an HA-style duration dict to milliseconds.
 * Returns null when the duration is unset or all zero, signalling "no filter".
 */
export function durationToMs(d: DurationConfig | undefined): number | null {
  if (!d) return null;
  const ms =
    (d.days ?? 0) * DAY +
    (d.hours ?? 0) * HOUR +
    (d.minutes ?? 0) * MINUTE +
    (d.seconds ?? 0) * 1_000;
  return ms > 0 ? ms : null;
}

/**
 * Apply the optional ``due_date_period`` and ``completed_period`` filters to a
 * list of chores.
 *
 * - ``due_date_period`` hides ``pending`` chores whose ``next_due`` is further
 *   than ``dueMs`` milliseconds in the future. ``overdue`` and ``due`` chores
 *   are retained regardless (their ``next_due`` is at or before ``now``).
 * - ``completed_period`` hides ``completed`` chores whose ``last_completed`` is
 *   further than ``completedMs`` milliseconds in the past.
 *
 * Passing ``null`` for either bound disables that filter.
 */
export function applyPeriodFilters(
  items: EnrichedChoreItem[],
  dueMs: number | null,
  completedMs: number | null,
  now: Date,
): EnrichedChoreItem[] {
  if (dueMs === null && completedMs === null) return items;
  const nowMs = now.getTime();
  return items.filter((item) => {
    if (
      completedMs !== null &&
      item.status === "completed" &&
      item.last_completed
    ) {
      const age = nowMs - new Date(item.last_completed).getTime();
      if (age > completedMs) return false;
    }
    if (dueMs !== null && item.status === "pending" && item.next_due) {
      const lead = new Date(item.next_due).getTime() - nowMs;
      if (lead > dueMs) return false;
    }
    return true;
  });
}

/**
 * Format a duration as a human-readable string.
 * Uses the largest appropriate unit: "2 days", "4 hours", "30 minutes".
 */
function formatDuration(ms: number): string {
  const abs = Math.abs(ms);
  if (abs < HOUR) {
    const mins = Math.max(1, Math.round(abs / MINUTE));
    return `${mins} minute${mins !== 1 ? "s" : ""}`;
  }
  if (abs < DAY) {
    const hrs = Math.round(abs / HOUR);
    return `${hrs} hour${hrs !== 1 ? "s" : ""}`;
  }
  const days = Math.round(abs / DAY);
  return `${days} day${days !== 1 ? "s" : ""}`;
}

/** Format a completed-at timestamp for display. */
export function formatCompletedTime(
  isoString: string,
  now: Date,
  locale: string,
): string {
  const target = new Date(isoString);
  const diffDays = Math.floor((now.getTime() - target.getTime()) / DAY);

  if (diffDays === 0) {
    // Today — show time.
    return new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
    }).format(target);
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  if (diffDays < 7) {
    return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(target);
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(target);
}

/**
 * Get the secondary time text for a chore row.
 * Matches the blueprint pattern: "Overdue by X", "Due", "in X", "✓ time".
 */
export function getTimeText(
  item: EnrichedChoreItem,
  now: Date,
  locale: string,
): string {
  switch (item.status) {
    case "overdue":
      if (item.next_due) {
        const graceMins =
          typeof item.schedule === "object" && item.schedule !== null
            ? Number(item.schedule.grace_period_mins ?? 0)
            : 0;
        const graceEndMs = new Date(item.next_due).getTime() + graceMins * MINUTE;
        const diffMs = now.getTime() - graceEndMs;
        return diffMs > 0 ? `Overdue by ${formatDuration(diffMs)}` : "Overdue";
      }
      return "Overdue";
    case "due":
      return "Due";
    case "pending":
      if (item.next_due) {
        const diffMs = new Date(item.next_due).getTime() - now.getTime();
        return diffMs > 0 ? `in ${formatDuration(diffMs)}` : "Pending";
      }
      return "Pending";
    case "completed":
      return "";
  }
}

/** Format a schedule object (dict) into a human-readable string. */
export function formatSchedule(
  schedule: string | Record<string, unknown>,
): string {
  if (typeof schedule === "string") return schedule;

  // Scheduled chore: { time, active_days, early_window_mins, grace_period_mins }
  if ("time" in schedule) {
    const time = String(schedule.time ?? "");
    const days = schedule.active_days as string[] | undefined;
    if (days && days.length > 0 && days.length < 7) {
      return `${days.join(", ")} at ${time}`;
    }
    return `Daily at ${time}`;
  }

  // Interval chore: { interval_mins, grace_period_mins }
  if ("interval_mins" in schedule) {
    const mins = Number(schedule.interval_mins);
    if (mins >= 1440 && mins % 1440 === 0) {
      const days = mins / 1440;
      return `Every ${days} day${days !== 1 ? "s" : ""}`;
    }
    if (mins >= 60 && mins % 60 === 0) {
      const hrs = mins / 60;
      return `Every ${hrs} hour${hrs !== 1 ? "s" : ""}`;
    }
    return `Every ${mins} minute${mins !== 1 ? "s" : ""}`;
  }

  return JSON.stringify(schedule);
}

/** Section display labels. */
export const SECTION_LABELS: Record<ChoreStatus, string> = {
  overdue: "Overdue",
  due: "Due",
  pending: "Upcoming",
  completed: "Completed",
};

/** Check whether an action config represents a real action (not none/undefined). */
export function hasAction(config?: ActionConfig): boolean {
  return config !== undefined && config.action !== "none";
}

const DOMAIN = "chore_calendar";

/**
 * Execute an action for a chore row.
 * Custom actions (details, complete) are handled directly.
 * Standard HA actions are delegated via hass-action event.
 */
export async function handleChoreAction(
  element: HTMLElement,
  hass: HomeAssistant,
  actionConfig: ActionConfig | undefined,
  item: EnrichedChoreItem,
): Promise<void> {
  if (!actionConfig || actionConfig.action === "none") return;

  switch (actionConfig.action) {
    case "details":
      fireEvent(element, "chore-detail" as keyof HASSDomEvents, { item });
      break;

    case "complete":
      try {
        await hass.callWS({
          type: "call_service",
          domain: DOMAIN,
          service: "complete_item",
          service_data: {
            entity_id: item.source_entity,
            item: item.uid,
          },
        });
        fireEvent(element, "chore-completed" as keyof HASSDomEvents, { item });
      } catch (err) {
        console.error("chore-calendar-card: failed to complete chore", err);
      }
      break;

    default:
      // Delegate standard HA actions (more-info, navigate, url, call-service, etc.)
      fireEvent(element, "hass-action" as keyof HASSDomEvents, {
        config: {
          entity: item.source_entity,
          tap_action: actionConfig,
          hold_action: actionConfig,
          double_tap_action: actionConfig,
        },
        action: "tap",
      });
      break;
  }
}

// Declare custom event types for fireEvent.
declare global {
  interface HASSDomEvents {
    "chore-detail": { item: EnrichedChoreItem };
    "chore-completed": { item: EnrichedChoreItem };
    "hass-action": { config: Record<string, unknown>; action: string };
  }
}
