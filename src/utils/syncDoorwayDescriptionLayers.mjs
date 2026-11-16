import { decodeHTMLAttribute } from 'entities';
import { syncPageSchemaDescriptions } from './syncPageSchemaDescriptions.mjs';

export function syncDoorwayDescriptionLayers(html, pathname) {
  const ogTag = html.match(/<meta\b(?=[^>]*\bproperty\s*=\s*["']og:description["'])[^>]*>/i)?.[0];
  const twitterTag = html.match(/<meta\b(?=[^>]*\bname\s*=\s*["']twitter:description["'])[^>]*>/i)?.[0];
  const content = tag => tag?.match(/\bcontent\s*=\s*(["'])([\s\S]*?)\1/i)?.[2];
  const og = content(ogTag);
  const twitter = content(twitterTag);
  if (og === undefined || twitter === undefined || decodeHTMLAttribute(og) !== decodeHTMLAttribute(twitter)) return html;
  const description = decodeHTMLAttribute(og);
  const escape = text => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
  const updated = html.replace(/<meta\b(?=[^>]*\bname\s*=\s*["']description["'])[^>]*>/i,
    tag => tag.replace(/\bcontent\s*=\s*(["'])([\s\S]*?)\1/i, () => `content="${escape(description)}"`));
  return syncPageSchemaDescriptions(updated, pathname);
}
