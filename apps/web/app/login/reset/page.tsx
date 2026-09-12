import { Card } from "@/components/Card";
import { ResetForm } from "./ResetForm";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <Card title="Reset your password">
      <p className="mb-4 text-sm opacity-80">We&apos;ll email you a link. Open it and choose a new password.</p>
      <ResetForm initialEmail={email ?? ""} />
    </Card>
  );
}
