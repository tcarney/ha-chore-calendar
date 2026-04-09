// Must be first — patches LitElement.createRenderRoot for Safari compatibility.
import "./patch-adopt-styles";
import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type {
  ChoreCalendarCardConfig,
  ChoreItem,
  ChoreStatus,
  EnrichedChoreItem,
  EntityConfig,
  FilterValue,
  HomeAssistant,
  UnsubscribeFunc,
} from "./types";
import {
  groupByStatus,
  resolveEntityConfig,
  sortChores,
  SECTION_LABELS,
} from "./utils";

// Import sub-components so they register.
import "./components/chore-row";
import "./components/status-filter";
import "./chore-calendar-card-editor";

const DOMAIN = "chore_calendar";

/** Section render order. */
const SECTION_ORDER: ChoreStatus[] = ["overdue", "due", "pending", "completed"];

@customElement("chore-calendar-card")
export class ChoreCalendarCard extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @state() private _config!: ChoreCalendarCardConfig;
  @state() private _items: EnrichedChoreItem[] = [];
  @state() private _filter: FilterValue = "active";
  @state() private _showAllCompleted = false;
  @state() private _loading = true;

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
      throw new Error("Please define at least one entity");
    }
    this._config = config;
    this._entityConfigs = config.entities.map((e, i) =>
      resolveEntityConfig(e, i),
    );
    this._filter = config.default_filter ?? "active";
    if (config.hide_filter && !config.default_filter) {
      this._filter = "all";
    }
    // Reflect no_card_background as a host attribute for CSS.
    if (config.no_card_background) {
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
          response: { items: ChoreItem[] };
        }>({
          type: "call_service",
          domain: DOMAIN,
          service: "get_items",
          service_data: { entity_id: cfg.entity },
          return_response: true,
        });

        const items = response.response?.items ?? [];
        for (const item of items) {
          allItems.push({
            ...item,
            source_entity: cfg.entity,
            source_color: cfg.color,
          });
        }
      });

      await Promise.all(promises);
      this._items = sortChores(allItems);
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
      this._eventUnsub = await this.hass.connection.subscribeEvents(
        () => this._refreshData(),
        "chore_calendar_status_changed",
      );
    } catch {
      // Connection may not be ready yet; polling handles it.
    }
  }

  private _unsubscribeEvents() {
    this._eventUnsub?.();
    this._eventUnsub = undefined;
  }

  // -- Filtering ------------------------------------------------------------

  private _getFilteredItems(): EnrichedChoreItem[] {
    if (this._filter === "all") return this._items;
    if (this._filter === "active") {
      return this._items.filter((i) => i.status !== "completed");
    }
    return this._items.filter((i) => i.status === this._filter);
  }

  private _onFilterChanged(e: CustomEvent<{ value: FilterValue }>) {
    this._filter = e.detail.value;
    this._showAllCompleted = false;
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

    .loading {
      padding: 32px 0;
      text-align: center;
      color: var(--secondary-text-color);
      font-size: 14px;
    }

    .show-more {
      padding: 4px 0 8px 27px;
      font-size: 12px;
      color: var(--primary-color);
      cursor: pointer;
      background: none;
      border: none;
      font-family: inherit;
    }

    .show-more:hover {
      text-decoration: underline;
    }

  `;

  protected render() {
    if (!this._config) return nothing;

    const showHeader = this._config.show_header !== false;
    const hideFilter = this._config.hide_filter === true;
    return html`
      <ha-card>
        ${showHeader
          ? html`
              <div class="header">
                <span class="title"
                  >${this._config.title ?? "Chores"}</span
                >
                ${!hideFilter
                  ? html`
                      <status-filter
                        .value=${this._filter}
                        @filter-changed=${this._onFilterChanged}
                      ></status-filter>
                    `
                  : nothing}
              </div>
            `
          : nothing}
        ${this._loading
          ? html`<div class="loading">Loading...</div>`
          : this._renderSections()}
      </ha-card>
    `;
  }

  private _renderSections() {
    const filtered = this._getFilteredItems();

    if (filtered.length === 0) {
      return html`<div class="empty">No chores to show</div>`;
    }

    const groups = groupByStatus(filtered);
    const showCompleted = this._config.show_completed !== false;
    const completedLimit = this._config.completed_limit ?? 3;
    const hideSections = this._config.hide_sections === true;

    return html`
      ${SECTION_ORDER.map((status) => {
        const items = groups.get(status);
        if (!items || items.length === 0) return nothing;
        if (status === "completed" && !showCompleted) return nothing;

        const isCompleted = status === "completed";
        const visibleItems =
          isCompleted && !this._showAllCompleted && items.length > completedLimit
            ? items.slice(0, completedLimit)
            : items;
        const hiddenCount = items.length - visibleItems.length;

        return html`
          ${!hideSections
            ? html`<div class="section-header ${status}">
                ${SECTION_LABELS[status]}
              </div>`
            : nothing}
          ${visibleItems.map(
            (item) => html`
              <chore-row
                .hass=${this.hass}
                .item=${item}
              ></chore-row>
            `,
          )}
          ${hiddenCount > 0
            ? html`
                <button class="show-more" @click=${this._showMore}>
                  Show ${hiddenCount} more
                </button>
              `
            : nothing}
        `;
      })}
    `;
  }

  private _showMore() {
    this._showAllCompleted = true;
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

window.customCards = window.customCards || [];
window.customCards.push({
  type: "chore-calendar-card",
  name: "Chore Calendar",
  description: "Timeline view of chores from Chore Calendar lists",
  preview: true,
});
