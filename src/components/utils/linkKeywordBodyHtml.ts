import { autoLinkKeywordsInText } from './autoLinkKeywordsInText.ts';
import { semantic as k4Semantic } from '@/data/semantic/K4-Sem.ts';

const ROTATING_TERMS = new Set([
  'painterly photography',
  'wild west',
  'narrative western art',
  'historically themed photography',
]);

const COWBOY_COLOR_COLLECTION = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color';

type AuthoredInterlinkRule = {
  href: string;
  phrases: string[];
};

// Packet 3: curated editorial relationships placed on phrases that already
// exist in body copy. These anchors are intentionally distinct from kw-link.
const AUTHORED_INTERLINK_RULES: Record<string, AuthoredInterlinkRule[]> = {
  // Essay -> doorway / annex gaps.
  '/blog/what-is-painterly-photography': [
    { href: '/western-painterly-fine-art-photography', phrases: ['Painterly fine art photography'] },
    { href: '/Blog/what-is-cinematic-western-art', phrases: ['cinematic light'] },
  ],
  '/blog/what-is-contemporary-western-art': [
    { href: '/Contemporary-Western-Art', phrases: ['contemporary Western art'] },
    { href: '/Blog/what-is-western-art', phrases: ['Western tradition'] },
  ],
  '/blog/what-is-western-art': [
    { href: '/western-artwork', phrases: ['Western art'] },
    { href: '/Blog/what-is-contemporary-western-art', phrases: ['Contemporary Western art'] },
    { href: '/Blog/decor-art-vs-fine-art', phrases: ['decorative frontier imagery'] },
  ],
  '/blog/what-is-the-wild-west': [
    { href: '/american-wild-west', phrases: ['American West'] },
    { href: '/Blog/wild-west-american-frontier', phrases: ['frontier line'] },
  ],
  '/blog/wild-west-american-frontier': [
    { href: '/american-wild-west', phrases: ['American frontier'] },
    { href: '/Blog/what-is-the-wild-west', phrases: ['Wild West'] },
  ],
  '/blog/narrative-vs-documentary-photography': [
    { href: '/Historical-Western-Art', phrases: ['historical subject matter', 'historical truth'] },
    { href: '/Blog/what-is-narrative-photography', phrases: ['Narrative photography'] },
  ],
  '/blog/what-is-historically-themed-photography': [
    { href: '/Historical-Western-Art', phrases: ['historically themed fine art photography'] },
  ],
  '/blog/decor-art-vs-fine-art': [
    { href: '/Galleries/Painterly-Fine-Art-Photography', phrases: ['fine art photography', 'fine art'] },
  ],
  '/blog/what-is-artistic-western-photography': [
    { href: '/Art-of-the-West', phrases: ['Western fine art tradition'] },
  ],
  '/blog/what-is-cowboy-fine-art-photography': [
    { href: '/Cowboy-Fine-Art-Photography', phrases: ['cowboy fine art photography'] },
  ],

  // Remaining narrative-cluster inbound relationships.
  '/blog/what-is-narrative-photography': [
    { href: '/Blog/what-is-visual-storytelling-in-photography', phrases: ['visual art'] },
    { href: '/Blog/narrative-vs-documentary-photography', phrases: ['documentary photography'] },
  ],
  '/blog/narrative-western-art-vs-traditional': [
    { href: '/Blog/can-photography-be-narrative-western-art', phrases: ['Narrative Western art'] },
  ],
  '/blog/can-photography-be-narrative-western-art': [
    { href: '/Blog/narrative-western-art-vs-traditional', phrases: ['narrative Western art'] },
  ],

  // Doorway / annex -> governing essay.
  '/western-painterly-fine-art-photography': [
    { href: '/Blog/what-is-painterly-photography', phrases: ['painterly photography'] },
  ],
  '/contemporary-western-art': [
    { href: '/Blog/what-is-contemporary-western-art', phrases: ['contemporary Western art'] },
  ],
  '/western-artwork': [
    { href: '/Blog/what-is-western-art', phrases: ['Western artwork', 'Western art'] },
  ],
  '/american-wild-west': [
    { href: '/Blog/what-is-the-wild-west', phrases: ['Wild West'] },
  ],
  '/narrative-western-art': [
    { href: '/Blog/narrative-western-art-vs-traditional', phrases: ['narrative Western art'] },
  ],
  '/historical-western-art': [
    { href: '/Blog/what-is-historically-themed-photography', phrases: ['historically themed photography', 'Historical Western art'] },
  ],
  '/cinematic-western-art': [
    { href: '/Blog/what-is-cinematic-western-art', phrases: ['cinematic Western art'] },
  ],
  '/galleries/painterly-fine-art-photography': [
    { href: '/Blog/decor-art-vs-fine-art', phrases: ['wall decor', 'mass-produced decor'] },
  ],
  '/cowboy-fine-art-photography': [
    { href: '/Blog/what-is-cowboy-fine-art-photography', phrases: ['cowboy fine art photography'] },
  ],

  // De-orphan the print doorway from its nearest siblings.
  '/western-photography-art': [
    { href: '/Western-Photography-Prints', phrases: ['Western photography prints', 'Western fine art prints', 'print presentation'] },
  ],
  '/western-photos': [
    { href: '/Western-Photography-Prints', phrases: ['Western photography prints', 'Western prints', 'fine art prints'] },
  ],
};

