import { readFailure } from "@/lib/refusal";

// The newest job's failure. A refusal is not an error: nothing was charged, and for other people's IP
// the student gets a way to make the idea their own.
export function FailureNote({ error }: { error: string }) {
  const f = readFailure(error);
  if (!f.refused) return <p className="text-[12px] text-drift">The last one didn&apos;t work: {f.text}</p>;
  return (
    <div className="text-[12px]">
      <p><span className="text-drift">Refused · no charge.</span> {f.reason}</p>
      {f.suggestion && <p className="mt-0.5 text-dim">Make it your own: {f.suggestion}</p>}
    </div>
  );
}
