import { LitElement, html, css } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "./define";
import type {
  ActionConfig,
  ChoreCalendarCardConfig,
  ChoreStatus,
  DurationConfig,
  EntityConfig,
  HomeAssistant,
} from "./types";
import { themeColorToCss } from "./utils";
import { localize, statusLabel } from "./localize/localize";

interface HaFormSchema {
  name: string;
  selector: Record<string, unknown>;
  default?: unknown;
  required?: boolean;
}

/** Just the title; the boolean toggles render as a compact custom grid below. */
const OPTIONS_SCHEMA_TOP: HaFormSchema[] = [{ name: "title", selector: { text: {} } }];

/** Boolean card options in display order; labels come from editor.option.*. */
const TOGGLE_KEYS: (keyof ChoreCalendarCardConfig)[] = [
  "hide_completed",
  "hide_section_headers",
  "hide_card_background",
  "allow_uncomplete",
  "hide_add_button",
  "hide_edit_button",
  "hide_show_all",
];

/** Options below the period rows. */
const OPTIONS_SCHEMA_BOTTOM: HaFormSchema[] = [
  {
    name: "update_interval",
    selector: { number: { min: 10, max: 600, step: 10, mode: "box" } },
    default: 60,
  },
];

/** Period filter rows in display order; labels come from editor.field.*. */
const PERIOD_KEYS: ("due_date_period" | "completed_period")[] = ["due_date_period", "completed_period"];

/** Tap/hold/double-tap action values in dropdown order. */
const ACTION_VALUES = ["details", "edit", "complete", "more-info", "navigate", "url", "call-service", "none"];

/** Map an action value to its editor.action.* subkey (hyphens → underscores). */
const ACTION_KEY: Record<string, string> = {
  "details": "details",
  "edit": "edit",
  "complete": "complete",
  "more-info": "more_info",
  "navigate": "navigate",
  "url": "url",
  "call-service": "call_service",
  "none": "none",
};

/** Statuses offered by the per-entity exclude control. */
const EXCLUDE_STATUSES: ChoreStatus[] = ["overdue", "due", "pending", "completed"];

/** Map an ha-form field name to its editor translation key. */
const EDITOR_LABEL_KEYS: Record<string, string> = {
  title: "editor.field.title",
  update_interval: "editor.field.update_interval",
  tap_action: "editor.field.tap_action",
  hold_action: "editor.field.hold_action",
  double_tap_action: "editor.field.double_tap_action",
  exclude: "editor.field.exclude",
  hide_completed: "editor.option.hide_completed",
  hide_section_headers: "editor.option.hide_section_headers",
  hide_card_background: "editor.option.hide_card_background",
  allow_uncomplete: "editor.option.allow_uncomplete",
  hide_add_button: "editor.option.hide_add_button",
  hide_edit_button: "editor.option.hide_edit_button",
  hide_show_all: "editor.option.hide_show_all",
};

/** Normalize a config entity entry to EntityConfig. */
function normalizeEntity(entry: string | EntityConfig): EntityConfig {
  return typeof entry === "string" ? { entity: entry } : { ...entry };
}

/** Derive a friendly name from an entity ID (e.g. "calendar.daily_chores" → "Daily Chores").
 *  Returns "" for an unset entity so the caller can supply a localized fallback. */
