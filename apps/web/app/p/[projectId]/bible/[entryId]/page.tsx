import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BibleChip } from "@/components/BibleChip";
import { addReference, addRelease, deleteEntry, revokeRelease, setEntryAssetLifecycle, setMaster, updateEntry } from "../actions";
import { EntryStudio } from "./EntryStudio";
import { JobWatcher } from "@/app/p/[projectId]/scenes/JobWatcher";
import type { Option } from "@/app/p/[projectId]/scenes/CutWorkspace";

const input = "input";
const btn = "btn";
const LANES = ["explore", "control", "finish", "voice_likeness"] as const;
const CHAR_SLOTS: { role: string; label: string; hint: string }[] = [
  { role: "face", label: "Face", hint: "close-up, neutral" }, { role: "body", label: "Body", hint: "full length" }, { role: "wardrobe", label: "Wardrobe", hint: "what they wear" },
  { role: "profile", label: "Profile", hint: "side view" }, { role: "expression", label: "Expression", hint: "one strong look" },
];
const FIXED: { key: string; label: string; ph: string }[] = [
  { key: "time", label: "time", ph: "1:40am" }, { key: "light", label: "light", ph: "sodium, overhead" }, { key: "weather", label: "weather", ph: "just rained" }, { key: "occupancy", label: "occupancy", ph: "empty" },
];

