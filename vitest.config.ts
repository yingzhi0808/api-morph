import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["**/*.test.ts"],
    coverage: {
      include: ["src"],
      exclude: ["src/**/index.ts"],
    },
  },
});
