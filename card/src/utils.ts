import { fireEvent } from "./fire-event";
import { localize, localizeOrdinal, localizePlural, resolveLang, statusLabel } from "./localize/localize";
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

// -- Locale-aware primitives (Intl) -----------------------------------------

/** Weekday code → offset from a known Sunday (2021-08-01). */
const DAY_CODE_OFFSET: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

/** Full/short weekday name for a lowercase day code, localized via Intl. */
export function weekdayName(
  hass: HomeAssistant | undefined,
  code: string,
  style: "long" | "short" = "long",
): string {
  const offset = DAY_CODE_OFFSET[code];
  if (offset == null) return code;
  return new Intl.DateTimeFormat(resolveLang(hass), { weekday: style }).format(
    new Date(2021, 7, 1 + offset),
  );
}

/** Month name (1 = January) localized via Intl. */
export function monthName(
  hass: HomeAssistant | undefined,
  month: number,
  style: "long" | "short" = "short",
): string {
  return new Intl.DateTimeFormat(resolveLang(hass), { month: style }).format(
    new Date(2000, month - 1, 1),
  );
}

/**
 * Format a duration with the largest appropriate unit, localized (plural and
 * unit word) via Intl.NumberFormat: "2 days", "4 hours", "30 minutes".
 */
function formatDuration(ms: number, hass: HomeAssistant | undefined): string {
  const abs = Math.abs(ms);
  let value: number;
  let unit: "minute" | "hour" | "day";
  if (abs < HOUR) {
    value = Math.max(1, Math.round(abs / MINUTE));
    unit = "minute";
  } else if (abs < DAY) {
    value = Math.round(abs / HOUR);
    unit = "hour";
  } else {
    value = Math.round(abs / DAY);
    unit = "day";
  }
  return new Intl.NumberFormat(resolveLang(hass), {
    style: "unit",
    unit,
    unitDisplay: "long",
  }).format(value);
}

/** Format a Date as an HA datetime value ("YYYY-MM-DD HH:MM:SS", local time),
 *  the shape HA's date/time inputs and the datetime selector read and write. */
export function formatHaDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/**
 * Convert an HA datetime value to an offset-bearing ISO string, or undefined
 * when empty/unparseable.
 */
