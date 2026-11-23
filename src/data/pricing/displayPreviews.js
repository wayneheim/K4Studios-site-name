// Paths are relative to public, for example: /images/display-preview-5x7.webp.
// Add an image and caption to enable See on Wall for a size everywhere it appears.
export const DISPLAY_PREVIEWS = {
  '5x7': {
    image: '/images/5x7sample1.webp',
    caption: '5 x 7 prints display nicely in 8x10 mats and frames.',
    alt: 'A matted and framed print resting on a wooden console against a stone wall',
  },
  '8x10': { image: '/images/8x10sample1.webp', caption: 'Display idea for an 8 x 10 print.' },
  '11x14': { image: '/images/11x14sample1.webp', caption: 'Display idea for an 11 x 14 print.' },
  '16x20': { image: '/images/16x20sample1.webp', caption: 'Display idea for a 16 x 20 print.' },
  '20x24': { image: '/images/20x24sample1.webp', caption: 'Display idea for a 20 x 24 print.' },
  '30x40': { image: '/images/30x40sample1.webp', caption: 'Display idea for a 30 x 40 print.' },
  '40x60': { image: '/images/40x60sample1.webp', caption: 'Display idea for a 40 x 60 print.' },
};

export function getDisplayPreview(size) {
  const dimensions = String(size || '').match(/\d+(?:\.\d+)?/g);
  if (dimensions?.length !== 2) return null;
  const key = dimensions.map(Number).sort((a, b) => a - b).join('x');
  const preview = DISPLAY_PREVIEWS[key];
  return preview?.image && preview?.caption ? { ...preview, size: key.replace('x', ' x ') } : null;
}
