import { LitElement, html, css, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../define";
import { formatHaDateTime, monthName, ordinalNumber, parseByday, positionWord, weekdayName } from "../utils";
import { localize } from "../localize/localize";
import {
  DATETIME_ROW_STYLES,
  PICKER_LOADER_SCHEMA,
  mergeDatePart,
  mergeTimePart,
  renderDateTimeRow,
} from "./datetime-row";
import type { ChoreSelector, EnrichedChoreItem, HomeAssistant } from "../types";

const DOMAIN = "chore_calendar";

/** A configured target list the chore can be created on. */
export interface TargetOption {
  value: string;
  label: string;
}

/** Loose ha-form schema entry — ha-form is an HA-provided element. */
type FormSchema = { name: string; required?: boolean; [key: string]: unknown };

/** Flat form state, distinct from the service payload built on submit. */
type FormData = Record<string, unknown>;

/** Scheduled frequencies (the interval-only minutely/hourly are excluded). */
const SCHEDULED_FREQ_VALUES = new Set(["daily", "weekly", "monthly", "yearly"]);

/** Frequency values in dropdown order, per chore type. */
const SCHEDULED_FREQ_ORDER = ["daily", "weekly", "monthly", "yearly"];
const INTERVAL_FREQ_ORDER = ["minutely", "hourly", "daily", "weekly", "monthly", "yearly"];

/** Weekday code indexed by JS Date.getDay() (0 = Sunday). */
const DAY_CODE = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** Weekday codes in display order (Mon–Sun) for the weekly toggle. */
const WEEKDAY_CODES = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** Map an ha-form field name to its ``card.edit.field.*`` translation subkey. */
const FIELD_KEYS: Record<string, string> = {
  target_entity: "list",
  chore_name: "name",
  description: "description",
  chore_type: "type",
  dtstart: "start",
  byday: "repeat_on",
  monthly_mode: "repeat_monthly",
  bymonth: "only_in_months",
  due_datetime: "due",
  until: "until",
  count: "count",
  persist: "keep",
  pending_period: "pending_period",
  grace_period: "grace_period",
  trigger_entity: "trigger",
  assigned_to: "assigned_to",
};

/** Scheduled "Repeat every" unit subkey by frequency (calendar-editor style). */
const SCHEDULED_UNIT_KEY: Record<string, string> = { daily: "days", weekly: "weeks", monthly: "months" };

/** Interval "Repeat after" unit subkey by frequency (all frequencies apply). */
const INTERVAL_UNIT_KEY: Record<string, string> = {
  minutely: "minutes",
  hourly: "hours",
  daily: "days",
  weekly: "weeks",
  monthly: "months",
  yearly: "years",
};

export class ChoreEditDialog extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: Boolean }) open = false;
  /** Set for edit mode; undefined for create mode. */
  @property({ attribute: false }) item?: EnrichedChoreItem;
  /** Configured target lists; the list dropdown shows only when >1. */
  @property({ attribute: false }) targets: TargetOption[] = [];
  /** Fallback target when only one list is configured. */
  @property({ attribute: false }) defaultTarget?: string;

  @state() private _data: FormData = {};
  @state() private _error?: string;
  @state() private _loading = false;
  @state() private _confirmDelete = false;
  private _seededFor?: string;

  static styles = css`
    ${DATETIME_ROW_STYLES}
    ha-dialog {
      --ha-dialog-max-width: 460px;
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
    /* Until (end date): matches ha-form's 24px row rhythm; the clear button
       only renders while a date is set. */
    .until-row {
      display: flex;
      align-items: center;
      gap: 4px;
      margin: 24px 0;
    }
    .until-row .until-date {
      flex: 1;
      min-width: 0;
    }
    .until-row .until-clear {
      color: var(--secondary-text-color);
    }
    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 16px;
      border-top: 1px solid var(--divider-color);
    }
    .delete {
      --mdc-theme-primary: var(--error-color);
    }
  `;

  protected willUpdate(changed: Map<string, unknown>) {
    // Seed the form once per open, keyed by item uid (or "create"), so reopening
    // the same dialog resets cleanly without clobbering live edits mid-session.
    if (changed.has("open") || changed.has("item")) {
      const key = this.open ? (this.item?.uid ?? "create") : undefined;
      if (key && key !== this._seededFor) {
        this._seededFor = key;
        this._data = this.item ? this._dataFromItem(this.item) : this._defaults();
        this._error = undefined;
        this._confirmDelete = false;
      }
      if (!this.open) this._seededFor = undefined;
    }
  }

  private _defaults(): FormData {
    return {
      chore_type: "scheduled",
      frequency: "daily",
      interval: 1,
      dtstart: this._todayStart(),
      persist: false,
      ...(this.targets.length > 1 ? {} : { target_entity: this.defaultTarget }),
    };
  }

  /** Today at 08:00 as an ha datetime value ("YYYY-MM-DD HH:MM:SS"). */
  private _todayStart(): string {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return formatHaDateTime(d);
  }

  /** Parse an ha datetime value into a Date (accepts space or T separator). */
  private _parseDate(value: unknown): Date | null {
    if (!value) return null;
    const d = new Date(String(value).replace(" ", "T"));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  /** The date-only (YYYY-MM-DD) portion of an ha datetime value. */
  private _datePart(value: unknown): string {
    return String(value ?? "").slice(0, 10);
  }

  /** Days in the calendar month containing *date*. */
  private _daysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  /**
   * BYSETPOS for the Nth-weekday monthly rule anchored on *date*, using -1 for
   * the final occurrence of that weekday in the month (matching HA's calendar
   * editor). `ceil(day / 7)` alone can never express "last" and yields an
   * unsatisfiable 5 for days 29-31, which most months can't fulfil.
   */
  private _monthlySetpos(date: Date): number {
    return date.getDate() + 7 > this._daysInMonth(date) ? -1 : Math.ceil(date.getDate() / 7);
  }

  /** The two computed monthly options, derived from the start date. */
  private _monthlyOptions(): TargetOption[] {
    const date = this._parseDate(this._data.dtstart) ?? new Date();
    const dom = date.getDate();
    const setpos = this._monthlySetpos(date);
    return [
      {
        value: "monthday",
        label: localize(this.hass, "card.edit.monthly_on_day", { ordinal: ordinalNumber(dom, this.hass) }),
      },
      {
        value: "weekday",
        label: localize(this.hass, "card.edit.monthly_on_weekday", {
          position: positionWord(setpos, this.hass),
          weekday: weekdayName(this.hass, DAY_CODE[date.getDay()]),
        }),
      },
    ];
  }

  private _dataFromItem(item: EnrichedChoreItem): FormData {
    const sel: ChoreSelector = item.selector ?? {};
    const schedule = (typeof item.schedule === "object" && item.schedule) || {};
    const data: FormData = {
      chore_name: item.chore_name,
      description: item.description ?? "",
      chore_type: item.chore_type,
      trigger_entity: item.trigger_entity ?? undefined,
      assigned_to: item.assigned_to,
      target_entity: item.source_entity,
      persist: sel.persist ?? false,
      pending_period: this._minsToDuration(schedule.pending_period_mins),
      grace_period: this._minsToDuration(schedule.grace_period_mins),
    };

    if (item.chore_type === "oneshot") {
      data.due_datetime = sel.due_datetime ?? undefined;
    } else if (item.chore_type === "interval") {
      data.frequency = sel.frequency ?? "daily";
      data.interval = sel.interval ?? 1;
      data.bymonth = (sel.bymonth ?? []).map(String);
      data.until = sel.until ? String(sel.until).slice(0, 10) : undefined;
      data.count = sel.count;
    } else {
      // Scheduled — mirror the calendar editor: a Start datetime plus a
      // per-frequency control (weekday toggles, or a computed monthly mode).
      data.frequency = sel.frequency ?? "daily";
      data.interval = sel.interval ?? 1;
      data.dtstart = sel.dtstart ? String(sel.dtstart).replace("T", " ").slice(0, 19) : this._todayStart();
      const parsedByday = parseByday(sel.byday);
      data.byday = parsedByday.map((e) => e.code);
      const hasOrdinal = parsedByday.some((e) => e.ordinal != null);
      data.monthly_mode =
        sel.bymonthday?.length ? "monthday" : sel.bysetpos?.length || hasOrdinal ? "weekday" : "monthday";
      data.until = sel.until ? String(sel.until).slice(0, 10) : undefined;
      data.count = sel.count;
      // Snapshot the stored recurrence anchor so a no-op Save round-trips the
      // exact rule instead of re-deriving it from dtstart (which would rewrite
      // e.g. "last Friday" to "first Saturday") or stripping fields the form
      // doesn't expose (season bymonth, yearly day-of-month). Re-derivation
      // only kicks in when the user changes the start date or the monthly mode.
      data.__snap = {
        byday: sel.byday ?? [],
        bysetpos: sel.bysetpos ?? [],
        bymonthday: sel.bymonthday ?? [],
        bymonth: sel.bymonth ?? [],
      };
      data.__dtstart0 = data.dtstart;
      data.__mode0 = data.monthly_mode;
    }
    return data;
  }

  private _minsToDuration(mins: unknown): Record<string, number> | undefined {
    const n = Number(mins ?? 0);
    if (!n) return undefined;
    return { days: Math.floor(n / 1440), hours: Math.floor((n % 1440) / 60), minutes: n % 60, seconds: 0 };
  }

  // -- Localized option builders (rebuilt per render so they track language) --

  private get _scheduledFreqs(): { value: string; label: string }[] {
    return SCHEDULED_FREQ_ORDER.map((value) => ({ value, label: localize(this.hass, `card.edit.freq.${value}`) }));
  }

  private get _intervalFreqs(): { value: string; label: string }[] {
    return INTERVAL_FREQ_ORDER.map((value) => ({ value, label: localize(this.hass, `card.edit.freq.${value}`) }));
  }

  private get _weekdayOptions(): { value: string; label: string }[] {
    return WEEKDAY_CODES.map((code) => ({ value: code, label: weekdayName(this.hass, code) }));
  }

  private get _monthOptions(): { value: string; label: string }[] {
    return Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: monthName(this.hass, i + 1, "long") }));
  }

  private _scheduledUnit(freq: string): string {
    return localize(this.hass, `card.edit.unit.${SCHEDULED_UNIT_KEY[freq] ?? "days"}`);
  }

  private _intervalUnit(freq: string): string {
    return localize(this.hass, `card.edit.unit.${INTERVAL_UNIT_KEY[freq] ?? "days"}`);
  }

  /** Fields above the Start row (Start is rendered as a custom row between). */
  private _topSchema(): FormSchema[] {
    const schema: FormSchema[] = [];
    // The list is only choosable at creation; update_item can't move a chore
    // between lists (its uid lives in one list's store), so edit locks it.
    if (!this.item && this.targets.length > 1) {
      schema.push({ name: "target_entity", required: true, selector: { select: { mode: "dropdown", options: this.targets } } });
    }
    schema.push({ name: "chore_name", required: true, selector: { text: {} } });
    schema.push({ name: "description", selector: { text: { multiline: true } } });
    schema.push({
      name: "chore_type",
      required: true,
      selector: {
        select: {
          mode: "dropdown",
          options: [
            { value: "scheduled", label: localize(this.hass, "card.edit.type.scheduled") },
            { value: "interval", label: localize(this.hass, "card.edit.type.interval") },
            { value: "oneshot", label: localize(this.hass, "card.edit.type.oneshot") },
          ],
        },
      },
    });
    return schema;
  }

  /** Type-specific recurrence fields rendered between the Start row and the
   *  Until row. Empty for oneshot (its due datetime is the custom date row). */
  private _recurrenceSchema(): FormSchema[] {
    const type = String(this._data.chore_type ?? "scheduled");
    if (type === "scheduled") return this._scheduledSchema();
    if (type === "interval") return this._intervalSchema();
    return [];
  }

  /** Fields below the Until row: the lifecycle tail plus the shared tail. */
  private _tailSchema(): FormSchema[] {
    const type = String(this._data.chore_type ?? "scheduled");
    const schema: FormSchema[] = [];
    if (type !== "oneshot") schema.push({ name: "count", selector: { number: { min: 1, mode: "box" } } });
    schema.push({ name: "persist", selector: { boolean: {} } });
    schema.push({ name: "pending_period", selector: { duration: {} } });
    schema.push({ name: "grace_period", selector: { duration: {} } });
    schema.push({ name: "trigger_entity", selector: { entity: { filter: { domain: "tag" } } } });
    schema.push({ name: "assigned_to", selector: { entity: { multiple: true, filter: { domain: "person" } } } });
    return schema;
  }

  private _scheduledSchema(): FormSchema[] {
    const freq = String(this._data.frequency ?? "daily");
    const schema: FormSchema[] = [
      { name: "frequency", required: true, selector: { select: { mode: "dropdown", options: this._scheduledFreqs } } },
    ];
    // Yearly has no options (it recurs on the start date); daily/weekly/monthly
    // carry an interval with a dynamic unit, as the calendar editor does.
    if (freq !== "yearly") {
      schema.push({
        name: "interval",
        selector: { number: { min: 1, mode: "box", unit_of_measurement: this._scheduledUnit(freq) } },
      });
    }
    if (freq === "weekly") {
      schema.push({ name: "byday", selector: { select: { multiple: true, mode: "list", options: this._weekdayOptions } } });
    }
    if (freq === "monthly") {
      schema.push({ name: "monthly_mode", selector: { select: { mode: "dropdown", options: this._monthlyOptions() } } });
    }
    return schema;
  }

  private _intervalSchema(): FormSchema[] {
    const freq = String(this._data.frequency ?? "daily");
    return [
      { name: "frequency", required: true, selector: { select: { mode: "dropdown", options: this._intervalFreqs } } },
      {
        name: "interval",
        selector: { number: { min: 1, mode: "box", unit_of_measurement: this._intervalUnit(freq) } },
      },
      { name: "bymonth", selector: { select: { multiple: true, mode: "dropdown", options: this._monthOptions } } },
    ];
  }

  protected render() {
    if (!this.open) return nothing;
    const isEdit = !!this.item;
    return html`
      <ha-dialog .open=${this.open} @closed=${this._onClosed}>
        <ha-icon-button slot="headerNavigationIcon" data-dialog="close" class="header_button">
          <ha-icon icon="mdi:close"></ha-icon>
        </ha-icon-button>
        <span slot="headerTitle">${isEdit ? localize(this.hass, "card.edit.title_edit") : localize(this.hass, "card.edit.title_new")}</span>
        <div class="content">
          ${this._error ? html`<ha-alert alert-type="error">${this._error}</ha-alert>` : nothing}
          <ha-form
            .hass=${this.hass}
            .data=${this._data}
            .schema=${this._topSchema()}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._onValueChanged}
          ></ha-form>
          ${this._data.chore_type === "scheduled"
            ? this._renderDateTimeRow("dtstart", localize(this.hass, "card.edit.start_row"))
            : this._data.chore_type === "oneshot"
              ? this._renderDateTimeRow("due_datetime", localize(this.hass, "card.edit.due_row"))
              : nothing}
          <ha-form
            .hass=${this.hass}
            .data=${this._data}
            .schema=${this._recurrenceSchema()}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._onValueChanged}
          ></ha-form>
          ${this._data.chore_type !== "oneshot" ? this._renderUntilRow() : nothing}
          <ha-form
            .hass=${this.hass}
            .data=${this._data}
            .schema=${this._tailSchema()}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._onValueChanged}
          ></ha-form>
          <ha-form class="picker-loader" .hass=${this.hass} .schema=${PICKER_LOADER_SCHEMA} .data=${{}}></ha-form>
        </div>
        <div slot="footer" class="footer">
          <span>
            ${isEdit
              ? this._confirmDelete
                ? html`<ha-button class="delete" ?disabled=${this._loading} @click=${this._onDelete}>${localize(this.hass, "card.edit.confirm_delete")}</ha-button>`
                : html`<ha-button class="delete" appearance="plain" @click=${() => (this._confirmDelete = true)}>${localize(this.hass, "card.edit.delete")}</ha-button>`
              : nothing}
          </span>
          <ha-button ?disabled=${this._loading} @click=${this._onSubmit}>
            ${this._loading ? localize(this.hass, "card.edit.saving") : isEdit ? localize(this.hass, "card.edit.save") : localize(this.hass, "card.edit.create")}
          </ha-button>
        </div>
      </ha-dialog>
    `;
  }

  /** A date + time row (Start for scheduled, Due for oneshot). The hidden
   *  picker-loader ha-form in the dialog body force-registers the inputs it
   *  uses. */
  private _renderDateTimeRow(key: "dtstart" | "due_datetime", label: string) {
    // A scheduled Start always has a value; an unscheduled oneshot due renders
    // empty (rather than a fake today that Save wouldn't persist).
    return renderDateTimeRow({
      label,
      value: String(this._data[key] ?? (key === "dtstart" ? this._todayStart() : "")),
      locale: this.hass.locale,
      // A oneshot Due is optional, so it can be cleared back to unscheduled. A
      // scheduled Start is required, so it is not clearable.
      canClear: key === "due_datetime",
      onDate: (e) => this._onDatePart(key, e),
      onTime: (e) => this._onTimePart(key, e),
    });
  }

  /** The "Until (end date)" row — a raw ha-date-input with an explicit clear
   *  button, because ha-form's date selector offers no way to clear a value
   *  once one is set. */
  private _renderUntilRow() {
    const until = String(this._data.until ?? "");
    return html`
      <div class="until-row">
        <ha-date-input
          class="until-date"
          .locale=${this.hass.locale}
          .label=${localize(this.hass, "card.edit.field.until")}
          .value=${until}
          .canClear=${true}
          @value-changed=${this._onUntilChanged}
        ></ha-date-input>
        ${until
          ? html`
              <ha-icon-button class="until-clear" title=${localize(this.hass, "card.edit.clear_end_date")} @click=${this._onUntilClear}>
                <ha-icon icon="mdi:close"></ha-icon>
              </ha-icon-button>
            `
          : nothing}
      </div>
    `;
  }

  private _onUntilChanged(e: CustomEvent<{ value?: string }>) {
    this._data = { ...this._data, until: e.detail.value || undefined };
  }

  private _onUntilClear() {
    this._data = { ...this._data, until: undefined };
  }

  private _onDatePart(key: "dtstart" | "due_datetime", e: CustomEvent<{ value?: string }>) {
    const date = e.detail.value;
    // Clearing the date unsets the whole value, taking the time with it, which
    // returns a oneshot to unscheduled. Only the Due row is clearable, so a
    // scheduled Start never reaches this branch and keeps its required value.
    if (!date) {
      if (key === "due_datetime") this._data = { ...this._data, due_datetime: undefined };
      return;
    }
    this._data = { ...this._data, [key]: mergeDatePart(this._data[key], date) };
  }

  private _onTimePart(key: "dtstart" | "due_datetime", e: CustomEvent<{ value?: string }>) {
    const time = e.detail.value;
    if (!time) return;
    this._data = { ...this._data, [key]: mergeTimePart(this._data[key], time) };
  }

  private _computeLabel = (schema: FormSchema): string => {
    if (schema.name === "frequency") {
      return localize(this.hass, this._data.chore_type === "scheduled" ? "card.edit.repeat" : "card.edit.frequency");
    }
    if (schema.name === "interval") {
      return localize(this.hass, this._data.chore_type === "scheduled" ? "card.edit.repeat_every" : "card.edit.repeat_after");
    }
    const key = FIELD_KEYS[schema.name];
    return key ? localize(this.hass, `card.edit.field.${key}`) : schema.name;
  };

  private _onValueChanged(e: CustomEvent<{ value: FormData }>) {
    const prev = this._data;
    const next = { ...e.detail.value };
    // Switching Interval → Scheduled can carry an interval-only frequency
    // ('minutely'/'hourly'); reset it to a valid scheduled frequency so the
    // Repeat dropdown isn't blank and the payload isn't rejected.
    if (
      next.chore_type === "scheduled" &&
      next.chore_type !== prev.chore_type &&
      !SCHEDULED_FREQ_VALUES.has(String(next.frequency))
    ) {
      next.frequency = "daily";
    }
    // A Scheduled chore always needs a persisted Start. Interval/oneshot sources
    // never set dtstart, so seed it here (before the weekday derivation below)
    // — otherwise the row's displayed default would be silently lost on Save.
    if (next.chore_type === "scheduled" && !next.dtstart) {
      next.dtstart = this._todayStart();
    }
    // On a frequency switch, seed the per-frequency control's default so the
    // form is immediately valid — the weekday toggle picks the start weekday,
    // and monthly defaults to the day-of-month option (both like the calendar).
    if (next.chore_type === "scheduled" && next.frequency !== prev.frequency) {
      if (next.frequency === "weekly" && !(Array.isArray(next.byday) && next.byday.length)) {
        const date = this._parseDate(next.dtstart) ?? new Date();
        next.byday = [DAY_CODE[date.getDay()]];
      }
      if (next.frequency === "monthly" && !next.monthly_mode) next.monthly_mode = "monthday";
    }
    // A oneshot Due is deliberately left empty. Unlike a scheduled Start it is
    // optional, and an unscheduled oneshot is a supported state that stays
    // pending rather than falling due, so seeding today here would make every
    // chore created from this dialog dated whether or not that was wanted.
    this._data = next;
  }

  /** Build the service payload from the flat form state. */
  private _buildPayload(): Record<string, unknown> {
    const d = this._data;
    const type = String(d.chore_type ?? "scheduled");
    const payload: Record<string, unknown> = {
      chore_name: String(d.chore_name ?? "").trim(),
      description: String(d.description ?? ""),
    };
    // In edit mode always send the trigger (empty string clears it); on create
    // only send it when set.
    if (this.item) payload.trigger_entity = d.trigger_entity ?? "";
    else if (d.trigger_entity) payload.trigger_entity = d.trigger_entity;
    payload.assigned_to = Array.isArray(d.assigned_to) ? d.assigned_to : [];
    // In edit mode always send the windows (an empty duration clears them); on
    // create only send them when set. Omitting the key preserves the stored
    // value, so a cleared field would otherwise never take effect.
    if (this.item) {
      payload.pending_period = d.pending_period ?? {};
      payload.grace_period = d.grace_period ?? {};
    } else {
      if (d.pending_period) payload.pending_period = d.pending_period;
      if (d.grace_period) payload.grace_period = d.grace_period;
    }

    if (type === "oneshot") {
      payload.oneshot = { due_datetime: d.due_datetime ?? null, persist: !!d.persist };
    } else if (type === "interval") {
      const sel: Record<string, unknown> = { frequency: d.frequency, persist: !!d.persist };
      sel.interval = Number(d.interval ?? 1);
      if (Array.isArray(d.bymonth) && d.bymonth.length) sel.bymonth = d.bymonth;
      this._applyLifecycle(sel, d);
      payload.interval = sel;
    } else {
      payload.scheduled = this._buildScheduledSelector(d);
    }
    return payload;
  }

  private _buildScheduledSelector(d: FormData): Record<string, unknown> {
    const freq = String(d.frequency ?? "daily");
    const sel: Record<string, unknown> = { frequency: freq, persist: !!d.persist };
    if (d.dtstart) sel.dtstart = String(d.dtstart);
    // Always emit interval — the form has no yearly interval control, so this
    // round-trips a service-set "every N years" (dropping it silently reset the
    // rule to every year). The backend omits INTERVAL=1, so a default is a no-op.
    sel.interval = Number(d.interval ?? 1);

    const snap = (d.__snap as Record<string, unknown[]> | undefined) ?? {};
    const snapshot = (key: string): unknown[] => (Array.isArray(snap[key]) ? snap[key] : []);

    if (freq === "weekly") {
      if (Array.isArray(d.byday) && d.byday.length) sel.byday = d.byday;
    } else if (freq === "monthly") {
      // A no-op edit (same start DATE + same mode) round-trips the stored
      // anchor exactly; changing either re-derives it from the start date. The
      // comparison is date-only: dtstart embeds the time, so a time-only edit
      // must not be treated as an anchor change (it would rewrite e.g. "last
      // Friday" into a bogus "5th Friday").
      const anchorChanged =
        this._datePart(d.dtstart) !== this._datePart(d.__dtstart0) || d.monthly_mode !== d.__mode0;
      const byday = snapshot("byday");
      const bysetpos = snapshot("bysetpos");
      const bymonthday = snapshot("bymonthday");
      if (!anchorChanged && (byday.length || bysetpos.length || bymonthday.length)) {
        if (d.monthly_mode === "weekday") {
          if (byday.length) sel.byday = byday;
          if (bysetpos.length) sel.bysetpos = bysetpos;
        } else if (bymonthday.length) {
          sel.bymonthday = bymonthday;
        }
      } else {
        const date = this._parseDate(d.dtstart) ?? new Date();
        if (d.monthly_mode === "weekday") {
          sel.byday = [DAY_CODE[date.getDay()]];
          sel.bysetpos = [this._monthlySetpos(date)];
        } else {
          sel.bymonthday = [date.getDate()];
        }
      }
    } else if (freq === "yearly") {
      // The form exposes no yearly options — round-trip the stored anchor.
      if (snapshot("byday").length) sel.byday = snapshot("byday");
      if (snapshot("bysetpos").length) sel.bysetpos = snapshot("bysetpos");
      if (snapshot("bymonthday").length) sel.bymonthday = snapshot("bymonthday");
    }

    // Season / month-of-year window carries through: the form has no control
    // for it, so preserve whatever was stored (see issues/card-crud-ui.md).
    if (snapshot("bymonth").length) sel.bymonth = snapshot("bymonth");

    this._applyLifecycle(sel, d);
    return sel;
  }

  private _applyLifecycle(sel: Record<string, unknown>, d: FormData) {
    // until and count are mutually exclusive; validation rejects both being set.
    if (d.until) sel.until = d.until;
    else if (d.count) sel.count = Number(d.count);
  }

  /** Client-side validation mirroring recurrence.py; returns an error or null. */
  private _validate(): string | null {
    const d = this._data;
    if (!String(d.chore_name ?? "").trim()) return localize(this.hass, "card.edit.err.name_required");
    const type = String(d.chore_type ?? "scheduled");
    if (type !== "oneshot" && d.until && d.count) return localize(this.hass, "card.edit.err.until_and_count");
    if (!this.item && this.targets.length > 1 && !d.target_entity) return localize(this.hass, "card.edit.err.choose_list");
    return null;
  }

  private _target(): string | undefined {
    return (this._data.target_entity as string) ?? this.defaultTarget ?? this.item?.source_entity;
  }

  private async _onSubmit() {
    if (this._loading) return;
    const error = this._validate();
    if (error) {
      this._error = error;
      return;
    }
    const entityId = this._target();
    if (!entityId) {
      this._error = localize(this.hass, "card.edit.err.no_target");
      return;
    }

    this._loading = true;
    this._error = undefined;
    try {
      const payload = this._buildPayload();
      const isEdit = !!this.item;
      await this.hass.callWS({
        type: "call_service",
        domain: DOMAIN,
        service: isEdit ? "update_item" : "create_item",
        service_data: {
          entity_id: entityId,
          ...(isEdit ? { item: this.item!.uid } : {}),
          ...payload,
        },
      });
      this.dispatchEvent(new CustomEvent("chore-saved", { bubbles: true, composed: true }));
      this.open = false;
    } catch (err) {
      this._error = err instanceof Error ? err.message : String(err);
      console.error("chore-edit-dialog: save failed", err);
    } finally {
      this._loading = false;
    }
  }

  private async _onDelete() {
    if (this._loading || !this.item) return;
    this._loading = true;
    this._error = undefined;
    try {
      await this.hass.callWS({
        type: "call_service",
        domain: DOMAIN,
        service: "delete_item",
        service_data: { entity_id: this.item.source_entity, item: this.item.uid },
      });
      this.dispatchEvent(new CustomEvent("chore-saved", { bubbles: true, composed: true }));
      this.open = false;
    } catch (err) {
      this._error = err instanceof Error ? err.message : String(err);
      console.error("chore-edit-dialog: delete failed", err);
    } finally {
      this._loading = false;
    }
  }

  private _onClosed() {
    this.open = false;
    this.dispatchEvent(new CustomEvent("edit-dialog-closed", { bubbles: true, composed: true }));
  }
}

safeDefine("chore-edit-dialog", ChoreEditDialog);

declare global {
  interface HTMLElementTagNameMap {
    "chore-edit-dialog": ChoreEditDialog;
  }
}
