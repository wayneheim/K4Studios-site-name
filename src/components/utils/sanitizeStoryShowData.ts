import { normalizeImageSrc } from "@/utils/imageProxy.js";

const IMAGE_FIELDS: Record<string, string> = {
  src: "l",
  srcS: "s",
  srcM: "m",
  srcL: "l",
  srcXL: "l",
  srcOriginal: "l",
};

export function sanitizeStoryShowData<T extends Record<string, any>>(items: T[] = []): T[] {
  return items.map((item) => {
    if (!item || typeof item !== "object") return item;

    const next = { ...item };
    const imageId = item.id || item.linkedImageId;

    for (const [field, size] of Object.entries(IMAGE_FIELDS)) {
      if (imageId) {
        next[field] = `/img/${imageId}/${size}.jpg`;
      } else if (item[field]) {
        next[field] = normalizeImageSrc(item[field], size);
      }
    }

    if (item.src2) next.src2 = normalizeImageSrc(item.src2, "l");
    if (item.src3) next.src3 = normalizeImageSrc(item.src3, "l");

    return next;
  });
}
