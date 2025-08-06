// src/utils/autoLinkKeywordsInText.ts

import { semantic as defaultSemantic } from '@data/semantic/K4-Sem.ts';
import {
  galleryDataMap,
  sectionGalleries,
  allImages
} from '@data/galleryMaps/MasterGalleryData.ts';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
}

function getSectionForKW(
  kwLower: string,
  semantic: typeof defaultSemantic
): { section: any; type: 'landing' | 'image' | 'universal' } | null {
  if (
    semantic.universal?.landingPhrases?.some(
      p => p.use && p.phrase.toLowerCase() === kwLower
    )
  ) {
    return { section: semantic.universal, type: 'landing' };
  }
  for (const key of Object.keys(semantic)) {
    if (key === 'synonymMap' || key === 'universal') continue;
    const sec = (semantic as any)[key];
    if (
      sec.landingPhrases?.some((p: any) => p.use && p.phrase.toLowerCase() === kwLower)
    ) {
      return { section: sec, type: 'landing' };
    }
    if (
      sec.imagePhrases?.some((p: any) => p.use && p.phrase.toLowerCase() === kwLower)
    ) {
      return { section: sec, type: 'image' };
    }
  }
  if (
    semantic.universal?.imagePhrases?.some(
      p => p.use && p.phrase.toLowerCase() === kwLower
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
function getAllImageSectionsForKW(
  kwLower: string,
  semantic: typeof defaultSemantic
): string[] {
  const sections: string[] = [];
  for (const key of Object.keys(semantic)) {
    if (key === 'synonymMap' || key === 'universal') continue;
    const sec = (semantic as any)[key];
    if (
      sec.imagePhrases?.some((p: any) => p.use && p.phrase.toLowerCase() === kwLower)
    ) {
      sections.push(sec.path);
    }
  }
  if (
    semantic.universal?.imagePhrases?.some(
      (p: any) => p.use && p.phrase.toLowerCase() === kwLower
    )
  ) {
    sections.push(semantic.universal.path);
  }
  return sections;
}

export function autoLinkKeywordsInText(
  html: string,
  _galleryDatas: any[],
  featheredImages: { id: string }[],
  _galleryPaths: string[],
  semantic = defaultSemantic,
  sectionPath = '/index'
): string {
  if (!html) return html;

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
  const allKWs = [
    ...getAllActivePhrases(semantic),
    ...Object.keys(overrides),
  ].sort((a, b) => b.length - a.length);
  const kwRe = new RegExp(`\\b(${allKWs.map(escapeRegex).join('|')})\\b`, 'gi');

  // 3) collect matches
  const matches: { index: number; kw: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = kwRe.exec(html))) {
    matches.push({ index: m.index, kw: m[1] });
  }
  matches.reverse();

  let output = html;
  const linked = new Set<string>();

  for (const { index, kw } of matches) {
    const lc = kw.toLowerCase();
    if (linked.has(lc)) continue;

    const before = output.lastIndexOf('<a', index);
    const after = output.indexOf('</a>', index);
    if (before !== -1 && after > before) continue;

    let href: string | undefined;

    // a) overrides
    if (overrides[kw] || overrides[lc]) {
      href = overrides[kw] || overrides[lc];
    }

    // b) semantic landing
    if (!href) {
      const res = getSectionForKW(lc, semantic);
      if (res && res.type === 'landing') {
        href = res.section.path;
      }
    }

    // c) semantic image (multi-section)
    if (!href) {
      const imgSecs = getAllImageSectionsForKW(lc, semantic);
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
          } else {
            const matchPath = sec + '/';
            poolEntries.push(
              ...allImages
                .filter(img => img.src.includes(matchPath))
                .map(img => ({ img, galleryKey: img.galleries?.[0] || sec }))
            );
          }
        });

        const filtered = poolEntries.filter(e => !exclude.has(e.img.id));
        if (filtered.length) poolEntries = filtered;

        if (poolEntries.length) {
          const pick = poolEntries[Math.floor(Math.random() * poolEntries.length)];
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
        let pool = allImages.filter(img => !exclude.has(img.id));
        if (!pool.length) pool = allImages;
        const pick = pool[Math.floor(Math.random() * pool.length)];
        const sec = pick.galleries?.[0] || sectionPath.replace(/^\//, '');
        href = `/${sec}/${pick.id}`;
      }
    }

    // e) synonym fallback as image (same multi-section logic)
    if (!href) {
      const syn = resolveSynonym(lc, semantic);
      if (syn) {
        // try landing
        const res2 = getSectionForKW(syn, semantic);
        if (res2 && res2.type === 'landing') {
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
              } else {
                const matchPath = sec + '/';
                poolEntries2.push(
                  ...allImages
                    .filter(img => img.src.includes(matchPath))
                    .map(img => ({ img, galleryKey: img.galleries?.[0] || sec }))
                );
              }
            });
            const filtered2 = poolEntries2.filter(e => !exclude.has(e.img.id));
            if (filtered2.length) poolEntries2 = filtered2;
            if (poolEntries2.length) {
              const pick2 = poolEntries2[Math.floor(Math.random() * poolEntries2.length)];
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
      `<a href="${href}" class="kw-link">${kw}</a>` +
      output.slice(index + kw.length);

    linked.add(lc);
  }

  return output;
}
