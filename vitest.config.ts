import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts", "worker/**/*.test.ts"],
    // Worker tuning vars live in `.env.local` for the running app, but vitest
    // does not load env files. Pin the timing-sensitive defaults the suite
    // asserts against so runs are deterministic regardless of the shell env
    // (matches the deployed `WORKER_STALE_RUNNING_MS`). See firestore.lifecycle.test.ts.
    env: {
      WORKER_STALE_RUNNING_MS: "180000",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/scanner/**", "src/lib/ai/**", "src/lib/reports/**"],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
