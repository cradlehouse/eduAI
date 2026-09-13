"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database, Json } from "@/lib/db/types";
import { generate } from "./generate";
import { setChosenTake, setTakeLifecycle } from "./actions";

type Lane = "explore" | "control" | "finish";
type Layer = Database["public"]["Enums"]["layer"];
export type Option = Database["public"]["Functions"]["model_options"]["Returns"][number];
export type Readiness = { lane: string; ready: boolean; missing: string[] };
export type TakeRow = { id: string; layer: Layer; asset_id: string; created_at: string; lifecycle: string; mime: string; kind: string; duration_s: number | null };
type Schema = { type?: string; required?: string[]; properties?: Record<string, SchemaProp> };
type SchemaProp = { type?: string; title?: string; enum?: (string | number)[]; default?: Json; minimum?: number; maximum?: number; maxLength?: number; format?: string; "x-ui"?: { widget?: string; accept?: string } };

const LANES: { id: Lane; label: string; blurb: string }[] = [
  { id: "explore", label: "Explore", blurb: "Quick, cheap tests and variations." },
  { id: "control", label: "Control", blurb: "References, settings, reproducible." },
  { id: "finish", label: "Finish", blurb: "Release quality. Instructor-gated." },
];
// Literal class names on purpose: Tailwind only emits classes it can see in source.
const LANE_STYLE: Record<Lane, { solid: string; text: string; ring: string }> = {
  explore: { solid: "bg-explore text-white", text: "text-explore", ring: "ring-explore" },
  control: { solid: "bg-control text-white", text: "text-control", ring: "ring-control" },
  finish:  { solid: "bg-finish text-white",  text: "text-finish",  ring: "ring-finish" },
};
const LAYERS: { id: Layer; label: string; short: string; modalities: string[]; help: string }[] = [
  { id: "background", label: "Background", short: "BG", modalities: ["text_to_image", "text_to_video", "image_to_video"], help: "The location plate. Reused across every cut in the scene." },
  { id: "character", label: "Character", short: "Char", modalities: ["image_to_video", "text_to_video"], help: "The consent-bearing pass. Uses the plate frame as reference." },
  { id: "merged", label: "Merged", short: "Merged", modalities: ["image_to_video", "text_to_video"], help: "The take you compare and choose." },
  { id: "dialogue", label: "Dialogue", short: "Dialogue", modalities: ["text_to_speech"], help: "The line from the notes, in a consented voice." },
  { id: "sfx", label: "SFX", short: "SFX", modalities: ["sound_effects"], help: "Foley and ambience for this cut." },
];
const REASON: Record<string, string> = {
  lane_not_supported: "not a route for this lane", not_in_org_allowlist: "not enabled for your school", lane_not_allowed_for_org: "your school hasn't allowed this lane",
  profile_not_approved: "not approved yet", profile_approval_expired: "approval expired", version_not_approved: "version not approved", content_tier: "content tier",
  minor_voice_likeness: "not available for under-18s", allowlist_expired: "school approval expired", allowlist_not_started: "school approval not started yet", profile_down: "route is down",
};
const PROMPT_KEYS = ["prompt", "text"];
const MISSING: Record<string, string> = {
  objective: "an objective", continuity: "continuity", camera_language: "a camera note",
  bible_assets: "a bible entry ticked under Continuity (or 'uses nothing from the bible')", consent: "a signed release for a linked entry",
};

// "LTX 2.5 fast" rather than "LTX" twice: family name + the version's own part of its slug.
function routeLabel(o: Option): string {
  const family = o.display_name.toLowerCase().replace(/\s+/g, "-") + "-";
  const v = o.version_slug.startsWith(family) ? o.version_slug.slice(family.length) : o.version_slug;
  return `${o.display_name} ${v.replace(/-/g, " ")}`;
}

function defaultsFor(schema: Schema, seed: Record<string, Json>): Record<string, Json> {
  const out: Record<string, Json> = {};
  for (const [k, p] of Object.entries(schema.properties ?? {})) {
    if (seed[k] !== undefined) out[k] = seed[k];
    else if (p.default !== undefined) out[k] = p.default;
  }
  return out;
}

