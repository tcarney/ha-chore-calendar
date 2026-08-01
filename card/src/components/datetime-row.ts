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
  /* Date + time laid out like HA's calendar editor: a standalone label above a
     row with a wider date field and a narrower time field. Raw ha-date-input /
     ha-time-input (not ha-form fields) so there's no reserved label/helper
     space to throw off the alignment. */
  .datetime-label {
    margin: 10px 0 2px;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--primary-text-color);
  }
  .datetime-row {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    margin: 0 0 8px;
  }
  .datetime-row .datetime-date {
    flex: 3;
    min-width: 0;
  }
  .datetime-row .datetime-time {
    flex: 2;
    min-width: 0;
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
 *  The heading above the row carries the label, so the date input's own label
 *  is a non-breaking space: blank would collapse its reserved label space and
 *  drop the field out of line with the time input beside it. */
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
        .label=${" "}
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
