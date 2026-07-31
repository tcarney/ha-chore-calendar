import { LitElement, html, css, nothing } from "lit";
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

    .assignees {
      display: flex;
      flex-shrink: 0;
      align-items: center;
    }

    .assignees .avatar {
      box-sizing: border-box;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background-size: cover;
      background-position: center;
      /* Card-background ring separates overlapping avatars in a stack. */
      border: 2px solid var(--card-background-color, var(--ha-card-background, white));
    }

    .assignees .avatar + .avatar {
      margin-left: -7px;
    }

    .assignees .initial {
      display: flex;
      align-items: center;
      justify-content: center;
      /* --border-color is the row's list color, set inline on .chore. */
      background: var(--border-color, var(--primary-color, #03a9f4));
      color: var(--text-primary-color, white);
      font-size: 10px;
      font-weight: 500;
      line-height: 1;
    }

    /* Icon fallback: bare icon, no photo-style disc. */
    .assignees .icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      color: var(--border-color, var(--primary-color, #03a9f4));
      --mdc-icon-size: 18px;
    }

    .assignees .icon ha-icon {
      display: flex;
      line-height: 0;
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
        ${this._renderAssignees()}
        <span class="time">${timeText}</span>
      </div>
    `;
  }

  /** Assignee avatar badges: the person's entity_picture in a small circle,
   *  else their explicitly set icon, else their initial in a list-colored
   *  bubble (never the generic mdi:account default). Name shows as a tooltip. */
  private _renderAssignees() {
    const ids = this.item.assigned_to ?? [];
    if (ids.length === 0) return nothing;
    return html`
      <span class="assignees" part="assignees">
        ${ids.map((id) => {
          const stateObj = this.hass?.states?.[id];
          const name = (stateObj?.attributes?.friendly_name as string) ?? id.split(".").pop() ?? id;
          const picture = stateObj?.attributes?.entity_picture as string | undefined;
          const icon = stateObj?.attributes?.icon as string | undefined;
          if (picture) {
            return html`<span class="avatar" title=${name} style="background-image: url('${picture}')"></span>`;
          }
          if (icon) {
            return html`
              <span class="icon" title=${name}>
                <ha-icon .icon=${icon}></ha-icon>
              </span>
            `;
          }
          return html`<span class="avatar initial" title=${name}>${name.charAt(0).toUpperCase()}</span>`;
        })}
      </span>
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
