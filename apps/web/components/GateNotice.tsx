export function GateNotice({ reason }: { reason: string }) {
  return (
    <p className="rounded border border-accent/50 bg-accent/10 px-3 py-2 text-sm">
      <span className="font-medium">Locked.</span> {reason}
    </p>
  );
}
