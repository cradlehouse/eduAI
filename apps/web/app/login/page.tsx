import { Card } from "@/components/Card";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string; error?: string }>;
}) {
  const { next, email, error } = await searchParams;
  return (
    <Card title="Sign in">
      <p className="mb-4 text-sm opacity-80">
        No passwords. Enter the email your programme lead invited, and we&apos;ll send a sign-in link.
      </p>
      {error && <p className="mb-3 rounded-[12px] bg-danger/10 p-2 text-sm text-danger">{error}</p>}
      <LoginForm next={next ?? "/"} initialEmail={email ?? ""} />
    </Card>
  );
}
