import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import importX from "eslint-plugin-import-x";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import { readdirSync, existsSync } from "node:fs";

// Every folder in src/features is a block. New blocks are protected automatically.
const features = existsSync("./src/features")
  ? readdirSync("./src/features", { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  : [];

const supabaseOnlyInLib = {
  group: ["@supabase/supabase-js", "@supabase/ssr"],
  message: "Create Supabase clients only through src/lib/supabase/*.",
};
const dbTypesOnlyInDataLayer = {
  group: ["@/lib/database.types", "**/database.types"],
  message: "DB row types only in features/*/data.ts and actions.ts. Export a DTO from types.ts.",
};

export default defineConfig([
  ...nextVitals,
  ...nextTs,

  // R1-R3: block boundaries
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "import-x": importX },
    settings: { "import-x/resolver-next": [createTypeScriptImportResolver()] },
    rules: {
      "import-x/no-restricted-paths": ["error", { zones: [
        ...features.map((f) => ({
          target: `./src/features/${f}`, from: "./src/features", except: [`./${f}`],
          message: "A block never imports another block. Compose them in src/app (page, slot, or SQL view).",
        })),
        { target: "./src/features", from: "./src/app", message: "Blocks must not import from src/app." },
        { target: ["./src/lib", "./src/components", "./src/config"], from: ["./src/features", "./src/app"],
          message: "Shared code (lib, components, config) must not depend on blocks or pages." },
      ]}],
      "no-restricted-imports": ["error", { patterns: [supabaseOnlyInLib, dbTypesOnlyInDataLayer] }],
    },
  },
  { files: ["src/features/*/data.ts", "src/features/*/actions.ts"],
    rules: { "no-restricted-imports": ["error", { patterns: [supabaseOnlyInLib] }] } },
  { files: ["src/lib/supabase/**"], rules: { "no-restricted-imports": "off" } },

  // R7-R8: no raw HTML, no hard-coded design
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "react/no-danger": "error",
      "react/forbid-dom-props": ["error", { forbid: [{ propName: "style", message: "Use Tailwind classes built on the tokens in src/app/globals.css." }] }],
      "no-restricted-syntax": ["error",
        { selector: "CallExpression[callee.property.name='setHTML']", message: "Never setHTML: build popups with textContent (see features/map/build-popup.ts)." },
        { selector: "AssignmentExpression[left.property.name='innerHTML']", message: "Never innerHTML: use textContent." },
        { selector: "Literal[value=/(^|[^\\w&])#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/]", message: "No hard-coded colors. Use a token from src/app/globals.css (@theme)." },
        { selector: "TemplateElement[value.raw=/(^|[^\\w&])#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/]", message: "No hard-coded colors. Use a token from src/app/globals.css (@theme)." },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": ["error", { "ts-ignore": true, "ts-expect-error": "allow-with-description" }],
    },
  },
  // The only places allowed to name raw brand values
  { files: ["src/config/brand.ts"], rules: { "no-restricted-syntax": "off" } },

  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "src/lib/database.types.ts"]),
]);
