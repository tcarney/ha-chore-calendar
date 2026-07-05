import { fireEvent } from "./fire-event";
import type {
  ActionConfig,
  ChoreSelector,
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

/** Full weekday name by lowercase day code ("mon" → "Monday"). */
export const DAY_FULL: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const POS_WORDS: Record<number, string> = {
  1: "first",
  2: "second",
  3: "third",
  4: "fourth",
  5: "fifth",
  [-1]: "last",
  [-2]: "second-to-last",
  [-3]: "third-to-last",
};

/** Capitalize the first character of a string. */
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Coerce a selector value (scalar or array) to a number array. */
function asNumbers(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw.map(Number);
  return raw != null ? [Number(raw)] : [];
}

/** Parse a selector byday entry ("mon", "2mon", "-1fri") into its parts. */
export function parseByday(raw: unknown): { ordinal: number | null; code: string }[] {
  const list = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  return list.map((entry) => {
    const match = /^([+-]?\d+)?([a-z]{3})$/.exec(String(entry).toLowerCase());
    if (!match) return { ordinal: null, code: String(entry) };
    return { ordinal: match[1] ? Number(match[1]) : null, code: match[2] };
  });
}

/** Ordinal English for a positional value: 1 → "first", -1 → "last". */
export function positionWord(n: number): string {
  return POS_WORDS[n] ?? (n > 0 ? ordinalNumber(n) : `${ordinalNumber(-n)}-to-last`);
}

/** Ordinal English for a day-of-month: 1 → "1st", 15 → "15th". */
export function ordinalNumber(n: number): string {
  const v = n % 100;
  const suffix = v >= 11 && v <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${suffix}`;
}

/** Phrase the monthly/yearly weekday spec: "last Friday", "second Monday". */
function bydayPhrase(byday: { ordinal: number | null; code: string }[], bysetpos: number[]): string {
  const dayName = (code: string) => DAY_FULL[code] ?? code;
  if (bysetpos.length) {
    return `${bysetpos.map(positionWord).join(", ")} ${byday.map((e) => dayName(e.code)).join(", ")}`;
  }
  if (byday.some((e) => e.ordinal != null)) {
    return byday
      .map((e) => (e.ordinal != null ? `${positionWord(e.ordinal)} ${dayName(e.code)}` : dayName(e.code)))
      .join(", ");
  }
  return byday.map((e) => dayName(e.code)).join(", ");
}

/** Render a scheduled chore from its structured selector fields.
 *
 * Replaces the former rrule.js `toText()` path: the backend now decomposes the
 * stored rrule into selector fields, so display and the edit form share one
 * source of truth and there's no second client-side RRULE parser.
 */
function formatScheduledSelector(selector: ChoreSelector | undefined, timeRaw: unknown): string {
  const time = formatLocalTime(String(timeRaw ?? ""));
  if (!selector?.frequency) return `${String(timeRaw ?? "")}`.trim() ? `At ${time}` : "";

  const freq = selector.frequency;
  const interval = Number(selector.interval ?? 1);
  const byday = parseByday(selector.byday);
  const bysetpos = asNumbers(selector.bysetpos);
  const bymonthday = asNumbers(selector.bymonthday);
  const bymonth = asNumbers(selector.bymonth);

  let base: string;
  if (freq === "daily") {
    base = interval === 1 ? "Daily" : `Every ${interval} days`;
  } else if (freq === "weekly") {
    if (interval === 1 && new Set(byday.map((e) => e.code)).size === 7) {
      // A weekly rule covering all seven days is just "Daily".
      base = "Daily";
    } else if (byday.length) {
      const days = byday.map((e) => DAY_FULL[e.code] ?? e.code).join(", ");
      base = interval === 1 ? days : `Every ${interval} weeks on ${days}`;
    } else {
      base = interval === 1 ? "Weekly" : `Every ${interval} weeks`;
    }
  } else if (freq === "monthly") {
    const lead = interval === 1 ? "Monthly" : `Every ${interval} months`;
    if (byday.length) {
      const phrase = bydayPhrase(byday, bysetpos);
      base = interval === 1 ? capitalize(phrase) : `${lead} on the ${phrase}`;
    } else if (bymonthday.length) {
      base = `${lead} on the ${bymonthday.map((d) => (d === -1 ? "last day" : ordinalNumber(d))).join(", ")}`;
    } else {
      base = lead;
    }
  } else if (freq === "yearly") {
    let text = interval === 1 ? "Annually" : `Every ${interval} years`;
    if (bymonth.length) {
      text += ` in ${bymonth.map((m) => MONTH_SHORT[m - 1]).join(", ")}`;
    }
    if (byday.length) {
      text += ` on the ${bydayPhrase(byday, bysetpos)}`;
    } else if (bymonthday.length) {
      text += ` on the ${bymonthday.map((d) => (d === -1 ? "last day" : ordinalNumber(d))).join(", ")}`;
    }
    base = text;
  } else {
    base = freq;
  }

  let suffix = "";
  // On a non-yearly frequency, bymonth is a season window ("Oct–Mar").
  if (freq !== "yearly") {
    const window = formatMonthWindow(bymonth);
    if (window) suffix += `, ${window}`;
  }
  // until is naive local ISO — Date() parses it in the local zone.
  const until = selector.until ? formatDate(new Date(String(selector.until))) : "";
  suffix += lifecycleSuffix(until, selector.count);

  return `${base} at ${time}${suffix}`;
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
  selector?: ChoreSelector,
): string {
  if (typeof schedule === "string") return schedule;

  // Scheduled chore: render from the structured selector ({ rrule } marks the
  // type; the recurrence text comes from selector fields, not the rrule string).
  if ("rrule" in schedule) {
    return formatScheduledSelector(selector, schedule.time);
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

    case "edit":
      fireEvent(element, "chore-edit" as keyof HASSDomEvents, { item });
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
    "chore-edit": { item: EnrichedChoreItem };
    "chore-completed": { item: EnrichedChoreItem };
    "hass-action": { config: Record<string, unknown>; action: string };
  }
}
