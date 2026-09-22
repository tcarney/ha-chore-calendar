import { LitElement, html, css, nothing } from "lit";
import { property } from "lit/decorators.js";
import { safeDefine } from "../define";
import type { HomeAssistant } from "../types";

/** Assignee avatar badges: the person's entity_picture in a small circle,
 *  else their explicitly set icon, else their initial in a list-colored
 *  bubble (never the generic mdi:account default). Name shows as a tooltip.
 *  The list color arrives as ``--border-color`` from the host. Shared by the
 *  chore row and the detail dialog header. */
export class ChoreAssignees extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) assignedTo: string[] = [];

  static styles = css`
    :host {
      display: flex;
      flex-shrink: 0;
      align-items: center;
    }

    .avatar {
      box-sizing: border-box;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background-size: cover;
      background-position: center;
      /* Card-background ring separates overlapping avatars in a stack. */
      border: 2px solid var(--card-background-color, var(--ha-card-background, white));
    }

    .avatar + .avatar {
      margin-left: -7px;
    }

    .initial {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--border-color, var(--primary-color, #03a9f4));
      color: var(--text-primary-color, white);
      font-size: 10px;
      font-weight: 500;
      line-height: 1;
    }

    /* Icon fallback: bare icon, no photo-style disc. */
    .icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      color: var(--border-color, var(--primary-color, #03a9f4));
      --mdc-icon-size: 18px;
    }

    .icon ha-icon {
      display: flex;
      line-height: 0;
    }
  `;

  protected render() {
    if (this.assignedTo.length === 0) return nothing;
    return this.assignedTo.map((id) => {
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
    });
  }
}

safeDefine("chore-assignees", ChoreAssignees);

declare global {
  interface HTMLElementTagNameMap {
    "chore-assignees": ChoreAssignees;
  }
}
