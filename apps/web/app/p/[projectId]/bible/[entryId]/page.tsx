import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BibleChip } from "@/components/BibleChip";
import { addRelease, deleteEntry, revokeRelease, updateEntry } from "../actions";

const input = "rounded border border-ink/20 bg-white px-2 py-1 text-sm text-ink dark:border-paper/20";
const btn = "rounded border border-ink/20 px-2 py-1 text-xs hover:bg-ink/5 dark:border-paper/20 dark:hover:bg-paper/10";
const LANES = ["explore", "control", "finish", "voice_likeness"] as const;

export default async function EntryPage({ params, searchParams }: { params: Promise<{ projectId: string; entryId: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { projectId, entryId } = await params;
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const [{ data: e }, { data: releases }, { data: manage }] = await Promise.all([
    supabase.from("bible_entry_status").select("*").eq("id", entryId).maybeSingle(),
    supabase.from("consent_releases").select("*").eq("bible_entry_id", entryId).order("created_at", { ascending: false }),
    supabase.rpc("my_landing"),   // cheap proxy for "am I instructor/admin": landing is /c or /org
  ]);
  if (!e) notFound();
  const canManage = typeof manage === "string" && (manage.startsWith("/c/") || manage === "/org");
  const laneStates = await Promise.all(LANES.map(async (lane) => {
    const { data } = await supabase.rpc("bible_consent_state_for", { p_entry: entryId, p_lane: lane }).maybeSingle();
    return [lane, data] as const;
  })).catch(() => [] as (readonly [string, unknown])[]);

  return (
    <div className="max-w-3xl">
      <Link href={`/p/${projectId}/bible`} className="text-xs underline opacity-70">← Bible</Link>
      <div className="mb-1 mt-2"><BibleChip state={e.requires_consent ? e.consent_state : "not_required"} /></div>
      <h1 className="text-2xl font-semibold">{e.name}</h1>
      <p className="mb-4 text-xs opacity-60">{e.kind}{e.likeness_of ? ` · likeness of ${e.likeness_of}` : ""}</p>
      {ok && <p className="mb-4 rounded bg-money/10 p-2 text-sm text-money">{ok}</p>}
      {error && <p className="mb-4 rounded bg-danger/10 p-2 text-sm text-danger">{error}</p>}

      <div className="grid gap-6 md:grid-cols-[1fr_260px]">
        <form action={updateEntry} className="grid gap-3">
          <input type="hidden" name="project_id" value={projectId} />
          <input type="hidden" name="entry_id" value={entryId} />
          <label className="text-sm">Name<br /><input name="name" defaultValue={e.name ?? ""} required className={`${input} w-full`} /></label>
          <label className="text-sm">Description<br /><textarea name="description" rows={4} defaultValue={e.description ?? ""} className={`${input} w-full`} /></label>
          <label className="text-sm">Likeness or voice of (real person)<br /><input name="likeness_of" defaultValue={e.likeness_of ?? ""} className={`${input} w-full`} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requires_consent" defaultChecked={!!e.requires_consent} /> Requires consent</label>
          <label className="text-sm">Reference image<br /><input type="file" name="reference" accept="image/png,image/jpeg,image/webp" className="text-sm" /></label>
          <div className="flex gap-2"><button className="rounded bg-ink px-3 py-2 text-sm font-medium text-paper dark:bg-paper dark:text-ink">Save</button></div>
        </form>
        <div>
          {e.reference_asset_id ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/assets/${e.reference_asset_id}`} alt={`Reference for ${e.name}`} className="w-full rounded border border-ink/10 dark:border-paper/15" />
          ) : <div className="flex h-40 items-center justify-center rounded border border-dashed border-ink/20 text-xs opacity-60 dark:border-paper/20">no reference yet</div>}
          {laneStates.length > 0 && e.requires_consent && (
            <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
              {laneStates.map(([lane, st]) => <div key={lane} className="contents"><dt className="opacity-60">{lane}</dt><dd>{String(st ?? "")}</dd></div>)}
            </dl>
          )}
          <form action={deleteEntry} className="mt-4">
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="entry_id" value={entryId} />
            <button className={`${btn} text-danger`}>Delete entry</button>
          </form>
        </div>
      </div>

      {e.requires_consent && (
        <section className="mt-10">
          <h2 className="mb-2 font-medium">Consent releases</h2>
          {(releases ?? []).length === 0 ? <p className="mb-4 text-sm opacity-60">No release yet. Generate is blocked for this entry until one is signed.</p> : (
            <ul className="mb-6 flex flex-col gap-2">
              {(releases ?? []).map((r) => (
                <li key={r.id} className="rounded-lg border border-ink/10 p-3 text-sm dark:border-paper/15">
                  <div className="flex flex-wrap items-center gap-2">
                    <BibleChip state={r.state} />
                    <span className="font-medium">{r.subject_name}</span>
                    <span className="opacity-70">signed by {r.rights_holder_name}{r.is_guardian ? " (guardian)" : ""}{r.subject_is_minor ? " · minor" : ""}</span>
                  </div>
                  <div className="mt-1 text-xs opacity-70">
                    lanes: {r.permitted_lanes.join(", ")} · distribution: {r.distribution}
                    {r.expires_at ? ` · expires ${new Date(r.expires_at).toLocaleDateString()}` : " · no expiry"}
                    {r.signed_at ? ` · signed ${new Date(r.signed_at).toLocaleDateString()}` : ""}
                    {r.revoked_at ? ` · revoked ${new Date(r.revoked_at).toLocaleDateString()}: ${r.revoked_reason}` : ""}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    {r.file_asset_id && <a className="underline" href={`/api/assets/${r.file_asset_id}`} target="_blank">signed document</a>}
                    {r.source_asset_id && <a className="underline" href={`/api/assets/${r.source_asset_id}`} target="_blank">source asset</a>}
                    {canManage && r.state !== "revoked" && (
                      <form action={revokeRelease} className="flex items-center gap-1">
                        <input type="hidden" name="project_id" value={projectId} />
                        <input type="hidden" name="entry_id" value={entryId} />
                        <input type="hidden" name="release_id" value={r.id} />
                        <input name="reason" placeholder="reason" className={input} />
                        <button className={`${btn} text-danger`}>Revoke</button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form action={addRelease} className="grid gap-3 rounded-lg border border-ink/10 p-4 sm:grid-cols-2 dark:border-paper/15">
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="entry_id" value={entryId} />
            <h3 className="font-medium sm:col-span-2">Record a release</h3>
            <label className="text-sm">Subject (the person depicted)<br /><input name="subject_name" required defaultValue={e.likeness_of ?? ""} className={`${input} w-full`} /></label>
            <label className="text-sm">Signed by (rights holder)<br /><input name="rights_holder_name" required className={`${input} w-full`} /></label>
            <label className="text-sm">Signer email (optional)<br /><input name="signer_email" type="email" className={`${input} w-full`} /></label>
            <label className="text-sm">Expires (optional)<br /><input name="expires_at" type="date" className={`${input} w-full`} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="subject_is_minor" /> Subject is under 18</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_guardian" /> Signer is the guardian</label>
            <fieldset className="text-sm sm:col-span-2">
              <legend className="mb-1">Permitted lanes</legend>
              <div className="flex flex-wrap gap-4">
                {LANES.map((l) => <label key={l} className="flex items-center gap-1"><input type="checkbox" name={`lane_${l}`} defaultChecked={l !== "voice_likeness"} /> {l}</label>)}
              </div>
            </fieldset>
            <label className="text-sm">Distribution<br />
              <select name="distribution" className={input} defaultValue="cohort"><option value="internal">internal</option><option value="cohort">cohort</option><option value="public">public</option></select>
            </label>
            <label className="text-sm">Signed document (PDF or image) — makes it signed<br /><input type="file" name="signed_file" accept="application/pdf,image/png,image/jpeg" className="text-sm" /></label>
            <label className="text-sm sm:col-span-2">Source asset the release covers (face photo or voice sample, optional)<br /><input type="file" name="source_file" accept="image/png,image/jpeg,image/webp,audio/*" className="text-sm" /></label>
            <button className="rounded bg-ink px-3 py-2 text-sm font-medium text-paper dark:bg-paper dark:text-ink sm:col-span-2">Record release</button>
          </form>
        </section>
      )}
    </div>
  );
}
