import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Top-level await support for dynamic imports in tests
    pool: "forks",
  },
  resolve: {
    alias: {
      // Match Next.js @ path alias
      "@": path.resolve(__dirname, "."),
    },
  },
});
