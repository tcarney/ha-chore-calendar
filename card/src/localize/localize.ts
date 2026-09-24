import type { HomeAssistant } from "../types";
import en from "./languages/en.json";

/** Registered translation dictionaries, keyed by language code. */
const LANGUAGES: Record<string, unknown> = { en };

/**
 * Resolved language for both translation lookup and Intl formatters.
 * Mirrors the Home Assistant frontend: the per-user selected language, then the
 * instance language, then English.
 */
export function resolveLang(hass?: HomeAssistant): string {
  return hass?.locale?.language || hass?.language || "en";
}

/** Resolve a dotted key against a nested dictionary, or undefined when absent. */
function lookup(dict: unknown, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>(
    (node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined),
    dict,
  );
  return typeof value === "string" ? value : undefined;
}

/** Substitute ``{name}`` placeholders; a missing placeholder is left verbatim. */
function interpolate(template: string, placeholders?: Record<string, string | number>): string {
  if (!placeholders) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    placeholders[name] != null ? String(placeholders[name]) : `{${name}}`,
  );
}

/**
 * Translate a dotted key for the resolved language.
 *
 * Falls back through exact language, base language (``it-CH`` → ``it``),
 * English, then the literal key, so a partial translation never renders blank.
 */
export function localize(
  hass: HomeAssistant | undefined,
  key: string,
  placeholders?: Record<string, string | number>,
): string {
  const raw = resolveLang(hass);
  const candidates = [raw, raw.split("-")[0], "en"];
  let template: string | undefined;
  for (const code of candidates) {
    template = lookup(LANGUAGES[code], key);
    if (template != null) break;
  }
  if (template == null) template = lookup(LANGUAGES.en, key) ?? key;
  return interpolate(template, placeholders);
}

/**
 * Plural-aware translation: appends the CLDR plural category to the base key
 * (``base_one`` / ``base_other`` / ...). ``count`` is added to the placeholders.
 */
export function localizePlural(
  hass: HomeAssistant | undefined,
  baseKey: string,
  count: number,
  placeholders?: Record<string, string | number>,
): string {
  const category = new Intl.PluralRules(resolveLang(hass)).select(count);
  const merged = { count, ...(placeholders ?? {}) };
  const categoryKey = `${baseKey}_${category}`;
  // Fall back to _other when the language lacks the selected category.
  if (localize(hass, categoryKey, merged) !== categoryKey) {
    return localize(hass, categoryKey, merged);
  }
  return localize(hass, `${baseKey}_other`, merged);
}

/**
 * Localized chore status word. Reuses the integration's own entity-state
 * translations (loaded eagerly for configured integrations), falling back to
 * the card bundle when the frontend has not loaded that key yet.
 */
export function statusLabel(hass: HomeAssistant | undefined, status: string): string {
  const viaHa = hass?.localize?.(`component.chore_calendar.entity.sensor.chore_status.state.${status}`);
  return viaHa && viaHa !== "" ? viaHa : localize(hass, `card.status.${status}`);
}