const escapePhrase = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function applyAuthoredInterlinks(html: string, pagePath: string): string {
  const rules = AUTHORED_INTERLINK_RULES[String(pagePath || '').replace(/\/+$/, '').toLowerCase()];
  if (!rules?.length) return html;

  let output = html;
  for (const rule of rules) {
    const protectedFragments: string[] = [];
    const protect = (source: string, pattern: RegExp) => source.replace(pattern, (fragment) => {
      const index = protectedFragments.push(fragment) - 1;
      return `\uE200${index}\uE201`;
    });

    let linkable = protect(output, /<(script|style|nav|aside|figure|header|footer|button|form|h[1-6])\b[\s\S]*?<\/\1>/gi);
    linkable = protect(linkable, /<a\b[\s\S]*?<\/a>/gi);
    linkable = protect(linkable, /<[^>]+>/g);

    let linked = false;
    for (const phrase of rule.phrases) {
      const phrasePattern = new RegExp(`\\b${escapePhrase(phrase).replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (!phrasePattern.test(linkable)) continue;
      linkable = linkable.replace(
        phrasePattern,
        (label) => `<a href="${rule.href}" class="editorial-link authored-interlink">${label}</a>`,
      );
      linked = true;
      break;
    }

    output = linkable.replace(/\uE200(\d+)\uE201/g, (_match, index) => protectedFragments[Number(index)] ?? '');
    if (!linked) console.warn(`[authored-interlink] No natural anchor found on ${pagePath} for ${rule.href}`);
  }
  return output;
}

const normalizeLabel = (value: string) => value
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/[\u2010-\u2014-]/g, '-')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

export function linkKeywordBodyHtml(html: string, pagePath: string): string {
  if (!html) return html;

  html = applyAuthoredInterlinks(html, pagePath);

  // Rebuild only the four governed terms. Every other existing kw-link is
  // preserved byte-for-byte, including its established piece exemplar.
  let linkable = html.replace(
    /<a\b([^>]*\bclass=(['"])[^'"]*\bkw-link\b[^'"]*\2[^>]*)>([\s\S]*?)<\/a>/gi,
    (anchor, attributes, _quote, label) => {
      if (ROTATING_TERMS.has(normalizeLabel(label))) return label;
      if (/href=(['"])[^'"]*\/(?:i-3HM43Zv|i-nbvxtrR)\1/i.test(attributes)) {
        return anchor.replace(/href=(['"])[^'"]*\1/i, `href="${COWBOY_COLOR_COLLECTION}"`);
      }
      return anchor;
    },
  );

  const protectedFragments: string[] = [];
  const protect = (source: string, pattern: RegExp) => source.replace(pattern, (fragment) => {
    const index = protectedFragments.push(fragment) - 1;
    return `\uE100${index}\uE101`;
  });

  // Automatic links belong in readable body copy, not chrome, controls,
  // authored links, structured data, artwork cards, or headings.
  linkable = protect(linkable, /<(script|style|nav|aside|figure|header|footer|button|form|h[1-6])\b[\s\S]*?<\/\1>/gi);
  linkable = protect(linkable, /<a\b[\s\S]*?<\/a>/gi);
  linkable = protect(linkable, /<[^>]+>/g);

  const linked = autoLinkKeywordsInText(linkable, [], [], [], k4Semantic, pagePath, {
    maxLinksPerPhrase: 1,
    minCharsBetweenSamePhrase: 0,
    alternateDestinations: false,
  });

  return linked.replace(/\uE100(\d+)\uE101/g, (_match, index) => protectedFragments[Number(index)] ?? '');
}
