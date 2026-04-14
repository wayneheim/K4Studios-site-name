import imageIdMap from '@/data/imageIdMap.json';

export const WESTERN_POOL_PATHS = [
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits',
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West'
];

export const WESTERN_GROUP_GALLERY_PATHS = [
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color',
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White',
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color',
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White',
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color',
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Black-White'
];

const WESTERN_HREF_PRIORITY = [
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits',
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives',
  '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans'
];

type ImageIdMap = Record<string, string[] | undefined>;

function isWesternGalleryHref(href?: string | null): boolean {
  return typeof href === 'string' && WESTERN_POOL_PATHS.some((prefix) => href.startsWith(prefix));
}

function getMappedGalleryHrefs(imageId?: string | null): string[] {
  if (!imageId) return [];

  const hrefs = (imageIdMap as ImageIdMap)[imageId];
  return Array.isArray(hrefs) ? hrefs.filter(Boolean) : [];
}

function pickPreferredWesternHref(hrefs: string[]): string | null {
  for (const preferredPrefix of WESTERN_HREF_PRIORITY) {
    const match = hrefs.find((href) => href.startsWith(preferredPrefix));
    if (match) return match;
  }

  return hrefs[0] || null;
}

export function resolveCarouselGalleryHref(imageId: string | undefined, sourceGalleryHref: string): string {
  const mappedHrefs = getMappedGalleryHrefs(imageId);

  if (mappedHrefs.length === 0 || mappedHrefs.includes(sourceGalleryHref)) {
    return sourceGalleryHref;
  }

  if (isWesternGalleryHref(sourceGalleryHref) || mappedHrefs.some((href) => isWesternGalleryHref(href))) {
    return pickPreferredWesternHref(mappedHrefs) || sourceGalleryHref;
  }

  return mappedHrefs[0] || sourceGalleryHref;
}

function getWesternPreferenceRank(candidate: string, preferredPath: string): number {
  if (candidate === preferredPath) return 0;

  const prefersCowboyPortraits = preferredPath.includes('/Western-Cowboy-Portraits');
  const prefersNarratives = preferredPath.includes('/Wild-West/Western-Narratives');
  const prefersNativeAmericans = preferredPath.includes('/Wild-West/Native-Americans');
  const prefersWildWest = preferredPath.includes('/Wild-West');

  if (prefersCowboyPortraits && candidate.includes('/Western-Cowboy-Portraits/')) return 1;
  if (prefersNarratives && candidate.includes('/Wild-West/Western-Narratives/')) return 1;
  if (prefersNativeAmericans && candidate.includes('/Wild-West/Native-Americans/')) return 1;
  if (prefersWildWest && candidate.includes('/Wild-West/')) return 1;

  if (candidate.startsWith(preferredPath)) return 2;
  return 3;
}

export function getOrderedWesternGalleryPaths(preferredPath: string): string[] {
  return [...WESTERN_GROUP_GALLERY_PATHS].sort((left, right) => {
    const leftRank = getWesternPreferenceRank(left, preferredPath);
    const rightRank = getWesternPreferenceRank(right, preferredPath);
    if (leftRank !== rightRank) return leftRank - rightRank;
    return left.localeCompare(right);
  });
}