/** Chore item as returned by chore_calendar.get_items service. */
export interface ChoreItem {
  chore_id: string;
  chore_name: string;
  chore_type: "scheduled" | "interval";
  status: ChoreStatus;
  next_due: string | null;
  last_completed: string | null;
  last_completed_by: string | null;
  assigned_to: string[];
  trigger_entity: string | null;
  schedule: string;
}

export type ChoreStatus = "completed" | "pending" | "due" | "overdue";

/** Per-entity config entry. */
export interface EntityConfig {
  entity: string;
  color?: string;
}

/** Card configuration. */
export interface ChoreCalendarCardConfig {
  type: string;
  title?: string;
  entities: (string | EntityConfig)[];
  show_header?: boolean;
  show_completed?: boolean;
  completed_limit?: number;
  hide_filter?: boolean;
  hide_sections?: boolean;
  default_filter?: FilterValue;
  update_interval?: number;
  compact?: boolean;
  no_card_background?: boolean;
}

export type FilterValue =
  | "all"
  | "active"
  | "overdue"
  | "due"
  | "pending"
  | "completed";

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
