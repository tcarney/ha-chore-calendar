import { LitElement, html, css } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "./define";
import type {
  ActionConfig,
  ChoreCalendarCardConfig,
  ChoreStatus,
  EntityConfig,
  HomeAssistant,
} from "./types";
import { themeColorToCss } from "./utils";

interface HaFormSchema {
  name: string;
  selector: Record<string, unknown>;
  default?: unknown;
  required?: boolean;
}

/** Schema for ha-form options (excludes entities which are handled separately). */
const OPTIONS_SCHEMA: HaFormSchema[] = [
  { name: "title", selector: { text: {} } },
  { name: "hide_completed", selector: { boolean: {} }, default: false },
  { name: "hide_pending", selector: { boolean: {} }, default: false },
  { name: "hide_section_headers", selector: { boolean: {} }, default: false },
  { name: "hide_card_background", selector: { boolean: {} }, default: false },
  { name: "allow_uncomplete", selector: { boolean: {} }, default: false },
  {
    name: "completed_limit",
    selector: { number: { min: 0, max: 50, step: 1, mode: "box" } },
    default: 3,
  },
  {
    name: "update_interval",
    selector: { number: { min: 10, max: 600, step: 10, mode: "box" } },
    default: 60,
  },
];

const ACTION_OPTIONS = [
  { value: "details", label: "Chore Details" },
  { value: "complete", label: "Complete Chore" },
  { value: "more-info", label: "More Info" },
  { value: "navigate", label: "Navigate" },
  { value: "url", label: "URL" },
  { value: "call-service", label: "Call Service" },
  { value: "none", label: "None" },
];

const ACTIONS_SCHEMA: HaFormSchema[] = [
  {
    name: "tap_action",
    selector: { select: { options: ACTION_OPTIONS, mode: "dropdown" } },
    default: "details",
  },
  {
    name: "hold_action",
    selector: { select: { options: ACTION_OPTIONS, mode: "dropdown" } },
    default: "none",
  },
  {
    name: "double_tap_action",
    selector: { select: { options: ACTION_OPTIONS, mode: "dropdown" } },
    default: "none",
  },
];

const EXCLUDE_SCHEMA: HaFormSchema[] = [
  {
    name: "exclude",
    selector: {
      select: {
        multiple: true,
        options: [
          { value: "overdue", label: "Overdue" },
          { value: "due", label: "Due" },
          { value: "pending", label: "Pending" },
          { value: "completed", label: "Completed" },
        ],
      },
    },
  },
];

const LABELS: Record<string, string> = {
  title: "Title",
  hide_completed: "Hide completed section",
  hide_pending: "Hide pending section",
  hide_section_headers: "Hide section headings",
  hide_card_background: "Hide card background",
  allow_uncomplete: "Allow uncomplete",
  completed_limit: "Completed chores limit",
  update_interval: "Update interval (seconds)",
  tap_action: "Tap action",
  hold_action: "Hold action",
  double_tap_action: "Double-tap action",
  exclude: "Exclude statuses",
};

/** Normalize a config entity entry to EntityConfig. */
function normalizeEntity(entry: string | EntityConfig): EntityConfig {
  return typeof entry === "string" ? { entity: entry } : { ...entry };
}

