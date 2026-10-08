import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const { checkDictionaries } = await import(
  pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../script/card/i18n-check.mjs")).href
);

const EN = {
  card: {
    button: { edit: "Edit", skip: "Skip" },
    time: { in: "in {duration}" },
    schedule: { at: "At {time}", times_one: "{count} time", times_other: "{count} times" },
    ordinal: { one: "{n}st", two: "{n}nd", few: "{n}rd", other: "{n}th" },
  },
};

const IT = {
  card: {
    button: { edit: "Modifica", skip: "Salta" },
    time: { in: "tra {duration}" },
    schedule: { at: "Alle {time}", times_one: "{count} volta", times_many: "{count} volte", times_other: "{count} volte" },
    ordinal: { many: "{n}°", other: "{n}°" },
  },
};

/** Build a languages dir with a matching localize.ts registry; returns problems. */
function run(langs) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "i18n-"));
  const dir = path.join(root, "localize", "languages");
  fs.mkdirSync(dir, { recursive: true });
  const codes = Object.keys(langs);
  for (const code of codes) fs.writeFileSync(path.join(dir, `${code}.json`), JSON.stringify(langs[code]));
  const imports = codes.map((c) => `import ${c.replace("-", "_")} from "./languages/${c}.json";`).join("\n");
  const reg = codes.map((c) => `"${c}": ${c.replace("-", "_")}`).join(", ");
  fs.writeFileSync(path.join(root, "localize", "localize.ts"), `${imports}\nconst LANGUAGES: Record<string, unknown> = { ${reg} };\n`);
  try {
    return checkDictionaries(dir).problems;
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const clone = (o) => JSON.parse(JSON.stringify(o));

test("repository dictionaries pass", () => {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/localize/languages");
  assert.deepEqual(checkDictionaries(dir).problems, []);
});

test("English and Italian pass", () => {
  assert.deepEqual(run({ en: EN, it: IT }), []);
});

test("missing selectable category fails", () => {
  const it = clone(IT);
  delete it.card.schedule.times_many;
  delete it.card.ordinal.many;
  const problems = run({ en: EN, it }).join("\n");
  assert.match(problems, /times missing cardinal category "many"/);
  assert.match(problems, /ordinal missing ordinal category "many"/);
});

test("incomplete Polish cardinal fails", () => {
  const pl = clone(IT);
  pl.card.schedule = { at: "O {time}", times_one: "{count} raz", times_other: "{count} razu" };
  pl.card.ordinal = { other: "{n}." };
  const problems = run({ en: EN, pl }).join("\n");
  assert.match(problems, /times missing cardinal category "few"/);
  assert.match(problems, /times missing cardinal category "many"/);
});

test("consistently wrong plural placeholder fails against English", () => {
  const it = clone(IT);
  for (const cat of ["one", "many", "other"]) it.card.schedule[`times_${cat}`] = "{n} volte";
  assert.match(run({ en: EN, it }).join("\n"), /times\[one\] placeholders \{n\} != en \{count\}/);
});

test("Polish cardinal one/few/many/other passes", () => {
  const pl = clone(IT);
  pl.card.schedule = { at: "O {time}", times_one: "{count} raz", times_few: "{count} razy", times_many: "{count} razy", times_other: "{count} razu" };
  pl.card.ordinal = { other: "{n}." };
  assert.deepEqual(run({ en: EN, pl }), []);
});

test("Russian cardinal one/few/many/other passes", () => {
  const ru = clone(IT);
  ru.card.schedule = { at: "В {time}", times_one: "{count} раз", times_few: "{count} раза", times_many: "{count} раз", times_other: "{count} раза" };
  ru.card.ordinal = { other: "{n}-й" };
  assert.deepEqual(run({ en: EN, ru }), []);
});

test("missing ordinary key fails", () => {
  const it = clone(IT);
  delete it.card.button.skip;
  assert.match(run({ en: EN, it }).join("\n"), /it\.json: missing key card\.button\.skip/);
});

test("extra ordinary key fails", () => {
  const it = clone(IT);
  it.card.button.extra = "x";
  assert.match(run({ en: EN, it }).join("\n"), /extra key card\.button\.extra/);
});

test("missing other fallback category fails", () => {
  const it = clone(IT);
  delete it.card.schedule.times_other;
  delete it.card.ordinal.other;
  const problems = run({ en: EN, it }).join("\n");
  assert.match(problems, /times missing cardinal category "other"/);
  assert.match(problems, /ordinal missing ordinal category "other"/);
});

test("unsupported plural and ordinal categories fail", () => {
  const it = clone(IT);
  it.card.schedule.times_two = "{count} volte";
  for (const category of ["one", "two", "few"]) it.card.ordinal[category] = "{n}°";
  const problems = run({ en: EN, it }).join("\n");
  assert.match(problems, /times unsupported cardinal category "two"/);
  assert.match(problems, /ordinal unsupported ordinal category "one"/);
  assert.match(problems, /ordinal unsupported ordinal category "two"/);
  assert.match(problems, /ordinal unsupported ordinal category "few"/);
});

test("invalid category suffix fails", () => {
  const it = clone(IT);
  it.card.schedule.times_several = "{count} volte";
  assert.match(run({ en: EN, it }).join("\n"), /extra key card\.schedule\.times_several/);
});

test("placeholder mismatch fails", () => {
  const it = clone(IT);
  it.card.time.in = "tra {minutes}";
  it.card.schedule.times_one = "{n} volta";
  const problems = run({ en: EN, it }).join("\n");
  assert.match(problems, /card\.time\.in placeholders/);
  assert.match(problems, /times\[one\] placeholders/);
});

test("unregistered locale fails", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "i18n-"));
  const dir = path.join(root, "localize", "languages");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "en.json"), JSON.stringify(EN));
  fs.writeFileSync(path.join(dir, "it.json"), JSON.stringify(IT));
  fs.writeFileSync(
    path.join(root, "localize", "localize.ts"),
    `import en from "./languages/en.json";\nconst LANGUAGES: Record<string, unknown> = { en };\n`,
  );
  try {
    assert.match(checkDictionaries(dir).problems.join("\n"), /it\.json: not registered/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
