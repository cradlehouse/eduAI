// Public config. Both values are safe in the browser; RLS is the security boundary.
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set. See apps/web/.env.example and wrangler.jsonc.`);
  return v;
}
export const SUPABASE_URL = required("NEXT_PUBLIC_SUPABASE_URL");
export const SUPABASE_ANON_KEY = required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
