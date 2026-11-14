import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rollup } from "rollup";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

const cardDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundle = await rollup({
  input: path.join(cardDir, "src/utils.ts"),
  plugins: [json(), typescript({ tsconfig: path.join(cardDir, "tsconfig.json") }), resolve()],
  onwarn: () => {},
});
const { output } = await bundle.generate({ format: "es" });
await bundle.close();
const { entitySuggestion } = await import(`data:text/javascript;base64,${Buffer.from(output[0].code).toString("base64")}`);

const hass = {
  entities: {
    "calendar.daily": { entity_id: "calendar.daily", platform: "chore_calendar", device_id: "d1" },
    "todo.daily": { entity_id: "todo.daily", platform: "chore_calendar", device_id: "d1" },
    "sensor.dishes": { entity_id: "sensor.dishes", platform: "chore_calendar", device_id: "d1" },
    "calendar.weekly": { entity_id: "calendar.weekly", platform: "chore_calendar", device_id: "d2" },
    "calendar.google": { entity_id: "calendar.google", platform: "google", device_id: "d3" },
  },
};
const card = (cal) => ({ config: { type: "custom:chore-calendar-card", entities: [cal] } });

test("calendar entity suggests the card for itself", () => {
  assert.deepEqual(entitySuggestion(hass, "calendar.weekly"), card("calendar.weekly"));
});

test("todo and sensor entities suggest the card for their list's calendar", () => {
  assert.deepEqual(entitySuggestion(hass, "todo.daily"), card("calendar.daily"));
  assert.deepEqual(entitySuggestion(hass, "sensor.dishes"), card("calendar.daily"));
});

test("other integrations and unknown entities get no suggestion", () => {
  assert.equal(entitySuggestion(hass, "calendar.google"), null);
  assert.equal(entitySuggestion(hass, "light.kitchen"), null);
  assert.equal(entitySuggestion({}, "calendar.daily"), null);
});
