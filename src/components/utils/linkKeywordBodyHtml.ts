import { autoLinkKeywordsInText } from './autoLinkKeywordsInText.ts';
import { semantic as k4Semantic } from '@/data/semantic/K4-Sem.ts';

const ROTATING_TERMS = new Set([
  'painterly photography',
  'wild west',
  'narrative western art',
  'historically themed photography',
]);

const COWBOY_COLOR_COLLECTION = '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color';

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
