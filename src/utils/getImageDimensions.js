import imageDimensions from '../data/imageDimensions.json';

function isPositiveFiniteNumber(value) {
  return Number.isFinite(value) && value > 0;
}

function normalizeAspectRatio(value, width, height) {
  const numericValue = Number(value);
  if (isPositiveFiniteNumber(numericValue)) return numericValue;
  return width / height;
}

function normalizeOrientation(value, width, height) {
  if (value === 'horizontal' || value === 'vertical' || value === 'square') {
    return value;
  }
  if (width === height) return 'square';
  return width > height ? 'horizontal' : 'vertical';
}

export function getImageDimensions(imageOrId) {
  const imageId =
    typeof imageOrId === 'string'
      ? imageOrId
      : imageOrId && typeof imageOrId === 'object'
        ? imageOrId.id
        : null;

  if (!imageId) return null;

  const entry = imageDimensions?.[imageId];
  if (!entry || typeof entry !== 'object') return null;

  const width = Number(entry.width);
  const height = Number(entry.height);

  if (!isPositiveFiniteNumber(width) || !isPositiveFiniteNumber(height)) {
    return null;
  }

  return {
    width,
    height,
    aspectRatio: normalizeAspectRatio(entry.aspectRatio, width, height),
    orientation: normalizeOrientation(entry.orientation, width, height),
  };
}

export default getImageDimensions;
