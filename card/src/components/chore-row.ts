import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { ChoreStatus, EnrichedChoreItem, HomeAssistant } from "../types";
import { getTimeText, formatSchedule } from "../utils";

const STATUS_ICON: Record<ChoreStatus, string> = {
  overdue: "\u2717",  // ✗
  due: "\u25CF",      // ●
  pending: "\u25CB",  // ○
  completed: "\u2713", // ✓
};

@customElement("chore-row")
export class ChoreRow extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) item!: EnrichedChoreItem;
  @state() _expanded = false;

  static styles = css`
    :host {
      display: block;
      margin-bottom: 5px;
    }

    .card {
      background: var(--card-background-color, var(--ha-card-background, white));
      border-radius: 0 5px 5px 0;
      overflow: hidden;
    }

    .row {
      display: flex;
      align-items: center;
      padding: 10px;
      cursor: pointer;
      transition: background-color 0.15s ease;
      gap: 12px;
      min-height: 0;
    }

    .row:hover {
      background-color: var(--secondary-background-color, rgba(0, 0, 0, 0.05));
    }

    .status-indicator {
      flex-shrink: 0;
      width: 16px;
      text-align: center;
      font-size: 14px;
      line-height: 1;
    }

    .name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 14px;
      color: var(--primary-text-color);
    }

    .time {
      flex-shrink: 0;
      font-size: 12px;
      color: var(--secondary-text-color);
      white-space: nowrap;
    }

    :host([status="completed"]) .card {
      opacity: 0.6;
    }

    :host([status="overdue"]) .time {
      color: var(--error-color, #db4437);
    }

    .details {
      padding: 0 16px 12px 38px;
      font-size: 12px;
      color: var(--secondary-text-color);
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 4px 12px;
    }

    .details .label {
      opacity: 0.7;
    }

    .details .value {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `;

  protected render() {
    const now = new Date();
    const locale = this.hass?.language ?? "en";
    const timeText = getTimeText(this.item, now, locale);

    return html`
      <div
        class="card"
        style="border-left: 5px solid ${this.item.source_color}"
      >
        <div class="row" @click=${this._toggle}>
          <span class="status-indicator">${STATUS_ICON[this.item.status]}</span>
          <span class="name">${this.item.chore_name}</span>
          <span class="time">${timeText}</span>
        </div>
        ${this._expanded ? this._renderDetails() : nothing}
      </div>
    `;
  }

  private _renderDetails() {
    const { item } = this;
    return html`
      <div class="details">
        <span class="label">Schedule</span>
        <span class="value">${formatSchedule(item.schedule)}</span>

        ${item.assigned_to.length > 0
          ? html`
              <span class="label">Assigned</span>
              <span class="value">${item.assigned_to.map((e) => this._resolveEntityName(e)).join(", ")}</span>
            `
          : nothing}
        ${item.trigger_entity
          ? html`
              <span class="label">Trigger</span>
              <span class="value">${item.trigger_entity}</span>
            `
          : nothing}
        ${item.last_completed
          ? html`
              <span class="label">Last done</span>
              <span class="value">
                ${new Date(item.last_completed).toLocaleString(
                  this.hass?.language ?? "en",
                )}
                ${item.last_completed_by ? `by ${this._resolveEntityName(item.last_completed_by)}` : ""}
              </span>
            `
          : nothing}
      </div>
    `;
  }

  /** Resolve an entity_id to its friendly_name, falling back to the raw id. */
  private _resolveEntityName(entityId: string): string {
    const entity = this.hass?.states?.[entityId];
    return (entity?.attributes?.friendly_name as string) ?? entityId;
  }

  private _toggle() {
    this._expanded = !this._expanded;
  }

  connectedCallback() {
    super.connectedCallback();
    this._syncStatusAttribute();
  }

  updated() {
    this._syncStatusAttribute();
  }

  /** Reflect status as a host attribute for CSS :host([status=...]) selectors. */
  private _syncStatusAttribute() {
    this.setAttribute("status", this.item.status);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "chore-row": ChoreRow;
  }
}
