import { LitElement, html, css, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { safeDefine } from "../define";
import { DAY_FULL, ordinalNumber, parseByday, positionWord } from "../utils";
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

const SCHEDULED_FREQS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const SCHEDULED_FREQ_VALUES = new Set(SCHEDULED_FREQS.map((f) => f.value));

const INTERVAL_FREQS = [
  { value: "minutely", label: "Minutely" },
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

/** Weekday code indexed by JS Date.getDay() (0 = Sunday). */
const DAY_CODE = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const WEEKDAY_OPTIONS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((code) => ({
  value: code,
  label: DAY_FULL[code],
}));

const MONTH_OPTIONS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
].map((label, i) => ({ value: String(i + 1), label }));

/** Dynamic "Repeat every" units for scheduled chores, mirroring HA's calendar editor. */
const SCHEDULED_UNITS: Record<string, string> = { daily: "days", weekly: "weeks", monthly: "months" };

/** Dynamic "Repeat after" units for interval chores (all frequencies apply). */
const INTERVAL_UNITS: Record<string, string> = {
  minutely: "minutes",
  hourly: "hours",
  daily: "days",
  weekly: "weeks",
  monthly: "months",
  yearly: "years",
};

/** A throwaway time selector whose only job is to make HA lazy-load and
 *  register ha-time-input, which isn't loaded anywhere else in the card. */
const TIME_LOADER_SCHEMA = [{ name: "_t", selector: { time: {} } }];

const LABELS: Record<string, string> = {
  target_entity: "List",
  chore_name: "Name",
  description: "Description",
  chore_type: "Type",
  dtstart: "Start",
  byday: "Repeat on",
  monthly_mode: "Repeat monthly",
  bymonth: "Only in months",
  due_datetime: "Due",
  until: "Until (end date)",
  count: "Or after N times",
  persist: "Keep when finished",
  pending_period: "Pending period",
  grace_period: "Grace period",
  trigger_entity: "Trigger tag",
  assigned_to: "Assigned to",
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
    /* Start date + time, laid out like HA's calendar editor: a standalone
       "Start:" label above a row with a wider date field and a narrower time
       field. Raw ha-date-input / ha-time-input (not ha-form fields) so there's
       no reserved label/helper space to throw off the alignment. */
    .start-label {
      margin: 10px 0 2px;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--primary-text-color);
    }
    .start-row {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      margin: 0 0 8px;
    }
    .start-row .start-date {
      flex: 3;
      min-width: 0;
    }
    .start-row .start-time {
      flex: 2;
      min-width: 0;
    }
    /* Off-screen ha-form whose time selector force-registers ha-time-input,
       which HA only lazy-loads when a time selector is used. */
    .start-loader {
      display: none;
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
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} 08:00:00`;
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
      { value: "monthday", label: `Monthly on the ${ordinalNumber(dom)}` },
      { value: "weekday", label: `Monthly on the ${positionWord(setpos)} ${DAY_FULL[DAY_CODE[date.getDay()]]}` },
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
            { value: "scheduled", label: "Scheduled" },
            { value: "interval", label: "Interval" },
            { value: "oneshot", label: "One-time" },
          ],
        },
      },
    });
    return schema;
  }

  /** Fields below the Start row: the type-specific block plus the shared tail. */
  private _bodySchema(): FormSchema[] {
    const type = String(this._data.chore_type ?? "scheduled");
    const schema: FormSchema[] = [];
    if (type === "scheduled") schema.push(...this._scheduledSchema());
    else if (type === "interval") schema.push(...this._intervalSchema());
    else schema.push(...this._oneshotSchema());

    schema.push({ name: "pending_period", selector: { duration: {} } });
    schema.push({ name: "grace_period", selector: { duration: {} } });
    schema.push({ name: "trigger_entity", selector: { entity: { filter: { domain: "tag" } } } });
    schema.push({ name: "assigned_to", selector: { entity: { multiple: true, filter: { domain: "person" } } } });
    return schema;
  }

  private _scheduledSchema(): FormSchema[] {
    const freq = String(this._data.frequency ?? "daily");
    const schema: FormSchema[] = [
      { name: "frequency", required: true, selector: { select: { mode: "dropdown", options: SCHEDULED_FREQS } } },
    ];
    // Yearly has no options (it recurs on the start date); daily/weekly/monthly
    // carry an interval with a dynamic unit, as the calendar editor does.
    if (freq !== "yearly") {
      schema.push({
        name: "interval",
        selector: { number: { min: 1, mode: "box", unit_of_measurement: SCHEDULED_UNITS[freq] ?? "days" } },
      });
    }
    if (freq === "weekly") {
      schema.push({ name: "byday", selector: { select: { multiple: true, mode: "list", options: WEEKDAY_OPTIONS } } });
    }
    if (freq === "monthly") {
      schema.push({ name: "monthly_mode", selector: { select: { mode: "dropdown", options: this._monthlyOptions() } } });
    }
    schema.push(...this._lifecycleSchema());
    return schema;
  }

  private _intervalSchema(): FormSchema[] {
    const freq = String(this._data.frequency ?? "daily");
    return [
      { name: "frequency", required: true, selector: { select: { mode: "dropdown", options: INTERVAL_FREQS } } },
      {
        name: "interval",
        selector: { number: { min: 1, mode: "box", unit_of_measurement: INTERVAL_UNITS[freq] ?? "days" } },
      },
      { name: "bymonth", selector: { select: { multiple: true, mode: "dropdown", options: MONTH_OPTIONS } } },
      ...this._lifecycleSchema(),
    ];
  }

  private _oneshotSchema(): FormSchema[] {
    // due_datetime renders as a custom date+time row (see _renderDateTimeRow).
    return [{ name: "persist", selector: { boolean: {} } }];
  }

  private _lifecycleSchema(): FormSchema[] {
    return [
      { name: "until", selector: { date: {} } },
      { name: "count", selector: { number: { min: 1, mode: "box" } } },
      { name: "persist", selector: { boolean: {} } },
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
        <span slot="headerTitle">${isEdit ? "Edit chore" : "New chore"}</span>
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
            ? this._renderDateTimeRow("dtstart", "Start:")
            : this._data.chore_type === "oneshot"
              ? this._renderDateTimeRow("due_datetime", "Due:")
              : nothing}
          <ha-form
            .hass=${this.hass}
            .data=${this._data}
            .schema=${this._bodySchema()}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._onValueChanged}
          ></ha-form>
        </div>
        <div slot="footer" class="footer">
          <span>
            ${isEdit
              ? this._confirmDelete
                ? html`<ha-button class="delete" ?disabled=${this._loading} @click=${this._onDelete}>Confirm delete</ha-button>`
                : html`<ha-button class="delete" appearance="plain" @click=${() => (this._confirmDelete = true)}>Delete</ha-button>`
              : nothing}
          </span>
          <ha-button ?disabled=${this._loading} @click=${this._onSubmit}>
            ${this._loading ? "Saving..." : isEdit ? "Save" : "Create"}
          </ha-button>
        </div>
      </ha-dialog>
    `;
  }

  /** A date + time row (Start for scheduled, Due for oneshot), using HA's raw
   *  date/time inputs (as the calendar editor does) with no labels — the
   *  heading labels the row — so nothing reserves the vertical space that
   *  misaligns ha-form fields. The hidden ha-form force-registers
   *  ha-time-input. */
  private _renderDateTimeRow(key: "dtstart" | "due_datetime", label: string) {
    // A scheduled Start always has a value; an unscheduled oneshot due renders
    // empty (rather than a fake today that Save wouldn't persist).
    const dt = String(this._data[key] ?? (key === "dtstart" ? this._todayStart() : ""));
    return html`
      <div class="start-label">${label}</div>
      <div class="start-row">
        <ha-date-input
          class="start-date"
          .locale=${this.hass.locale}
          .value=${dt.slice(0, 10)}
          .label=${" "}
          @value-changed=${(e: CustomEvent<{ value?: string }>) => this._onDatePart(key, e)}
        ></ha-date-input>
        <ha-time-input
          class="start-time"
          .locale=${this.hass.locale}
          .value=${dt ? dt.slice(11, 19) || "08:00:00" : ""}
          .enableSecond=${false}
          @value-changed=${(e: CustomEvent<{ value?: string }>) => this._onTimePart(key, e)}
        ></ha-time-input>
      </div>
      <ha-form class="start-loader" .hass=${this.hass} .schema=${TIME_LOADER_SCHEMA} .data=${{}}></ha-form>
    `;
  }

  private _onDatePart(key: "dtstart" | "due_datetime", e: CustomEvent<{ value?: string }>) {
    const date = e.detail.value;
    if (!date) return;
    const time = String(this._data[key] ?? "").slice(11, 19) || "08:00:00";
    this._data = { ...this._data, [key]: `${date} ${time}` };
  }

  private _onTimePart(key: "dtstart" | "due_datetime", e: CustomEvent<{ value?: string }>) {
    let time = e.detail.value;
    if (!time) return;
    if (time.length === 5) time += ":00"; // ha-time-input omits seconds when disabled
    const date = String(this._data[key] ?? "").slice(0, 10) || this._todayStart().slice(0, 10);
    this._data = { ...this._data, [key]: `${date} ${time}` };
  }

  private _computeLabel = (schema: FormSchema): string => {
    if (schema.name === "frequency") return this._data.chore_type === "scheduled" ? "Repeat" : "Frequency";
    if (schema.name === "interval") return this._data.chore_type === "scheduled" ? "Repeat every" : "Repeat after";
    return LABELS[schema.name] ?? schema.name;
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
    // Seed a due date when switching to oneshot so its date+time row has a value.
    if (next.chore_type === "oneshot" && next.chore_type !== prev.chore_type && !next.due_datetime) {
      next.due_datetime = this._todayStart();
    }
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
    if (!String(d.chore_name ?? "").trim()) return "Name is required.";
    const type = String(d.chore_type ?? "scheduled");
    if (type !== "oneshot" && d.until && d.count) return "Set either an end date or a count, not both.";
    if (!this.item && this.targets.length > 1 && !d.target_entity) return "Choose a list.";
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
      this._error = "No target list available.";
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
