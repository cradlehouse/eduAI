#!/usr/bin/env node
// Registry seed generator.
//   seed/models.csv               → public.models (families)
//   seed/model_versions.csv       + schemas/<version_slug>.json ({input_schema, safety})   → public.model_versions
//   seed/deployment_profiles.csv  + profiles/<profile_slug>.json ({cost_model, retention, quota?, energy_profile?, resource_model?, adapter?}) → public.deployment_profiles
// Output: seed/models.sql, idempotent upserts on slug. --check: exit 1 if stale.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const seedDir = join(root, "packages/db/seed");
const outPath = join(seedDir, "models.sql");

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows.filter(r => r.length > 1 || r[0] !== "");
  return body.map(r => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}
const csv = name => parseCsv(readFileSync(join(seedDir, name), "utf8"));
const json = (dir, slug) => {
  const p = join(seedDir, dir, `${slug}.json`);
  if (!existsSync(p)) throw new Error(`missing ${p}`);
  return JSON.parse(readFileSync(p, "utf8"));
};

const lit = s => `'${String(s).replace(/'/g, "''")}'`;
const jb = o => `$json$${JSON.stringify(o)}$json$::jsonb`;
const bool = s => (/^(true|1|yes)$/i.test(s) ? "true" : "false");
const nullable = s => (s === "" ? "null" : lit(s));
const laneArr = s => `array[${s.split("|").map(x => lit(x.trim()) + "::public.lane").join(", ")}]`;
const need = (r, cols, file) => { for (const k of cols) if (!(k in r)) throw new Error(`${file}: missing column ${k}`); };

const upsert = (table, cols, rows, key = "slug") =>
  `insert into public.${table} (${cols.join(", ")})\nvalues\n${rows.join(",\n")}\non conflict (${key}) do update set\n` +
  cols.filter(c => c !== key).map(c => `  ${c} = excluded.${c}`).join(",\n") + ";\n";

// families
const mCols = ["slug", "display_name", "modality", "creative_guidance"];
const models = csv("models.csv").map(r => { need(r, mCols, "models.csv"); return "  (" + mCols.map(c => lit(r[c])).join(", ") + ")"; });

// versions
const vScalar = ["slug", "model_slug", "version", "weights_status", "license_family", "license_version", "license_url",
  "commercial_eligibility", "training_data_disclosure", "output_rights_summary", "self_hostable", "voice_likeness_risk",
  "release_eligible", "integrity_rating", "indemnification", "min_content_tier", "limitations", "safety_pipeline_version",
  "approval_status", "approval_owner", "approved_at", "approved_until", "notes", "resource_disclosure", "resource_disclosure_source"];
const vCols = ["slug", "model_id", "version", "weights_status", "license_family", "license_version", "license_url",
  "commercial_eligibility", "training_data_disclosure", "output_rights_summary", "self_hostable", "voice_likeness_risk",
  "release_eligible", "integrity_rating", "indemnification", "min_content_tier", "limitations", "safety_pipeline_version",
  "approval_status", "approval_owner", "approved_at", "approved_until", "notes", "input_schema", "safety",
  "resource_disclosure", "resource_disclosure_source"];
const versions = csv("model_versions.csv").map(r => {
  need(r, vScalar, "model_versions.csv");
  const s = json("schemas", r.slug);
  if (!s.input_schema) throw new Error(`schemas/${r.slug}.json needs input_schema`);
  return "  (" + [
    lit(r.slug), `(select id from public.models where slug = ${lit(r.model_slug)})`, lit(r.version), lit(r.weights_status),
    lit(r.license_family), lit(r.license_version), lit(r.license_url), lit(r.commercial_eligibility),
    lit(r.training_data_disclosure), lit(r.output_rights_summary), bool(r.self_hostable), lit(r.voice_likeness_risk),
    bool(r.release_eligible), lit(r.integrity_rating), bool(r.indemnification), lit(r.min_content_tier), lit(r.limitations),
    lit(r.safety_pipeline_version), lit(r.approval_status), nullable(r.approval_owner), nullable(r.approved_at),
    nullable(r.approved_until), lit(r.notes), jb(s.input_schema), jb(s.safety ?? {}),
    lit(r.resource_disclosure || "C"), lit(r.resource_disclosure_source),
  ].join(", ") + ")";
});

// profiles
const pScalar = ["slug", "version_slug", "kind", "provider", "endpoint", "region", "credential_policy", "lanes",
  "health_status", "adapter_tested_at", "approval_status", "approval_owner", "approved_at", "approved_until", "enabled", "notes",
  "compute_provider", "image_version", "model_checksum"];
const pCols = ["slug", "model_version_id", "kind", "provider", "endpoint", "region", "credential_policy", "lanes",
  "health_status", "adapter_tested_at", "approval_status", "approval_owner", "approved_at", "approved_until", "enabled", "notes",
  "cost_model", "retention", "quota", "safety_pipeline_version",
  "compute_provider", "image_version", "model_checksum", "energy_profile", "resource_model", "adapter"];
const profiles = csv("deployment_profiles.csv").map(r => {
  need(r, pScalar, "deployment_profiles.csv");
  const p = json("profiles", r.slug);
  if (!p.cost_model) throw new Error(`profiles/${r.slug}.json needs cost_model`);
  return "  (" + [
    lit(r.slug), `(select id from public.model_versions where slug = ${lit(r.version_slug)})`, lit(r.kind), lit(r.provider),
    lit(r.endpoint), lit(r.region), lit(r.credential_policy), laneArr(r.lanes), lit(r.health_status),
    nullable(r.adapter_tested_at), lit(r.approval_status), nullable(r.approval_owner), nullable(r.approved_at),
    nullable(r.approved_until), bool(r.enabled), lit(r.notes), jb(p.cost_model), jb(p.retention ?? {}), jb(p.quota ?? {}),
    `(select safety_pipeline_version from public.model_versions where slug = ${lit(r.version_slug)})`,
    lit(r.compute_provider), nullable(r.image_version), nullable(r.model_checksum),
    jb(p.energy_profile ?? {}), jb(p.resource_model ?? {}), jb(p.adapter ?? {}),
  ].join(", ") + ")";
});

const sql = `-- GENERATED by scripts/build-models-seed.mjs from models.csv, model_versions.csv, deployment_profiles.csv,
-- schemas/*.json and profiles/*.json. Do not edit. Re-running is safe unless a job already references a
-- version/profile whose non-operational fields changed (eduai.registry_guard) — that needs a new slug.
${upsert("models", mCols, models)}
${upsert("model_versions", vCols, versions)}
${upsert("deployment_profiles", pCols, profiles)}`;

if (process.argv.includes("--check")) {
  const cur = existsSync(outPath) ? readFileSync(outPath, "utf8") : "";
  if (cur !== sql) { console.error("models.sql is stale. Run: pnpm seed:build"); process.exit(1); }
  console.log("models seed: in sync");
} else {
  writeFileSync(outPath, sql);
  console.log(`wrote ${outPath} (${models.length} families, ${versions.length} versions, ${profiles.length} profiles)`);
}