export function haDateTimeToIso(value: unknown): string | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const date = new Date(raw.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** Whether to show 12-hour times, mirroring the HA frontend's useAmPm(). */
function useAmPm(hass: HomeAssistant | undefined): boolean {
  const format = hass?.locale?.time_format;
  if (format === "12") return true;
  if (format === "24") return false;
  const locale = format === "system" ? undefined : resolveLang(hass);
  return new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hour12 ?? false;
}

/** Local midnight of *date*, as epoch milliseconds. */
function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Format a completed-at timestamp for display. */
export function formatCompletedTime(
  isoString: string,
  now: Date,
  hass: HomeAssistant | undefined,
): string {
  const lang = resolveLang(hass);
  const target = new Date(isoString);
  // Calendar days in local time, not 24-hour windows: 7:14 PM yesterday is
  // "Yesterday" at 7:02 PM today. Rounding absorbs DST-shortened days.
  const diffDays = Math.round((startOfLocalDay(now) - startOfLocalDay(target)) / DAY);

  if (diffDays === 0 || diffDays === 1) {
    const time = new Intl.DateTimeFormat(lang, {
      hour: "numeric",
      minute: "2-digit",
      hour12: useAmPm(hass),
    }).format(target);
    return localize(hass, diffDays === 0 ? "card.time.today" : "card.time.yesterday", { time });
  }

  if (diffDays < 7) {
    return new Intl.DateTimeFormat(lang, { weekday: "long" }).format(target);
  }

  return new Intl.DateTimeFormat(lang, {
    month: "short",
    day: "numeric",
  }).format(target);
}

/** Format a due timestamp as a short calendar date, with the year only when it differs from now. */
export function formatDueDate(isoString: string, now: Date, hass: HomeAssistant | undefined): string {
  const target = new Date(isoString);
  return new Intl.DateTimeFormat(resolveLang(hass), {
    month: "short",
    day: "numeric",
    ...(target.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  }).format(target);
}

/**
 * Label for the upcoming occurrence of an overdue chore, from its own window
 * state: "Upcoming" before the pending window opens, "Pending" inside it,
 * "Due" once the due time has passed (it cannot be past its grace period,
 * or it would be in the missed list instead).
 */
export function upcomingLabel(item: EnrichedChoreItem, now: Date, hass: HomeAssistant | undefined): string {
  if (!item.upcoming_due) return localize(hass, "card.upcoming.upcoming");
  const schedule = typeof item.schedule === "object" && item.schedule !== null ? item.schedule : {};
  const pendingMins = Number(schedule.pending_period_mins ?? 0);
  const dueMs = new Date(item.upcoming_due).getTime();
  if (now.getTime() < dueMs - pendingMins * MINUTE) return localize(hass, "card.upcoming.upcoming");
  if (now.getTime() < dueMs) return localize(hass, "card.upcoming.pending");
  return localize(hass, "card.upcoming.due");
}

/**
 * Get the secondary time text for a chore row.
 * Matches the blueprint pattern: "Overdue by X", "Due", "in X", "✓ time".
 */
export function getTimeText(item: EnrichedChoreItem, now: Date, hass: HomeAssistant | undefined): string {
  switch (item.status) {
    case "overdue":
      if (item.next_due) {
        const graceMins =
          typeof item.schedule === "object" && item.schedule !== null
            ? Number(item.schedule.grace_period_mins ?? 0)
            : 0;
        const graceEndMs = new Date(item.next_due).getTime() + graceMins * MINUTE;
        const diffMs = now.getTime() - graceEndMs;
        return diffMs > 0
          ? localize(hass, "card.time.overdue_by", { duration: formatDuration(diffMs, hass) })
          : statusLabel(hass, "overdue");
      }
      return statusLabel(hass, "overdue");
    case "due":
      return statusLabel(hass, "due");
    case "pending":
      if (item.next_due) {
        const diffMs = new Date(item.next_due).getTime() - now.getTime();
        return diffMs > 0
          ? localize(hass, "card.time.in", { duration: formatDuration(diffMs, hass) })
          : statusLabel(hass, "pending");
      }
      return statusLabel(hass, "pending");
    case "completed":
      return "";
  }
}

/** True while a pending chore's next_due is still in the future — the detail
 *  dialog renders that as "Due in X" rather than the bare "in X". */
export function isPendingFuture(item: EnrichedChoreItem, now: Date): boolean {
  return item.status === "pending" && !!item.next_due && new Date(item.next_due).getTime() > now.getTime();
}

/** "Due in X" for a pending chore whose next_due is still in the future. */
export function dueInText(item: EnrichedChoreItem, now: Date, hass: HomeAssistant | undefined): string {
  const diffMs = new Date(item.next_due as string).getTime() - now.getTime();
  return localize(hass, "card.detail.due_in", { duration: formatDuration(diffMs, hass) });
}

/** Format an ``HH:MM:SS`` time-of-day string using the resolved locale. */
function formatLocalTime(timeStr: string, hass: HomeAssistant | undefined): string {
  const parts = timeStr.split(":").map(Number);
  if (parts.length < 2 || parts.some(Number.isNaN)) return timeStr;
  const dt = new Date();
  dt.setHours(parts[0], parts[1], 0, 0);
  return new Intl.DateTimeFormat(resolveLang(hass), {
    hour: "numeric",
    minute: "2-digit",
    hour12: useAmPm(hass),
  }).format(dt);
}

/** Format a season window compactly: a contiguous (possibly year-wrapping)
 * run reads as a range ("Oct–Mar"), anything else as a list ("Oct, Dec"). */
function formatMonthWindow(months: unknown, hass: HomeAssistant | undefined): string {
  const values = Array.isArray(months) ? months.map(Number).filter((m) => m >= 1 && m <= 12) : [];
  const set = new Set(values);
  if (set.size === 0 || set.size >= 12) return "";
  const wrap = (m: number) => ((m - 1 + 12) % 12) + 1;
  const starts = [...set].filter((m) => !set.has(wrap(m - 1)));
  if (starts.length === 1 && set.size > 1) {
    let end = starts[0];
    while (set.has(wrap(end + 1))) end = wrap(end + 1);
    return `${monthName(hass, starts[0], "short")}–${monthName(hass, end, "short")}`;
  }
  return [...set]
    .sort((a, b) => a - b)
    .map((m) => monthName(hass, m, "short"))
    .join(", ");
}

/** Format a date with the resolved locale ("Jun 30, 2027"). */
function formatDate(date: Date, hass: HomeAssistant | undefined, utc = false): string {
  return new Intl.DateTimeFormat(resolveLang(hass), {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(utc ? { timeZone: "UTC" } : {}),
  }).format(date);
}

/** Wrap schedule text with its season window, until date and repeat count, each as a whole localized phrase. */
function withLifecycle(
  text: string,
  window: string,
  until: string,
  count: unknown,
  hass: HomeAssistant | undefined,
): string {
  if (window) text = localize(hass, "card.schedule.with_season", { text, window });
  if (until) text = localize(hass, "card.schedule.with_until", { text, date: until });
  const n = Number(count ?? 0);
  if (n > 0) return localizePlural(hass, "card.schedule.with_times", n, { text });
  return text;
}

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

/** Localized ordinal for a positional value: 1 → "first", -1 → "last". */
export function positionWord(n: number, hass: HomeAssistant | undefined): string {
  const key = `card.position.${n}`;
  const word = localize(hass, key);
  if (word !== key) return word;
  return n > 0
    ? ordinalNumber(n, hass)
    : localize(hass, "card.position.nth_to_last", { ordinal: ordinalNumber(-n, hass) });
}

/** Localized ordinal for a day-of-month: 1 → "1st", 15 → "15th" (en); "1°"/"15°" (it). */
export function ordinalNumber(n: number, hass: HomeAssistant | undefined): string {
  return localizeOrdinal(hass, "card.ordinal", n, { n });
}

/** Phrase the monthly/yearly weekday spec: "last Friday", "second Monday". */
function bydayPhrase(
  byday: { ordinal: number | null; code: string }[],
  bysetpos: number[],
  hass: HomeAssistant | undefined,
): string {
  const dayName = (code: string) => weekdayName(hass, code);
  if (bysetpos.length) {
    return `${bysetpos.map((p) => positionWord(p, hass)).join(", ")} ${byday.map((e) => dayName(e.code)).join(", ")}`;
  }
  if (byday.some((e) => e.ordinal != null)) {
    return byday
      .map((e) => (e.ordinal != null ? `${positionWord(e.ordinal, hass)} ${dayName(e.code)}` : dayName(e.code)))
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
function formatScheduledSelector(
  selector: ChoreSelector | undefined,
  timeRaw: unknown,
  hass: HomeAssistant | undefined,
): string {
  const time = formatLocalTime(String(timeRaw ?? ""), hass);
  if (!selector?.frequency) return `${String(timeRaw ?? "")}`.trim() ? localize(hass, "card.schedule.at", { time }) : "";

  const freq = selector.frequency;
  const interval = Number(selector.interval ?? 1);
  const byday = parseByday(selector.byday);
  const bysetpos = asNumbers(selector.bysetpos);
  const bymonthday = asNumbers(selector.bymonthday);
  const bymonth = asNumbers(selector.bymonth);
  const lastDay = () => localize(hass, "card.schedule.last_day");
  const monthdayList = (days: number[]) =>
    days.map((d) => (d === -1 ? lastDay() : ordinalNumber(d, hass))).join(", ");

  let base: string;
  if (freq === "daily") {
    base = interval === 1 ? localize(hass, "card.freq.daily") : localize(hass, "card.freq.every_n_days", { n: interval });
  } else if (freq === "weekly") {
    if (interval === 1 && new Set(byday.map((e) => e.code)).size === 7) {
      // A weekly rule covering all seven days is just "Daily".
      base = localize(hass, "card.freq.daily");
    } else if (byday.length) {
      const days = byday.map((e) => weekdayName(hass, e.code)).join(", ");
      base = interval === 1 ? days : localize(hass, "card.freq.every_n_weeks_on", { n: interval, days });
    } else {
      base = interval === 1 ? localize(hass, "card.freq.weekly") : localize(hass, "card.freq.every_n_weeks", { n: interval });
    }
  } else if (freq === "monthly") {
    const lead = interval === 1 ? localize(hass, "card.freq.monthly") : localize(hass, "card.freq.every_n_months", { n: interval });
    if (byday.length) {
      const phrase = bydayPhrase(byday, bysetpos, hass);
      base =
        interval === 1
          ? capitalize(phrase)
          : localize(hass, "card.schedule.on_the", { lead, phrase });
    } else if (bymonthday.length) {
      const phrase = monthdayList(bymonthday);
      base = localize(hass, "card.schedule.on_the", { lead, phrase });
    } else {
      base = lead;
    }
  } else if (freq === "yearly") {
    let text = interval === 1 ? localize(hass, "card.freq.annually") : localize(hass, "card.freq.every_n_years", { n: interval });
    if (bymonth.length) {
      const months = bymonth.map((m) => monthName(hass, m, "short")).join(", ");
      text = localize(hass, "card.schedule.yearly_in_months", { base: text, months });
    }
    if (byday.length) {
      text = localize(hass, "card.schedule.yearly_on", { base: text, phrase: bydayPhrase(byday, bysetpos, hass) });
    } else if (bymonthday.length) {
      text = localize(hass, "card.schedule.yearly_on", { base: text, phrase: monthdayList(bymonthday) });
    }
    base = text;
  } else {
    base = freq;
  }

  // On a non-yearly frequency, bymonth is a season window ("Oct–Mar").
  const window = freq !== "yearly" ? formatMonthWindow(bymonth, hass) : "";
  // until is naive local ISO — Date() parses it in the local zone.
  const until = selector.until ? formatDate(new Date(String(selector.until)), hass) : "";

  return withLifecycle(localize(hass, "card.schedule.at_time", { base, time }), window, until, selector.count, hass);
}

/** Render an interval chore from freq/interval with season and lifecycle suffixes. */
function formatIntervalSchedule(schedule: Record<string, unknown>, hass: HomeAssistant | undefined): string {
  const freq = String(schedule.freq);
  const n = Number(schedule.interval ?? 1);
  const text =
    n === 1
      ? localize(hass, `card.interval.every_${freq}`)
      : localize(hass, `card.interval.every_n_${freq}`, { n });
  const window = formatMonthWindow(schedule.bymonth, hass);
  // until is naive local ISO — Date() parses it in the local zone.
  const until = schedule.until ? formatDate(new Date(String(schedule.until)), hass) : "";
  return withLifecycle(text, window, until, schedule.count, hass);
}

/** Format a schedule object (dict) into a human-readable string. */
export function formatSchedule(
  schedule: string | Record<string, unknown>,
  selector: ChoreSelector | undefined,
  hass: HomeAssistant | undefined,
): string {
  if (typeof schedule === "string") return schedule;

  // Scheduled chore: render from the structured selector ({ rrule } marks the
  // type; the recurrence text comes from selector fields, not the rrule string).
  if ("rrule" in schedule) {
    return formatScheduledSelector(selector, schedule.time, hass);
  }

  // Interval chore: { freq, interval, bymonth?, until?, count?, ... }
  if ("freq" in schedule) {
    return formatIntervalSchedule(schedule, hass);
  }

  // Oneshot chore: { due_datetime, pending_period_mins, grace_period_mins }
  if ("due_datetime" in schedule) {
    const due = schedule.due_datetime as string | null | undefined;
    if (!due) return localize(hass, "card.schedule.unscheduled");
    const target = new Date(due);
    return `${new Intl.DateTimeFormat(resolveLang(hass), {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: useAmPm(hass),
    }).format(target)}`;
  }

  return JSON.stringify(schedule);
}

/** Section display label for a status, localized. */
export function sectionLabel(status: ChoreStatus, hass: HomeAssistant | undefined): string {
  return localize(hass, `card.section.${status}`);
}

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
    "chore-complete-details": { item: EnrichedChoreItem };
    "chore-skip-details": { item: EnrichedChoreItem };
    "chore-completed": { item: EnrichedChoreItem };
    "hass-action": { config: Record<string, unknown>; action: string };
  }
}
