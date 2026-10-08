import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rollup } from "rollup";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

const cardDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Bundle src/utils.ts in memory and import it. */
async function loadModule(file) {
  const bundle = await rollup({
    input: path.join(cardDir, file),
    plugins: [json(), typescript({ tsconfig: path.join(cardDir, "tsconfig.json") }), resolve()],
    onwarn: () => {},
  });
  const { output } = await bundle.generate({ format: "es" });
  await bundle.close();
  return import(`data:text/javascript;base64,${Buffer.from(output[0].code).toString("base64")}`);
}

const { formatSchedule, dueInText, ordinalNumber, positionWord } = await loadModule("src/utils.ts");
const { localizePlural, localizeOrdinal } = await loadModule("src/localize/localize.ts");

const en = { language: "en", locale: { language: "en", time_format: "24" } };
const it = { language: "it", locale: { language: "it", time_format: "24" } };

const render = (hass, selector, time = "09:00:00") => formatSchedule({ rrule: "x", time }, selector, hass);
const interval = (hass, extra) => formatSchedule({ freq: "weekly", interval: 2, ...extra }, undefined, hass);

test("yearly + month + weekday", () => {
  const sel = { frequency: "yearly", interval: 1, bymonth: [6], byday: ["mon"], bysetpos: [2] };
  assert.equal(render(en, sel), "Annually in Jun on the second Monday at 09:00");
  assert.equal(render(it, sel), "Annuale in giu: secondo lunedì alle 9:00");
});

test("yearly + month day", () => {
  const sel = { frequency: "yearly", interval: 1, bymonth: [3], bymonthday: [15] };
  assert.equal(render(en, sel), "Annually in Mar on the 15th at 09:00");
  assert.equal(render(it, sel), "Annuale in mar: 15° alle 9:00");
});

test("Italian schedule labels avoid article elision", () => {
  const lastDay = { frequency: "monthly", interval: 2, bymonthday: [-1] };
  const lastMultiMonthWeekday = { frequency: "monthly", interval: 2, byday: ["-1mon"] };
  const lastYearDay = { frequency: "yearly", interval: 1, bymonth: [6], bymonthday: [-1] };
  const lastWeekday = { frequency: "yearly", interval: 1, bymonth: [8], byday: ["-1mon"] };
  const eighth = { frequency: "monthly", interval: 1, bymonthday: [8] };
  const eleventh = { frequency: "monthly", interval: 1, bymonthday: [11] };
  assert.equal(render(it, lastDay), "Ogni 2 mesi: ultimo giorno alle 9:00");
  assert.equal(render(it, lastMultiMonthWeekday), "Ogni 2 mesi: ultimo lunedì alle 9:00");
  assert.equal(render(it, lastYearDay), "Annuale in giu: ultimo giorno alle 9:00");
  assert.equal(render(it, lastWeekday), "Annuale in ago: ultimo lunedì alle 9:00");
  assert.equal(render(it, eighth), "Mensile: 8° alle 9:00");
  assert.equal(render(it, eleventh), "Mensile: 11° alle 9:00");
  assert.equal(ordinalNumber(8, it), "8°");
  assert.equal(ordinalNumber(11, it), "11°");
  assert.equal(positionWord(-2, it), "penultimo");
  assert.equal(positionWord(-3, it), "terzultimo");
  assert.equal(positionWord(-4, it), "4° dal fondo");
  assert.equal(positionWord(-5, it), "5° dal fondo");
});

test("weekly interval with weekday", () => {
  const sel = { frequency: "weekly", interval: 2, byday: ["mon"] };
  assert.equal(render(en, sel), "Every 2 weeks on Monday at 09:00");
  assert.equal(render(it, sel), "Ogni 2 settimane il lunedì alle 9:00");
});

test("season window", () => {
  const sel = { frequency: "daily", interval: 1, bymonth: [10, 11, 12, 1, 2, 3] };
  assert.equal(render(en, sel), "Daily at 09:00, Oct–Mar");
  assert.equal(render(it, sel), "Giornaliera alle 9:00, ott–mar");
});

test("until date", () => {
  const sel = { frequency: "daily", interval: 1, until: "2027-06-30T00:00:00" };
  assert.equal(render(en, sel), "Daily at 09:00, until Jun 30, 2027");
  assert.equal(render(it, sel), "Giornaliera alle 9:00, fine: 30 giu 2027");
  assert.equal(render(it, { frequency: "daily", interval: 1, until: "2027-06-08T00:00:00" }), "Giornaliera alle 9:00, fine: 8 giu 2027");
  assert.equal(render(it, { frequency: "daily", interval: 1, until: "2027-06-11T00:00:00" }), "Giornaliera alle 9:00, fine: 11 giu 2027");
});

test("repeat count", () => {
  assert.equal(render(en, { frequency: "daily", count: 1 }), "Daily at 09:00, 1 time");
  assert.equal(render(en, { frequency: "daily", count: 3 }), "Daily at 09:00, 3 times");
  assert.equal(render(it, { frequency: "daily", count: 1 }), "Giornaliera alle 9:00, 1 volta");
  assert.equal(render(it, { frequency: "daily", count: 3 }), "Giornaliera alle 9:00, 3 volte");
  assert.equal(render(it, { frequency: "daily", count: 100 }), "Giornaliera alle 9:00, 100 volte");
});

test("plural categories missing from the dictionary fall back to other", () => {
  const pl = { language: "pl", locale: { language: "pl" } };
  const fr = { language: "fr", locale: { language: "fr" } };
  assert.equal(localizePlural(pl, "card.show_all.more", 5), "Show all (5 more)");
  assert.equal(localizePlural(fr, "card.show_all.more", 1_000_000), "Show all (1000000 more)");
  assert.equal(localizePlural(pl, "card.schedule.with_times", 5, { text: "X" }), "X, 5 times");
  assert.equal(localizeOrdinal(fr, "card.ordinal", 3, { n: 3 }), "3th");
});

test("until + repeat count", () => {
  const sel = { frequency: "daily", until: "2027-06-30T00:00:00", count: 3 };
  assert.equal(render(en, sel), "Daily at 09:00, until Jun 30, 2027, 3 times");
  assert.equal(render(it, sel), "Giornaliera alle 9:00, fine: 30 giu 2027, 3 volte");
  assert.equal(
    render(it, { frequency: "daily", until: "2027-06-08T00:00:00", count: 3 }),
    "Giornaliera alle 9:00, fine: 8 giu 2027, 3 volte",
  );
});

test("interval chore with lifecycle", () => {
  const extra = { until: "2027-06-30T00:00:00", count: 3 };
  assert.equal(interval(en, extra), "Every 2 weeks, until Jun 30, 2027, 3 times");
  assert.equal(interval(it, extra), "Ogni 2 settimane, fine: 30 giu 2027, 3 volte");
});

test("no translation value carries leading punctuation or whitespace", async () => {
  const fs = await import("node:fs");
  for (const file of ["en", "it"]) {
    const dict = JSON.parse(fs.readFileSync(path.join(cardDir, `src/localize/languages/${file}.json`), "utf8"));
    for (const key of Object.keys(dict.card.schedule)) {
      assert.doesNotMatch(dict.card.schedule[key], /^[\s,]/, `${file}: schedule.${key}`);
    }
  }
});

test("pending chore due in a future time", () => {
  const now = new Date("2026-01-01T10:00:00Z");
  const item = { status: "pending", next_due: "2026-01-01T12:00:00Z" };
  assert.equal(dueInText(item, now, en), "Due in 2 hours");
  assert.equal(dueInText(item, now, it), "Da fare tra 2 ore");
});