function Media({ take, big }: { take: TakeRow; big?: boolean }) {
  const src = `/api/assets/${take.asset_id}`;
  if (take.kind === "video") return <video src={src} controls={big} muted={!big} playsInline preload="metadata" className="h-full w-full object-cover" />;
  if (take.kind === "audio") return <div className="flex h-full w-full items-center justify-center p-3"><audio src={src} controls={big} preload="metadata" className="w-full" /></div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="h-full w-full object-cover" />;
}

export function CutWorkspace({ projectId, shot, takes, optionsByLane, readiness, promptSeed, dialogueSeed, assets }: {
  projectId: string;
  shot: { id: string; label: string; selected_take_id: string | null; plate_take_id: string | null };
  takes: TakeRow[];
  optionsByLane: Record<Lane, Option[]>;
  readiness: Readiness[];
  promptSeed: string; dialogueSeed: string;
  assets: { id: string; kind: string; label: string }[];
}) {
  const countOf = (rows: TakeRow[]) => { const c: Record<string, number> = {}; for (const t of rows) c[t.layer] = (c[t.layer] ?? 0) + 1; return c; };
  const serverCounts = countOf(takes.filter((t) => t.lifecycle === "live"));
  const hasPlate = !!shot.plate_take_id || (serverCounts.background ?? 0) > 0;
  const [layer, setLayer] = useState<Layer>(hasPlate ? ((serverCounts.merged ?? 0) > 0 ? "merged" : "character") : "background");
  const [lane, setLane] = useState<Lane>("explore");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Record<string, Json>>({});
  const [estimates, setEstimates] = useState<Record<string, number | null>>({});
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Bin state is local and optimistic: a tick or a kill changes this view immediately and the server
  // catches up; nothing reloads, nothing jumps. Server truth arrives on the next render of the page.
  const [chosen, setChosen] = useState<{ background: string | null; merged: string | null }>({ background: shot.plate_take_id, merged: shot.selected_take_id });
  const [lifecycle, setLifecycle] = useState<Record<string, string>>(() => Object.fromEntries(takes.map((t) => [t.id, t.lifecycle])));
  const [binMsg, setBinMsg] = useState<string | null>(null);
  useEffect(() => { setChosen({ background: shot.plate_take_id, merged: shot.selected_take_id }); }, [shot.plate_take_id, shot.selected_take_id]);
  useEffect(() => { setLifecycle(Object.fromEntries(takes.map((t) => [t.id, t.lifecycle]))); }, [takes]);

  function toggleChoose(t: TakeRow) {
    if (layer !== "background" && layer !== "merged") return;
    const key = layer; const next = chosen[key] === t.id ? null : t.id;
    setChosen((c) => ({ ...c, [key]: next })); setBinMsg(null);
    start(async () => { const r = await setChosenTake(projectId, shot.id, layer, next); if ("error" in r) { setBinMsg(r.error); setChosen((c) => ({ ...c, [key]: chosen[key] })); } });
  }
  function setLife(t: TakeRow, life: "live" | "killed") {
    if (life === "killed" && !confirm("Kill this take? It leaves the bin but is never deleted; you can restore it from the killed shelf.")) return;
    const prev = lifecycle[t.id];
    setLifecycle((m) => ({ ...m, [t.id]: life })); setBinMsg(null);
    if (life === "killed" && focus === t.id) setFocus(null);
    start(async () => { const r = await setTakeLifecycle(projectId, t.id, life); if ("error" in r) { setBinMsg(r.error); setLifecycle((m) => ({ ...m, [t.id]: prev })); } });
  }

  const live = useMemo(() => takes.filter((t) => (lifecycle[t.id] ?? t.lifecycle) === "live"), [takes, lifecycle]);
  const counts = countOf(live);
  const layerDef = LAYERS.find((l) => l.id === layer)!;
  const options = useMemo(() => optionsByLane[lane].filter((o) => layerDef.modalities.includes(o.modality)), [optionsByLane, lane, layerDef]);
  const selected = options.find((o) => o.profile_id === profileId) ?? options.find((o) => o.allowed) ?? null;
  const schema = (selected?.input_schema ?? { type: "object" }) as Schema;
  const gateLane = layer === "dialogue" ? "voice_likeness" : lane;
  const gate = readiness.find((r) => r.lane === gateLane);
  const promptKey = PROMPT_KEYS.find((k) => schema.properties?.[k]) ?? "prompt";

  useEffect(() => {
    if (!selected) return;
    setProfileId(selected.profile_id);
    const seed: Record<string, Json> = layer === "dialogue" ? { text: dialogueSeed } : { prompt: promptSeed };
    setInputs(defaultsFor((selected.input_schema ?? {}) as Schema, seed));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.profile_id, layer]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    const t = setTimeout(async () => {
      const entries = await Promise.all(options.filter((o) => o.allowed).map(async (o) => {
        const { data } = await supabase.rpc("estimate_tokens", { p_profile: o.profile_id, p_inputs: inputs });
        return [o.profile_id, data ?? null] as const;
      }));
      if (!cancelled) setEstimates(Object.fromEntries(entries));
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [options, inputs]);

  const estimate = selected ? estimates[selected.profile_id] ?? null : null;
  const canGenerate = !!selected?.allowed && !!gate?.ready && !pending;
  const ls = LANE_STYLE[lane];
  const set = (k: string, v: Json) => setInputs((s) => ({ ...s, [k]: v }));

  function submit() {
    if (!selected) return;
    setMsg(null);
    start(async () => {
      const r = await generate({ projectId, shotId: shot.id, profileId: selected.profile_id, lane, layer, inputs });
      if ("error" in r && r.error) setMsg({ kind: "error", text: r.error });
      else setMsg({ kind: "ok", text: `Queued${r.tokens != null ? `, ${r.tokens.toLocaleString()} tokens reserved` : ""}. The take lands here when it finishes.` });
    });
  }

  // ---- stage: the takes of the current layer, chosen one large
  const layerTakes = live.filter((t) => t.layer === layer);
  const killed = takes.filter((t) => t.layer === layer && (lifecycle[t.id] ?? t.lifecycle) === "killed");
  const chosenId = layer === "background" ? chosen.background : layer === "merged" ? chosen.merged : null;
  const main = layerTakes.find((t) => t.id === focus) ?? layerTakes.find((t) => t.id === chosenId) ?? layerTakes[0] ?? null;
  const canChoose = layer === "background" || layer === "merged";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {LAYERS.map((l) => (
          <button key={l.id} type="button" onClick={() => { setLayer(l.id); setFocus(null); }}
                  className={`pill display ${layer === l.id ? "bg-ink text-paper" : "bg-sand text-ink hover:bg-line"}`}>
            {l.label}{counts[l.id] ? <span className="ml-1 opacity-70">{counts[l.id]}</span> : null}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted">{layerDef.help}</span>
      </div>

      <div className="card overflow-hidden" style={{ borderRadius: 18 }}>
        <div className={`grid ${layerTakes.length > 0 ? "grid-cols-[128px_minmax(0,1fr)]" : "grid-cols-1"}`}>
          {/* the bin: takes down the left, tick to choose, × to kill */}
          {layerTakes.length > 0 && (
            <div className="flex max-h-[520px] flex-col gap-2 overflow-y-auto border-r border-line bg-sand p-2">
              {layerTakes.map((t) => {
                const isMain = main?.id === t.id; const isChosen = t.id === chosenId;
                return (
                  <div key={t.id} className={`group relative shrink-0 overflow-hidden rounded-[8px] bg-ink ring-2 ${isMain ? "ring-ink" : "ring-transparent"}`}>
                    <button type="button" onClick={() => setFocus(t.id)} className="block h-[68px] w-full" title={new Date(t.created_at).toLocaleString()}><Media take={t} /></button>
                    {canChoose && (
                      <button type="button" onClick={() => toggleChoose(t)} aria-pressed={isChosen} aria-label={isChosen ? "Chosen · click to unchoose" : "Choose this take"} title={isChosen ? "Chosen · click to unchoose" : (layer === "background" ? "Use as plate" : "Choose this take")}
                              className={`absolute bottom-1 right-1 grid h-6 w-6 place-items-center rounded-full text-[13px] font-bold ${isChosen ? "bg-money text-ink" : "bg-black/55 text-paper opacity-0 hover:bg-money hover:text-ink group-hover:opacity-100"}`}>✓</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className={`relative bg-ink ${layer === "dialogue" || layer === "sfx" ? "h-24" : "aspect-video"}`}>
            {main ? <Media take={main} big /> : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-sm text-paper/70">
                <span>No {layerDef.label.toLowerCase()} take yet.</span>
                <span className="text-xs text-paper/50">Write the prompt below and generate.</span>
              </div>
            )}
            {main && (
              <button type="button" onClick={() => setLife(main, "killed")} className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-0.5 text-[11px] text-paper hover:bg-danger">Kill take</button>
            )}
            {main && (
              <div className="absolute left-3 top-3 flex gap-1.5">
                {main.id === chosenId && <span className="rounded-full bg-money px-2 py-0.5 text-[11px] font-semibold text-ink">✓ {layer === "background" ? "plate for this cut" : "chosen for this cut"}</span>}
                <span className="rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-paper">{layerDef.short}{main.duration_s ? ` · ${main.duration_s.toFixed(1)} s` : ""}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {binMsg && <p className="text-xs text-danger">{binMsg}</p>}
      {killed.length > 0 && (
        <details className="text-xs text-muted">
          <summary className="cursor-pointer select-none">Killed takes on this layer ({killed.length}) · nothing is ever deleted</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {killed.map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-[10px] border border-line bg-card p-1.5">
                <div className="h-12 w-20 overflow-hidden rounded-[6px] bg-ink opacity-60"><Media take={t} /></div>
                <button type="button" onClick={() => setLife(t, "live")} className="btn text-xs">Restore</button>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* ---- the dock: prompt on top, everything else as chips, cost on the button */}
      <div className="card p-3 shadow-[0_14px_36px_rgba(35,33,43,0.10)]" style={{ borderRadius: 18 }}>
        <textarea rows={2} maxLength={schema.properties?.[promptKey]?.maxLength} value={String(inputs[promptKey] ?? "")} onChange={(e) => set(promptKey, e.target.value)}
                  placeholder={layer === "dialogue" ? "The line to voice, from the notes" : layer === "sfx" ? "Describe the sound: rain on a tin roof, distant traffic" : "Describe the picture for this cut"}
                  className="w-full resize-none border-0 bg-transparent px-1 py-1 text-[15px] leading-snug outline-none placeholder:text-muted" />
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-line pt-2">
          <div className="flex rounded-full bg-sand p-0.5">
            {LANES.map((l) => { const r = readiness.find((x) => x.lane === l.id); return (
              <button key={l.id} type="button" onClick={() => setLane(l.id)} title={r && !r.ready ? `blocked: ${r.missing.join(", ")}` : l.blurb}
                      className={`display rounded-full px-2.5 py-1 text-xs ${lane === l.id ? LANE_STYLE[l.id].solid : LANE_STYLE[l.id].text}`}>{l.label}</button>
            ); })}
          </div>

          <details className="relative">
            <summary className="pill flex cursor-pointer list-none items-center gap-1.5 bg-card text-xs">
              <span className="font-semibold">{selected ? routeLabel(selected) : "Route"}</span>
              {selected && <span className="text-muted">{selected.compute_provider} · {selected.integrity_rating} · {selected.resource_disclosure}</span>}
              <span className="opacity-60">▾</span>
            </summary>
            <div className="card absolute left-0 z-20 mt-1 w-80 p-2 text-sm">
              <div className="label mb-1 px-2">Route · cost before you commit</div>
              {options.length === 0 && <div className="px-2 py-1 text-xs text-muted">No route serves this layer in the {lane} lane.</div>}
              {options.map((o) => { const est = estimates[o.profile_id]; return (
                <button key={o.profile_id} type="button" disabled={!o.allowed} onClick={(e) => { setProfileId(o.profile_id); (e.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open"); }}
                        className={`flex w-full items-center justify-between rounded-[10px] px-2 py-1.5 text-left hover:bg-sand ${o.allowed ? "" : "opacity-45"} ${selected?.profile_id === o.profile_id ? "bg-sand" : ""}`}>
                  <span><span className="font-semibold">{routeLabel(o)}</span> <span className="text-xs text-muted">{o.compute_provider} · integrity {o.integrity_rating} · energy {o.resource_disclosure}</span>
                    {!o.allowed && <span className="block text-xs text-muted">{REASON[o.reason ?? ""] ?? o.reason}</span>}</span>
                  <span className={`mono ml-2 shrink-0 text-xs ${o.allowed ? "text-money" : "text-muted"}`}>{o.allowed ? (est != null ? est.toLocaleString() : "…") : "—"}</span>
                </button>
              ); })}
              {selected?.limitations && <div className="mt-1 px-2 text-xs text-muted">{selected.limitations}</div>}
            </div>
          </details>

          {Object.entries(schema.properties ?? {}).filter(([k]) => !PROMPT_KEYS.includes(k)).map(([k, p]) => {
            const v = inputs[k];
            const name = p.title ?? k.replace(/_/g, " ");
            const chip = "pill flex items-center gap-1 bg-card text-xs";
            if (p.format === "asset-ref") {
              const accept = p["x-ui"]?.accept ?? "image";
              return <label key={k} className={chip} title={name}><span className="text-muted">{name}</span>
                <select className="bg-transparent outline-none" value={String(v ?? "")} onChange={(e) => set(k, e.target.value || null)}>
                  <option value="">none</option>{assets.filter((a) => a.kind === accept).map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label>;
            }
            if (p.enum) {
              return <label key={k} className={chip} title={name}>
                <select className="bg-transparent outline-none" value={String(v ?? "")} onChange={(e) => set(k, p.type === "integer" || p.type === "number" ? Number(e.target.value) : e.target.value)}>
                  {p.enum.map((opt) => <option key={String(opt)} value={String(opt)}>{k === "duration_s" ? `${opt} s` : String(opt)}</option>)}</select></label>;
            }
            if (p.type === "boolean") {
              return <button key={k} type="button" onClick={() => set(k, !v)} className={`${chip} ${v ? "bg-ink text-paper" : ""}`}>{name}</button>;
            }
            if (p.type === "integer" || p.type === "number") {
              return <label key={k} className={chip} title={name}><span className="text-muted">{name}</span>
                <input type="number" className="w-14 bg-transparent outline-none" min={p.minimum} max={p.maximum} step={p.type === "integer" ? 1 : "any"} value={v == null ? "" : String(v)} onChange={(e) => set(k, e.target.value === "" ? null : Number(e.target.value))} /></label>;
            }
            return <label key={k} className={chip} title={name}><span className="text-muted">{name}</span>
              <input className="w-28 bg-transparent outline-none" maxLength={p.maxLength} value={String(v ?? "")} onChange={(e) => set(k, e.target.value)} placeholder="…" /></label>;
          })}

          <button type="button" onClick={submit} disabled={!canGenerate}
                  className={`display ml-auto rounded-full px-4 py-1.5 text-sm shadow-[0_4px_0_rgba(0,0,0,0.18)] disabled:opacity-40 ${ls.solid}`}>
            {pending ? "…" : "Generate"}{estimate != null && <span className="mono ml-2 font-normal opacity-90">{estimate.toLocaleString()}</span>}
          </button>
        </div>
        {gate && !gate.ready && (
          <p className="mt-2 text-xs"><b>Not ready.</b> {gateLane === "voice_likeness" ? "Dialogue in a real voice needs a voice release." : `This cut still needs ${gate.missing.map((m) => MISSING[m] ?? m).join(", ")}.`} Save the notes on the right and this unlocks.</p>
        )}
        {msg && <p className={`mt-2 text-xs ${msg.kind === "ok" ? "text-control" : "text-danger"}`}>{msg.text}</p>}
      </div>
    </div>
  );
}