/** Derive a friendly name from an entity ID (e.g. "calendar.daily_chores" → "Daily Chores"). */
function entityDisplayName(entityId: string): string {
  if (!entityId) return "New entity";
  const name = entityId.split(".").pop() ?? entityId;
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export class ChoreCalendarCardEditor extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @state() private _config!: ChoreCalendarCardConfig;
  @state() private _expandedEntities = new Set<number>();

  setConfig(config: ChoreCalendarCardConfig) {
    this._config = { ...config };
  }

  static styles = css`
    .entities-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0 4px;
      font-size: 12px;
      font-weight: 500;
      color: var(--secondary-text-color);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    ha-expansion-panel {
      margin-bottom: 4px;
      --expansion-panel-summary-padding: 0 8px;
      --expansion-panel-content-padding: 0 8px 8px;
    }

    .entity-header {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }

    .entity-color-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .entity-name {
      font-size: 14px;
      font-weight: 400;
      color: var(--primary-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .entity-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .entity-picker {
      min-width: 0;
    }

    .remove-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--secondary-text-color);
      padding: 4px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .remove-btn:hover {
      color: var(--error-color);
      background: var(--secondary-background-color);
    }

    .add-btn {
      width: 100%;
      padding: 8px;
      margin-top: 4px;
      background: none;
      border: 1px dashed var(--divider-color, rgba(0, 0, 0, 0.12));
      border-radius: 8px;
      color: var(--primary-color);
      cursor: pointer;
      font-size: 13px;
      font-family: inherit;
    }

    .add-btn:hover {
      background: var(--secondary-background-color);
    }

    .divider {
      border-top: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      margin: 12px 0;
    }
  `;

  protected render() {
    if (!this.hass || !this._config) return html``;

    const entities = (this._config.entities ?? []).map(normalizeEntity);

    return html`
      <div class="entities-header">
        <span>Entities</span>
      </div>
      ${entities.map((cfg, idx) => {
        const name = entityDisplayName(cfg.entity);
        const color = cfg.color ?? "";
        const expanded = this._expandedEntities.has(idx);

        return html`
          <ha-expansion-panel
            .expanded=${expanded}
            @expanded-changed=${(ev: CustomEvent) =>
              this._toggleExpanded(ev, idx)}
          >
            <div class="entity-header" slot="header">
              <span
                class="entity-color-dot"
                style="background-color: ${color ? themeColorToCss(color) : "var(--primary-color)"}"
              ></span>
              <span class="entity-name">${name}</span>
            </div>
            <div class="entity-content">
              <ha-form
                class="entity-picker"
                .hass=${this.hass}
                .data=${{ entity: cfg.entity }}
                .schema=${[
                  {
                    name: "entity",
                    selector: {
                      entity: {
                        domain: "calendar",
                        integration: "chore_calendar",
                      },
                    },
                  },
                ]}
                .computeLabel=${() => ""}
                @value-changed=${(ev: CustomEvent) =>
                  this._entityChanged(ev, idx)}
              ></ha-form>
              <ha-form
                .hass=${this.hass}
                .data=${{ color: cfg.color ?? "" }}
                .schema=${[
                  {
                    name: "color",
                    selector: { ui_color: {} },
                  },
                ]}
                .computeLabel=${() => "List color"}
                @value-changed=${(ev: CustomEvent) =>
                  this._colorChanged(ev, idx)}
              ></ha-form>
              <ha-form
                .hass=${this.hass}
                .data=${{ exclude: cfg.exclude ?? [] }}
                .schema=${EXCLUDE_SCHEMA}
                .computeLabel=${this._computeLabel}
                @value-changed=${(ev: CustomEvent) =>
                  this._excludeChanged(ev, idx)}
              ></ha-form>
              <button
                class="remove-btn"
                title="Remove entity"
                @click=${() => this._removeEntity(idx)}
                style="align-self: flex-end"
              >
                ✕ Remove
              </button>
            </div>
          </ha-expansion-panel>
        `;
      })}
      ${entities.length === 0
        ? html`<button class="add-btn" @click=${this._addEntity}>
            + Add entity
          </button>`
        : html`<button class="add-btn" @click=${this._addEntity}>
            + Add another entity
          </button>`}

      <div class="divider"></div>

      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${OPTIONS_SCHEMA}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._optionsChanged}
      ></ha-form>

      <div class="divider"></div>

      <ha-form
        .hass=${this.hass}
        .data=${this._actionsFormData()}
        .schema=${ACTIONS_SCHEMA}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._actionsChanged}
      ></ha-form>
    `;
  }

  private _computeLabel = (schema: HaFormSchema): string => {
    return LABELS[schema.name] ?? schema.name;
  };

  private _dispatch() {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _toggleExpanded(ev: CustomEvent, index: number) {
    const expanded = ev.detail.expanded as boolean;
    const next = new Set(this._expandedEntities);
    if (expanded) {
      next.add(index);
    } else {
      next.delete(index);
    }
    this._expandedEntities = next;
  }

  private _entityChanged(ev: CustomEvent, index: number) {
    ev.stopPropagation();
    const entities = (this._config.entities ?? []).map(normalizeEntity);
    entities[index] = { ...entities[index], entity: ev.detail.value.entity };
    this._config = { ...this._config, entities };
    this._dispatch();
  }

  private _colorChanged(ev: CustomEvent, index: number) {
    ev.stopPropagation();
    const color = ev.detail.value?.color as string | undefined;
    const entities = (this._config.entities ?? []).map(normalizeEntity);
    entities[index] = { ...entities[index], color: color || undefined };
    this._config = { ...this._config, entities };
    this._dispatch();
  }

  private _excludeChanged(ev: CustomEvent, index: number) {
    ev.stopPropagation();
    const exclude =
      (ev.detail.value.exclude as ChoreStatus[]) ?? [];
    const entities = (this._config.entities ?? []).map(normalizeEntity);
    entities[index] = { ...entities[index], exclude };
    this._config = { ...this._config, entities };
    this._dispatch();
  }

  private _removeEntity(index: number) {
    const entities = (this._config.entities ?? [])
      .map(normalizeEntity)
      .filter((_, i) => i !== index);
    // Rebuild expanded set — indices shift after removal.
    const next = new Set<number>();
    for (const i of this._expandedEntities) {
      if (i < index) next.add(i);
      else if (i > index) next.add(i - 1);
    }
    this._expandedEntities = next;
    this._config = { ...this._config, entities };
    this._dispatch();
  }

  private _addEntity() {
    const entities = [
      ...(this._config.entities ?? []).map(normalizeEntity),
      { entity: "" },
    ];
    const newIndex = entities.length - 1;
    const next = new Set(this._expandedEntities);
    next.add(newIndex);
    this._expandedEntities = next;
    this._config = { ...this._config, entities };
    this._dispatch();
  }

  /** Extract the action string from an ActionConfig object. */
  private _actionToString(action?: ActionConfig): string {
    return action?.action ?? "";
  }

  /** Build flat form data for the actions ha-form (strings, not ActionConfig objects). */
  private _actionsFormData(): Record<string, string> {
    return {
      tap_action: this._actionToString(this._config.tap_action),
      hold_action: this._actionToString(this._config.hold_action),
      double_tap_action: this._actionToString(this._config.double_tap_action),
    };
  }

  private _actionsChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (!this._config || !this.hass) return;
    const values = ev.detail.value as Record<string, string>;
    const toActionConfig = (val: string): ActionConfig | undefined =>
      val ? { action: val } : undefined;
    this._config = {
      ...this._config,
      tap_action: toActionConfig(values.tap_action),
      hold_action: toActionConfig(values.hold_action),
      double_tap_action: toActionConfig(values.double_tap_action),
    };
    this._dispatch();
  }

  private _optionsChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (!this._config || !this.hass) return;
    // Merge options back, preserving entities and actions (which ha-form doesn't manage).
    this._config = {
      ...ev.detail.value,
      entities: this._config.entities,
      tap_action: this._config.tap_action,
      hold_action: this._config.hold_action,
      double_tap_action: this._config.double_tap_action,
    };
    this._dispatch();
  }
}

safeDefine("chore-calendar-card-editor", ChoreCalendarCardEditor);

declare global {
  interface HTMLElementTagNameMap {
    "chore-calendar-card-editor": ChoreCalendarCardEditor;
  }
}
