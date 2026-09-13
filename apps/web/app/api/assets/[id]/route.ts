import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Serve an asset the caller may see (RLS on the assets row decides), streamed from R2 via the binding.
// Honours Range so <video> can seek.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: asset } = await supabase.from("assets").select("r2_key, mime, bytes").eq("id", id).maybeSingle();
  if (!asset) return new NextResponse("Not found", { status: 404 });

  const { env } = getCloudflareContext();
  const base = { "Content-Type": asset.mime, "Cache-Control": "private, max-age=3600", "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff", "Accept-Ranges": "bytes" };
  const range = req.headers.get("range");
  const m = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (m && (m[1] || m[2])) {
    const total = Number(asset.bytes);
    let start = m[1] ? Number(m[1]) : Math.max(0, total - Number(m[2]));
    let end = m[1] && m[2] ? Number(m[2]) : total - 1;
    if (start >= total) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${total}` } });
    end = Math.min(end, total - 1); start = Math.max(0, start);
    const obj = await env.ASSETS_BUCKET.get(asset.r2_key, { range: { offset: start, length: end - start + 1 } });
    if (!obj) return new NextResponse("Missing object", { status: 404 });
    return new Response(obj.body, { status: 206, headers: { ...base, "Content-Range": `bytes ${start}-${end}/${total}`, "Content-Length": String(end - start + 1) } });
  }
  const obj = await env.ASSETS_BUCKET.get(asset.r2_key);
  if (!obj) return new NextResponse("Missing object", { status: 404 });
  return new Response(obj.body, { headers: { ...base, "Content-Length": String(asset.bytes) } });
}
