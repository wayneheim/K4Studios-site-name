import { sitemapMatches } from '@/data/sitemapMatches';

export type SisterLink = {
  url: string;   // absolute
  path: string;  // pathname only (for internal links)
  label: string;
};

function normalizePath(p: string): string {
  try {
    // ensure no trailing slash except root
    const path = p.replace(/\/+$/, '');
    return path.length ? path : '/';
  } catch {
    return p || '/';
  }
}

function lastSeg(pathname: string): string {
  const segs = pathname.split('/').filter(Boolean);
  return (segs[segs.length - 1] || '').toLowerCase();
}

function variantLabel(from: string, to: string): string | null {
  const a = lastSeg(from);
  const b = lastSeg(to);
  const isColor = (s: string) => ['color', 'colour'].includes(s);
  const isBW = (s: string) => ['black-white', 'black-and-white', 'bw', 'blackwhite'].includes(s);
  if (isColor(a) && isBW(b)) return 'See this gallery in Black & White';
  if (isBW(a) && isColor(b)) return 'See this gallery in Color';
  return null;
}

export function getSisterLink(currentPathname: string): SisterLink | null {
  const cur = normalizePath(currentPathname);
  // Try to find a match that includes this path (compare by pathname)
  const match = sitemapMatches.find((m) => {
    try {
      const aPath = new URL(m.a).pathname.replace(/\/+$/, '');
      const bPath = new URL(m.b).pathname.replace(/\/+$/, '');
      return aPath === cur || bPath === cur;
    } catch {
      return false;
    }
  });
  if (!match) return null;
  let sisterAbs: string;
  try {
    const aPath = new URL(match.a).pathname.replace(/\/+$/, '');
    const bPath = new URL(match.b).pathname.replace(/\/+$/, '');
    sisterAbs = aPath === cur ? match.b : match.a;
  } catch {
    return null;
  }

  let sisterPath = '/';
  try {
    sisterPath = new URL(sisterAbs).pathname;
  } catch {
    // fallback to absolute if parsing fails
    sisterPath = sisterAbs;
  }

  // Prefer variant label if applicable; fallback generic
  const curLabel = variantLabel(cur, sisterPath) || 'Explore the sister page';
  return { url: sisterAbs, path: sisterPath, label: curLabel };
}
