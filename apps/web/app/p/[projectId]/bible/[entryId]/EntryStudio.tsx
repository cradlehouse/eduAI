"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database, Json } from "@/lib/db/types";
import { generateForEntry } from "@/app/p/[projectId]/scenes/generate";

type Lane = "explore" | "control" | "finish";
type Option = Database["public"]["Functions"]["model_options"]["Returns"][number];

// The "+ angle" / "test it" / "+ reference" generator on a bible entry (docs/DESIGN.md §4.1–4.2).
// Environments: an angle is made FROM the master with the angles route (turn / height / distance).
// Any entry: a test still from a prompt + the entry's own references with the edit route.
export function EntryStudio({ projectId, entryId, kind, masterAssetId, refAssetIds, options, entryName, fixed, appearance = "" }: {
  projectId: string; entryId: string; kind: string; masterAssetId: string | null; refAssetIds: string[];
  options: Record<Lane, Option[]>; entryName: string; fixed: Record<string, string>; appearance?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [estimates, setEstimates] = useState<Record<string, number | null>>({});
  const [turn, setTurn] = useState(45); const [height, setHeight] = useState(0); const [zoom, setZoom] = useState(0);
  const [note, setNote] = useState("");
  const [testPrompt, setTestPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  const pick = (modality: string) => {
    for (const l of ["explore", "control", "finish"] as Lane[]) {
      const o = options[l].find((x) => x.modality === modality && x.allowed);
      if (o) return { o, lane: l };
    }
    return null;
  };
  const angles = useMemo(() => pick("image_edit"), [options]); // eslint-disable-line react-hooks/exhaustive-deps
  const angleRoute = useMemo(() => {
    for (const l of ["explore", "control", "finish"] as Lane[]) { const o = options[l].find((x) => x.profile_slug.startsWith("qwen-angles") && x.allowed); if (o) return { o, lane: l }; }
    return null;
  }, [options]);
  const editRoute = useMemo(() => {
    for (const l of ["explore", "control", "finish"] as Lane[]) { const o = options[l].find((x) => x.profile_slug.startsWith("flux-2-pro-edit") && x.allowed); if (o) return { o, lane: l }; }
    return angles;
  }, [options, angles]);

  const angleInputs = useMemo(() => ({ image: masterAssetId, horizontal_angle: turn, vertical_angle: height, zoom, additional_prompt: note || undefined, image_size: "landscape_16_9", num_images: 1 }), [masterAssetId, turn, height, zoom, note]);
  const refs = useMemo(() => [masterAssetId, ...refAssetIds].filter((x): x is string => !!x).slice(0, 9), [masterAssetId, refAssetIds]);
  const fixedLine = ["time", "light", "weather", "occupancy"].map((k) => fixed[k]).filter(Boolean).join(", ");
  const testInputs = useMemo(() => ({ prompt: [appearance || entryName, fixedLine, testPrompt].filter(Boolean).join(". "), references: refs, image_size: "landscape_16_9" }), [appearance, entryName, fixedLine, testPrompt, refs]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    const t = setTimeout(async () => {
      const out: Record<string, number | null> = {};
      if (angleRoute && masterAssetId) { const { data } = await supabase.rpc("estimate_tokens", { p_profile: angleRoute.o.profile_id, p_inputs: angleInputs as Record<string, Json> }); out.angle = data ?? null; }
      if (editRoute && refs.length) { const { data } = await supabase.rpc("estimate_tokens", { p_profile: editRoute.o.profile_id, p_inputs: testInputs as unknown as Record<string, Json> }); out.test = data ?? null; }
      if (!cancelled) setEstimates(out);
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [angleRoute, editRoute, masterAssetId, angleInputs, testInputs, refs.length]);

  // While a job for this entry is open, refresh so the new angle appears.
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => router.refresh(), 4000);
    const stop = setTimeout(() => setBusy(false), 180000);
    return () => { clearInterval(t); clearTimeout(stop); };
  }, [busy, router]);

  function run(role: string, route: { o: Option; lane: Lane } | null, inputs: Record<string, unknown>, layer: "background" | "character") {
    if (!route) return;
    setMsg(null);
    start(async () => {
      const r = await generateForEntry({ projectId, entryId, role, profileId: route.o.profile_id, lane: route.lane, layer, inputs: inputs as Record<string, Json> });
      if ("error" in r && r.error) setMsg({ kind: "error", text: r.error });
      else { setMsg({ kind: "ok", text: `Queued${r.tokens != null ? `, ${r.tokens.toLocaleString()} tokens reserved` : ""}. It lands here when it finishes.` }); setBusy(true); }
    });
  }

  const sel = "input py-1 text-[11px]";
  return (
    <div className="flex flex-col gap-3">
      {kind === "location" && (
        <div className="glass rounded-[10px] p-3">
          <div className="text-[12px] font-medium">+ angle <span className="ml-2 font-normal text-mute">made from the wide, so it lines up</span></div>
          {!masterAssetId ? <p className="mt-1 text-[11px] text-drift">Save a master wide first (upload a reference, or generate a test still and set it as master).</p>
           : !angleRoute ? <p className="mt-1 text-[11px] text-drift">Your school has no angles route enabled.</p> : (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              <label className="pill flex items-center gap-1"><span className="text-mute">turn</span>
                <select className="bg-transparent outline-none" value={turn} onChange={(e) => setTurn(Number(e.target.value))}>
                  {[[0, "as shot"], [45, "45° right"], [90, "right side"], [135, "135°"], [180, "reverse"], [225, "225°"], [270, "left side"], [315, "45° left"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select></label>
              <label className="pill flex items-center gap-1"><span className="text-mute">height</span>
                <select className="bg-transparent outline-none" value={height} onChange={(e) => setHeight(Number(e.target.value))}>
                  {[[-30, "low"], [0, "eye level"], [30, "elevated"], [60, "high"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select></label>
              <label className="pill flex items-center gap-1"><span className="text-mute">distance</span>
                <select className="bg-transparent outline-none" value={zoom} onChange={(e) => setZoom(Number(e.target.value))}>
                  {[[0, "wide"], [2, "wide-ish"], [5, "medium"], [8, "tight"], [10, "close"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select></label>
              <input className={`${sel} min-w-40 flex-1`} placeholder="notes (optional): toward the exit, rain on the floor" value={note} onChange={(e) => setNote(e.target.value)} />
              <button type="button" disabled={pending} onClick={() => run("angle", angleRoute, angleInputs, "background")} className="btn-primary flex items-center gap-2 disabled:opacity-40">
                <span>{pending ? "…" : "Make angle"}</span>{estimates.angle != null && <span className="mono text-[11px] opacity-80">{estimates.angle.toLocaleString()}</span>}
              </button>
            </div>
          )}
          <p className="mt-2 text-[11px] text-mute">Angles within about 90° of the wide keep the layout; a full reverse invents the wall it has never seen.</p>
        </div>
      )}

      <div className="glass rounded-[10px] p-3">
        <div className="text-[12px] font-medium">{kind === "location" ? "Test it" : kind === "character" ? "Test her" : "Test it"} <span className="ml-2 font-normal text-mute">tests tune the {kind}; they never go in the film</span></div>
        {!editRoute ? <p className="mt-1 text-[11px] text-drift">Your school has no edit route enabled.</p> : (
          <div className="mt-2 flex items-center gap-2">
            <input className={`${sel} flex-1`} placeholder={kind === "location" ? "low angle from bay 1, rain on concrete" : "three-quarter, under sodium light, looking over her shoulder"} value={testPrompt} onChange={(e) => setTestPrompt(e.target.value)} />
            <button type="button" disabled={pending || refs.length === 0} onClick={() => run("test", editRoute, testInputs, kind === "character" ? "character" : "background")} className="btn-primary flex items-center gap-2 disabled:opacity-40" title={refs.length === 0 ? "Add a reference image first" : undefined}>
              <span>{pending ? "…" : "Generate"}</span>{estimates.test != null && <span className="mono text-[11px] opacity-80">{estimates.test.toLocaleString()}</span>}
            </button>
          </div>
        )}
        <p className="mt-1 text-[11px] text-mute">Uses {refs.length} reference{refs.length === 1 ? "" : "s"}{fixedLine ? ` · ${fixedLine}` : ""} · screened before it runs · refusals cost nothing</p>
      </div>
      {msg && <p className={`text-[11px] ${msg.kind === "ok" ? "text-ok" : "text-drift"}`}>{msg.text}</p>}
    </div>
  );
}
