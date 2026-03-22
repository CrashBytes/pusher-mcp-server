import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      zod: path.resolve(__dirname, "tests/zod-patch.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      include: ["src/**/*.ts"],
    },
  },
});
