import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { createFilter } from "@rollup/pluginutils";

function loadTemplates(options) {
  const { include, exclude } = options;

  const filter = createFilter(include, exclude);

  return {
    name: "load-template",
    transform(code, id) {
      if (filter(id)) {
        const updatedCode = `export default ${JSON.stringify(code)};`;
        return {
          code: updatedCode,
          map: { mappings: "" },
        };
      }
      return null;
    },
  };
}

export default {
  input: "src/index.ts",
  output: [
    {
      file: "dist/index.cjs.js",
      format: "cjs",
      sourcemap: true,
    },
    {
      file: "dist/index.esm.js",
      format: "esm",
      sourcemap: true,
    },
  ],
  plugins: [
    loadTemplates({
      include: ["project-templates/*.template"],
    }),
    nodeResolve(),
    commonjs(),
    typescript({
      tsconfig: "./tsconfig.json",
      declaration: true,
      declarationDir: "dist/types",
      rootDir: "src",
      sourceMap: true,
      exclude: ["**/__tests__", "**/*.test.ts"],
    }),
  ],
  external: ["lodash"],
};
