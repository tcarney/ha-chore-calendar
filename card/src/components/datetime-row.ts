import { css, html } from "lit";
import type { TemplateResult } from "lit";
import { formatHaDateTime } from "../utils";

/** Time used when a row has a date but no time set yet. */
const DEFAULT_TIME = "08:00:00";

/**
 * Styles for {@link renderDateTimeRow} and the picker loader. Spread into a
 * component's ``static styles`` array alongside its own rules.
 */
export const DATETIME_ROW_STYLES = css`
  /* Date + time laid out like HA's calendar event editor, down to the label
     typography and the growing date field with a content-sized time field
     16px after it. Raw ha-date-input / ha-time-input rather than an ha-form
     datetime selector, whose reserved label and helper space throws the row
     out of line. */
  .datetime-label {
    margin: 10px 0 2px;
    font-size: var(--ha-font-size-s, 12px);
    font-weight: var(--ha-font-weight-medium, 500);
    color: var(--input-label-ink-color, rgba(0, 0, 0, 0.6));
  }
  .datetime-row {
    display: flex;
    justify-content: space-between;
    margin: 0 0 8px;
  }
  .datetime-row .datetime-date {
    flex-grow: 1;
    min-width: 0;
  }
  .datetime-row .datetime-time {
    margin-left: 16px;
    margin-inline-start: 16px;
    margin-inline-end: initial;
  }
  /* Off-screen ha-form whose selectors force-register ha-date-input and
     ha-time-input, which HA only lazy-loads when a matching selector is
     rendered by an ha-form. */
  .picker-loader {
    display: none;
  }
`;

/** Throwaway selectors whose only job is to make HA lazy-load and register
 *  ha-time-input and ha-date-input, which {@link renderDateTimeRow} uses but
 *  no ha-form schema in the card imports. Render as
 *  ``<ha-form class="picker-loader" .hass=${hass} .schema=${PICKER_LOADER_SCHEMA} .data=${{}}>``. */
export const PICKER_LOADER_SCHEMA = [
  { name: "_t", selector: { time: {} } },
  { name: "_d", selector: { date: {} } },
];

/** A labelled date + time row bound to an ha datetime value
 *  ("YYYY-MM-DD HH:MM:SS"); an empty value renders both fields empty.
 *
 *  The heading above the row carries the label and the date input gets none of
 *  its own, as in HA's calendar event editor. Its fields then sit slightly
 *  higher than the time input's HH/MM — the same offset the native dialog has
 *  (where AM/PM doesn't line up either). */
export function renderDateTimeRow(opts: {
  label: string;
  value: string;
  locale: unknown;
  onDate: (ev: CustomEvent<{ value?: string }>) => void;
  onTime: (ev: CustomEvent<{ value?: string }>) => void;
}): TemplateResult {
  const { label, value, locale, onDate, onTime } = opts;
  return html`
    <div class="datetime-label">${label}</div>
    <div class="datetime-row">
      <ha-date-input
        class="datetime-date"
        .locale=${locale}
        .value=${value.slice(0, 10)}
        @value-changed=${onDate}
      ></ha-date-input>
      <ha-time-input
        class="datetime-time"
        .locale=${locale}
        .value=${value ? value.slice(11, 19) || DEFAULT_TIME : ""}
        .enableSecond=${false}
        @value-changed=${onTime}
      ></ha-time-input>
    </div>
  `;
}

/** Merge a new date into an ha datetime value, keeping its time. */
export function mergeDatePart(current: unknown, date: string): string {
  const time = String(current ?? "").slice(11, 19) || DEFAULT_TIME;
  return `${date} ${time}`;
}

/** Merge a new time into an ha datetime value, keeping its date (today when
 *  unset). Seconds are appended — ha-time-input omits them when disabled. */
export function mergeTimePart(current: unknown, time: string): string {
  const withSeconds = time.length === 5 ? `${time}:00` : time;
  const date = String(current ?? "").slice(0, 10) || formatHaDateTime(new Date()).slice(0, 10);
  return `${date} ${withSeconds}`;
}
