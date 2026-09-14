import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    ".vercel/**",
    "next-env.d.ts",
    "worker/dist/**",
    // Scan/audit artifacts, not source: these are generated reports and
    // throwaway probe scripts, and linting them fails the whole run on rules
    // (like no-require-imports) that only make sense for our own code.
    "output/**",
    "test-results/**",
    "playwright-report/**",
  ]),
]);

export default eslintConfig;
