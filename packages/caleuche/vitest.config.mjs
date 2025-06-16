import { defineConfig } from "vitest/config";
import { createFilter } from "@rollup/pluginutils";
import { readFileSync } from "fs";

function loadTemplates(options = {}) {
  const { include, exclude } = options;
  const filter = createFilter(include, exclude);

  return {
    name: "load-template",
    load(id) {
      if (filter(id)) {
        const code = readFileSync(id, "utf-8");
        return `export default ${JSON.stringify(code)};`;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [
    loadTemplates({
      include: ["**/*.template"],
      exclude: ["node_modules/**"],
    }),
  ],
  test: {
    include: ["test/**/*.test.ts"],
  },
});
