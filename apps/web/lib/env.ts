// Public config. Both values are safe in the browser; RLS is the security boundary.
// Referenced LITERALLY on purpose: Next.js only inlines NEXT_PUBLIC_* into browser bundles when the
// full `process.env.NAME` expression appears in source. `process.env[name]` is undefined client-side.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. See apps/web/.env.example.");
}

export const SUPABASE_URL: string = url;
export const SUPABASE_ANON_KEY: string = anon;

// "Continue with Google" shows only once the provider is configured in Supabase (docs/STACK.md → Auth).
export const AUTH_GOOGLE: boolean = process.env.NEXT_PUBLIC_AUTH_GOOGLE === "1";
