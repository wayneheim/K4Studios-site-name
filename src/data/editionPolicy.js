import limits from './editionPolicy.json' with { type: 'json' };

export const PAPER_EDITION_LIMITS = limits;
export const SIZE_EDITION_LABEL = 'Editions defined by size';
export const ENGRAINED_EDITION_LIMIT = 5;
export const normalizeEditionSize = size => String(size || '').replace(/["\s]/g, '').replace(/×/g, 'x').toLowerCase();
export const displayEditionSize = size => normalizeEditionSize(size).replace('x', '×');

export function getSizeEditionLimit(seriesKey, size) {
  return Object.entries(limits[seriesKey] || {}).find(([key]) => normalizeEditionSize(key) === normalizeEditionSize(size))?.[1] ?? null;
}

export function getSizeEditionLabel(seriesKey, size) {
  const limit = getSizeEditionLimit(seriesKey, size);
  return limit ? `Signed limited edition of ${limit} + 1 artist’s proof` : 'Open edition';
}

export function assertNoAddedEditionSizes(previous, next) {
  for (const tier of Object.keys(limits)) {
    const data = previous.editionData?.[tier] || {};
    if (!(Number(data.sold) > 0 || Object.values(data.soldBySize || {}).some(value => Number(value) > 0) || Object.values(data.artistProofsBySize || {}).some(proof => Number(proof.sold) > 0))) continue;
    const declared = data.declaredSizes || getOfferedEditionSizes(tier, previous.excludeSizes);
    const offered = (next.tiers || []).includes(tier) ? getOfferedEditionSizes(tier, next.excludeSizes) : [];
    if (offered.some(size => !declared.includes(size))) throw new Error(`Cannot add a ${tier} size to an artwork already sold in that series.`);
  }
}

export function getOfferedEditionSizes(seriesKey, excludeSizes = {}) {
  const excluded = (excludeSizes[seriesKey] || []).map(normalizeEditionSize);
  return Object.keys(limits[seriesKey] || {}).filter(size => !excluded.includes(normalizeEditionSize(size)));
}

export function getSizeCount(counts, size) {
  return Number(Object.entries(counts || {}).find(([key]) => normalizeEditionSize(key) === normalizeEditionSize(size))?.[1]) || 0;
}

export function getEditionSummary(seriesKey, sizes = Object.keys(limits[seriesKey] || {})) {
  const entries = [...new Set(sizes.map(normalizeEditionSize))].map(size => ({ size: displayEditionSize(size), limit: getSizeEditionLimit(seriesKey, size) })).filter(entry => entry.limit);
  const total = entries.reduce((sum, entry) => sum + entry.limit, 0);
  const ap = entries.length;
  const breakdown = entries.map(entry => `${entry.limit} at ${entry.size}`).join(' and ');
  const shorthand = entries.length ? `${entries.map(entry => entry.limit).join(' + ')} + ${ap} AP` : '';
  const disclosure = !entries.length ? '' : entries.length === 1
    ? `Strictly limited to ${total} numbered prints of this artwork worldwide, in a single individually numbered edition at ${entries[0].size}, plus one artist’s proof.`
    : `Strictly limited to ${total} numbered prints of this artwork worldwide, comprising two individually numbered editions — ${breakdown} — plus one artist’s proof in each size.`;
  return { entries, total, ap, shorthand, disclosure, tooltip: `${breakdown}. Each size is numbered independently, with one artist’s proof (AP) outside its numbered edition. Sold-out sizes cannot borrow from another size. Totals cover only the sizes offered in this series for this artwork.` };
}

export function validateEditionCounts(seriesKey, counts = {}) {
  for (const [size, value] of Object.entries(counts)) {
    const limit = getSizeEditionLimit(seriesKey, size);
    if (!limit || !Number.isInteger(value) || value < 0 || value > limit) {
      throw new Error(`Invalid ${seriesKey} count for ${size}; expected a whole number from 0 to ${limit ?? 0}.`);
    }
  }
}

export function getArtistProofs(seriesKey, excludeSizes = {}, existing = {}) {
  return { ...existing, ...Object.fromEntries(getOfferedEditionSizes(seriesKey, excludeSizes).map(size => [size, artistProofState(existing[size])])) };
}

export function artistProofState(existing = {}) {
  return { printed: 0, sold: 0, availableForSale: false, price: null, ...existing, reserved: 1, designation: 'AP' };
}

export function validateArtistProof(value) {
  const proof = artistProofState(value);
  if (![0, 1].includes(proof.printed) || ![0, 1].includes(proof.sold) || proof.sold > proof.printed) throw new Error('An artist’s proof has one slot; sold cannot exceed printed.');
  if (typeof proof.availableForSale !== 'boolean') throw new Error('Select whether this AP is available for sale.');
  if (proof.availableForSale && (proof.sold || !Number.isFinite(Number(proof.price)) || Number(proof.price) <= 0)) throw new Error('An unsold AP needs an explicit positive price before it can be offered for sale.');
  return proof;
}

export function buildArtistProofProduct(product, value) {
  const proof = artistProofState(value);
  if (!product || !proof.availableForSale || proof.sold || !Number.isFinite(Number(proof.price)) || Number(proof.price) <= 0) return null;
  return { ...product, productKey: `${product.productKey}-ap`, shippingRateKey: product.shippingRateKey || product.productKey, editionType: 'ap', edition: 'Artist’s Proof (AP) — 1 of 1 in this size', editionLimit: 1, unitPrice: Number(proof.price), seriesLabel: `${product.seriesLabel} · AP` };
}
