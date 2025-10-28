// Small helpers for safe URL path construction across the app

// Normalize a base path to:
// - use forward slashes
// - start with exactly one leading slash
// - have no trailing slash (except root)
// - collapse any doubled slashes
export function normalizeBasePath(path: string): string {
  if (!path) return '/';
  let p = path.trim().replace(/\\/g, '/');
  if (!p.startsWith('/')) p = '/' + p;
  // collapse multiple slashes
  p = p.replace(/\/+/g, '/');
  // remove trailing slash if not root
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

// Join path parts ensuring exactly one slash between segments.
export function joinUrl(base: string, ...parts: Array<string | undefined | null>): string {
  let out = normalizeBasePath(base || '/');
  for (const part of parts) {
    if (!part) continue;
    const seg = String(part).replace(/^\/+|\/+$/g, '');
    if (!seg) continue;
    out += '/' + seg;
  }
  // final collapse of accidental doubles
  out = out.replace(/\/+/g, '/');
  return out;
}
