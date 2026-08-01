/**
 * Press-and-hold handler that fires as soon as the hold time elapses, without
 * waiting for release.
 *
 * Distinct from ``action-handler.ts`` (HA's own directive, used for row
 * gestures), which reports a hold on release because it competes with tap and
 * double-tap. The detail dialog's Complete/Skip buttons have no double-tap and
 * swap the dialog out mid-press, so the hold has to resolve on the timer — and
 * the release that follows must not also fire the tap.
 */
import { noChange } from "lit";
import type { AttributePart, DirectiveParameters } from "lit/directive.js";
import { directive, Directive } from "lit/directive.js";

/** Hold duration, matching HA's action-handler so gestures feel the same. */
export const HOLD_TIME_MS = 500;

export interface HoldActionOptions {
  /** Runs once the hold time elapses, while the pointer is still down. */
  hold: () => void;
  /** Runs on a click (including keyboard activation) that wasn't a hold. */
  tap: () => void;
  disabled?: boolean;
}

interface HoldActionState {
  options: HoldActionOptions;
  timer?: number;
  /** Set when the hold fired, so the release's click is swallowed. */
  fired: boolean;
}

interface HoldActionElement extends HTMLElement {
  _holdAction?: HoldActionState;
}

function bindHoldAction(element: HoldActionElement, options: HoldActionOptions) {
  // Listeners read the options through the state object, so a re-render (which
  // hands over fresh closures) updates behavior without rebinding.
  if (element._holdAction) {
    element._holdAction.options = options;
    return;
  }

  const state: HoldActionState = { options, fired: false };
  element._holdAction = state;

  const clearTimer = () => {
    if (state.timer !== undefined) {
      clearTimeout(state.timer);
      state.timer = undefined;
    }
  };

  element.addEventListener("pointerdown", (ev: PointerEvent) => {
    if (state.options.disabled || !ev.isPrimary || ev.button !== 0) return;
    // A fresh press always clears the previous one's verdict, so a hold whose
    // click never arrived can't swallow a later tap.
    state.fired = false;
    clearTimer();
    state.timer = window.setTimeout(() => {
      state.timer = undefined;
      state.fired = true;
      state.options.hold();
    }, HOLD_TIME_MS);
  });

  for (const type of ["pointerup", "pointercancel", "pointerleave"]) {
    element.addEventListener(type, clearTimer);
  }

  // Touch synthesizes a click at the release point ~300ms later, which would
  // land on whatever the hold just opened there. Suppressing the default on
  // touchend cancels it; the event still reaches this listener because touches
  // stay bound to their touchstart target.
  element.addEventListener("touchend", (ev: TouchEvent) => {
    if (state.fired && ev.cancelable) ev.preventDefault();
  });

  element.addEventListener("click", (ev: MouseEvent) => {
    if (state.options.disabled) return;
    if (state.fired) {
      state.fired = false;
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
    state.options.tap();
  });

  // A long press on touch would otherwise raise the context menu mid-hold.
  element.addEventListener("contextmenu", (ev: Event) => ev.preventDefault());
}

export const holdAction = directive(
  class extends Directive {
    update(part: AttributePart, [options]: DirectiveParameters<this>) {
      bindHoldAction(part.element as HoldActionElement, options);
      return noChange;
    }

    render(_options: HoldActionOptions) {}
  },
);
