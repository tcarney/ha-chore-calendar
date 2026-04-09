import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { FilterValue } from "../types";

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "overdue", label: "Overdue" },
  { value: "due", label: "Due" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
];

@customElement("status-filter")
export class StatusFilter extends LitElement {
  @property() value: FilterValue = "active";

  static styles = css`
    :host {
      display: inline-block;
    }

    select {
      background: transparent;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      border-radius: 8px;
      padding: 4px 8px;
      font-size: 12px;
      color: var(--primary-text-color);
      cursor: pointer;
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      padding-right: 20px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23727272'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 6px center;
    }

    select:focus {
      border-color: var(--primary-color);
    }
  `;

  protected render() {
    return html`
      <select .value=${this.value} @change=${this._onChange}>
        ${FILTER_OPTIONS.map(
          (opt) =>
            html`<option
              value=${opt.value}
              ?selected=${opt.value === this.value}
            >
              ${opt.label}
            </option>`,
        )}
      </select>
    `;
  }

  private _onChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    this.value = select.value as FilterValue;
    this.dispatchEvent(
      new CustomEvent("filter-changed", {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "status-filter": StatusFilter;
  }
}
