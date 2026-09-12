import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/safe-next";

// Magic-link landing. Handles both the PKCE flow (?code=) and the token-hash flow
// (?token_hash=&type=) so a link opened in a different browser still works.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const supabase = await createClient();

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  let errorMessage: string | null = null;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    errorMessage = error?.message ?? null;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    errorMessage = error?.message ?? null;
  } else {
    errorMessage = "Sign-in link is missing its code.";
  }

  const dest = url.clone();
  dest.search = "";
  if (errorMessage) {
    dest.pathname = "/login";
    dest.search = `?error=${encodeURIComponent(errorMessage)}&next=${encodeURIComponent(next)}`;
  } else {
    dest.pathname = next.split("?")[0];
    dest.search = next.includes("?") ? "?" + next.split("?")[1] : "";
  }
  return NextResponse.redirect(dest);
}
