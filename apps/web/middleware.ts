import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

// Refreshes the Supabase session cookie on every request and gates the three shells.
// Org resolution (which org the user is acting in) comes with the shells in P1-05.
const PROTECTED = [/^\/p(\/|$)/, /^\/c(\/|$)/, /^\/org(\/|$)/, /^\/home(\/|$)/, /^\/account(\/|$)/, /^\/welcome$/];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  // getUser() validates the JWT with Supabase; getSession() would trust the cookie blindly.
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname, search } = request.nextUrl;

  if (!user && PROTECTED.some((re) => re.test(pathname))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  // Readable links (migration 0135): /c/autumn-2026 and /p/last-call. A slug is rewritten to the ID the
  // pages are written against (the address bar keeps the slug); an ID link is redirected to its slug.
  // Lookups run as the user, so RLS still decides what exists for them.
  const m = pathname.match(/^\/(c|p)\/([^/]+)(\/.*)?$/);
  if (user && m) {
    const [, kind, seg, rest = ""] = m;
    const table = kind === "c" ? "cohorts" : "projects";
    if (UUID.test(seg)) {
      if (request.method === "GET") {
        const slug = await lookup(supabase, table, "id", seg);
        if (slug) {
          const url = request.nextUrl.clone();
          url.pathname = `/${kind}/${slug}${rest}`;
          return withCookies(NextResponse.redirect(url, 308), response);
        }
      }
    } else {
      const id = await lookup(supabase, table, "slug", seg);
      if (id) {
        const url = request.nextUrl.clone();
        url.pathname = `/${kind}/${id}${rest}`;
        return withCookies(NextResponse.rewrite(url, { request }), response);
      }
    }
  }
  return response;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// slug ↔ id, cached briefly per worker (names rarely change; a stale entry only costs a redirect).
const cache = new Map<string, { v: string; at: number }>();
async function lookup(supabase: ReturnType<typeof createServerClient>, table: "cohorts" | "projects", by: "id" | "slug", value: string) {
  const key = `${table}:${by}:${value}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.v;
  const { data } = await supabase.from(table).select("id, slug").eq(by, value).limit(1).maybeSingle();
  if (!data) return null;
  const v = by === "id" ? data.slug : data.id;
  cache.set(key, { v, at: Date.now() });
  return v;
}

// Keep any refreshed session cookies on a redirect or rewrite.
function withCookies(res: NextResponse, from: NextResponse) {
  for (const c of from.cookies.getAll()) res.cookies.set(c);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
