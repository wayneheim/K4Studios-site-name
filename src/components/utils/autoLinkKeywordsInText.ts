// src/utils/autoLinkKeywordsInText.ts

import { semantic as defaultSemantic } from '@data/semantic/K4-Sem.ts';
import {
  galleryDataMap,
  sectionGalleries,
  allImages
} from '@data/galleryMaps/MasterGalleryData.mjs';

const CANONICAL_LINK_MAP: Record<string, string> = {
  'authentic cowboy life': '/authentic-cowboy-life',
  'artistic western photography': '/Blog/what-is-artistic-western-photography',
  'cowboy fine art photography': '/Cowboy-Fine-Art-Photography',
  'fine art photography': '/Galleries/Fine-Art-Photography',
  'historical themed western photography': '/Blog/what-is-historical-western-photography',
  'historical cowboy life': '/authentic-cowboy-life',
  'historical western art': '/Historical-Western-Art',
  'historical western photography': '/Blog/what-is-historical-western-photography',
  'narrative western art': '/Narrative-Western-Art',
  'one image movie': '/Other/One-Image-Movie',
  'one image movies': '/Other/One-Image-Movie',
  'one-image movie': '/Other/One-Image-Movie',
  'one-image movies': '/Other/One-Image-Movie',
  'one-image movie™': '/Other/One-Image-Movie',
  'one-image movies™': '/Other/One-Image-Movie',
  'painterly fine art photography': '/Galleries/Painterly-Fine-Art-Photography',
  'painterly photography': '/Blog/what-is-painterly-photography',
  'reality behind the cowboy myth': '/authentic-cowboy-life',
  'western art': '/Blog/what-is-western-art',
  'black and white western photography': '/Western-Black-and-White-Photography',
  'wild west': '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West',
  'wild west photography': '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West',
  'western narratives': '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives',
  'narrative western photography': '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives',
  'western storytelling photography': '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives',
  'native americans': '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans',
  'native american portraits': '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans',
  'native american fine art photography': '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans',
  'indigenous portrait photography': '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans',
  'western art photography': '/western-art-photography',
  'western photography art': '/Western-Photography-Art',
  'western photos': '/western-photos',
  'western artwork': '/western-artwork',
  'historical fine art photography collection': '/historical-fine-art-photography-collection',
  'western black and white photography': '/Western-Black-and-White-Photography',
  'western cowboy art': '/Blog/what-is-western-cowboy-art',
  'western cowboy photography': '/Western-Cowboy-Photography',
  'western cowboy portraits': '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits',
  'western frontier art': '/Western-Frontier-Art',
  'western fine art': '/Blog/what-is-western-fine-art'
};

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
}

// Helper: check if image is from Archive (should not be used for auto-linking)
function isArchiveImage(img: { galleries?: string[] }): boolean {
  return (img.galleries || []).some(g => g.startsWith('Other/Archive') || g.startsWith('/Other/Archive'));
}

// Normalize only dash variants to a single en-dash character without touching spaces/case
function normalizeDashesOnly(str: string): string {
  return str.replace(/[\u2013\u2014\u2012\u2011\u2010\-]/g, '–');
}

// Build a regex snippet for a phrase that is:
// - dash-agnostic: any dash variant matches
// - space-agnostic around dashes and general whitespace collapsed
function buildPhrasePattern(phrase: string): string {
  // Temporarily mark dash positions so we can escape around them
  const DASH_TOKEN = '__DASH__';
  let marked = phrase.replace(/[\u2013\u2014\u2012\u2011\u2010\-]/g, DASH_TOKEN);
  // Escape everything else safely
  let esc = escapeRegex(marked);
  // Collapse normal spaces in phrase to \s+
  esc = esc.replace(/\s+/g, '\\s+');
  // Replace dash tokens with flexible dash with optional surrounding spaces
  esc = esc.replace(new RegExp(DASH_TOKEN, 'g'), '\\s*[\\u2010-\\u2014\-]\\s*');
  return esc;
}