// One bible entry. An environment (docs/DESIGN.md §4.2): master wide, angles made from it, fixed
// conditions that fork on change. A character (§4.1): reference slots. Everything else: the plain form.
export default async function EntryPage({ params, searchParams }: { params: Promise<{ projectId: string; entryId: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { projectId, entryId } = await params;
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const [{ data: e }, { data: row }, { data: rows }, { data: releases }, { data: manage }, { data: jobs }, { data: pins }, ...opts] = await Promise.all([
    supabase.from("bible_entry_status").select("*").eq("id", entryId).maybeSingle(),
    supabase.from("bible_entries").select("fixed, forked_from, description").eq("id", entryId).maybeSingle(),
    supabase.from("bible_entry_assets").select("id, asset_id, role, label, params, position, lifecycle, job_id, created_at, assets(width, height)").eq("bible_entry_id", entryId).order("position"),
    supabase.from("consent_releases").select("*").eq("bible_entry_id", entryId).order("created_at", { ascending: false }),
    supabase.rpc("my_landing"),
    supabase.from("job_tokens").select("job_id, entry_role, status, estimated_tokens, actual_tokens, created_at, error").eq("bible_entry_id", entryId).order("created_at", { ascending: false }).limit(8),
    supabase.from("shot_bible_entries").select("shot_id").eq("bible_entry_id", entryId),
    ...(["explore", "control", "finish"] as const).map(async (lane) => { const { data } = await supabase.rpc("model_options", { p_project: projectId, p_lane: lane }); return (data ?? []) as Option[]; }),
  ]);
  if (!e) notFound();
  const canManage = typeof manage === "string" && (manage.startsWith("/c/") || manage === "/org");
  const fixed = ((row?.fixed ?? {}) as Record<string, string>);
  const assets = rows ?? [];
  const live = assets.filter((a) => a.lifecycle === "live");
  const killed = assets.filter((a) => a.lifecycle === "killed");
  const angles = live.filter((a) => a.role === "angle");
  const tests = live.filter((a) => a.role === "test");
  const refIds = live.filter((a) => ["face", "body", "wardrobe", "profile", "expression"].includes(a.role)).map((a) => a.asset_id);
  const options = { explore: opts[0] as Option[], control: opts[1] as Option[], finish: opts[2] as Option[] };
  const used = (pins ?? []).length + angles.length;
  const busy = (jobs ?? []).some((j) => ["queued", "claimed", "submitted", "running"].includes(j.status ?? ""));
  const laneStates = e.requires_consent ? await Promise.all(LANES.map(async (lane) => {
    const { data } = await supabase.rpc("bible_consent_state_for", { p_entry: entryId, p_lane: lane }).maybeSingle();
    return [lane, data] as const;
  })) : [];
  const angleLabel = (p: unknown) => { const q = (p ?? {}) as { horizontal_angle?: number; vertical_angle?: number; zoom?: number };
    const t = { 0: "as shot", 45: "45° right", 90: "right side", 135: "135°", 180: "reverse", 225: "225°", 270: "left side", 315: "45° left" }[q.horizontal_angle ?? 0] ?? `${q.horizontal_angle}°`;
    const h = { "-30": "low", "0": "", "30": "elevated", "60": "high" }[String(q.vertical_angle ?? 0)] ?? "";
    const z = { 0: "wide", 2: "wide", 5: "medium", 8: "tight", 10: "close" }[q.zoom ?? 0] ?? "";
    return [t, h, z].filter(Boolean).join(" · "); };
  const img = (id: string, cls: string) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/api/assets/${id}`} alt="" className={cls} />
  );
  const killForm = (id: string, life: "killed" | "live") => (
    <form action={setEntryAssetLifecycle}><input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="entry_id" value={entryId} /><input type="hidden" name="asset_row_id" value={id} /><input type="hidden" name="lifecycle" value={life} />
      <button className="rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-ink hover:bg-drift hover:text-bg-deep">{life === "killed" ? "kill" : "restore"}</button></form>
  );
  const masterForm = (assetId: string) => (
    <form action={setMaster}><input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="entry_id" value={entryId} /><input type="hidden" name="asset_id" value={assetId} />
      <button className="rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-ink hover:bg-gold hover:text-bg-deep">set as master</button></form>
  );

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[22px]">{e.name} <span className="ml-2 text-[13px] text-dim">{e.kind === "location" ? "environment" : e.kind}</span></h1>
        {e.requires_consent && <BibleChip state={e.consent_state} />}
        {row?.forked_from && <Link href={`/p/${projectId}/bible/${row.forked_from}`} className="text-[11px] text-mute underline">forked from an earlier version</Link>}
        <Link href={`/p/${projectId}/bible`} className="ml-auto text-[11px] text-mute hover:text-dim">← Bible</Link>
      </div>
      {ok && <p className="rounded-[6px] bg-ok/10 px-3 py-2 text-[12px] text-ok">{ok}</p>}
      {error && <p className="rounded-[6px] bg-drift/10 px-3 py-2 text-[12px] text-drift">{error}</p>}
      <JobWatcher active={busy} />
      {busy && <p className="text-[11px] text-gold">Generating… this page refreshes when it lands.</p>}

      {/* ENVIRONMENT: master wide + angles made from it */}
      {e.kind === "location" && (
        <div className="flex flex-wrap items-start gap-4">
          <div className="imgcard chosen relative h-[260px] w-[460px]">
            {e.reference_asset_id ? img(e.reference_asset_id, "h-full w-full object-cover") : (
              <form action={addReference} className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[11px] text-mute">
                <input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="entry_id" value={entryId} /><input type="hidden" name="role" value="master" />
                <span>No master wide yet. Upload one, or generate a test still below and set it as master.</span>
                <input type="file" name="file" accept="image/png,image/jpeg,image/webp" className="text-[11px]" /><button className="btn">Upload wide</button>
              </form>
            )}
            <span className="absolute left-2.5 top-2 text-[11px] text-ink [text-shadow:0_1px_2px_#000]">Wide · master</span>
            <span className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/75 to-transparent px-2.5 py-1.5 text-[11px]"><span>{e.description?.slice(0, 40) || "the space"}</span><span className="text-chosen">geometry source</span></span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {angles.map((a) => (
              <div key={a.id} className="imgcard group relative h-[124px] w-[216px]">
                {img(a.asset_id, "h-full w-full object-cover")}
                <span className="absolute left-2 top-1.5 text-[11px] text-ink [text-shadow:0_1px_2px_#000]">{a.label || angleLabel(a.params)}</span>
                <div className="absolute bottom-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100">{masterForm(a.asset_id)}{killForm(a.id, "killed")}</div>
              </div>
            ))}
            {angles.length === 0 && <div className="flex h-[124px] w-[216px] items-center justify-center rounded-[8px] border border-dashed border-card-edge text-center text-[11px] text-mute">no angles yet<br />make them from the wide below</div>}
          </div>
        </div>
      )}

      {/* CHARACTER: reference slots */}
      {e.kind === "character" && (
        <div className="flex flex-wrap items-start gap-3">
          {CHAR_SLOTS.map((s) => {
            const have = live.filter((a) => a.role === s.role);
            const big = s.role === "face" || s.role === "body" || s.role === "wardrobe";
            return (
              <div key={s.role} className={`relative ${big ? "h-[220px] w-[220px]" : "h-[104px] w-[110px]"}`}>
                {have[0] ? (
                  <div className="imgcard group relative h-full w-full">
                    {img(have[0].asset_id, "h-full w-full object-cover")}
                    <span className="absolute left-2 top-1.5 text-[11px] text-ink [text-shadow:0_1px_2px_#000]">{s.label}</span>
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 py-1 text-[11px]">{have[0].label || s.hint}{have.length > 1 ? ` · +${have.length - 1}` : ""}</span>
                    <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100">{killForm(have[0].id, "killed")}</div>
                  </div>
                ) : (
                  <form action={addReference} className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-[8px] border border-dashed border-card-edge p-2 text-center text-[11px] text-mute">
                    <input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="entry_id" value={entryId} /><input type="hidden" name="role" value={s.role} />
                    <span>+ {s.label.toLowerCase()}</span>{big && <span className="text-[10px]">{s.hint}</span>}
                    <input type="file" name="file" accept="image/png,image/jpeg,image/webp" className="w-full text-[10px]" /><button className="btn py-0.5 text-[10px]">Add</button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_302px]">
        <div className="flex flex-col gap-4">
          <form action={updateEntry} className="glass grid gap-2 rounded-[10px] p-3">
            <input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="entry_id" value={entryId} />
            {e.kind === "location" && (
              <>
                <div className="text-[12px] font-medium">Fixed for this space <span className="ml-2 font-normal text-mute">{used > 0 ? "change these and you get a new environment, not a new take" : "set once; locked after first use"}</span></div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {FIXED.map((f) => <label key={f.key} className="label">{f.label}<input name={`fixed_${f.key}`} defaultValue={fixed[f.key] ?? ""} placeholder={f.ph} className={`${input} mt-0.5 w-full`} /></label>)}
                </div>
              </>
            )}
            <label className="label">Name<input name="name" defaultValue={e.name ?? ""} required className={`${input} mt-0.5 w-full`} /></label>
            <label className="label">{e.kind === "location" ? "What it is" : e.kind === "character" ? "Who they are" : "Description"}<textarea name="description" rows={3} defaultValue={e.description ?? ""} className={`${input} mt-0.5 w-full`} placeholder={e.kind === "location" ? "Regional bus depot after last departure. Wet concrete, one working vending machine, bays 1–6 empty." : e.kind === "character" ? "19, tired, moves fast. Grey hoodie, red duffel bag, scar on left eyebrow." : ""} /></label>
            {e.kind !== "location" && <label className="label">Likeness or voice of (real person)<input name="likeness_of" defaultValue={e.likeness_of ?? ""} className={`${input} mt-0.5 w-full`} /></label>}
            <label className="flex items-center gap-2 text-[11px] text-dim"><input type="checkbox" name="requires_consent" defaultChecked={!!e.requires_consent} /> Requires consent</label>
            {e.kind !== "location" && e.kind !== "character" && <label className="label">Reference image<input type="file" name="reference" accept="image/png,image/jpeg,image/webp" className="mt-0.5 block text-[11px]" /></label>}
            {e.kind === "location" && e.reference_asset_id && <label className="label">Replace the master wide<input type="file" name="reference" accept="image/png,image/jpeg,image/webp" className="mt-0.5 block text-[11px]" /></label>}
            <div className="flex gap-2"><button className="btn-primary">Save {e.kind === "location" ? "environment" : e.kind}</button></div>
          </form>
          <form action={deleteEntry} className="-mt-2 self-end"><input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="entry_id" value={entryId} /><button className={`${btn} text-drift`}>Delete entry</button></form>

          <EntryStudio projectId={projectId} entryId={entryId} kind={e.kind ?? ""} masterAssetId={e.reference_asset_id ?? null} refAssetIds={refIds} options={options} entryName={e.name ?? ""} fixed={fixed} />

          {tests.length > 0 && (
            <div className="glass rounded-[10px] p-3">
              <div className="text-[12px] font-medium">Tests <span className="ml-2 font-normal text-mute">never in the film · set one as master if it&apos;s the space</span></div>
              <div className="mt-2 flex flex-wrap gap-2">
                {tests.map((t) => (
                  <div key={t.id} className="imgcard group relative h-[70px] w-[120px]">
                    {img(t.asset_id, "h-full w-full object-cover")}
                    <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100">{e.kind === "location" && masterForm(t.asset_id)}{killForm(t.id, "killed")}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {killed.length > 0 && (
            <details className="text-[11px] text-dim"><summary className="cursor-pointer select-none">Killed ({killed.length}) · nothing is ever deleted</summary>
              <div className="mt-2 flex flex-wrap gap-2">{killed.map((k) => <div key={k.id} className="flex items-center gap-2 rounded-[6px] border border-card-edge p-1"><div className="h-10 w-[68px] overflow-hidden rounded-[4px] opacity-60">{img(k.asset_id, "h-full w-full object-cover")}</div>{killForm(k.id, "live")}</div>)}</div>
            </details>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {e.kind === "location" && (
            <div className="glass rounded-[10px] p-3 text-[11px]">
              <div className="text-[12px] font-medium">Continuity</div>
              <p className="mt-1 text-dim">Every shot in this space is checked against the master wide.{used > 0 ? ` Used by ${(pins ?? []).length} cut${(pins ?? []).length === 1 ? "" : "s"}.` : ""}</p>
              <p className="mt-1 text-mute">Scores arrive with the render worker (RENDER_PLAN step 5).</p>
            </div>
          )}
          {e.kind === "character" && (
            <div className="glass rounded-[10px] p-3 text-[11px]">
              <div className="text-[12px] font-medium">Lock</div>
              <p className="mt-1 text-dim">Face · body · wardrobe. The references, not the model, decide what they look like.</p>
              <p className="mt-1 text-mute">Identity fingerprint and continuity scores arrive with the render worker (RENDER_PLAN step 5).</p>
            </div>
          )}
          <div className="glass rounded-[10px] p-3">
            <div className="text-[12px] font-medium">Receipts</div>
            {(jobs ?? []).length === 0 ? <p className="mt-1 text-[11px] text-mute">Nothing generated for this entry yet.</p> : (
              <ul className="mt-1 flex flex-col text-[11px]">
                {(jobs ?? []).map((j) => (
                  <li key={j.job_id} className="kv border-t border-glass-edge"><span>{j.entry_role} <span className={j.status === "rejected" || j.status === "failed" ? "text-drift" : "text-mute"}>· {j.status === "rejected" ? "refused · no charge" : j.status}</span>{j.error && <span className="block text-drift">{j.error}</span>}</span><span className="mono text-dim">{(j.actual_tokens ?? j.estimated_tokens ?? 0).toLocaleString()}</span></li>
                ))}
              </ul>
            )}
          </div>
          {laneStates.length > 0 && (
            <div className="glass rounded-[10px] p-3 text-[11px]"><div className="text-[12px] font-medium">Consent by lane</div>
              <dl className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1">{laneStates.map(([lane, st]) => <div key={lane} className="contents"><dt className="text-mute">{lane}</dt><dd>{String(st ?? "")}</dd></div>)}</dl></div>
          )}
        </div>
      </div>

      {e.requires_consent && (
        <section className="mt-4">
          <h2 className="mb-2 text-[12px] font-medium">Consent releases</h2>
          {(releases ?? []).length === 0 ? <p className="mb-4 text-[12px] text-dim">No release yet. Generate is blocked for this entry until one is signed.</p> : (
            <ul className="mb-6 flex flex-col gap-2">
              {(releases ?? []).map((r) => (
                <li key={r.id} className="card p-3 text-[12px]">
                  <div className="flex flex-wrap items-center gap-2"><BibleChip state={r.state} /><span className="font-medium">{r.subject_name}</span><span className="text-dim">signed by {r.rights_holder_name}{r.is_guardian ? " (guardian)" : ""}{r.subject_is_minor ? " · minor" : ""}</span></div>
                  <div className="mt-1 text-[11px] text-dim">lanes: {r.permitted_lanes.join(", ")} · distribution: {r.distribution}{r.expires_at ? ` · expires ${new Date(r.expires_at).toLocaleDateString()}` : " · no expiry"}{r.signed_at ? ` · signed ${new Date(r.signed_at).toLocaleDateString()}` : ""}{r.revoked_at ? ` · revoked ${new Date(r.revoked_at).toLocaleDateString()}: ${r.revoked_reason}` : ""}</div>
                  <div className="mt-2 flex items-center gap-3 text-[11px]">
                    {r.file_asset_id && <a className="underline" href={`/api/assets/${r.file_asset_id}`} target="_blank">signed document</a>}
                    {r.source_asset_id && <a className="underline" href={`/api/assets/${r.source_asset_id}`} target="_blank">source asset</a>}
                    {canManage && r.state !== "revoked" && (
                      <form action={revokeRelease} className="flex items-center gap-1"><input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="entry_id" value={entryId} /><input type="hidden" name="release_id" value={r.id} /><input name="reason" placeholder="reason" className={input} /><button className={`${btn} text-drift`}>Revoke</button></form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <form action={addRelease} className="glass grid gap-3 rounded-[10px] p-4 sm:grid-cols-2">
            <input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="entry_id" value={entryId} />
            <h3 className="text-[12px] font-medium sm:col-span-2">Record a release</h3>
            <label className="label">Subject (the person depicted)<input name="subject_name" required defaultValue={e.likeness_of ?? ""} className={`${input} mt-0.5 w-full`} /></label>
            <label className="label">Signed by (rights holder)<input name="rights_holder_name" required className={`${input} mt-0.5 w-full`} /></label>
            <label className="label">Signer email (optional)<input name="signer_email" type="email" className={`${input} mt-0.5 w-full`} /></label>
            <label className="label">Expires (optional)<input name="expires_at" type="date" className={`${input} mt-0.5 w-full`} /></label>
            <label className="flex items-center gap-2 text-[11px]"><input type="checkbox" name="subject_is_minor" /> Subject is under 18</label>
            <label className="flex items-center gap-2 text-[11px]"><input type="checkbox" name="is_guardian" /> Signer is the guardian</label>
            <fieldset className="text-[11px] sm:col-span-2"><legend className="mb-1 label">Permitted lanes</legend><div className="flex flex-wrap gap-4">{LANES.map((l) => <label key={l} className="flex items-center gap-1"><input type="checkbox" name={`lane_${l}`} defaultChecked={l !== "voice_likeness"} /> {l}</label>)}</div></fieldset>
            <label className="label">Distribution<select name="distribution" className={`${input} mt-0.5`} defaultValue="cohort"><option value="internal">internal</option><option value="cohort">cohort</option><option value="public">public</option></select></label>
            <label className="label">Signed document (PDF or image) — makes it signed<input type="file" name="signed_file" accept="application/pdf,image/png,image/jpeg" className="mt-0.5 block text-[11px]" /></label>
            <label className="label sm:col-span-2">Source asset the release covers (optional)<input type="file" name="source_file" accept="image/png,image/jpeg,image/webp,audio/*" className="mt-0.5 block text-[11px]" /></label>
            <button className="btn-primary sm:col-span-2">Record release</button>
          </form>
        </section>
      )}
    </div>
  );
}
