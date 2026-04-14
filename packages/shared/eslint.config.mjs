// @ts-check
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import pluginImport from "eslint-plugin-import";

export default tseslint.config(
  {
    ignores: ["dist/", "node_modules/", "eslint.config.mjs", "coverage/"],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, eslintPluginPrettierRecommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
        node: true,
      },
    },
    plugins: {
      import: pluginImport,
    },
    rules: {
      curly: ["error", "all"],
      "import/exports-last": "error",
      "import/newline-after-import": ["error", { count: 1 }],
      "no-console": "warn",
      // no-multiple-empty-lines는 Prettier랑 충돌 날 수 있으니 Prettier에게 맡기거나 유지
      "no-unused-vars": "off",
      "padding-line-between-statements": [
        "error",
        {
          blankLine: "always",
          next: ["if", "for", "while", "do", "switch", "try"],
          prev: ["*"],
        },
        {
          blankLine: "always",
          next: ["*"],
          prev: ["if", "for", "while", "do", "switch", "try", "break", "continue"],
        },
        { blankLine: "always", next: ["function", "class"], prev: "*" },
        { blankLine: "always", next: "*", prev: ["function", "class"] },
        { blankLine: "always", next: "return", prev: "*" },
      ],
      "prettier/prettier": ["error", {}, { usePrettierrc: true }],
      "sort-imports": ["error", { ignoreCase: true, ignoreDeclarationSort: true }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["**/*.spec.ts", "**/*.test.ts", "**/*.spec.tsx", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
