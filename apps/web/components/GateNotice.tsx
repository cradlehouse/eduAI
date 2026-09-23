export function GateNotice({ reason }: { reason: string }) {
  return (
    <p className="rounded-[6px] border border-gold bg-gold/15 px-3 py-2 text-sm">
      <span className="font-medium">Locked.</span> {reason}
    </p>
  );
}
