import { LitElement, html, css, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../define";
import type { EnrichedChoreItem, HomeAssistant } from "../types";
import { formatSchedule, formatCompletedTime } from "../utils";

const DOMAIN = "chore_calendar";

export class ChoreDetailDialog extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) item?: EnrichedChoreItem;
  @property({ type: Boolean }) open = false;
  @property({ type: Boolean, attribute: "allow-uncomplete" }) allowUncomplete = false;
  @state() private _loading = false;

  static styles = css`
    ha-dialog {
      --ha-dialog-max-width: 400px;
    }

    .header_button {
      color: var(--secondary-text-color);
    }

    .content {
      padding: 0 16px 16px;
    }

    .content > div {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
    }

    .content ha-icon,
    .content ha-state-icon {
      flex-shrink: 0;
      color: var(--secondary-text-color);
      --mdc-icon-size: 20px;
      --ha-icon-display: inline-flex;
    }

    .content .info {
      flex: 1;
      min-width: 0;
      font-size: 14px;
      color: var(--primary-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .footer {
      display: flex;
      justify-content: flex-end;
      padding: 16px;
      border-top: 1px solid var(--divider-color);
    }
  `;

  protected render() {
    if (!this.item) return nothing;

    const isCompleted = this.item.status === "completed";

    return html`
      <ha-dialog
        .open=${this.open}
        @closed=${this._onClosed}
      >
        <ha-icon-button
          slot="headerNavigationIcon"
          data-dialog="close"
          class="header_button"
        >
          <ha-icon icon="mdi:close"></ha-icon>
        </ha-icon-button>
        <span slot="headerTitle">${this.item.chore_name}</span>
        <div class="content">
          ${this._renderDetails()}
        </div>
        ${!isCompleted
          ? html`
              <div slot="footer" class="footer">
                <ha-button
                  ?disabled=${this._loading}
                  @click=${this._onComplete}
                >
                  ${this._loading ? "Completing..." : "Complete"}
                </ha-button>
              </div>
            `
          : this.allowUncomplete && this.item?.last_completed
            ? html`
                <div slot="footer" class="footer">
                  <ha-button
                    variant="neutral"
                    appearance="plain"
                    ?disabled=${this._loading}
                    @click=${this._onUncomplete}
                  >
                    ${this._loading ? "Uncompleting..." : "Uncomplete"}
                  </ha-button>
                </div>
              `
            : nothing}
      </ha-dialog>
    `;
  }

  private _renderDetails() {
    const { item } = this;
    if (!item) return nothing;
    const locale = this.hass?.language ?? "en";
    const now = new Date();

    return html`
      ${this._renderListRow()}

      <div class="schedule">
        <ha-icon icon="mdi:calendar-clock"></ha-icon>
        <div class="info">${formatSchedule(item.schedule)}</div>
      </div>

      ${item.assigned_to.length > 0
        ? html`
            <div class="assigned">
              <ha-icon icon=${item.assigned_to.length > 1 ? "mdi:account-multiple" : "mdi:account"}></ha-icon>
              <div class="info">
                ${item.assigned_to.map((e) => this._resolveEntityName(e)).join(", ")}
              </div>
            </div>
          `
        : nothing}

      ${item.trigger_entity
        ? html`
            <div class="trigger">
              <ha-icon icon="mdi:nfc-tap"></ha-icon>
              <div class="info">${this._resolveEntityName(item.trigger_entity)}</div>
            </div>
          `
        : nothing}

      ${item.last_completed
        ? html`
            <div class="last-completed">
              <ha-icon icon="mdi:check-circle-outline"></ha-icon>
              <div class="info">
                ${formatCompletedTime(item.last_completed, now, locale)}${item.last_completed_by
                  ? ` by ${this._resolveEntityName(item.last_completed_by)}`
                  : ""}
              </div>
            </div>
          `
        : nothing}
    `;
  }

  private _renderListRow() {
    const entityId = this.item?.source_entity;
    if (!entityId) return nothing;

    const stateObj = this.hass?.states?.[entityId];
    const listName =
      (stateObj?.attributes?.friendly_name as string) ?? entityId;

    return html`
      <div class="calendar">
        <ha-state-icon
          .hass=${this.hass}
          .stateObj=${stateObj}
        ></ha-state-icon>
        <div class="info">${listName}</div>
      </div>
    `;
  }

  private async _onComplete() {
    if (!this.item || this._loading) return;

    this._loading = true;
    try {
      await this.hass.callWS({
        type: "call_service",
        domain: DOMAIN,
        service: "complete_item",
        service_data: {
          entity_id: this.item.source_entity,
          item: this.item.uid,
        },
      });
      this.dispatchEvent(
        new CustomEvent("chore-completed", {
          detail: { item: this.item },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (err) {
      console.error("chore-detail-dialog: failed to complete chore", err);
    } finally {
      this._loading = false;
    }
  }

  private async _onUncomplete() {
    if (!this.item || this._loading) return;

    this._loading = true;
    try {
      await this.hass.callWS({
        type: "call_service",
        domain: DOMAIN,
        service: "uncomplete_item",
        service_data: {
          entity_id: this.item.source_entity,
          item: this.item.uid,
        },
      });
      this.dispatchEvent(
        new CustomEvent("chore-uncompleted", {
          detail: { item: this.item },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (err) {
      console.error("chore-detail-dialog: failed to uncomplete chore", err);
    } finally {
      this._loading = false;
    }
  }

  private _resolveEntityName(entityId: string): string {
    const entity = this.hass?.states?.[entityId];
    return (entity?.attributes?.friendly_name as string) ?? entityId;
  }

  private _onClosed() {
    this.dispatchEvent(
      new CustomEvent("detail-dialog-closed", {
        bubbles: true,
        composed: true,
      }),
    );
  }
}

safeDefine("chore-detail-dialog", ChoreDetailDialog);

declare global {
  interface HTMLElementTagNameMap {
    "chore-detail-dialog": ChoreDetailDialog;
  }
}
