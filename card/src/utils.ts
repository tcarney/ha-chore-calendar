import { RRule, Weekday } from "rrule";
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
 *   than ``dueMs`` milliseconds in the future. Pending chores with no
 *   ``next_due`` (unscheduled) are also hidden — the filter is interpreted as
 *   "show items due within this window," and undated items aren't in any
 *   window. Mirrors HA's native ``todo-list-card`` behavior. ``overdue`` and
 *   ``due`` chores are retained regardless (their ``next_due`` is at or
 *   before ``now``).
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
    if (dueMs !== null && item.status === "pending") {
      if (!item.next_due) return false;
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
export function getTimeText(item: EnrichedChoreItem, now: Date): string {
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

/** Format an ``HH:MM:SS`` time-of-day string using the browser's locale. */
function formatLocalTime(timeStr: string): string {
  const parts = timeStr.split(":").map(Number);
  if (parts.length < 2 || parts.some(Number.isNaN)) return timeStr;
  const dt = new Date();
  dt.setHours(parts[0], parts[1], 0, 0);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(dt);
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Format a season window compactly: a contiguous (possibly year-wrapping)
 * run reads as a range ("Oct–Mar"), anything else as a list ("Oct, Dec"). */
function formatMonthWindow(months: unknown): string {
  const values = Array.isArray(months) ? months.map(Number).filter((m) => m >= 1 && m <= 12) : [];
  const set = new Set(values);
  if (set.size === 0 || set.size >= 12) return "";
  const wrap = (m: number) => ((m - 1 + 12) % 12) + 1;
  const starts = [...set].filter((m) => !set.has(wrap(m - 1)));
  if (starts.length === 1 && set.size > 1) {
    let end = starts[0];
    while (set.has(wrap(end + 1))) end = wrap(end + 1);
    return `${MONTH_SHORT[starts[0] - 1]}–${MONTH_SHORT[end - 1]}`;
  }
  return [...set]
    .sort((a, b) => a - b)
    .map((m) => MONTH_SHORT[m - 1])
    .join(", ");
}

/** Format a date with the browser's locale ("Jun 30, 2027"). */
function formatDate(date: Date, utc = false): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(utc ? { timeZone: "UTC" } : {}),
  }).format(date);
}

/** Append the shared lifecycle suffix (", until Jun 30, 2027" / ", 3 times"). */
function lifecycleSuffix(until: string, count: unknown): string {
  let suffix = until ? `, until ${until}` : "";
  const n = Number(count ?? 0);
  if (n > 0) suffix += `, ${n} time${n !== 1 ? "s" : ""}`;
  return suffix;
}

/** Render a scheduled chore's rrule the way HA core's calendar does.
 *
 * Mirrors `renderRRuleAsText` (rrule.js `toText()` with the
 * `isFullyConvertibleToText` guard and a raw-string fallback), with two
 * display normalizations: a single BYSETPOS folds onto the weekday (toText
 * silently drops a bare BYSETPOS — "last Friday" would read "Friday"), and
 * UNTIL/COUNT are lifted out so the time-of-day reads before the lifecycle
 * suffix.
 */
function formatRRuleSchedule(schedule: Record<string, unknown>): string {
  const rruleStr = String(schedule.rrule ?? "");
  const time = formatLocalTime(String(schedule.time ?? ""));

  // Plain daily/weekly shapes keep the card's compact rendering.
  if (rruleStr === "FREQ=DAILY") return `Daily at ${time}`;
  if (/^FREQ=WEEKLY;BYDAY=[A-Z,]+$/.test(rruleStr)) {
    const days = (schedule.active_days as string[] | undefined) ?? [];
    if (days.length > 0 && days.length < 7) return `${days.join(", ")} at ${time}`;
    return `Daily at ${time}`;
  }

  try {
    const opts = { ...RRule.fromString(`RRULE:${rruleStr}`).origOptions };
    const pos = Array.isArray(opts.bysetpos) ? opts.bysetpos : opts.bysetpos != null ? [opts.bysetpos] : [];
    if (pos.length === 1 && opts.byweekday) {
      const weekdays = Array.isArray(opts.byweekday) ? opts.byweekday : [opts.byweekday];
      opts.byweekday = weekdays.map((day) =>
        day instanceof Weekday
          ? new Weekday(day.weekday, pos[0])
          : typeof day === "number"
            ? new Weekday(day, pos[0])
            : day,
      );
      delete opts.bysetpos;
    }
    const { until, count } = opts;
    delete opts.until;
    delete opts.count;

    const display = new RRule(opts);
    if (!display.isFullyConvertibleToText()) return `${rruleStr} at ${time}`;
    const text = display.toText();
    // rrule.js parses UNTIL as UTC — format it as such to keep the wall date.
    return (
      `${text.charAt(0).toUpperCase()}${text.slice(1)} at ${time}` +
      lifecycleSuffix(until ? formatDate(until, true) : "", count)
    );
  } catch {
    return rruleStr;
  }
}

const INTERVAL_UNITS: Record<string, string> = {
  minutely: "minute",
  hourly: "hour",
  daily: "day",
  weekly: "week",
  monthly: "month",
  yearly: "year",
};

/** Render an interval chore from freq/interval with season and lifecycle suffixes. */
function formatIntervalSchedule(schedule: Record<string, unknown>): string {
  const unit = INTERVAL_UNITS[String(schedule.freq)] ?? String(schedule.freq);
  const n = Number(schedule.interval ?? 1);
  let text = n === 1 ? `Every ${unit}` : `Every ${n} ${unit}s`;
  const window = formatMonthWindow(schedule.bymonth);
  if (window) text += `, ${window}`;
  // until is naive local ISO — Date() parses it in the local zone.
  const until = schedule.until ? formatDate(new Date(String(schedule.until))) : "";
  return text + lifecycleSuffix(until, schedule.count);
}

/** Format a schedule object (dict) into a human-readable string. */
export function formatSchedule(
  schedule: string | Record<string, unknown>,
): string {
  if (typeof schedule === "string") return schedule;

  // Scheduled chore: { rrule, dtstart, time, active_days, ... }
  if ("rrule" in schedule) {
    return formatRRuleSchedule(schedule);
  }

  // Interval chore: { freq, interval, bymonth?, until?, count?, ... }
  if ("freq" in schedule) {
    return formatIntervalSchedule(schedule);
  }

  // Oneshot chore: { due_datetime, pending_period_mins, grace_period_mins }
  if ("due_datetime" in schedule) {
    const due = schedule.due_datetime as string | null | undefined;
    if (!due) return "Unscheduled";
    const target = new Date(due);
    return `${new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(target)}`;
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
