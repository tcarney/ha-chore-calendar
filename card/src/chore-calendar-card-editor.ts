import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type {
  ChoreCalendarCardConfig,
  EntityConfig,
  HomeAssistant,
} from "./types";

interface HaFormSchema {
  name: string;
  selector: Record<string, unknown>;
  default?: unknown;
  required?: boolean;
}

/** Schema for ha-form options (excludes entities which are handled separately). */
const OPTIONS_SCHEMA: HaFormSchema[] = [
  { name: "title", selector: { text: {} } },
  { name: "show_header", selector: { boolean: {} }, default: true },
  { name: "show_completed", selector: { boolean: {} }, default: true },
  { name: "hide_filter", selector: { boolean: {} }, default: false },
  { name: "hide_sections", selector: { boolean: {} }, default: false },
  {
    name: "default_filter",
    selector: {
      select: {
        options: [
          { value: "active", label: "Active" },
          { value: "all", label: "All" },
          { value: "overdue", label: "Overdue" },
          { value: "due", label: "Due" },
          { value: "pending", label: "Pending" },
          { value: "completed", label: "Completed" },
        ],
        mode: "dropdown",
      },
    },
    default: "active",
  },
  { name: "no_card_background", selector: { boolean: {} }, default: false },
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

const LABELS: Record<string, string> = {
  title: "Title",
  show_header: "Show header",
  show_completed: "Show completed section",
  hide_filter: "Hide status filter",
  hide_sections: "Hide section headings",
  default_filter: "Default filter",
  no_card_background: "Transparent card background",
  completed_limit: "Completed chores limit",
  update_interval: "Update interval (seconds)",
};

/** Normalize a config entity entry to EntityConfig. */
function normalizeEntity(entry: string | EntityConfig): EntityConfig {
  return typeof entry === "string" ? { entity: entry } : { ...entry };
}

@customElement("chore-calendar-card-editor")
export class ChoreCalendarCardEditor extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @state() private _config!: ChoreCalendarCardConfig;

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

    .entity-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
    }

    .entity-picker {
      flex: 1;
      min-width: 0;
    }

    .color-input {
      width: 36px;
      height: 36px;
      padding: 2px;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
      flex-shrink: 0;
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
      ${entities.map(
        (cfg, idx) => html`
          <div class="entity-row">
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
            <input
              type="color"
              class="color-input"
              .value=${cfg.color ?? "#4285F4"}
              title="List color"
              @input=${(ev: InputEvent) => this._colorChanged(ev, idx)}
            />
            <button
              class="remove-btn"
              title="Remove"
              @click=${() => this._removeEntity(idx)}
            >
              ✕
            </button>
          </div>
        `,
      )}
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

  private _entityChanged(ev: CustomEvent, index: number) {
    ev.stopPropagation();
    const entities = (this._config.entities ?? []).map(normalizeEntity);
    entities[index] = { ...entities[index], entity: ev.detail.value.entity };
    this._config = { ...this._config, entities };
    this._dispatch();
  }

  private _colorChanged(ev: InputEvent, index: number) {
    const color = (ev.target as HTMLInputElement).value;
    const entities = (this._config.entities ?? []).map(normalizeEntity);
    entities[index] = { ...entities[index], color };
    this._config = { ...this._config, entities };
    this._dispatch();
  }

  private _removeEntity(index: number) {
    const entities = (this._config.entities ?? [])
      .map(normalizeEntity)
      .filter((_, i) => i !== index);
    this._config = { ...this._config, entities };
    this._dispatch();
  }

  private _addEntity() {
    const entities = [
      ...(this._config.entities ?? []).map(normalizeEntity),
      { entity: "" },
    ];
    this._config = { ...this._config, entities };
    this._dispatch();
  }

  private _optionsChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (!this._config || !this.hass) return;
    // Merge options back, preserving entities (which ha-form doesn't manage).
    this._config = { ...ev.detail.value, entities: this._config.entities };
    this._dispatch();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "chore-calendar-card-editor": ChoreCalendarCardEditor;
  }
}
