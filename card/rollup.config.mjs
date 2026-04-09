import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

const production = !process.env.ROLLUP_WATCH;

export default {
  input: "src/chore-calendar-card.ts",
  output: {
    file: "dist/chore-calendar-card.js",
    format: "es",
    sourcemap: !production,
    inlineDynamicImports: true,
  },
  plugins: [
    json(),
    typescript(),
    resolve(),
    production && terser({ format: { comments: false } }),
  ],
};
