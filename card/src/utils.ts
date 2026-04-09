import type { ChoreStatus, EnrichedChoreItem, EntityConfig } from "./types";

/** Default color palette for multi-list color bars. */
const DEFAULT_COLORS = [
  "#4285F4",
  "#EA4335",
  "#FBBC04",
  "#34A853",
  "#FF6D01",
  "#46BDC6",
  "#7B1FA2",
  "#C2185B",
];

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
        const diffMs = now.getTime() - new Date(item.next_due).getTime();
        return `Overdue by ${formatDuration(diffMs)}`;
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
