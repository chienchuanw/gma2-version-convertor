import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The conversion core is pure TS (no DOM); run it in the fast node env.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
