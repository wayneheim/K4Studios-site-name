// src/utils/autoLinkKeywordsInText.ts

import { semantic as defaultSemantic } from "../../data/semantic/K4-Sem.ts";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ensureImageId(id: string): string {
  if (!id) return id;
  return id.startsWith("i-") ? id : `i-${id}`;
}

function normalizePath(p?: string): string {
  if (!p) return "";
  // Lowercase, remove trailing slash
  return p.toLowerCase().replace(/\/+$/, "");
}

function pathStartsWith(child: string, parent: string): boolean {
  const c = normalizePath(child);
  const p = normalizePath(parent);
  if (!c || !p) return false;
  // exact or descendant (e.g., /a/b/c startsWith /a/b)
  return c === p || c.startsWith(p + "/");
}

function getRoundRobinImagePool(galleryDatas: any[], galleryPaths: string[]) {
  if (!Array.isArray(galleryDatas) || galleryDatas.length === 0) return [];
  const pools = galleryDatas.map((arr, i) => {
    let images = (arr || []).filter((img: any) => img && img.id !== "i-k4studios");
    // Light trim to keep pool small and stable
    if (images.length > 30) images = images.sort(() => Math.random() - 0.5).slice(0, 30);
    if (images.length > 20) images = images.sort(() => Math.random() - 0.5).slice(0, 20);
    const galleryPath = galleryPaths?.[i] || "";
    return images.map((img: any) => ({ img, galleryPath }));
  });

  const roundRobin: Array<{ img: any; galleryPath: string }> = [];
  let idx = 0;
  let added: boolean;
  do {
    added = false;
    for (let p = 0; p < pools.length; p++) {
      if (pools[p][idx]) {
        roundRobin.push(pools[p][idx]);
        added = true;
      }
    }
    idx++;
  } while (added);
  return roundRobin;
}

function getSectionForKW(
  kwLower: string,
  semantic: typeof defaultSemantic
): { section: any; type: "landing" | "image" | "universal" } | null {
  // Named sections (skip synonymMap and universal for direct scan)
  for (const sectionName of Object.keys(semantic)) {
    if (sectionName === "synonymMap" || sectionName === "universal") continue;
    const section = (semantic as any)[sectionName];
    if (
      (section?.landingPhrases || []).some(
        (p: any) => p?.use && typeof p.phrase === "string" && p.phrase.toLowerCase() === kwLower
      )
    ) {
      return { section, type: "landing" };
    }
    if (
      (section?.imagePhrases || []).some(
        (p: any) => p?.use && typeof p.phrase === "string" && p.phrase.toLowerCase() === kwLower
      )
    ) {
      return { section, type: "image" };
    }
  }
  // Universal (image) pool
  if (
    (semantic.universal?.imagePhrases || []).some(
      (p: any) => p?.use && typeof p.phrase === "string" && p.phrase.toLowerCase() === kwLower
    )
  ) {
    return { section: semantic.universal, type: "universal" };
  }
  return null;
}

function resolveSynonym(kwLower: string, semantic: typeof defaultSemantic): string | null {
  const synMap = (semantic as any)?.synonymMap || {};
  for (const [mainKW, syns] of Object.entries(synMap)) {
    if (Array.isArray(syns) && syns.map((s) => String(s).toLowerCase()).includes(kwLower)) {
      return String(mainKW).toLowerCase();
    }
  }
  return null;
}

function getAllActivePhrases(semantic: typeof defaultSemantic): string[] {
  let all: string[] = [];
  for (const key of Object.keys(semantic)) {
    if (key === "synonymMap") continue;
    const section = (semantic as any)[key];
    if (Array.isArray(section?.landingPhrases)) {
      all.push(...section.landingPhrases.filter((p: any) => p?.use).map((p: any) => String(p.phrase)));
    }
    if (Array.isArray(section?.imagePhrases)) {
      all.push(...section.imagePhrases.filter((p: any) => p?.use).map((p: any) => String(p.phrase)));
    }
  }
  // Also include synonyms as linkable text (they resolve to their canonical)
  const synMap = (semantic as any)?.synonymMap || {};
  for (const syns of Object.values(synMap)) {
    if (Array.isArray(syns)) all.push(...syns.map(String));
  }
  // Unique, keep longest-first sort later
  return Array.from(new Set(all));
}

