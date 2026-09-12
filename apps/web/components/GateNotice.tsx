export function GateNotice({ reason }: { reason: string }) {
  return (
    <p className="rounded-[12px] border border-money bg-money/15 px-3 py-2 text-sm">
      <span className="font-medium">Locked.</span> {reason}
    </p>
  );
}