function getSectionForKW(
  kwLower: string,
  semantic: typeof defaultSemantic
): { section: any; type: 'landing' | 'image' | 'universal' } | null {
  const normKW = normalizeKW(kwLower);
  let bestMatch: { section: any; type: 'landing' | 'image' | 'universal'; rating: number } | null = null;

  // Prefer the strongest section-specific match instead of the first object-order hit.
  for (const key of Object.keys(semantic)) {
    if (key === 'synonymMap' || key === 'universal') continue;
    const sec = (semantic as any)[key];

    const landingMatch = sec.landingPhrases?.find(
      (p: any) => p.use && normalizeKW(p.phrase) === normKW
    );
    if (landingMatch) {
      const candidate = {
        section: sec,
        type: 'landing' as const,
        rating: Number(landingMatch.rating || 0),
      };
      if (!bestMatch || candidate.rating > bestMatch.rating || (candidate.rating === bestMatch.rating && bestMatch.type !== 'landing')) {
        bestMatch = candidate;
      }
    }

    const imageMatch = sec.imagePhrases?.find(
      (p: any) => p.use && normalizeKW(p.phrase) === normKW
    );
    if (imageMatch) {
      const candidate = {
        section: sec,
        type: 'image' as const,
        rating: Number(imageMatch.rating || 0),
      };
      if (!bestMatch || candidate.rating > bestMatch.rating) {
        bestMatch = candidate;
      }
    }
  }

  if (bestMatch) {
    return { section: bestMatch.section, type: bestMatch.type };
  }

  // Universal is only a fallback when no stronger section-specific match exists.
  if (
    semantic.universal?.imagePhrases?.some(
      p => p.use && normalizeKW(p.phrase) === normKW
    )
  ) {
    return { section: semantic.universal, type: 'universal' };
  }
  return null;
}

function resolveSynonym(
  kwLower: string,
  semantic: typeof defaultSemantic
): string | null {
  const map = semantic.synonymMap || {};
  for (const [main, syns] of Object.entries(map)) {
    if ((syns as string[]).map(s => s.toLowerCase()).includes(kwLower)) {
      return main.toLowerCase();
    }
  }
  return null;
}

function getAllActivePhrases(semantic: typeof defaultSemantic): string[] {
  let phrases: string[] = [];
  for (const key of Object.keys(semantic)) {
    if (key === 'synonymMap') continue;
    const sec = (semantic as any)[key];
    if (sec.landingPhrases) {
      phrases.push(
        ...sec.landingPhrases.filter((p: any) => p.use).map((p: any) => p.phrase)
      );
    }
    if (sec.imagePhrases) {
      phrases.push(
        ...sec.imagePhrases.filter((p: any) => p.use).map((p: any) => p.phrase)
      );
    }
  }
  if (semantic.synonymMap) {
    for (const syns of Object.values(semantic.synonymMap)) {
      phrases.push(...(syns as string[]));
    }
  }
  return phrases;
}

