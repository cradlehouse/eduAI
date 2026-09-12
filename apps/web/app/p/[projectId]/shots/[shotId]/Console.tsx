"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database, Json } from "@/lib/db/types";
import { generate } from "./generate";

type Lane = "explore" | "control" | "finish";
type Layer = Database["public"]["Enums"]["layer"];
export type Option = Database["public"]["Functions"]["model_options"]["Returns"][number];
export type Readiness = { lane: string; ready: boolean; missing: string[] };
type Schema = { type?: string; required?: string[]; properties?: Record<string, SchemaProp> };
type SchemaProp = { type?: string; title?: string; enum?: (string | number)[]; default?: Json; minimum?: number; maximum?: number; maxLength?: number; format?: string; "x-ui"?: { widget?: string; accept?: string } };

const LANES: { id: Lane; label: string; blurb: string }[] = [
  { id: "explore", label: "Explore", blurb: "Quick, cheap tests and variations." },
  { id: "control", label: "Control", blurb: "References, settings, reproducible." },
  { id: "finish", label: "Finish", blurb: "Release quality. Instructor-gated." },
];
// Literal class names on purpose: Tailwind only emits classes it can see in source.
const LANE_STYLE: Record<Lane, { solid: string; text: string; border: string; soft: string; counter: string }> = {
  explore: { solid: "bg-explore text-white", text: "text-explore", border: "border-explore bg-explore/10", soft: "bg-explore/10", counter: "border-explore/40 bg-explore/10 text-explore" },
  control: { solid: "bg-control text-white", text: "text-control", border: "border-control bg-control/10", soft: "bg-control/10", counter: "border-control/40 bg-control/10 text-control" },
  finish:  { solid: "bg-finish text-white",  text: "text-finish",  border: "border-finish bg-finish/10",   soft: "bg-finish/10",  counter: "border-finish/40 bg-finish/10 text-finish" },
};
const LAYERS: { id: Layer; label: string; modalities: string[]; help: string }[] = [
  { id: "background", label: "Background", modalities: ["text_to_image", "text_to_video", "image_to_video"], help: "The location plate. Reused across every cut in the scene." },
  { id: "character", label: "Character", modalities: ["image_to_video", "text_to_video"], help: "The consent-bearing pass. Uses the plate frame as reference." },
  { id: "merged", label: "Merged", modalities: ["image_to_video", "text_to_video"], help: "The take you compare and choose." },
  { id: "dialogue", label: "Dialogue", modalities: ["text_to_speech"], help: "The line from the notes, in a consented voice." },
  { id: "sfx", label: "SFX", modalities: ["sound_effects"], help: "Foley and ambience for this cut." },
];
const REASON: Record<string, string> = {
  lane_not_supported: "not a route for this lane", not_in_org_allowlist: "not enabled for your school", lane_not_allowed_for_org: "your school hasn't allowed this lane",
  profile_not_approved: "not approved yet", profile_approval_expired: "approval expired", version_not_approved: "version not approved", content_tier: "content tier",
  minor_voice_likeness: "not available for under-18s", allowlist_expired: "school approval expired", allowlist_not_started: "school approval not started yet", profile_down: "route is down",
};

function defaultsFor(schema: Schema, seed: Record<string, Json>): Record<string, Json> {
  const out: Record<string, Json> = {};
  for (const [k, p] of Object.entries(schema.properties ?? {})) {
    if (seed[k] !== undefined) out[k] = seed[k];
    else if (p.default !== undefined) out[k] = p.default;
  }
  return out;
}

