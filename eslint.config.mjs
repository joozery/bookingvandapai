import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // These Node scripts/tests intentionally use the .cjs CommonJS format.
  {
    files: [
      "scripts/check-trip-reviews.cjs",
      "scripts/migrate-trip-reviews.cjs",
      "tests/public-trip-reviews.test.cjs",
      "tests/trip-reviews.test.cjs",
    ],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
