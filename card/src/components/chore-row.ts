import { LitElement, html, css } from "lit";
import { property } from "lit/decorators.js";
import { safeDefine } from "../define";
import { actionHandler } from "../action-handler";
import type { ActionConfig, ActionHandlerDetail, ChoreStatus, EnrichedChoreItem, HomeAssistant } from "../types";
import { getTimeText, handleChoreAction, hasAction, themeColorToCss } from "../utils";

const STATUS_ICON: Record<ChoreStatus, string> = {
  overdue: "\u2717",  // ✗
  due: "\u25CF",      // ●
  pending: "\u25CB",  // ○
  completed: "\u2713", // ✓
};

export class ChoreRow extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) item!: EnrichedChoreItem;
  @property({ attribute: false }) tapAction?: ActionConfig;
  @property({ attribute: false }) holdAction?: ActionConfig;
  @property({ attribute: false }) doubleTapAction?: ActionConfig;

  static styles = css`
    :host {
      display: block;
      margin-bottom: 5px;
    }

    .chore {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 0;
      padding: 10px;
      cursor: pointer;
      background: var(--card-background-color, var(--ha-card-background, white));
      border-left: 5px solid var(--border-color, var(--divider-color, rgba(0, 0, 0, 0.12)));
      border-radius: 0 5px 5px 0;
      overflow: hidden;
      transition: background-color 0.15s ease;
    }

    .chore:hover {
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

    :host([status="completed"]) .chore {
      opacity: 0.6;
    }

    :host([status="overdue"]) .time {
      color: var(--error-color, #db4437);
    }
  `;

  protected render() {
    const now = new Date();
    const timeText = getTimeText(this.item, now);

    return html`
      <div
        class="chore"
        style="--border-color: ${themeColorToCss(this.item.source_color)}"
        ${actionHandler({
          hasHold: hasAction(this.holdAction),
          hasDoubleClick: hasAction(this.doubleTapAction),
        })}
        @action=${this._handleAction}
      >
        <span class="status-indicator">${STATUS_ICON[this.item.status]}</span>
        <span class="name">${this.item.chore_name}</span>
        <span class="time">${timeText}</span>
      </div>
    `;
  }

  private _handleAction(ev: CustomEvent<ActionHandlerDetail>) {
    const action = ev.detail.action;
    let config: ActionConfig | undefined;

    switch (action) {
      case "tap":
        config = this.tapAction;
        break;
      case "hold":
        config = this.holdAction;
        break;
      case "double_tap":
        config = this.doubleTapAction;
        break;
    }

    handleChoreAction(this, this.hass, config, this.item);
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

safeDefine("chore-row", ChoreRow);

declare global {
  interface HTMLElementTagNameMap {
    "chore-row": ChoreRow;
  }
}
