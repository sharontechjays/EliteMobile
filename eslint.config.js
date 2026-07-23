// eslint-config-expo: the RN/Expo-aware ruleset (React hooks rules, RN-specific checks) — the
// baseline for every rule in this file.
// eslint-config-prettier: layered AFTER expoConfig specifically to turn off any stylistic ESLint
// rule that would otherwise conflict with Prettier's own formatting — Prettier owns formatting,
// ESLint owns everything else (correctness, hooks rules, unused vars, etc.).
const expoConfig = require("eslint-config-expo/flat");
const eslintConfigPrettier = require("eslint-config-prettier");

module.exports = [
  ...expoConfig,
  eslintConfigPrettier,
  {
    // ios/android are native, generated/vendored code — never linted, same reasoning as
    // .prettierignore. dist/.expo are build output, not source.
    ignores: ["dist/*", "ios/*", "android/*", ".expo/*"],
  },
];
