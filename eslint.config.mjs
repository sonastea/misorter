import next from "eslint-config-next";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import { defineConfig } from "eslint/config";

const eslintConfig = defineConfig([
  ...next,
  ...nextTs,
  prettier,
  {
    rules: {
      "react/no-unknown-property": [
        1,
        { ignore: ["key", "xmlns", "viewBox", "fill", "d"] },
      ],
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
]);

export default eslintConfig;
