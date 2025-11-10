import { defineConfig, globalIgnores } from "eslint/config";
import next from "eslint-config-next";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...next,
  ...nextTs,
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      "react/no-unknown-property": [
        1,
        { ignore: ["key", "xmlns", "viewBox", "fill", "d"] },
      ],
    },
  },
]);

export default eslintConfig;
