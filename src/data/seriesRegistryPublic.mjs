const IMAGE_FIELD_SIZES = {
  src: "l",
  srcS: "s",
  srcM: "m",
  srcL: "l",
  srcXL: "xl",
  srcOriginal: "l",
};

const IMAGE_ID_PATTERN = /i-[A-Za-z0-9]+/;

function proxyImageUrl(imageId, size) {
  return `/img/${imageId}/${size}.jpg`;
}

function imageIdFromValue(value) {
  if (typeof value !== "string") return "";
  return value.match(IMAGE_ID_PATTERN)?.[0] || "";
}

function imageIdFromRecord(record) {
  return (
    imageIdFromValue(record.id) ||
    imageIdFromValue(record.imageId) ||
    imageIdFromValue(record.primaryImageId) ||
    imageIdFromValue(record.src) ||
    imageIdFromValue(record.srcS) ||
    imageIdFromValue(record.srcM) ||
    imageIdFromValue(record.srcL) ||
    imageIdFromValue(record.srcXL) ||
    imageIdFromValue(record.srcOriginal)
  );
}

export function sanitizePublicSeriesRegistry(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizePublicSeriesRegistry);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const imageId = imageIdFromRecord(value);
  const sanitized = {};

  for (const [key, fieldValue] of Object.entries(value)) {
    const proxySize = IMAGE_FIELD_SIZES[key];
    sanitized[key] = proxySize && imageId
      ? proxyImageUrl(imageId, proxySize)
      : sanitizePublicSeriesRegistry(fieldValue);
  }

  return sanitized;
}
