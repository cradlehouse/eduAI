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
type SchemaProp = { type?: string; title?: string; enum?: (string | number)[]; default?: Json; minimum?: number; maximum?: number; maxLength?: number; format?: string; items?: { format?: string }; "x-ui"?: { widget?: string; accept?: string } };

const LANES: { id: Lane; label: string; blurb: string }[] = [
  { id: "explore", label: "Explore", blurb: "Quick, cheap tests and variations." },
  { id: "control", label: "Control", blurb: "References, settings, reproducible." },
  { id: "finish", label: "Finish", blurb: "Release quality. Costs the most; use it for the cut you keep." },
];
const LAYERS: { id: Layer; label: string; short: string; modalities: string[]; help: string }[] = [
  { id: "background", label: "Background", short: "BG", modalities: ["text_to_image", "image_edit", "text_to_video", "image_to_video"], help: "The location plate. Reused across every cut in the scene." },
  { id: "character", label: "Character", short: "Char", modalities: ["image_edit", "image_to_video", "text_to_video"], help: "The consent-bearing pass. Uses the plate frame as reference." },
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
  bible_assets: "a bible entry pinned from the rail (or 'uses nothing from the bible')", consent: "a signed release for a linked entry",
};
const HIDDEN = ["profile_not_approved", "version_not_approved", "not_in_org_allowlist", "profile_approval_expired", "allowlist_expired", "allowlist_not_started"];