function entityDisplayName(entityId: string): string {
  if (!entityId) return "";
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

  /** Tap/hold/double-tap action selectors, options localized per render. */
  private get _actionsSchema(): HaFormSchema[] {
    const options = ACTION_VALUES.map((value) => ({
      value,
      label: localize(this.hass, `editor.action.${ACTION_KEY[value]}`),
    }));
    return [
      { name: "tap_action", selector: { select: { options, mode: "dropdown" } }, default: "details" },
      { name: "hold_action", selector: { select: { options, mode: "dropdown" } }, default: "none" },
      { name: "double_tap_action", selector: { select: { options, mode: "dropdown" } }, default: "none" },
    ];
  }

  /** Per-entity status-exclude selector; status labels reuse the integration's. */
  private get _excludeSchema(): HaFormSchema[] {
    return [
      {
        name: "exclude",
        selector: {
          select: {
            multiple: true,
            options: EXCLUDE_STATUSES.map((value) => ({ value, label: statusLabel(this.hass, value) })),
          },
        },
      },
    ];
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

    .period-group {
      /* Matches ha-form's between-field rhythm so the bottom options form
         doesn't sit flush against the last period row. */
      margin-bottom: 16px;
    }

    .period-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
    }

    .period-label {
      flex: 1;
      font-size: 14px;
      color: var(--primary-text-color);
    }

    .period-inputs {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }

    .period-inputs ha-input {
      width: 88px;
    }

    .toggles {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
      column-gap: 16px;
      row-gap: 0;
      margin: 4px 0 16px;
    }

    .toggles ha-formfield {
      width: 100%;
      min-height: 40px;
    }
  `;

  protected render() {
    if (!this.hass || !this._config) return html``;

    const entities = (this._config.entities ?? []).map(normalizeEntity);

    return html`
      <div class="entities-header">
        <span>${localize(this.hass, "editor.section.entities")}</span>
      </div>
      ${entities.map((cfg, idx) => {
        const name = entityDisplayName(cfg.entity) || localize(this.hass, "editor.entity.new_name");
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
                .computeLabel=${() => localize(this.hass, "editor.field.color")}
                @value-changed=${(ev: CustomEvent) =>
                  this._colorChanged(ev, idx)}
              ></ha-form>
              <ha-form
                .hass=${this.hass}
                .data=${{ exclude: cfg.exclude ?? [] }}
                .schema=${this._excludeSchema}
                .computeLabel=${this._computeLabel}
                @value-changed=${(ev: CustomEvent) =>
                  this._excludeChanged(ev, idx)}
              ></ha-form>
              <button
                class="remove-btn"
                title=${localize(this.hass, "editor.button.remove_entity_title")}
                @click=${() => this._removeEntity(idx)}
                style="align-self: flex-end"
              >
                ✕ ${localize(this.hass, "editor.button.remove_entity")}
              </button>
            </div>
          </ha-expansion-panel>
        `;
      })}
      ${entities.length === 0
        ? html`<button class="add-btn" @click=${this._addEntity}>
            + ${localize(this.hass, "editor.button.add_entity")}
          </button>`
        : html`<button class="add-btn" @click=${this._addEntity}>
            + ${localize(this.hass, "editor.button.add_another_entity")}
          </button>`}

      <div class="divider"></div>

      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${OPTIONS_SCHEMA_TOP}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._optionsChanged}
      ></ha-form>

      <div class="toggles">
        ${TOGGLE_KEYS.map(
          (key) => html`
            <ha-formfield alignEnd spaceBetween .label=${localize(this.hass, EDITOR_LABEL_KEYS[key])}>
              <ha-switch
                .checked=${!!this._config[key]}
                @change=${(ev: Event) => this._toggleChanged(key, ev)}
              ></ha-switch>
            </ha-formfield>
          `,
        )}
      </div>

      <div class="period-group">
        ${PERIOD_KEYS.map((key) => this._renderPeriodRow(key, localize(this.hass, `editor.field.${key}`)))}
      </div>

      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${OPTIONS_SCHEMA_BOTTOM}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._optionsChanged}
      ></ha-form>

      <div class="divider"></div>

      <ha-form
        .hass=${this.hass}
        .data=${this._actionsFormData()}
        .schema=${this._actionsSchema}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._actionsChanged}
      ></ha-form>
    `;
  }

  private _computeLabel = (schema: HaFormSchema): string => {
    const key = EDITOR_LABEL_KEYS[schema.name];
    return key ? localize(this.hass, key) : schema.name;
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
    // Fall back to the card's own action defaults so the editor shows what an
    // unset action actually does (tap → details, hold → edit).
    return {
      tap_action: this._actionToString(this._config.tap_action) || "details",
      hold_action: this._actionToString(this._config.hold_action) || "none",
      double_tap_action: this._actionToString(this._config.double_tap_action) || "none",
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

  private _renderPeriodRow(key: "due_date_period" | "completed_period", label: string) {
    const current = this._config[key] ?? {};
    // If either unit is set, show both (the missing one as "0"). If neither is
    // set, both fields stay blank so the placeholders are visible.
    const anySet = !!(current.days || current.hours);
    const daysValue = anySet ? String(current.days ?? 0) : "";
    const hoursValue = anySet ? String(current.hours ?? 0) : "";
    return html`
      <div class="period-row">
        <span class="period-label">${label}</span>
        <div class="period-inputs">
          <ha-input
            appearance="outlined"
            type="number"
            min="0"
            max="365"
            placeholder=${localize(this.hass, "editor.placeholder.days")}
            .value=${daysValue}
            @change=${(ev: Event) =>
              this._setPeriod(key, "days", (ev.target as HTMLInputElement).value)}
          ></ha-input>
          <ha-input
            appearance="outlined"
            type="number"
            min="0"
            max="23"
            placeholder=${localize(this.hass, "editor.placeholder.hours")}
            .value=${hoursValue}
            @change=${(ev: Event) =>
              this._setPeriod(key, "hours", (ev.target as HTMLInputElement).value)}
          ></ha-input>
        </div>
      </div>
    `;
  }

  private _setPeriod(
    key: "due_date_period" | "completed_period",
    unit: "days" | "hours",
    raw: string,
  ) {
    if (!this._config) return;
    const value = Math.max(0, Math.floor(Number(raw) || 0));
    const current = this._config[key] ?? {};
    const next: DurationConfig = { ...current, [unit]: value };
    // Drop zero fields; if both are zero, drop the whole key.
    if (!next.days) delete next.days;
    if (!next.hours) delete next.hours;
    const hasValue = Object.keys(next).length > 0;
    this._config = { ...this._config, [key]: hasValue ? next : undefined };
    this._dispatch();
  }

  private _toggleChanged(key: keyof ChoreCalendarCardConfig, ev: Event) {
    if (!this._config) return;
    const checked = (ev.target as HTMLInputElement).checked;
    this._config = { ...this._config, [key]: checked };
    this._dispatch();
  }

  private _optionsChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (!this._config || !this.hass) return;
    // Shallow-merge the form's values onto the current config. The options
    // are split across two forms (above/below the period rows), so either
    // form's value-changed event only carries its own fields — merging (rather
    // than replacing) preserves fields managed by the other form, plus
    // entities, periods, and actions which aren't in any ha-form here.
    this._config = { ...this._config, ...ev.detail.value };
    this._dispatch();
  }
}

safeDefine("chore-calendar-card-editor", ChoreCalendarCardEditor);

declare global {
  interface HTMLElementTagNameMap {
    "chore-calendar-card-editor": ChoreCalendarCardEditor;
  }
}
