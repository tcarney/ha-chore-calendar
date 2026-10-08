// Validation logic for script/card/i18n-check (kept separate so tests can import it).
//
// en.json is the source of truth for ordinary keys and for which plural/ordinal
// families exist. Each family must have exactly the categories the locale
// selects (Intl.PluralRules), with placeholders matching English's `other` form.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CATEGORY = "(zero|one|two|few|many|other)";
const CARDINAL_RE = new RegExp(`^(.*)_${CATEGORY}$`);
const ORDINAL_RE = new RegExp(`^(.*\\.ordinal)\\.${CATEGORY}$`);

/** Flatten a nested dict to { "a.b.c": "value" }. */
export function flatten(obj, prefix = "", out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") flatten(value, full, out);
    else out[full] = value;
  }
  return out;
}

/** The set of {placeholder} tokens in a string. */
function tokens(str) {
  return new Set((String(str).match(/\{(\w+)\}/g) || []).sort());
}

/** Split a key into its plural/ordinal family, or null for an ordinary key. */
export function pluralFamily(key) {
  const ordinal = ORDINAL_RE.exec(key);
  if (ordinal) return { base: ordinal[1], type: "ordinal", category: ordinal[2] };
  const cardinal = CARDINAL_RE.exec(key);
  if (cardinal) return { base: cardinal[1], type: "cardinal", category: cardinal[2] };
  return null;
}

/** Group a flat dictionary into ordinary keys and plural families. */
function classify(flat) {
  const ordinary = {};
  const families = new Map(); // "type:base" → { base, type, forms: { category: value } }
  for (const [key, value] of Object.entries(flat)) {
    const fam = pluralFamily(key);
    if (!fam) {
      ordinary[key] = value;
      continue;
    }
    const id = `${fam.type}:${fam.base}`;
    if (!families.has(id)) families.set(id, { base: fam.base, type: fam.type, forms: {} });
    families.get(id).forms[fam.category] = value;
  }
  return { ordinary, families };
}

/** Categories the locale can select at runtime, or null when the locale is invalid. */
export function categoriesFor(locale, type) {
  try {
    return new Intl.PluralRules(locale, { type }).resolvedOptions().pluralCategories;
  } catch {
    return null;
  }
}

function samePlaceholders(a, b) {
  return a.size === b.size && [...a].every((t) => b.has(t));
}

function describe(set) {
  return [...set].join(",") || "∅";
}

/** Run every check against a languages directory; returns the list of problems. */
export function checkDictionaries(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const problems = [];

  const load = (file) => classify(flatten(JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"))));
  const base = load("en.json");

  for (const file of files) {
    const locale = file.replace(/\.json$/, "");
    const lang = file === "en.json" ? base : load(file);

    for (const key of Object.keys(base.ordinary)) {
      if (!(key in lang.ordinary)) {
        problems.push(`${file}: missing key ${key}`);
      } else if (file !== "en.json") {
        const a = tokens(base.ordinary[key]);
        const b = tokens(lang.ordinary[key]);
        if (!samePlaceholders(a, b)) problems.push(`${file}: ${key} placeholders ${describe(b)} != en ${describe(a)}`);
      }
    }
    for (const key of Object.keys(lang.ordinary)) {
      if (!(key in base.ordinary)) problems.push(`${file}: extra key ${key} (not in en.json)`);
    }

    for (const [id, fam] of lang.families) {
      if (!base.families.has(id)) {
        const supported = categoriesFor(locale, fam.type);
        if (supported) {
          for (const cat of Object.keys(fam.forms)) {
            if (!supported.includes(cat)) {
              problems.push(`${file}: ${fam.base} unsupported ${fam.type} category "${cat}"`);
            }
          }
        }
        for (const cat of Object.keys(fam.forms)) problems.push(`${file}: extra key ${fam.base}[${cat}] (not in en.json)`);
      }
    }

    for (const [id, enFam] of base.families) {
      const fam = lang.families.get(id);
      const supported = categoriesFor(locale, enFam.type);
      if (!supported) {
        problems.push(`${file}: "${locale}" is not a valid locale for Intl.PluralRules`);
        continue;
      }
      for (const cat of supported) {
        if (!fam || !(cat in fam.forms)) problems.push(`${file}: ${enFam.base} missing ${enFam.type} category "${cat}"`);
      }
      if (!fam) continue;
      const reference = tokens(enFam.forms.other ?? Object.values(enFam.forms)[0]);
      for (const [cat, value] of Object.entries(fam.forms)) {
        if (!supported.includes(cat)) {
          problems.push(`${file}: ${enFam.base} unsupported ${enFam.type} category "${cat}"`);
        }
        const got = tokens(value);
        if (!samePlaceholders(reference, got)) {
          problems.push(`${file}: ${enFam.base}[${cat}] placeholders ${describe(got)} != en ${describe(reference)}`);
        }
      }
    }
  }

  problems.push(...checkRegistry(dir, files));
  return { problems, files, keyCount: Object.keys(base.ordinary).length + base.families.size };
}

/** Every dictionary must be imported and registered in localize.ts, and nothing registered without a file. */
function checkRegistry(dir, files) {
  const problems = [];
  const registryFile = path.join(dir, "..", "localize.ts");
  const registrySrc = fs.readFileSync(registryFile, "utf8");
  const imports = {}; // identifier → language code (from the file name)
  for (const m of registrySrc.matchAll(/import\s+(\w+)\s+from\s+["']\.\/languages\/([\w-]+)\.json["']/g)) {
    imports[m[1]] = m[2];
  }
  const block = /const\s+LANGUAGES[^=]*=\s*\{([^}]*)\}/.exec(registrySrc);
  const registered = new Map(); // language code key → identifier
  if (!block) {
    problems.push(`${registryFile}: LANGUAGES registry not found`);
    return problems;
  }
  for (const raw of block[1].split(",").map((s) => s.trim()).filter(Boolean)) {
    const pair = /^["']?([\w-]+)["']?\s*:\s*(\w+)$/.exec(raw);
    if (pair) registered.set(pair[1], pair[2]);
    else registered.set(raw, raw); // shorthand `{ en }`
  }
  const codes = files.map((f) => f.replace(/\.json$/, ""));
  for (const code of codes) {
    const ident = registered.get(code);
    if (!ident) problems.push(`${code}.json: not registered in LANGUAGES (${registryFile})`);
    else if (imports[ident] !== code) {
      problems.push(`${code}.json: LANGUAGES["${code}"] does not map to an import of ./languages/${code}.json`);
    }
  }
  for (const code of registered.keys()) {
    if (!codes.includes(code)) problems.push(`LANGUAGES registers "${code}" but languages/${code}.json does not exist`);
  }
  return problems;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { problems, files, keyCount } = checkDictionaries(process.argv[2]);
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log(`OK — ${files.length} language file(s), ${keyCount} keys each, all registered.`);
}
