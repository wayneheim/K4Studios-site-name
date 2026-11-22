import { getFormattedLowestStandardPrintPrice } from '../pricing/printSeries.js';

export const LIMITED_FIRST_DOORWAY_PATHS = new Set([
  '/Western-Fine-Art', '/Western-Wall-Art', '/Western-Photography-Prints',
  '/western-art-prints', '/cowboy-art-prints', '/cowboy-artwork-prints',
  '/cowboy-fine-art-prints', '/cowboy-wall-art', '/Western-Interior-Design-Art',
  '/Modern-Western-Interior-Design-Art', '/Rustic-Western-Interior-Design-Art',
  '/Western-Wall-Art-for-Interior-Designers', '/WWII-Themed-Fine-Art-Prints',
]);

export const getLimitedFirstEditionLadder = () =>
  `presented first as signed and numbered limited editions in our Chronicle and Legend series, with select pieces reserved for beginner collectors as open-edition Foundation and small-works "Sketch" prints from ${getFormattedLowestStandardPrintPrice()}`;

// These thirteen doorways retain their subject copy; only their former pricing
// sentences are replaced. Other doorways and the settled /all copy pass through.
export function alignDoorwayGateway(value, path, ensureLadder = false, alreadyPresented = false) {
  if (!LIMITED_FIRST_DOORWAY_PATHS.has(path)) return value;
  let replaced = alreadyPresented;
  const copy = String(value).split(/\n{2,}/).map(paragraph => paragraph
    .split(/(?<=[.!?])\s+/)
    .map(sentence => {
      if (sentence.includes(getLimitedFirstEditionLadder())) {
        replaced = true;
        return sentence;
      }
      if (/\$\s*\d/.test(sentence)) {
        if (replaced) return '';
        replaced = true;
        const subject = sentence.match(/^(.*?), available as archival fine art prints ranging/);
        return subject
          ? `${subject[1]}, ${getLimitedFirstEditionLadder()}.`
          : `Works are ${getLimitedFirstEditionLadder()}.`;
      }
      if (/^(?:It scales through open-edition Foundation|Selected Chronicle and Legend editions add|Signed Chronicle and Legend editions are available)/.test(sentence)) return '';
      return sentence;
    }).filter(Boolean).join(' ')).filter(Boolean).join('\n\n');
  return ensureLadder && !replaced
    ? `${copy}\n\nWorks are ${getLimitedFirstEditionLadder()}.`
    : copy;
}

export function alignDoorwayDescription(value, path) {
  if (!LIMITED_FIRST_DOORWAY_PATHS.has(path)) return value;
  const openPrice = getFormattedLowestStandardPrintPrice();
  return String(value).replace(
    /Archival prints from \$[\d,]+ plus signed limited editions|, and signed limited editions from \$[\d,]+|\bfrom \$[\d,]+(?: through (?:signed limited|collector) editions)?/g,
    match => match.startsWith('Archival')
      ? `Signed and numbered limited edition prints, with open-edition small works from ${openPrice}`
      : match.startsWith(', and')
        ? `, and signed and numbered limited editions, with open-edition small works from ${openPrice}`
        : `as signed and numbered limited edition prints, with open-edition small works from ${openPrice}`,
  ).replace(/prints as signed and numbered limited edition prints/g,
    'prints in signed and numbered limited editions')
    .replace(/print options as signed and numbered limited edition prints/g,
      'print options in signed and numbered limited editions');
}
