// @ts-check
const { defineConfig } = require("eslint-define-config");
module.exports = defineConfig({
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "tsconfig.json",
    tsconfigRootDir: __dirname,
    sourceType: "module",
    emitDecoratorMetadata: true,
  },
  plugins: ["@typescript-eslint/eslint-plugin", "prettier"],
  extends: [
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
    "prettier",
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: [".eslintrc.cjs", "dist", "src/database/*"],
  rules: {
    "prettier/prettier": 2,
    "@typescript-eslint/no-explicit-any": "warn",
    "linebreak-style": "off",
  },
});
