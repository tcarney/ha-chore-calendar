import { LitElement, html, css, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../define";
import { formatHaDateTime, haDateTimeToIso } from "../utils";
import type { EnrichedChoreItem, HomeAssistant } from "../types";
import {
  DATETIME_ROW_STYLES,
  PICKER_LOADER_SCHEMA,
  mergeDatePart,
  mergeTimePart,
  renderDateTimeRow,
} from "./datetime-row";

const DOMAIN = "chore_calendar";

/**
 * An explicit resume datetime for a single chore.
 *
 * Opened by holding the detail dialog's Skip button; a plain tap there still
 * defers by the chore's type-specific default (next occurrence for scheduled,
 * now + interval for interval, unscheduled for oneshot).
 */
export class ChoreSkipDialog extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) item?: EnrichedChoreItem;
  @property({ type: Boolean }) open = false;

  @state() private _until = "";
  @state() private _error?: string;
  @state() private _loading = false;
  private _seededFor?: string;

  static styles = css`
    ${DATETIME_ROW_STYLES}
    ha-dialog {
      --ha-dialog-max-width: 400px;
    }
    .header_button {
      color: var(--secondary-text-color);
    }
    .content {
      padding: 8px 4px 0;
    }
    ha-alert {
      display: block;
      margin-bottom: 12px;
    }
    .footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      padding: 16px;
      border-top: 1px solid var(--divider-color);
    }
  `;

  protected willUpdate(changed: Map<string, unknown>) {
    // Seed once per open, keyed by item uid, so each open starts from the
    // chore's current due date without clobbering live edits mid-session.
    if (changed.has("open") || changed.has("item")) {
      const key = this.open ? this.item?.uid : undefined;
      if (key && key !== this._seededFor) {
        this._seededFor = key;
        this._until = this._defaultUntil();
        this._error = undefined;
      }
      if (!this.open) this._seededFor = undefined;
    }
  }

  /** The chore's current due datetime — the anchor the skip moves, in either
   *  direction. Unscheduled chores (no next_due) start from now. */
  private _defaultUntil(): string {
    const due = this.item?.next_due ? new Date(this.item.next_due) : null;
    return formatHaDateTime(due && !Number.isNaN(due.getTime()) ? due : new Date());
  }

  protected render() {
    if (!this.item) return nothing;

    return html`
      <ha-dialog .open=${this.open} @closed=${this._onClosed}>
        <ha-icon-button slot="headerNavigationIcon" data-dialog="close" class="header_button">
          <ha-icon icon="mdi:close"></ha-icon>
        </ha-icon-button>
        <span slot="headerTitle">Skip ${this.item.chore_name}</span>
        <div class="content">
          ${this._error ? html`<ha-alert alert-type="error">${this._error}</ha-alert>` : nothing}
          ${renderDateTimeRow({
            label: "Skip until:",
            value: this._until,
            locale: this.hass.locale,
            onDate: this._onDatePart,
            onTime: this._onTimePart,
          })}
          <ha-form class="picker-loader" .hass=${this.hass} .schema=${PICKER_LOADER_SCHEMA} .data=${{}}></ha-form>
        </div>
        <div slot="footer" class="footer">
          <ha-button variant="neutral" appearance="plain" ?disabled=${this._loading} @click=${this._onCancel}>
            Cancel
          </ha-button>
          <ha-button ?disabled=${this._loading} @click=${this._onSubmit}>
            ${this._loading ? "Skipping..." : "Skip"}
          </ha-button>
        </div>
      </ha-dialog>
    `;
  }

  private _onDatePart = (e: CustomEvent<{ value?: string }>) => {
    const date = e.detail.value;
    if (!date) return;
    this._until = mergeDatePart(this._until, date);
  };

  private _onTimePart = (e: CustomEvent<{ value?: string }>) => {
    const time = e.detail.value;
    if (!time) return;
    this._until = mergeTimePart(this._until, time);
  };

  private async _onSubmit() {
    if (!this.item || this._loading) return;

    this._loading = true;
    this._error = undefined;
    try {
      // A cleared datetime falls through to the type-specific default skip.
      const until = haDateTimeToIso(this._until);
      await this.hass.callWS({
        type: "call_service",
        domain: DOMAIN,
        service: "skip_item",
        service_data: {
          entity_id: this.item.source_entity,
          item: this.item.uid,
          ...(until ? { until } : {}),
        },
      });
      this.dispatchEvent(
        new CustomEvent("chore-skipped", {
          detail: { item: this.item },
          bubbles: true,
          composed: true,
        }),
      );
      this.open = false;
    } catch (err) {
      this._error = err instanceof Error ? err.message : String(err);
      console.error("chore-skip-dialog: failed to skip chore", err);
    } finally {
      this._loading = false;
    }
  }

  private _onCancel() {
    this.open = false;
    this._onClosed();
  }

  private _onClosed() {
    this.dispatchEvent(new CustomEvent("skip-dialog-closed", { bubbles: true, composed: true }));
  }
}

safeDefine("chore-skip-dialog", ChoreSkipDialog);

declare global {
  interface HTMLElementTagNameMap {
    "chore-skip-dialog": ChoreSkipDialog;
  }
}
