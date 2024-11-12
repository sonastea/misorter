import prettier from "eslint-plugin-prettier";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

const config = [
  {
    ignores: ["**/dist", "**/node_modules"],
  },
  ...compat.extends("next/core-web-vitals", "plugin:prettier/recommended"),
  {
    plugins: {
      prettier,
    },

    rules: {
      "react/no-unknown-property": [
        1,
        {
          ignore: ["key", "xmlns", "viewBox", "fill", "d"],
        },
      ],
    },
  },
];

export default config;
