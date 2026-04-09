/**
 * Workaround for Safari + HA's scoped custom element registry polyfill.
 *
 * Safari throws "Sheet constructor document doesn't match" when a
 * CSSStyleSheet created in one document context is adopted by an element
 * in another. HA's @webcomponents/scoped-custom-element-registry polyfill
 * can cause this by moving elements across scopes.
 *
 * This patch overrides LitElement.createRenderRoot to catch the error and
 * fall back to injecting <style> tags directly.
 */
import { LitElement, type CSSResultOrNative } from "lit";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- monkey-patching protected prototype method
const proto = LitElement.prototype as any;
const original = proto.createRenderRoot;

proto.createRenderRoot = function (this: LitElement) {
  try {
    return original.call(this);
  } catch {
    // adoptedStyleSheets failed — fall back to inline <style> elements.
    const root = this.attachShadow(
      (this.constructor as typeof LitElement).shadowRootOptions,
    );
    const styles = (this.constructor as typeof LitElement).elementStyles;
    if (styles && styles.length > 0) {
      for (const s of styles) {
        const style = document.createElement("style");
        style.textContent =
          typeof (s as CSSResultOrNative) === "string"
            ? (s as unknown as string)
            : (s as CSSStyleSheet).cssRules
              ? Array.from((s as CSSStyleSheet).cssRules)
                  .map((r) => r.cssText)
                  .join("\n")
              : (s as { cssText?: string }).cssText ?? "";
        root.appendChild(style);
      }
    }
    return root;
  }
};
