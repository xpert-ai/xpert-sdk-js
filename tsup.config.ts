import { defineConfig } from "tsup";

const entries = [
  "src/index.ts",
  "src/client.ts",
  "src/auth/index.ts",
  "src/logging/index.ts",
  "src/react/index.ts",
  "src/react-ui/index.ts",
  "src/react-ui/server/index.ts",
];

export default defineConfig({
  entry: entries,
  format: ["esm", "cjs"],
  sourcemap: true,
  clean: true,
  dts: true,
  splitting: false,
  treeshake: true,
  skipNodeModulesBundle: true,
  target: "es2021",
  outDir: "dist",
  external: ["@langchain/core", "react", "react-dom"],
  esbuildOptions(options) {
    options.outbase = "src";
  },
  outExtension({ format }) {
    return {
      js: format === "cjs" ? ".cjs" : ".js",
    };
  },
});
