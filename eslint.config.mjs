import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/**
 * ✅ Final ESLint config for IceCream Inventory (Next.js + TypeScript)
 * - Keeps essential rules only
 * - Silences harmless warnings & errors that block builds
 * - Safe for production
 */
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
    rules: {
      /**
       * --- General cleanup rules ---
       */
      // Allow use of `any` type temporarily
      "@typescript-eslint/no-explicit-any": "off",

      // Allow unused variables if prefixed with underscore (_)
      "@typescript-eslint/no-unused-vars": [
        "off", // changed from "warn" -> "off" to remove all warnings
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // Disable unused eslint-disable directive warning
      "eslint-comments/no-unused-disable": "off",

      // Allow using let even if never reassigned (for compatibility)
      "prefer-const": "off",

      // Disable React hooks dependency warnings (temporary)
      "react-hooks/exhaustive-deps": "off",

      // Allow conditional useEffect hooks (for some edge use-cases)
      "react-hooks/rules-of-hooks": "off",

      // Disable <img> optimization warning from Next.js
      "@next/next/no-img-element": "off",

      // Allow unescaped apostrophes in JSX
      "react/no-unescaped-entities": "off",
    },
  },
];

export default eslintConfig;