// New helper: find all sections that list this kwLower as an imagePhrase
function normalizeKW(kw: string): string {
  // Normalize dashes and trim whitespace
  return kw
    .replace(/[\u2013\u2014\u2012\u2011\u2010\-]/g, '–') // convert all dashes/hyphens to en-dash
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizePath(path: string): string {
  return String(path || '').replace(/\/+$/, '').toLowerCase();
}

function getPhraseLinkForKW(
  kwLower: string,
  semantic: typeof defaultSemantic
): string | null {
  const normKW = normalizeKW(kwLower);
  let bestLink: { link: string; rating: number } | null = null;

  for (const key of Object.keys(semantic)) {
    if (key === 'synonymMap') continue;
    const sec = (semantic as any)[key];
    for (const bucket of ['landingPhrases', 'imagePhrases']) {
      const phrases = sec?.[bucket] || [];
      const found = phrases.find(
        (p: any) => p?.use && p?.link && normalizeKW(p.phrase) === normKW
      );
      if (found?.link) {
        const candidate = { link: found.link, rating: Number(found.rating || 0) };
        if (!bestLink || candidate.rating > bestLink.rating) {
          bestLink = candidate;
        }
      }
    }
  }
  return bestLink?.link || null;
}

function getAllImageSectionsForKW(
  kwLower: string,
  semantic: typeof defaultSemantic
): string[] {
  const normKW = normalizeKW(kwLower);
  const sections: string[] = [];
  for (const key of Object.keys(semantic)) {
    if (key === 'synonymMap' || key === 'universal') continue;
    const sec = (semantic as any)[key];
    if (
      sec.imagePhrases?.some((p: any) => p.use && normalizeKW(p.phrase) === normKW)
    ) {
      // Add both with and without leading slash for robustness
      if (sec.path.startsWith('/')) {
        sections.push(sec.path);
        sections.push(sec.path.slice(1));
      } else {
        sections.push(sec.path);
        sections.push('/' + sec.path);
      }
    }
    // For By-Location branches, only add /Gallery variant if this section matches the image phrase
    if (
      /\/By-Location\//.test(sec.path) &&
      sec.imagePhrases?.some((p: any) => p.use && normalizeKW(p.phrase) === normKW)
    ) {
      let base = sec.path;
      if (/\/Gallery$/.test(base)) {
        base = base.replace(/\/Gallery$/, '');
      }
      const withGallery = base.endsWith('/') ? base + 'Gallery' : base + '/Gallery';
      if (withGallery.startsWith('/')) {
        sections.push(withGallery);
        sections.push(withGallery.slice(1));
      } else {
        sections.push(withGallery);
        sections.push('/' + withGallery);
      }
    }
  }
  if (
    semantic.universal?.imagePhrases?.some(
      (p: any) => p.use && normalizeKW(p.phrase) === normKW
    )
  ) {
    sections.push(semantic.universal.path);
  }
  return sections;
}

function hashToIndex(seed: string, length: number): number {
  if (length <= 0) return 0;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % length;
}

function pickDeterministic<T>(items: T[], seed: string): T | undefined {
  if (!items.length) return undefined;
  return items[hashToIndex(seed, items.length)];
}

export function autoLinkKeywordsInText(
  html: string,
  _galleryDatas: any[],
  featheredImages: { id: string }[],
  _galleryPaths: string[],
  semantic = defaultSemantic,
  pagePath = ''
): string {
  if (!html) return html;
  
  // Normalize pagePath for comparison
  const currentPath = normalizePath(pagePath || '');

  const exclude = new Set(featheredImages.map(i => i.id));

  // 1) manual overrides
  const overrides: Record<string, string> = {
    'medical illustration': 'https://heimmedicalart.com',
    'medical illustrator': 'https://heimmedicalart.com',
  };
  Object.keys(overrides)
    .sort((a, b) => b.length - a.length)
    .forEach(phrase => {
      const re = new RegExp(`\\b${escapeRegex(phrase)}\\b`, 'gi');
      html = html.replace(
        re,
        match => `<a href="${overrides[phrase]}" class="kw-link">${match}</a>`
      );
    });

  // 2) build regex of all phrases
  const allKWsRaw = [
    ...getAllActivePhrases(semantic),
    ...Object.keys(overrides),
  ].sort((a, b) => b.length - a.length);
  // Build robust patterns per phrase
  const patterns = allKWsRaw.map(buildPhrasePattern);
  const kwRe = new RegExp(`\\b(${patterns.join('|')})\\b`, 'gi');

  // 3) collect matches
  const matches: { index: number; matchLen: number; matchText: string }[] = [];
  const searchText = normalizeDashesOnly(html);
  let m: RegExpExecArray | null;
  while ((m = kwRe.exec(searchText))) {
    const matchLen = m[0].length;
    const matchText = html.substr(m.index, matchLen);
    matches.push({ index: m.index, matchLen, matchText });
  }
  matches.reverse();

  let output = html;
  const linked = new Set<string>();


  // Helper to determine if a given index is currently inside an <a>...</a> range
  function isInsideAnchor(str: string, pos: number): boolean {
    const lastOpenBefore = str.lastIndexOf('<a', pos);
    if (lastOpenBefore === -1) return false;
    const lastCloseBefore = str.lastIndexOf('</a>', pos);
    // If the most recent <a is after the most recent </a> before pos, we're inside a link
    return lastOpenBefore > lastCloseBefore;
  }

  for (const { index, matchLen, matchText } of matches) {
    const lc = normalizeKW(matchText); // normalized lower for matching and uniqueness
    const displayText = output.substr(index, matchLen); // preserve original dashes/casing
    if (linked.has(lc)) continue;

  // Skip if match position is inside an existing anchor
  if (isInsideAnchor(output, index)) continue;

    let href: string | undefined;
    let fallbackImagePath: string | undefined;
    let skipLinking = false;  // Flag for same-page with no fallback

    // a) overrides
    if (overrides[matchText] || overrides[lc]) {
      href = overrides[matchText] || overrides[lc];
    }

    // a.1) canonical SEO routing for priority phrases
    if (!href && CANONICAL_LINK_MAP[lc]) {
      const canonicalTarget = CANONICAL_LINK_MAP[lc];
      if (normalizePath(canonicalTarget) !== currentPath) {
        href = canonicalTarget;
      }
    }

    // a.2) explicit semantic phrase-level link override
    if (!href) {
      const phraseLink = getPhraseLinkForKW(lc, semantic);
      if (phraseLink && normalizePath(phraseLink) !== currentPath) {
        href = phraseLink;
      }
    }

    // b) semantic landing — but if it points to the CURRENT page, use fallbackImagePath for image linking
    if (!href) {
      const res = getSectionForKW(lc, semantic);
      if (res && res.type === 'landing') {
        const targetPath = res.section.path;
        // Skip if no path defined (glossary-only entries)
        if (!targetPath) {
          skipLinking = true;
        } else {
          // Normalize target path for comparison
          const normTarget = normalizePath(targetPath);
          
          // If linking to same page, use fallbackImagePath if defined
          if (normTarget === currentPath) {
            if (res.section.fallbackImagePath) {
              // Store the fallback path to use in step (c)
              fallbackImagePath = res.section.fallbackImagePath;
            } else {
              // No fallback defined - skip linking entirely (render plain text)
              skipLinking = true;
            }
          } else {
            href = targetPath;
          }
        }
      }
    }

    // If same-page with no fallback, skip this match entirely
    if (skipLinking) continue;

    // c) semantic image (multi-section) OR fallback from same-page landing
    if (!href) {
      // First try: use fallbackImagePath if we're on the same page as a landing phrase
      let imgSecs: string[] = [];
      if (fallbackImagePath) {
        imgSecs = [fallbackImagePath];
      } else {
        imgSecs = getAllImageSectionsForKW(lc, semantic);
      }
      
      if (imgSecs.length) {
        let poolEntries: { img: any; galleryKey: string }[] = [];

        imgSecs.forEach(sec => {
          const kids = sectionGalleries[sec] || [];
          if (kids.length) {
            poolEntries.push(
              ...kids.flatMap(key =>
                (galleryDataMap[key] || []).map(img => ({ img, galleryKey: key }))
              )
            );
            return;
          }

          // No children: pull images directly from galleryDataMap if present
          const alt1 = sec.startsWith('/') ? sec.slice(1) : '/' + sec;
          const direct = galleryDataMap[sec] || galleryDataMap[alt1] || [];
          if (direct.length) {
            poolEntries.push(...direct.map(img => ({ img, galleryKey: sec })));
            return;
          }

          // Fallback: scan allImages by gallery membership first, then by src path include
          // Exclude Archive images - they should only appear in Archive gallery
          const byGallery = allImages.filter(img => 
            !isArchiveImage(img) && 
            (img.galleries || []).some(g => g === sec || g === alt1)
          );
          if (byGallery.length) {
            poolEntries.push(...byGallery.map(img => ({ img, galleryKey: sec })));
            return;
          }

          const matchPath = sec + '/';
          poolEntries.push(
            ...allImages
              .filter(img => !isArchiveImage(img) && img.src.includes(matchPath))
              .map(img => ({ img, galleryKey: img.galleries?.[0] || sec }))
          );
        });

        const filtered = poolEntries.filter(e => !exclude.has(e.img.id));
        if (filtered.length) poolEntries = filtered;

        if (poolEntries.length) {
          const pick = pickDeterministic(poolEntries, `${currentPath}|${lc}|image`);
          if (!pick) continue;
          const base = pick.galleryKey.startsWith('/')
            ? pick.galleryKey
            : '/' + pick.galleryKey;
          href = `${base}/${pick.img.id}`;
        }
      }
    }

    // d) universal
    if (!href) {
      const res = getSectionForKW(lc, semantic);
      if (res && res.type === 'universal') {
        // Exclude Archive images from universal pool
        let pool = allImages.filter(img => !exclude.has(img.id) && !isArchiveImage(img));
        if (!pool.length) pool = allImages.filter(img => !isArchiveImage(img));
        const pick = pickDeterministic(pool, `${currentPath}|${lc}|universal`);
        if (!pick) continue;
        const secRaw = String(pick.galleries?.[0] || '').replace(/^\/+/, '');
        href = secRaw ? `/${secRaw}/${pick.id}` : `/Galleries/${pick.id}`;
      }
    }

    // e) synonym fallback as image (same multi-section logic)
    if (!href) {
      const syn = resolveSynonym(lc, semantic);
      if (syn) {
        // try landing
        const res2 = getSectionForKW(syn, semantic);
        if (res2 && res2.type === 'landing' && res2.section.path) {
          href = res2.section.path;
        }

        // try image
        if (!href) {
          const imgSecs2 = getAllImageSectionsForKW(syn, semantic);
          if (imgSecs2.length) {
            let poolEntries2: { img: any; galleryKey: string }[] = [];
            imgSecs2.forEach(sec => {
              const kids = sectionGalleries[sec] || [];
              if (kids.length) {
                poolEntries2.push(
                  ...kids.flatMap(key =>
                    (galleryDataMap[key] || []).map(img => ({ img, galleryKey: key }))
                  )
                );
                return;
              }

              const alt1 = sec.startsWith('/') ? sec.slice(1) : '/' + sec;
              const direct = galleryDataMap[sec] || galleryDataMap[alt1] || [];
              if (direct.length) {
                poolEntries2.push(...direct.map(img => ({ img, galleryKey: sec })));
                return;
              }

              const byGallery = allImages.filter(img => 
                !isArchiveImage(img) && 
                (img.galleries || []).some(g => g === sec || g === alt1)
              );
              if (byGallery.length) {
                poolEntries2.push(...byGallery.map(img => ({ img, galleryKey: sec })));
                return;
              }

              const matchPath = sec + '/';
              poolEntries2.push(
                ...allImages
                  .filter(img => !isArchiveImage(img) && img.src.includes(matchPath))
                  .map(img => ({ img, galleryKey: img.galleries?.[0] || sec }))
              );
            });
            const filtered2 = poolEntries2.filter(e => !exclude.has(e.img.id));
            if (filtered2.length) poolEntries2 = filtered2;
            if (poolEntries2.length) {
              const pick2 = pickDeterministic(poolEntries2, `${currentPath}|${lc}|${syn}|syn`);
              if (!pick2) continue;
              const base2 = pick2.galleryKey.startsWith('/')
                ? pick2.galleryKey
                : '/' + pick2.galleryKey;
              href = `${base2}/${pick2.img.id}`;
            }
          }
        }
      }
    }

    if (!href) continue;

    output =
      output.slice(0, index) +
      `<a href="${href}" class="kw-link">${displayText}</a>` +
      output.slice(index + matchLen);

    linked.add(lc);
  }

  return output;
}
