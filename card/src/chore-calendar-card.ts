import { LitElement, html, css, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "./define";
import type {
  ChoreCalendarCardConfig,
  ChoreItem,
  ChoreStatus,
  EnrichedChoreItem,
  EntityConfig,
  HomeAssistant,
  UnsubscribeFunc,
} from "./types";
import {
  applyPeriodFilters,
  durationToMs,
  groupByStatus,
  resolveEntityConfig,
  sortChores,
  SECTION_LABELS,
} from "./utils";

// Import sub-components so they register.
import "./components/chore-row";
import "./components/chore-detail-dialog";
import "./components/chore-edit-dialog";
import "./chore-calendar-card-editor";
import type { TargetOption } from "./components/chore-edit-dialog";

import { version } from "../../custom_components/chore_calendar/manifest.json";

const DOMAIN = "chore_calendar";

// eslint-disable-next-line no-console
console.info(
  `%c CHORE-CALENDAR-CARD %c v${version} `,
  "color: white; background: #4CAF50; font-weight: 700;",
  "color: #4CAF50; background: white; font-weight: 700;",
);

/** Section render order. */
const SECTION_ORDER: ChoreStatus[] = ["overdue", "due", "pending", "completed"];

export class ChoreCalendarCard extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @state() private _config!: ChoreCalendarCardConfig;
  @state() private _configError?: string;
  @state() private _items: EnrichedChoreItem[] = [];
  @state() private _loading = true;
  @state() private _dialogItem?: EnrichedChoreItem;
  @state() private _dialogOpen = false;
  @state() private _editItem?: EnrichedChoreItem;
  @state() private _editOpen = false;

  private _entityConfigs: (EntityConfig & { color: string })[] = [];
  private _refreshTimer?: ReturnType<typeof setInterval>;
  private _eventUnsub?: UnsubscribeFunc;
  private _connected = false;

  // -- HA card API ----------------------------------------------------------

  static getConfigElement() {
    return document.createElement("chore-calendar-card-editor");
  }

  static getStubConfig() {
    return { entities: [] };
  }

  setConfig(config: ChoreCalendarCardConfig) {
    if (!config.entities || config.entities.length === 0) {
      this._configError = "Please define at least one entity";
      this._config = config;
      return;
    }
    this._configError = undefined;
    this._config = config;
    this._entityConfigs = config.entities.map((e, i) =>
      resolveEntityConfig(e, i),
    );
    // Reflect hide_card_background as a host attribute for CSS.
    if (config.hide_card_background) {
      this.setAttribute("no-card-background", "");
    } else {
      this.removeAttribute("no-card-background");
    }
  }

  getCardSize(): number {
    return Math.max(3, this._items.length + 1);
  }

  // -- Lifecycle ------------------------------------------------------------

  connectedCallback() {
    super.connectedCallback();
    this._connected = true;
    this._startPolling();
    this._subscribeEvents();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._connected = false;
    this._stopPolling();
    this._unsubscribeEvents();
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has("hass") && this.hass) {
      // On first hass assignment or reconnect, fetch data.
      if (this._loading) {
        this._refreshData();
      }
    }
  }

  // -- Data fetching --------------------------------------------------------

  private async _refreshData() {
    if (!this.hass || !this._config) return;

    try {
      const allItems: EnrichedChoreItem[] = [];

      const promises = this._entityConfigs.map(async (cfg) => {
        const response = await this.hass.callWS<{
          response: {
            items: ChoreItem[];
            completed_cleared_at: string | null;
          };
        }>({
          type: "call_service",
          domain: DOMAIN,
          service: "get_items",
          service_data: { entity_id: cfg.entity },
          return_response: true,
        });

        const items = response.response?.items ?? [];
        // Per-list cutoff for hiding completed items (set by
        // chore_calendar.hide_completed_items / todo.remove_completed_items).
        // Items whose last_completed precedes this cutoff are hidden — composes
        // as AND with the optional completed_period filter applied below.
        const clearedAtMs = response.response?.completed_cleared_at
          ? new Date(response.response.completed_cleared_at).getTime()
          : null;
        const exclude = cfg.exclude ?? [];
        for (const item of items) {
          if (exclude.includes(item.status)) continue;
          if (
            clearedAtMs !== null &&
            item.status === "completed" &&
            item.last_completed &&
            new Date(item.last_completed).getTime() < clearedAtMs
          ) {
            continue;
          }
          allItems.push({
            ...item,
            source_entity: cfg.entity,
            source_color: cfg.color,
          });
        }
      });

      await Promise.all(promises);
      const dueMs = durationToMs(this._config.due_date_period);
      const completedMs = durationToMs(this._config.completed_period);
      const filtered = applyPeriodFilters(allItems, dueMs, completedMs, new Date());
      this._items = sortChores(filtered);
    } catch (err) {
      console.error("chore-calendar-card: failed to fetch items", err);
    } finally {
      this._loading = false;
    }
  }

  private _startPolling() {
    this._stopPolling();
    const interval = (this._config?.update_interval ?? 60) * 1000;
    this._refreshTimer = setInterval(() => {
      if (this._connected) this._refreshData();
    }, interval);
  }

  private _stopPolling() {
    if (this._refreshTimer !== undefined) {
      clearInterval(this._refreshTimer);
      this._refreshTimer = undefined;
    }
  }

  private async _subscribeEvents() {
    if (!this.hass?.connection) return;
    try {
      // Subscribe to state_changed (available to all users, including non-admin)
      // and filter to our configured entities for instant updates.
      const entityIds = new Set(this._entityConfigs.map((c) => c.entity));
      this._eventUnsub = await this.hass.connection.subscribeEvents(
        (ev: { data?: { entity_id?: string } }) => {
          if (ev.data?.entity_id && entityIds.has(ev.data.entity_id)) {
            this._refreshData();
          }
        },
        "state_changed",
      );
    } catch {
      // Connection may not be ready yet; polling handles it.
    }
  }

  private _unsubscribeEvents() {
    this._eventUnsub?.();
    this._eventUnsub = undefined;
  }

  // -- Rendering ------------------------------------------------------------

  static styles = css`
    :host {
      display: block;
    }

    ha-card {
      overflow: hidden;
      padding: 16px;
    }

    :host([no-card-background]) ha-card {
      background: none;
      box-shadow: none;
      border: none;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 0 8px;
    }

    .title {
      font-size: 16px;
      font-weight: 500;
      color: var(--primary-text-color);
    }

    .header .add {
      margin: -8px -8px -8px 0;
      color: var(--secondary-text-color);
    }

    .section-header {
      padding: 8px 0 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .section-header.overdue {
      color: var(--error-color, #db4437);
    }

    .section-header.due {
      color: var(--warning-color, #ff9800);
    }

    .section-header.pending {
      color: var(--secondary-text-color);
    }

    .section-header.completed {
      color: var(--secondary-text-color);
      opacity: 0.7;
    }

    .empty {
      padding: 32px 0;
      text-align: center;
      color: var(--secondary-text-color);
      font-size: 14px;
    }

    .placeholder {
      margin-bottom: 5px;
    }

    .placeholder-card {
      background: var(--card-background-color, var(--ha-card-background, white));
      border-radius: 0 5px 5px 0;
      border-left: 5px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      overflow: hidden;
    }

    .placeholder-row {
      display: flex;
      align-items: center;
      padding: 10px;
      gap: 12px;
      font-size: 14px;
      color: var(--secondary-text-color);
      font-style: italic;
    }

    .loading {
      padding: 32px 0;
      text-align: center;
      color: var(--secondary-text-color);
      font-size: 14px;
    }

`;

  protected render() {
    if (!this._config) return nothing;

    if (this._configError) {
      return html`
        <ha-card>
          <div class="empty">${this._configError}</div>
        </ha-card>
      `;
    }

    const title = this._config.title;
    const showAdd = !this._config.hide_add_button;
    return html`
      <ha-card
        @chore-detail=${this._onChoreDetail}
        @chore-edit=${this._onChoreEdit}
        @chore-completed=${this._onChoreCompleted}
      >
        ${title || showAdd
          ? html`
              <div class="header" part="header">
                ${title ? html`<span class="title" part="title">${title}</span>` : html`<span></span>`}
                ${showAdd
                  ? html`
                      <ha-icon-button class="add" part="add-button" title="Add chore" @click=${this._onAddChore}>
                        <ha-icon icon="mdi:plus"></ha-icon>
                      </ha-icon-button>
                    `
                  : nothing}
              </div>
            `
          : nothing}
        ${this._loading
          ? html`<div class="loading">Loading...</div>`
          : this._renderSections()}
      </ha-card>
      <chore-detail-dialog
        .hass=${this.hass}
        .item=${this._dialogItem}
        .open=${this._dialogOpen}
        .allowUncomplete=${!!this._config.allow_uncomplete}
        .allowEdit=${!this._config.hide_edit_button}
        @detail-dialog-closed=${this._onDialogClosed}
        @chore-edit=${this._onChoreEdit}
        @chore-completed=${this._onChoreCompleted}
        @chore-uncompleted=${this._onChoreCompleted}
        @chore-skipped=${this._onChoreCompleted}
      ></chore-detail-dialog>
      <chore-edit-dialog
        .hass=${this.hass}
        .item=${this._editItem}
        .open=${this._editOpen}
        .targets=${this._targetOptions()}
        .defaultTarget=${this._entityConfigs[0]?.entity}
        @edit-dialog-closed=${this._onEditClosed}
        @chore-saved=${this._onChoreSaved}
      ></chore-edit-dialog>
    `;
  }

  private _renderSections() {
    const groups = groupByStatus(this._items);
    const hideCompleted = !!this._config.hide_completed;
    const hideSections = !!this._config.hide_section_headers;

    const visibleSections = SECTION_ORDER.filter((status) => {
      const items = groups.get(status);
      if (!items || items.length === 0) return false;
      if (status === "completed" && hideCompleted) return false;
      return true;
    });

    if (visibleSections.length === 0) {
      return html`
        <div class="placeholder">
          <div class="placeholder-card">
            <div class="placeholder-row">No chores</div>
          </div>
        </div>
      `;
    }

    return html`
      ${visibleSections.map((status) => {
        const items = groups.get(status)!;
        return html`
          ${!hideSections
            ? html`<div class="section-header ${status}" part="section-header section-header-${status}">
                ${SECTION_LABELS[status]}
              </div>`
            : nothing}
          ${items.map(
            (item) => html`
              <chore-row
                .hass=${this.hass}
                .item=${item}
                .tapAction=${this._config.tap_action ?? { action: "details" }}
                .holdAction=${this._config.hold_action ?? { action: "none" }}
                .doubleTapAction=${this._config.double_tap_action ?? { action: "none" }}
              ></chore-row>
            `,
          )}
        `;
      })}
    `;
  }

  private _onChoreDetail(e: CustomEvent<{ item: EnrichedChoreItem }>) {
    this._dialogItem = e.detail.item;
    this._dialogOpen = true;
  }

  private _onDialogClosed() {
    this._dialogOpen = false;
  }

  private _onChoreCompleted() {
    this._dialogOpen = false;
    this._refreshData();
  }

  private _onAddChore() {
    this._editItem = undefined;
    this._editOpen = true;
  }

  private _onChoreEdit(e: CustomEvent<{ item: EnrichedChoreItem }>) {
    // Close the detail view and open the editor for the same chore.
    this._dialogOpen = false;
    this._editItem = e.detail.item;
    this._editOpen = true;
  }

  private _onEditClosed() {
    this._editOpen = false;
  }

  private _onChoreSaved() {
    this._editOpen = false;
    this._refreshData();
  }

  /** Configured lists as edit-dialog target options, labelled by friendly name. */
  private _targetOptions(): TargetOption[] {
    return this._entityConfigs.map((cfg) => ({
      value: cfg.entity,
      label:
        (this.hass?.states?.[cfg.entity]?.attributes?.friendly_name as string) ??
        cfg.entity,
    }));
  }
}

// -- Card picker registration -----------------------------------------------

interface CustomCardEntry {
  type: string;
  name: string;
  description: string;
  preview?: boolean;
}

declare global {
  interface Window {
    customCards?: CustomCardEntry[];
  }
  interface HTMLElementTagNameMap {
    "chore-calendar-card": ChoreCalendarCard;
  }
}

safeDefine("chore-calendar-card", ChoreCalendarCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "chore-calendar-card",
  name: "Chore Calendar",
  description: "Timeline view of chores from Chore Calendar lists",
  preview: true,
});
