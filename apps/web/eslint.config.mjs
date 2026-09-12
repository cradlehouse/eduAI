import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

// eslint-config-next 15 ships legacy-format configs; FlatCompat bridges them to ESLint 9 flat config.
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  { ignores: [".next/**", ".open-next/**", "cloudflare-env.d.ts", "next-env.d.ts", "lib/db/types.ts"] },
];

export default config;