function pickImageHrefForSection(
  linkableImages: Array<{ img: any; galleryPath: string }>,
  sectionPath: string
): string | null {
  if (!Array.isArray(linkableImages) || !linkableImages.length) return null;
  const match = linkableImages.find((entry) =>
    pathStartsWith(entry.galleryPath || "", sectionPath || "")
  );
  if (!match) return null;
  const base = match.galleryPath?.replace(/\/+$/, "") || "";
  const id = ensureImageId(match.img?.id);
  if (!base || !id) return null;
  return `${base}/${id}`;
}

export function autoLinkKeywordsInText(
  html: string,
  galleryDatas: any[],
  featheredImages: { id: string }[],
  galleryPaths: string[],
  semantic: typeof defaultSemantic = defaultSemantic,
  sectionPath = "/index"
): string {
  if (!html) return "";
  if (!Array.isArray(galleryDatas) || galleryDatas.length === 0) return html;

  // --- Overrides (first-pass, longest-first)
  const overrides: Record<string, string> = {
    "medical illustration": "https://heimmedicalart.com",
    "medical illustrator": "https://heimmedicalart.com",
  };
  const overridePhrases = Object.keys(overrides).sort((a, b) => b.length - a.length);
  for (const phrase of overridePhrases) {
    const overrideRegex = new RegExp(`\\b${escapeRegex(phrase)}\\b`, "gi");
    html = html.replace(
      overrideRegex,
      (matched) => `<a href="${overrides[phrase]}" class="kw-link">${matched}</a>`
    );
  }

  // --- Build the image pool (exclude already-feathered)
  const featheredIds = new Set((featheredImages || []).map((img) => img?.id));
  let linkableImages = getRoundRobinImagePool(galleryDatas, galleryPaths).filter(
    ({ img }) => img && !featheredIds.has(img.id)
  );

  // --- Build keyword regex (landing + image + synonyms + overrides)
  const allKWs = Array.from(
    new Set([...getAllActivePhrases(semantic), ...Object.keys(overrides)])
  ).sort((a, b) => b.length - a.length);
  if (!allKWs.length) return html;

  const keywordRegex = new RegExp(`\\b(${allKWs.map(escapeRegex).join("|")})\\b`, "gi");

  // Find matches (record original positions, then reverse)
  const matches: { index: number; keyword: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = keywordRegex.exec(html)) !== null) {
    matches.push({ index: m.index, keyword: m[1] });
  }
  matches.reverse();

  let output = html;
  const alreadyLinked = new Set<string>();

  for (const { index, keyword } of matches) {
    const lc = String(keyword).toLowerCase();
    if (alreadyLinked.has(lc)) continue;

    // Skip if we're inside an existing anchor
    const openA = output.lastIndexOf("<a", index);
    const closeA = output.indexOf("</a>", index);
    if (openA !== -1 && closeA !== -1 && openA < index && closeA > index) continue;

    let href: string | null = null;

    // 1) Overrides (again, case-safe)
    if (overrides[keyword] || overrides[lc]) {
      href = overrides[keyword] || overrides[lc];
    }

    // 2) Resolve canonical section/type
    if (!href) {
      let resolved = getSectionForKW(lc, semantic);

      // If not directly found, try synonym → canonical
      if (!resolved) {
        const synTarget = resolveSynonym(lc, semantic);
        if (synTarget) resolved = getSectionForKW(synTarget, semantic);
      }

      if (resolved) {
        const sectionPathExact: string | undefined = resolved.section?.path;

        if (resolved.type === "landing" && sectionPathExact) {
          // Always safe to link landing
          href = sectionPathExact;
        } else if (resolved.type === "image") {
          // Prefer an image link within the same branch
          if (sectionPathExact) {
            href = pickImageHrefForSection(linkableImages, sectionPathExact);
          }
          // If no image match in branch, fall back to landing path (if present)
          if (!href && sectionPathExact) {
            href = sectionPathExact;
          }
        } else if (resolved.type === "universal") {
          // Universal: pick first available image in pool; if none, do nothing
          if (linkableImages.length) {
            const first = linkableImages[0];
            const base = (first.galleryPath || "").replace(/\/+$/, "");
            const id = ensureImageId(first.img?.id);
            if (base && id) href = `${base}/${id}`;
          }
        }
      }
    }

    // 3) If we still have no href, skip linking (safer than forcing nonsense)
    if (!href) continue;

    // Insert link
    output =
      output.slice(0, index) +
      `<a href="${href}" class="kw-link">${keyword}</a>` +
      output.slice(index + keyword.length);

    alreadyLinked.add(lc);
  }

  return output;
}
