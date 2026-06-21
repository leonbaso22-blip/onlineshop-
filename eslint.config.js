"use strict";

module.exports = [
  {
    files: ["js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        // Browser environment
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        IntersectionObserver: "readonly",
        MutationObserver: "readonly",
        fetch: "readonly",
        navigator: "readonly",
        location: "readonly",
        // Cross-file project globals
        PRODUCTS: "readonly",
        CATEGORIES: "readonly",
        renderArt: "readonly",
      },
    },
    rules: {
      // Data/dispatcher globals are defined in one file and used in another,
      // which per-file analysis cannot see — don't flag their definitions.
      "no-unused-vars": ["warn", { varsIgnorePattern: "^(PRODUCTS|CATEGORIES|renderArt)$" }],
      "no-undef": "error",
      "prefer-const": "warn",
      eqeqeq: ["warn", "smart"],
    },
  },
];