export function Console({ projectId, shotId, optionsByLane, readiness, promptSeed, dialogueSeed, assets, layerCounts, hasPlate }: {
  projectId: string; shotId: string;
  optionsByLane: Record<Lane, Option[]>;
  readiness: Readiness[];
  promptSeed: string; dialogueSeed: string;
  assets: { id: string; kind: string; label: string }[];
  layerCounts: Record<string, number>;
  hasPlate: boolean;
}) {
  const [lane, setLane] = useState<Lane>("explore");
  const [layer, setLayer] = useState<Layer>(hasPlate ? "character" : "background");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Record<string, Json>>({});
  const [estimates, setEstimates] = useState<Record<string, number | null>>({});
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const layerDef = LAYERS.find((l) => l.id === layer)!;
  const options = useMemo(() => optionsByLane[lane].filter((o) => layerDef.modalities.includes(o.modality)), [optionsByLane, lane, layerDef]);
  const selected = options.find((o) => o.profile_id === profileId) ?? options.find((o) => o.allowed) ?? null;
  const schema = (selected?.input_schema ?? { type: "object" }) as Schema;
  const gateLane = layer === "dialogue" ? "voice_likeness" : lane;
  const gate = readiness.find((r) => r.lane === gateLane);

  useEffect(() => {
    if (!selected) return;
    setProfileId(selected.profile_id);
    const seed: Record<string, Json> = layer === "dialogue" ? { text: dialogueSeed } : { prompt: promptSeed };
    setInputs(defaultsFor((selected.input_schema ?? {}) as Schema, seed));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.profile_id, layer]);

  // Live estimate per allowed option for the current inputs (the rate never reaches the browser).
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

  function set(k: string, v: Json) { setInputs((s) => ({ ...s, [k]: v })); }

  function submit() {
    if (!selected) return;
    setMsg(null);
    start(async () => {
      const r = await generate({ projectId, shotId, profileId: selected.profile_id, lane, layer, inputs });
      if ("error" in r && r.error) setMsg({ kind: "error", text: r.error });
      else setMsg({ kind: "ok", text: `Queued. ${r.tokens != null ? `${r.tokens.toLocaleString()} tokens reserved when it starts.` : ""} The take lands in the contact sheet when it finishes.` });
    });
  }

  return (
    <div className="card p-5 shadow-[0_14px_36px_rgba(35,33,43,0.10)]" style={{ borderRadius: 22 }}>
      <div className="mb-4 flex flex-wrap gap-2">
        {LAYERS.map((l) => (
          <button key={l.id} type="button" onClick={() => setLayer(l.id)}
            className={`pill display ${layer === l.id ? "bg-ink text-paper" : "bg-sand text-ink hover:bg-line"}`}>
            {l.label}{layerCounts[l.id] ? <span className="ml-1 opacity-70">{layerCounts[l.id]}</span> : null}
          </button>
        ))}
        <span className="ml-auto self-center text-xs text-muted">{layerDef.help}{layer === "background" && hasPlate ? " A plate already exists for this cut." : ""}</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[236px_330px_minmax(0,1fr)_200px]">
        <div className="flex flex-col gap-2">
          <span className="label">Lane</span>
          <div className="flex rounded-full bg-sand p-1 gap-1">
            {LANES.map((l) => {
              const r = readiness.find((x) => x.lane === l.id);
              const active = lane === l.id;
              return (
                <button key={l.id} type="button" onClick={() => setLane(l.id)}
                  className={`display flex-1 rounded-full py-2 text-xs ${active ? LANE_STYLE[l.id].solid : LANE_STYLE[l.id].text}`}
                  title={r && !r.ready ? `blocked: ${r.missing.join(", ")}` : l.blurb}>
                  {l.label}
                </button>
              );
            })}
          </div>
          <span className="text-xs leading-snug text-muted">{LANES.find((l) => l.id === lane)!.blurb}</span>
          {gate && !gate.ready && (
            <span className="rounded-[12px] border border-money bg-money/15 px-3 py-2 text-xs">
              <b>Locked.</b> {gateLane === "voice_likeness" ? "Dialogue in a real voice needs a voice release." : `Missing: ${gate.missing.join(", ")}.`}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="label">Route · cost before you commit</span>
          <div className="flex flex-col gap-1">
            {options.length === 0 && <span className="text-xs text-muted">No route serves this layer in the {lane} lane.</span>}
            {options.map((o) => {
              const active = selected?.profile_id === o.profile_id;
              const est = estimates[o.profile_id];
              return (
                <button key={o.profile_id} type="button" disabled={!o.allowed} onClick={() => setProfileId(o.profile_id)}
                  className={`flex items-center justify-between rounded-[12px] border px-3 py-2 text-left text-sm ${active ? ls.border : "border-line"} ${o.allowed ? "" : "opacity-45"}`}>
                  <span>
                    <span className="font-semibold">{o.display_name}</span>{" "}
                    <span className="text-xs text-muted">{o.compute_provider} · integrity {o.integrity_rating} · energy {o.resource_disclosure}</span>
                    {!o.allowed && <span className="block text-xs text-muted">{REASON[o.reason ?? ""] ?? o.reason}</span>}
                  </span>
                  <span className={`mono text-xs ${active ? ls.text : "text-muted"}`}>{o.allowed ? (est != null ? est.toLocaleString() : "…") : "—"}</span>
                </button>
              );
            })}
          </div>
          {selected?.limitations && <span className="text-xs text-muted">{selected.limitations}</span>}
        </div>

        <div className="flex flex-col gap-3">
          <span className="label">Inputs</span>
          {Object.entries(schema.properties ?? {}).map(([k, p]) => {
            const req = schema.required?.includes(k);
            const v = inputs[k];
            const widget = p["x-ui"]?.widget;
            const labelText = `${p.title ?? k.replace(/_/g, " ")}${req ? "" : " (optional)"}`;
            if (p.format === "asset-ref") {
              const accept = p["x-ui"]?.accept ?? "image";
              return (
                <label key={k} className="text-sm"><span className="text-xs text-muted">{labelText}</span><br />
                  <select className="input w-full" value={String(v ?? "")} onChange={(e) => set(k, e.target.value || null)}>
                    <option value="">none</option>
                    {assets.filter((a) => a.kind === accept).map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                </label>
              );
            }
            if (p.enum) {
              return (
                <label key={k} className="text-sm"><span className="text-xs text-muted">{labelText}</span><br />
                  <select className="input w-full" value={String(v ?? "")} onChange={(e) => set(k, p.type === "integer" || p.type === "number" ? Number(e.target.value) : e.target.value)}>
                    {p.enum.map((opt) => <option key={String(opt)} value={String(opt)}>{String(opt)}</option>)}
                  </select>
                </label>
              );
            }
            if (p.type === "boolean") {
              return <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!v} onChange={(e) => set(k, e.target.checked)} /> {labelText}</label>;
            }
            if (p.type === "integer" || p.type === "number") {
              return (
                <label key={k} className="text-sm"><span className="text-xs text-muted">{labelText}</span><br />
                  <input type="number" className="input w-32" min={p.minimum} max={p.maximum} step={p.type === "integer" ? 1 : "any"} value={v == null ? "" : String(v)} onChange={(e) => set(k, e.target.value === "" ? null : Number(e.target.value))} />
                </label>
              );
            }
            const long = widget === "textarea" || (p.maxLength ?? 0) > 200;
            return (
              <label key={k} className="text-sm"><span className="text-xs text-muted">{labelText}</span><br />
                {long
                  ? <textarea className="input w-full" rows={4} maxLength={p.maxLength} value={String(v ?? "")} onChange={(e) => set(k, e.target.value)} />
                  : <input className="input w-full" maxLength={p.maxLength} value={String(v ?? "")} onChange={(e) => set(k, e.target.value)} placeholder={widget === "camera-motion" ? "e.g. slow push-in" : undefined} />}
              </label>
            );
          })}
          {Object.keys(schema.properties ?? {}).length === 0 && <span className="text-xs text-muted">Pick a route to see its inputs.</span>}
        </div>

        <div className="flex flex-col items-center justify-center gap-3">
          <div className={`mono rounded-full border px-4 py-1.5 text-base ${canGenerate ? ls.counter : "border-line text-muted"}`}>
            {estimate != null ? `−${estimate.toLocaleString()} tokens` : "— tokens"}
          </div>
          <button type="button" onClick={submit} disabled={!canGenerate}
            className={`display flex h-[92px] w-[92px] items-center justify-center rounded-full text-sm shadow-[0_8px_0_rgba(0,0,0,0.18)] disabled:opacity-40 ${ls.solid}`}>
            {pending ? "…" : "Generate"}
          </button>
          <span className="text-center text-[11px] leading-tight text-muted">{layer} · {lane}</span>
        </div>
      </div>
      {msg && <p className={`mt-4 rounded-[12px] p-2 text-sm ${msg.kind === "ok" ? "bg-control/10 text-control" : "bg-danger/10 text-danger"}`}>{msg.text}</p>}
    </div>
  );
}
