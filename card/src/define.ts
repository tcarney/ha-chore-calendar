/**
 * Safely register a custom element, skipping if already defined.
 *
 * Prevents DOMException when the script loads twice (e.g. cached + cache-busted
 * versions both execute, or HA's scoped registry replays definitions).
 */
export function safeDefine(
  tag: string,
  ctor: CustomElementConstructor,
): void {
  if (customElements.get(tag)) return;
  customElements.define(tag, ctor);
}
