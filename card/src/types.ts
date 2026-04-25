/** Chore item as returned by chore_calendar.get_items service. */
export interface ChoreItem {
  uid: string;
  chore_name: string;
  chore_type: "scheduled" | "interval";
  status: ChoreStatus;
  next_due: string | null;
  last_completed: string | null;
  last_completed_by: string | null;
  assigned_to: string[];
  trigger_entity: string | null;
  schedule: string | Record<string, unknown>;
}

export type ChoreStatus = "completed" | "pending" | "due" | "overdue";

/** Per-entity config entry. */
export interface EntityConfig {
  entity: string;
  color?: string;
  exclude?: ChoreStatus[];
}

/** Action configuration for tap/hold/double-tap gestures. */
export interface ActionConfig {
  action: string;
  service?: string;
  service_data?: Record<string, unknown>;
  data?: Record<string, unknown>;
  target?: Record<string, unknown>;
  navigation_path?: string;
  url_path?: string;
}

/** Options for the action handler directive. */
export interface ActionHandlerOptions {
  hasHold?: boolean;
  hasDoubleClick?: boolean;
  disabled?: boolean;
}

/** Detail payload for action handler events. */
export interface ActionHandlerDetail {
  action: "hold" | "tap" | "double_tap";
}

/** HA-style duration dict (matches the `duration` selector). */
export interface DurationConfig {
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}

/** Card configuration. */
export interface ChoreCalendarCardConfig {
  type: string;
  title?: string;
  entities: (string | EntityConfig)[];
  hide_completed?: boolean;
  /**
   * Hide pending chores whose ``next_due`` is further in the future than this
   * relative duration. Overdue and due chores always pass this filter (their
   * ``next_due`` is already at or before ``now``). Omit / set to all-zero for
   * no filter (default).
   */
  due_date_period?: DurationConfig;
  /**
   * Hide completed chores whose ``last_completed`` is further in the past than
   * this relative duration. Omit / set to all-zero for no filter (default).
   */
  completed_period?: DurationConfig;
  hide_section_headers?: boolean;
  update_interval?: number;
  compact?: boolean;
  hide_card_background?: boolean;
  allow_uncomplete?: boolean;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

/** Chore item enriched with source entity info for rendering. */
export interface EnrichedChoreItem extends ChoreItem {
  /** Calendar entity this chore belongs to. */
  source_entity: string;
  /** Color assigned to this source entity. */
  source_color: string;
}

/** Minimal Home Assistant types used by the card. */
export interface HomeAssistant {
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: Record<string, unknown>,
    notifyOnError?: boolean,
    returnResponse?: boolean,
  ): Promise<Record<string, unknown>>;
  callWS<T>(msg: Record<string, unknown>): Promise<T>;
  connection: HassConnection;
  states: Record<string, HassEntity>;
  language: string;
}

export interface HassConnection {
  subscribeEvents(
    callback: (event: HassEvent) => void,
    eventType: string,
  ): Promise<UnsubscribeFunc>;
}

export type UnsubscribeFunc = () => void;

export interface HassEvent {
  data: Record<string, unknown>;
}

export interface HassEntity {
  state: string;
  attributes: Record<string, unknown>;
}
