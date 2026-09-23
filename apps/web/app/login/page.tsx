import { Card } from "@/components/Card";
import { AUTH_GOOGLE } from "@/lib/env";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; email?: string; error?: string; mode?: string }> }) {
  const { next, email, error, mode } = await searchParams;
  return (
    <Card title="Sign in">
      {error && <p className="mb-3 rounded-[6px] bg-drift/10 p-2 text-sm text-drift">{error}</p>}
      <LoginForm next={next ?? "/"} initialEmail={email ?? ""} google={AUTH_GOOGLE} initialMode={mode === "link" ? "link" : "password"} />
      <p className="mt-5 text-center text-xs text-dim"><a href="/mission" className="underline">What Imaje is</a> · <a href="/how-it-works" className="underline">How it works</a></p>
    </Card>
  );
}
