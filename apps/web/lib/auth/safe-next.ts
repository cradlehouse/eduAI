// Only ever redirect to a path on this site. Anything else (absolute URLs, protocol-relative)
// collapses to "/", which closes the open-redirect hole in `?next=`.
export function safeNext(next: string | null | undefined): string {
  if (!next) return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/";
  return next;
}
