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

/** Loose ha-form schema entry — ha-form is an HA-provided element. */
type FormSchema = { name: string; required?: boolean; [key: string]: unknown };

/** Flat form state, distinct from the service payload built on submit. */
type FormData = Record<string, unknown>;

/** ``completed_at`` is a raw date/time row above this form, not an ha-form
 *  datetime selector — the selector's reserved label space misaligns it. */
const SCHEMA: FormSchema[] = [
  { name: "completed_by", selector: { entity: { filter: { domain: "person" } } } },
];

const LABELS: Record<string, string> = {
  completed_by: "Completed by:",
};

/**
 * Completion details for a single chore: when it was done and by whom.
 *
 * Opened by holding the detail dialog's Complete button; a plain tap there still
 * completes immediately with the service defaults.
 */
export class ChoreCompleteDialog extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) item?: EnrichedChoreItem;
  @property({ type: Boolean }) open = false;

  @state() private _data: FormData = {};
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
    // Seed once per open, keyed by item uid, so each open starts from "now"
    // without clobbering live edits mid-session.
    if (changed.has("open") || changed.has("item")) {
      const key = this.open ? this.item?.uid : undefined;
      if (key && key !== this._seededFor) {
        this._seededFor = key;
        this._data = this._defaults();
        this._error = undefined;
      }
      if (!this.open) this._seededFor = undefined;
    }
  }

  /** Now, plus the chore's assignee when there is exactly one — with two or
   *  more there's no way to tell which of them did it. */
  private _defaults(): FormData {
    const assignees = this.item?.assigned_to ?? [];
    return {
      completed_at: formatHaDateTime(new Date()),
      ...(assignees.length === 1 ? { completed_by: assignees[0] } : {}),
    };
  }

  protected render() {
    if (!this.item) return nothing;

    return html`
      <ha-dialog .open=${this.open} @closed=${this._onClosed}>
        <ha-icon-button slot="headerNavigationIcon" data-dialog="close" class="header_button">
          <ha-icon icon="mdi:close"></ha-icon>
        </ha-icon-button>
        <span slot="headerTitle">Complete ${this.item.chore_name}</span>
        <div class="content">
          ${this._error ? html`<ha-alert alert-type="error">${this._error}</ha-alert>` : nothing}
          ${renderDateTimeRow({
            label: "Completed at:",
            value: String(this._data.completed_at ?? ""),
            locale: this.hass.locale,
            onDate: this._onDatePart,
            onTime: this._onTimePart,
          })}
          <ha-form
            .hass=${this.hass}
            .data=${this._data}
            .schema=${SCHEMA}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._onValueChanged}
          ></ha-form>
          <ha-form class="picker-loader" .hass=${this.hass} .schema=${PICKER_LOADER_SCHEMA} .data=${{}}></ha-form>
        </div>
        <div slot="footer" class="footer">
          <ha-button variant="neutral" appearance="plain" ?disabled=${this._loading} @click=${this._onCancel}>
            Cancel
          </ha-button>
          <ha-button ?disabled=${this._loading} @click=${this._onSubmit}>
            ${this._loading ? "Completing..." : "Complete"}
          </ha-button>
        </div>
      </ha-dialog>
    `;
  }

  private _computeLabel = (schema: FormSchema): string => LABELS[schema.name] ?? schema.name;

  private _onValueChanged(e: CustomEvent<{ value: FormData }>) {
    // The date/time row lives outside this form, so preserve its value.
    this._data = { ...this._data, ...e.detail.value };
  }

  private _onDatePart = (e: CustomEvent<{ value?: string }>) => {
    const date = e.detail.value;
    if (!date) return;
    this._data = { ...this._data, completed_at: mergeDatePart(this._data.completed_at, date) };
  };

  private _onTimePart = (e: CustomEvent<{ value?: string }>) => {
    const time = e.detail.value;
    if (!time) return;
    this._data = { ...this._data, completed_at: mergeTimePart(this._data.completed_at, time) };
  };

  private async _onSubmit() {
    if (!this.item || this._loading) return;

    this._loading = true;
    this._error = undefined;
    try {
      // A cleared datetime falls through to the service default (now); an
      // unset person is simply omitted.
      const completedAt = haDateTimeToIso(this._data.completed_at);
      const completedBy = String(this._data.completed_by ?? "").trim();
      await this.hass.callWS({
        type: "call_service",
        domain: DOMAIN,
        service: "complete_item",
        service_data: {
          entity_id: this.item.source_entity,
          item: this.item.uid,
          ...(completedAt ? { completed_at: completedAt } : {}),
          ...(completedBy ? { completed_by: completedBy } : {}),
        },
      });
      this.dispatchEvent(
        new CustomEvent("chore-completed", {
          detail: { item: this.item },
          bubbles: true,
          composed: true,
        }),
      );
      this.open = false;
    } catch (err) {
      this._error = err instanceof Error ? err.message : String(err);
      console.error("chore-complete-dialog: failed to complete chore", err);
    } finally {
      this._loading = false;
    }
  }

  private _onCancel() {
    this.open = false;
    this._onClosed();
  }

  private _onClosed() {
    this.dispatchEvent(new CustomEvent("complete-dialog-closed", { bubbles: true, composed: true }));
  }
}

safeDefine("chore-complete-dialog", ChoreCompleteDialog);

declare global {
  interface HTMLElementTagNameMap {
    "chore-complete-dialog": ChoreCompleteDialog;
  }
}
