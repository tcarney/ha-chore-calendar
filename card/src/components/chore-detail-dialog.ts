import { LitElement, html, css, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../define";
import { holdAction } from "../hold-action";
import { fireEvent } from "../fire-event";
import "./chore-assignees";
import type { ChoreStatus, EnrichedChoreItem, HomeAssistant } from "../types";
import {
  formatSchedule,
  formatCompletedTime,
  formatDueDate,
  getTimeText,
  themeColorToCss,
  upcomingLabel,
} from "../utils";

const STATUS_ICON: Record<ChoreStatus, string> = {
  overdue: "\u2717", // ✗
  due: "\u25CF", // ●
  pending: "\u25CB", // ○
  completed: "\u2713", // ✓
};

const DOMAIN = "chore_calendar";

export class ChoreDetailDialog extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) item?: EnrichedChoreItem;
  @property({ type: Boolean }) open = false;
  @property({ type: Boolean, attribute: "allow-uncomplete" }) allowUncomplete = false;
  @property({ type: Boolean, attribute: "allow-edit" }) allowEdit = true;
  @state() private _loading = false;

  static styles = css`
    ha-dialog {
      --ha-dialog-max-width: 400px;
      /* The header bar pads 8px and centers a 24px glyph in a 48px close
         button, so the X sits 20px in. Match that so the row icons line up. */
      --dialog-content-padding: 0 20px 16px;
    }

    .header_button {
      color: var(--secondary-text-color);
    }

    .content {
      padding: 0;
    }

    /* Status block: what is happening now, in the status color, with the
       missed and upcoming context beneath it for overdue chores. */
    .status {
      display: flex;
      gap: 12px;
      padding: 8px 0 12px;
      font-size: 15px;
      font-weight: 500;
    }

    .status .glyph {
      flex-shrink: 0;
      width: 20px;
      text-align: center;
      line-height: 21px;
    }

    .status .lines {
      flex: 1;
      min-width: 0;
    }

    .status .headline {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* Context lines: secondary detail beneath a primary row, in the status
       block and the metadata alike. */
    .context {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
      font-size: 13px;
      font-weight: 400;
      color: var(--secondary-text-color);
    }

    .context > span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .status.overdue {
      color: var(--error-color);
    }

    .status.due {
      color: var(--warning-color);
    }

    .status.pending {
      color: var(--secondary-text-color);
    }

    .status.completed {
      color: var(--success-color);
    }

    /* Metadata rows: icon plus value, muted. */
    .meta > div {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 6px 0;
    }

    .meta ha-icon,
    .meta ha-state-icon {
      flex-shrink: 0;
      color: var(--secondary-text-color);
      --mdc-icon-size: 20px;
      --ha-icon-display: inline-flex;
    }

    /* Metadata context lines indent to the text column (20px icon + 12px gap). */
    .meta .context {
      margin: -2px 0 6px 32px;
    }

    .meta .info {
      flex: 1;
      min-width: 0;
      font-size: 14px;
      color: var(--secondary-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* The schedule text shrinks to its content so the assignee avatars
       follow it inline instead of being pushed to the far edge. */
    .meta .schedule .info,
    .meta .last-completed .info {
      flex: 0 1 auto;
    }

    /* Free-text description: the last details block, set off by spacing
       alone (a divider would double up with the footer border). */
    .description {
      margin-top: 12px;
      font-size: 14px;
      color: var(--primary-text-color);
      white-space: pre-line;
    }

    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 16px;
      border-top: 1px solid var(--divider-color);
    }

    .status-actions {
      display: flex;
      gap: 8px;
    }
  `;

  protected render() {
    if (!this.item) return nothing;

    const isCompleted = this.item.status === "completed";
    // The footer holds the Edit button and the status actions (Skip/Complete, or
    // Uncomplete on a completed chore). When none apply, omit the footer entirely
    // rather than render an empty bordered/padded bar.
    const hasStatusActions = !isCompleted || (this.allowUncomplete && !!this.item.last_completed);
    const showFooter = this.allowEdit || hasStatusActions;

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
        <span slot="headerTitle" part="title">${this.item.chore_name}</span>
        <div class="content" part="content">
          ${this._renderDetails()}
        </div>
        ${showFooter
          ? html`
              <div slot="footer" class="footer" part="footer">
                ${this.allowEdit
                  ? html`
                      <ha-button variant="neutral" appearance="plain" @click=${this._onEdit}>
                        Edit
                      </ha-button>
                    `
                  : html`<span></span>`}
                <span class="status-actions">
                  ${!isCompleted
                    ? html`
                        <ha-button
                          variant="neutral"
                          appearance="plain"
                          ?disabled=${this._loading}
                          title="Tap to skip to the next occurrence, hold to pick a date"
                          ${holdAction({
                            tap: () => this._onSkip(),
                            hold: () => this._openSkipDialog(),
                            disabled: this._loading,
                          })}
                        >
                          ${this._loading ? "Skipping..." : "Skip"}
                        </ha-button>
                        <ha-button
                          ?disabled=${this._loading}
                          title="Tap to complete now, hold to set time and person"
                          ${holdAction({
                            tap: () => this._onComplete(),
                            hold: () => this._openCompleteDialog(),
                            disabled: this._loading,
                          })}
                        >
                          ${this._loading ? "Completing..." : "Complete"}
                        </ha-button>
                      `
                    : hasStatusActions
                      ? html`
                          <ha-button
                            variant="neutral"
                            appearance="plain"
                            ?disabled=${this._loading}
                            @click=${this._onUncomplete}
                          >
                            ${this._loading ? "Uncompleting..." : "Uncomplete"}
                          </ha-button>
                        `
                      : nothing}
                </span>
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
      ${this._renderStatus(item, now, locale)}

      <div class="meta" part="meta">
        ${this._renderListRow()}

        <div class="schedule" part="schedule">
          <ha-icon icon="mdi:calendar-clock"></ha-icon>
          <div class="info">${formatSchedule(item.schedule, item.selector)}</div>
          ${item.assigned_to.length > 0
            ? html`
                <chore-assignees
                  part="assignees"
                  style="--border-color: ${themeColorToCss(item.source_color)}"
                  .hass=${this.hass}
                  .assignedTo=${item.assigned_to}
                ></chore-assignees>
              `
            : nothing}
        </div>

        ${item.trigger_entity
          ? html`
              <div class="context" part="trigger">
                <span>Tag: ${this._resolveEntityName(item.trigger_entity)}</span>
              </div>
            `
          : nothing}
      </div>

      ${item.description
        ? html`<div class="description" part="description">${item.description}</div>`
        : nothing}
    `;
  }

  /** The status line carries the row's time text ("Overdue by 2 days", "Due"),
   *  with a pending countdown spelled out as "Due in 3 days"; a completed chore
   *  shows its completion instead. The context lines beneath run
   *  chronologically: the last completion (for chores not currently
   *  completed), then for overdue chores the missed run and the upcoming
   *  occurrence. */
  private _renderStatus(item: EnrichedChoreItem, now: Date, locale: string) {
    const isCompleted = item.status === "completed" && !!item.last_completed;
    const timeText = getTimeText(item, now);
    const headline = isCompleted
      ? `Done ${formatCompletedTime(item.last_completed!, now, locale)}`
      : timeText.startsWith("in ")
        ? `Due ${timeText}`
        : timeText;
    return html`
      <div class="status ${item.status}" part="status status-${item.status}">
        <span class="glyph">${STATUS_ICON[item.status]}</span>
        <div class="lines">
          <div class="headline" part="status-text">
            <span>${headline}</span>
            ${isCompleted ? this._renderCompletedBy(item) : nothing}
          </div>
          ${item.last_completed && !isCompleted
            ? html`
                <div class="context" part="last-completed">
                  <span>Last done: ${formatCompletedTime(item.last_completed, now, locale)}</span>
                  ${this._renderCompletedBy(item)}
                </div>
              `
            : nothing}
          ${item.missed_count > 1
            ? html`
                <div class="context" part="missed">
                  <span>${this._formatMissed(item, now, locale)}</span>
                </div>
              `
            : nothing}
          ${item.missed_count > 0 && item.upcoming_due
            ? html`
                <div class="context" part="upcoming">
                  <span>${upcomingLabel(item, now)}: ${formatDueDate(item.upcoming_due, now, locale)}</span>
                </div>
              `
            : nothing}
        </div>
      </div>
    `;
  }

  /** "N missed: d1, d2, …" — the server sends the ten most recent, so a
   *  larger count gets a leading ellipsis to show the list is truncated.
   *  Shown only from two missed: a single missed period is the pinned
   *  next_due the "Overdue by" headline already measures, with more
   *  precision than a bare date. */
  private _formatMissed(item: EnrichedChoreItem, now: Date, locale: string): string {
    const dates = item.missed_occurrences.map((iso) => formatDueDate(iso, now, locale));
    const truncated = item.missed_count > dates.length ? "…, " : "";
    return `${item.missed_count} missed: ${truncated}${dates.join(", ")}`;
  }

  /** Who completed it, as the same avatar badge the assignees use. */
  private _renderCompletedBy(item: EnrichedChoreItem) {
    if (!item.last_completed_by) return nothing;
    return html`
      <chore-assignees
        part="completed-by"
        style="--border-color: ${themeColorToCss(item.source_color)}"
        .hass=${this.hass}
        .assignedTo=${[item.last_completed_by]}
      ></chore-assignees>
    `;
  }

  private _renderListRow() {
    const entityId = this.item?.source_entity;
    if (!entityId) return nothing;

    const stateObj = this.hass?.states?.[entityId];
    const listName = (stateObj?.attributes?.friendly_name as string) ?? entityId;

    return html`
      <div class="list" part="list">
        <ha-state-icon .hass=${this.hass} .stateObj=${stateObj}></ha-state-icon>
        <div class="info">${listName}</div>
      </div>
    `;
  }

  /** Hand off to the complete dialog, where the time and person can be set.
   *  Fires mid-press, as soon as the hold registers. */
  private _openCompleteDialog() {
    if (!this.item) return;
    fireEvent(this, "chore-complete-details", { item: this.item });
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

  /** Hand off to the skip dialog, where an explicit resume datetime can be
   *  picked. Fires mid-press, as soon as the hold registers. */
  private _openSkipDialog() {
    if (!this.item) return;
    fireEvent(this, "chore-skip-details", { item: this.item });
  }

  private async _onSkip() {
    if (!this.item || this._loading) return;

    this._loading = true;
    try {
      await this.hass.callWS({
        type: "call_service",
        domain: DOMAIN,
        service: "skip_item",
        service_data: {
          entity_id: this.item.source_entity,
          item: this.item.uid,
        },
      });
      this.dispatchEvent(
        new CustomEvent("chore-skipped", {
          detail: { item: this.item },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (err) {
      console.error("chore-detail-dialog: failed to skip chore", err);
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

  private _onEdit() {
    if (!this.item) return;
    this.dispatchEvent(
      new CustomEvent("chore-edit", {
        detail: { item: this.item },
        bubbles: true,
        composed: true,
      }),
    );
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