// "LTX 2.5 fast" rather than "LTX" twice: family name + the version's own part of its slug. When the
// version slug doesn't start with the family (still routes), the family name alone is the label.
function routeLabel(o: Option): string {
  const family = o.display_name.toLowerCase().replace(/\s+/g, "-") + "-";
  if (!o.version_slug.startsWith(family)) return o.display_name;
  return `${o.display_name} ${o.version_slug.slice(family.length).replace(/-/g, " ")}`;
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

// The selected cut's working panel (docs/DESIGN.md §4.3): the take bin and the current take, the
// layer tabs, the shot prompt with its chips and "Another take"; beside it the Route panel with a
// price per lane and the price of this take, then whatever the page passes as the inspector.
export function CutWorkspace({ projectId, shot, takes, optionsByLane, readiness, promptSeed, dialogueSeed, assets, look, inspector }: {
  projectId: string;
  shot: { id: string; label: string; selected_take_id: string | null; plate_take_id: string | null };
  takes: TakeRow[];
  optionsByLane: Record<Lane, Option[]>;
  readiness: Readiness[];
  promptSeed: string; dialogueSeed: string;
  assets: { id: string; kind: string; label: string }[];
  look: { key: string; label: string; prompt: string } | null;
  inspector?: React.ReactNode;
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
  // catches up; nothing reloads, nothing jumps.
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
  // Every route the school has for this layer, across lanes; picking one sets the lane.
  const picker = useMemo(() => {
    const seen = new Map<string, { o: Option; lane: Lane }>();
    for (const l of ["explore", "control", "finish"] as Lane[]) {
      for (const o of optionsByLane[l]) {
        if (!layerDef.modalities.includes(o.modality) || HIDDEN.includes(o.reason ?? "")) continue;
        const cur = seen.get(o.profile_id);
        if (!cur || (!cur.o.allowed && o.allowed) || (o.allowed && l === lane)) seen.set(o.profile_id, { o, lane: l });
      }
    }
    return [...seen.values()].sort((a, b) => (a.lane === lane ? -1 : 1) - (b.lane === lane ? -1 : 1));
  }, [optionsByLane, layerDef, lane]);
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
      const entries = await Promise.all(picker.filter((p) => p.o.allowed).map(async ({ o }) => {
        const { data } = await supabase.rpc("estimate_tokens", { p_profile: o.profile_id, p_inputs: inputs });
        return [o.profile_id, data ?? null] as const;
      }));
      if (!cancelled) setEstimates(Object.fromEntries(entries));
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [picker, inputs]);

  const estimate = selected ? estimates[selected.profile_id] ?? null : null;
  // The price a lane would cost: its cheapest allowed route for this layer.
  const laneEstimate = (l: Lane) => {
    const ids = optionsByLane[l].filter((o) => o.allowed && layerDef.modalities.includes(o.modality)).map((o) => estimates[o.profile_id]).filter((n): n is number => n != null);
    return ids.length ? Math.min(...ids) : null;
  };
  const canGenerate = !!selected?.allowed && !!gate?.ready && !pending;
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

  const layerTakes = live.filter((t) => t.layer === layer);
  const killed = takes.filter((t) => t.layer === layer && (lifecycle[t.id] ?? t.lifecycle) === "killed");
  const chosenId = layer === "background" ? chosen.background : layer === "merged" ? chosen.merged : null;
  const main = layerTakes.find((t) => t.id === focus) ?? layerTakes.find((t) => t.id === chosenId) ?? layerTakes[0] ?? null;
  const canChoose = layer === "background" || layer === "merged";
  const chip = "pill flex items-center gap-1 text-[11px]";

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_302px]">
      <div className="flex min-w-0 flex-col gap-3">
        {/* the stage: bin down the left, current take large */}
        <div className="glass overflow-hidden rounded-[10px]">
          <div className="flex items-center gap-1 border-b border-glass-edge px-2 py-1.5">
            {LAYERS.map((l) => (
              <button key={l.id} type="button" onClick={() => { setLayer(l.id); setFocus(null); }}
                      className={`rounded-[6px] px-2.5 py-1 text-[12px] transition-colors ${layer === l.id ? "bg-field text-gold" : "text-dim hover:bg-field"}`}>
                {l.label}{counts[l.id] ? <span className="ml-1 text-mute">{counts[l.id]}</span> : null}
              </button>
            ))}
            <span className="ml-auto truncate text-[11px] text-mute">{layerDef.help}</span>
          </div>
          <div className={`grid ${layerTakes.length > 0 ? "grid-cols-[92px_minmax(0,1fr)]" : "grid-cols-1"}`}>
            {layerTakes.length > 0 && (
              <div className="flex max-h-[420px] flex-col gap-1.5 overflow-y-auto border-r border-glass-edge p-1.5">
                {layerTakes.map((t, i) => {
                  const isMain = main?.id === t.id; const isChosen = t.id === chosenId;
                  return (
                    <div key={t.id} className={`group relative shrink-0 overflow-hidden rounded-[5px] border bg-card transition-all ${isChosen ? "border-chosen" : isMain ? "border-card-edge" : "border-transparent opacity-60 hover:opacity-100"}`}>
                      <button type="button" onClick={() => setFocus(t.id)} onDoubleClick={() => canChoose && toggleChoose(t)} className="block h-[46px] w-full" title={new Date(t.created_at).toLocaleString()}><Media take={t} /></button>
                      <span className="pointer-events-none absolute left-1 top-0.5 text-[10px] text-ink [text-shadow:0_1px_2px_#000]">{i + 1}</span>
                      {canChoose && (
                        <button type="button" onClick={() => toggleChoose(t)} aria-pressed={isChosen} aria-label={isChosen ? "Chosen · click to unchoose" : "Choose this take"}
                                className={`absolute bottom-0.5 right-0.5 grid h-5 w-5 place-items-center rounded-full text-[11px] ${isChosen ? "bg-chosen text-bg-deep" : "bg-black/55 text-ink opacity-0 hover:bg-chosen hover:text-bg-deep group-hover:opacity-100"}`}>✓</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className={`relative bg-card ${layer === "dialogue" || layer === "sfx" ? "h-24" : "aspect-video"}`}>
              {main ? <Media take={main} big /> : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[12px] text-dim">
                  <span>No {layerDef.label.toLowerCase()} take yet.</span>
                  <span className="text-[11px] text-mute">Write the shot below and generate.</span>
                </div>
              )}
              {main && (
                <div className="absolute left-2.5 top-2 flex gap-1.5 text-[11px]">
                  {main.id === chosenId && <span className="rounded-full bg-chosen px-2 py-0.5 text-bg-deep">chosen{layer === "background" ? " · plate" : ""}</span>}
                  <span className="rounded-full bg-black/55 px-2 py-0.5 text-ink">{layerDef.short}{main.duration_s ? ` · ${main.duration_s.toFixed(1)} s` : ""}</span>
                </div>
              )}
              {main && <button type="button" onClick={() => setLife(main, "killed")} className="absolute bottom-2.5 right-2.5 rounded-full bg-black/55 px-2.5 py-0.5 text-[11px] text-ink hover:bg-drift hover:text-bg-deep">Kill take</button>}
            </div>
          </div>
          {binMsg && <p className="px-3 py-1.5 text-[11px] text-drift">{binMsg}</p>}
          {killed.length > 0 && (
            <details className="border-t border-glass-edge px-3 py-1.5 text-[11px] text-dim">
              <summary className="cursor-pointer select-none">Killed takes on this layer ({killed.length}) · nothing is ever deleted</summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {killed.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 rounded-[6px] border border-card-edge p-1">
                    <div className="h-10 w-[68px] overflow-hidden rounded-[4px] bg-card opacity-60"><Media take={t} /></div>
                    <button type="button" onClick={() => setLife(t, "live")} className="btn text-[11px]">Restore</button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        {/* the shot: prompt, chips, another take */}
        <div className="glass rounded-[10px] p-3">
          <div className="sect mt-0">Shot</div>
          <textarea rows={2} maxLength={schema.properties?.[promptKey]?.maxLength} value={String(inputs[promptKey] ?? "")} onChange={(e) => set(promptKey, e.target.value)}
                    placeholder={layer === "dialogue" ? "The line to voice, from the notes" : layer === "sfx" ? "Describe the sound: rain on a tin roof, distant traffic" : "Write the shot…"}
                    className="input w-full resize-none text-[13px] leading-snug" />
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {["background", "character", "merged"].includes(layer) && (
              look ? <span className={`${chip} text-dim`} title={`Every picture prompt in this project starts with: ${look.prompt}`}>Look · {look.label}</span>
                   : <span className={`${chip} border-dashed text-mute`} title="Set the project's look in the scene header">Look · not set</span>
            )}
            {Object.entries(schema.properties ?? {}).filter(([k]) => !PROMPT_KEYS.includes(k)).map(([k, p]) => {
              const v = inputs[k];
              const name = p.title ?? k.replace(/_/g, " ");
              if (p.type === "array" && p.items?.format === "asset-ref") {
                const accept = p["x-ui"]?.accept ?? "image";
                const picked = Array.isArray(v) ? (v as string[]) : [];
                return <label key={k} className={chip} title={`${name} · hold ⌘/Ctrl to pick several`}><span className="text-mute">{name}</span>
                  <select multiple size={Math.min(4, Math.max(2, assets.filter((a) => a.kind === accept).length))} className="bg-transparent text-[11px] outline-none" value={picked}
                          onChange={(e) => set(k, Array.from(e.target.selectedOptions).map((o) => o.value))}>
                    {assets.filter((a) => a.kind === accept).map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select>
                  {picked.length > 0 && <span className="text-mute">{picked.length}</span>}</label>;
              }
              if (p.format === "asset-ref") {
                const accept = p["x-ui"]?.accept ?? "image";
                return <label key={k} className={chip} title={name}><span className="text-mute">{name}</span>
                  <select className="bg-transparent outline-none" value={String(v ?? "")} onChange={(e) => set(k, e.target.value || null)}>
                    <option value="">none</option>{assets.filter((a) => a.kind === accept).map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label>;
              }
              if (p.enum) {
                return <label key={k} className={chip} title={name}>
                  <select className="bg-transparent outline-none" value={String(v ?? "")} onChange={(e) => set(k, p.type === "integer" || p.type === "number" ? Number(e.target.value) : e.target.value)}>
                    {p.enum.map((opt) => <option key={String(opt)} value={String(opt)}>{k === "duration_s" ? `${opt} s` : String(opt)}</option>)}</select></label>;
              }
              if (p.type === "boolean") return <button key={k} type="button" onClick={() => set(k, !v)} className={`${chip} ${v ? "pinned" : "text-dim"}`}>{name}</button>;
              if (p.type === "integer" || p.type === "number") {
                return <label key={k} className={chip} title={name}><span className="text-mute">{name}</span>
                  <input type="number" className="w-12 bg-transparent outline-none" min={p.minimum} max={p.maximum} step={p.type === "integer" ? 1 : "any"} value={v == null ? "" : String(v)} onChange={(e) => set(k, e.target.value === "" ? null : Number(e.target.value))} /></label>;
              }
              return <label key={k} className={chip} title={name}><span className="text-mute">{name}</span>
                <input className="w-24 bg-transparent outline-none" maxLength={p.maxLength} value={String(v ?? "")} onChange={(e) => set(k, e.target.value)} placeholder="…" /></label>;
            })}
            <button type="button" onClick={submit} disabled={!canGenerate} className="btn-primary ml-auto flex items-center gap-2 disabled:opacity-40">
              <span>{pending ? "…" : layerTakes.length ? "Another take" : "Generate"}</span>
              {estimate != null && <span className="mono text-[11px] opacity-80">{estimate.toLocaleString()}</span>}
            </button>
          </div>
          {gate && !gate.ready && (
            <p className="mt-2 text-[11px] text-drift">Not ready. {gateLane === "voice_likeness" ? "Dialogue in a real voice needs a voice release." : `This cut still needs ${gate.missing.map((m) => MISSING[m] ?? m).join(", ")}.`}</p>
          )}
          {msg && <p className={`mt-2 text-[11px] ${msg.kind === "ok" ? "text-ok" : "text-drift"}`}>{msg.text}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* route panel: a price per lane, this take's price, the screening note */}
        <div className="glass rounded-[10px] p-3">
          <div className="text-[12px] font-medium">Route</div>
          {LANES.map((l) => { const r = readiness.find((x) => x.lane === l.id); const est = laneEstimate(l.id); const on = lane === l.id; return (
            <button key={l.id} type="button" onClick={() => setLane(l.id)} title={r && !r.ready ? `blocked: ${r.missing.join(", ")}` : l.blurb}
                    className={`kv w-full rounded-[6px] px-1 text-left transition-colors hover:bg-field ${on ? "text-gold" : ""}`}>
              <span>{l.label}</span><span className={`mono ${on ? "" : "text-mute"}`}>{est != null ? est.toLocaleString() : "—"}</span>
            </button>
          ); })}
          <details className="mt-1">
            <summary className="cursor-pointer list-none text-[11px] text-mute hover:text-dim">{selected ? routeLabel(selected) : "no route"} · change</summary>
            <div className="mt-1 flex flex-col">
              {picker.length === 0 && <div className="py-1 text-[11px] text-mute">Your school has no route for this layer yet.</div>}
              {picker.map(({ o, lane: l }) => { const est = estimates[o.profile_id]; const usable = o.allowed || l !== lane; return (
                <button key={o.profile_id} type="button" disabled={!usable} onClick={() => { setLane(l); setProfileId(o.profile_id); }}
                        className={`flex w-full items-center justify-between rounded-[6px] px-1.5 py-1 text-left text-[11px] hover:bg-field ${usable ? "" : "opacity-45"} ${selected?.profile_id === o.profile_id ? "text-gold" : ""}`}>
                  <span>{routeLabel(o)} <span className="text-mute">· {l}{!o.allowed && l === lane ? ` · ${REASON[o.reason ?? ""] ?? o.reason}` : ""}</span></span>
                  <span className="mono ml-2 shrink-0 text-mute">{est != null ? est.toLocaleString() : "…"}</span>
                </button>
              ); })}
              {selected?.limitations && <div className="mt-1 text-[11px] text-mute">{selected.limitations}</div>}
            </div>
          </details>
          <div className="kv mt-2 border-t border-glass-edge pt-2 text-[16px]"><span>This take</span><span className="mono">{estimate != null ? estimate.toLocaleString() : "—"}</span></div>
          <div className="text-[11px] text-mute">tokens · screened before it runs · refusals cost nothing</div>
        </div>
        {inspector}
      </div>
    </div>
  );
}
