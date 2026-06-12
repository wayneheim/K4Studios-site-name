export type ImageSeoMetaInput = {
  id?: string;
  title?: string;
  description?: string;
  alt?: string;
  galleryPath?: string;
  themes?: Record<string, number>;
  keywords?: string[] | string;
};

import { sanitizeRepeatedSeoCopy } from "@/utils/repetitiveSeoCopy";

const DEFAULT_DESCRIPTOR = "Fine Art Photography";

const COPYRIGHT_PATTERNS = [
  /Copyright\s+Wayne\s+Heim,\s*www\.k4studios\.com\.\s*All\s+rights\s+reserved\.?/gi,
  /(?:©|&copy;)\s*Wayne\s+Heim\.?/gi,
  /Copyright\s+Wayne\s+Heim\.?/gi,
];

export function cleanSeoText(value = "") {
  return sanitizeRepeatedSeoCopy(
    String(value || "")
    .replace(/Ã‚Â©|Â©/g, "©")
    .replace(/Ã¢â‚¬Â¦/g, "...")
    .replace(/Ã¢â‚¬â„¢/g, "'")
    .replace(/Ã¢â‚¬Å“|Ã¢â‚¬ï¿½/g, '"')
    .replace(/Ã¢â‚¬â€œ|Ã¢â‚¬â€/g, "-")
    .replace(/Ã‚/g, "")
    .replace(new RegExp(COPYRIGHT_PATTERNS.map((pattern) => pattern.source).join("|"), "gi"), "")
    .replace(/\bK4\s+image\s+i-[A-Za-z0-9-]+\b/gi, "")
    .replace(/\bin\s+facing\s+history\s+[^.]+/gi, "")
    .replace(/\bin\s+galleries\s+[^.]+/gi, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim()
  );
}

export function truncateSeoDescription(value = "", max = 165) {
  const clean = cleanSeoText(value);
  if (clean.length <= max) return clean;

  const clipped = clean.slice(0, max);
  const lastSentence = Math.max(
    clipped.lastIndexOf("."),
    clipped.lastIndexOf("!"),
    clipped.lastIndexOf("?")
  );

  if (lastSentence > 80) {
    return clipped.slice(0, lastSentence + 1).trim();
  }

  const lastSpace = clipped.lastIndexOf(" ");
  const cutIndex = lastSpace > 80 ? lastSpace : max;
  return `${clipped.slice(0, cutIndex).trim()}...`;
}

function normalizePath(path = "") {
  return String(path || "").replace(/\/+$/, "");
}

const gallerySeoTitleDescriptors: Record<string, string> = {
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color":
    "Painterly Western Cowboy Portrait",
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White":
    "Black and White Western Cowboy Portrait",
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits":
    "Western Cowboy Portrait",

  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color":
    "Narrative Western Fine Art",
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White":
    "Black and White Western Narrative Art",
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives":
    "Narrative Western Fine Art",

  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color":
    "Native American Western Fine Art",
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Black-White":
    "Black and White Native American Western Art",
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans":
    "Native American Western Fine Art",

  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits":
    "Civil War Fine Art Photography",
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII":
    "WWII Living History Photography",
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits":
    "Roaring Twenties Fine Art Photography",

  "/Galleries/Painterly-Fine-Art-Photography/Landscapes":
    "Painterly Landscape Photography",
  "/Galleries/Fine-Art-Photography/Landscapes":
    "Fine Art Landscape Photography",

  "/Galleries/Fine-Art-Photography/Portraits":
    "Fine Art Portrait Photography",
  "/Galleries/Fine-Art-Photography/Transportation":
    "Fine Art Transportation Photography",
  "/Galleries/Painterly-Fine-Art-Photography/Transportation":
    "Painterly Transportation Photography",
  "/Galleries/Fine-Art-Photography/Architecture":
    "Fine Art Architecture Photography",
  "/Galleries/Fine-Art-Photography/Miscellaneous/Pets":
    "Fine Art Pet Photography",
  "/Galleries/Fine-Art-Photography/Miscellaneous/Wildlife":
    "Fine Art Wildlife Photography",

  "/Other/K4-Select-Series/Engrained/Engrained-Series":
    "Engrained Wood Print Fine Art",
  "/Other/Archive": "Fine Art Photography Archive",
};

export function resolveGallerySeoDescriptor(galleryPath = "") {
  const normalized = normalizePath(galleryPath);

  if (gallerySeoTitleDescriptors[normalized]) {
    return gallerySeoTitleDescriptors[normalized];
  }

  const parts = normalized.split("/").filter(Boolean);
  while (parts.length > 0) {
    const parent = `/${parts.join("/")}`;
    if (gallerySeoTitleDescriptors[parent]) {
      return gallerySeoTitleDescriptors[parent];
    }
    parts.pop();
  }

  const lower = normalized.toLowerCase();
  if (lower.includes("civil-war")) return "Civil War Fine Art Photography";
  if (lower.includes("wwii")) return "WWII Living History Photography";
  if (lower.includes("roaring-20")) return "Roaring Twenties Fine Art Photography";
  if (lower.includes("native-american") || lower.includes("na-color") || lower.includes("na-black-white")) {
    return "Native American Western Fine Art";
  }
  if (lower.includes("western-narratives")) return "Narrative Western Fine Art";
  if (lower.includes("western-cowboy") || lower.includes("cowboy")) return "Western Cowboy Portrait";
  if (lower.includes("landscape")) return "Fine Art Landscape Photography";
  if (lower.includes("architecture")) return "Fine Art Architecture Photography";
  if (lower.includes("transportation") || lower.includes("trains") || lower.includes("cars")) {
    return "Fine Art Transportation Photography";
  }
  if (lower.includes("portrait")) return "Fine Art Portrait Photography";
  if (lower.includes("wildlife")) return "Fine Art Wildlife Photography";
  if (lower.includes("pets")) return "Fine Art Pet Photography";
  if (lower.includes("engrained")) return "Engrained Wood Print Fine Art";

  return DEFAULT_DESCRIPTOR;
}

function textHaystack(input: ImageSeoMetaInput) {
  const keywords = Array.isArray(input.keywords)
    ? input.keywords
    : typeof input.keywords === "string"
      ? input.keywords.split(",")
      : [];

  return [
    input.title,
    input.alt,
    input.description,
    ...keywords,
    ...Object.keys(input.themes || {}),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function pathHas(input: ImageSeoMetaInput, pattern: RegExp) {
  return pattern.test(String(input.galleryPath || "").toLowerCase());
}

export function resolveImageSpecificDescriptor(input: ImageSeoMetaInput) {
  const haystack = textHaystack(input);
  const isWesternContext = pathHas(input, /western|wild-west|cowboy|native-american|facing-history/);
  const isTransportationContext = pathHas(input, /transportation|trains|cars|planes|boats|military/);

  const rules: Array<{ terms: string[]; descriptor: string; when?: boolean }> = [
    { terms: ["buffalo soldier", "buffalo soldiers"], descriptor: "Buffalo Soldier Western Art", when: isWesternContext },
    { terms: ["native american", "indigenous", "warrior"], descriptor: "Native American Western Fine Art", when: isWesternContext },
    { terms: ["frontier scout", "scout tracking", "western tracker", "tracking", "faint tracks"], descriptor: "Western Tracking Narrative Art", when: isWesternContext },
    { terms: ["sheriff", "marshal", "lawman"], descriptor: "Old West Lawman Art", when: isWesternContext },
    { terms: ["outlaw", "wanted", "gunfight"], descriptor: "Outlaw Western Narrative Art", when: isWesternContext },
    { terms: ["rancher", "herd"], descriptor: "Western Rancher Portrait Photography", when: isWesternContext },
    { terms: ["locomotive", "train", "steam"], descriptor: "Fine Art Train Photography", when: isTransportationContext },
    { terms: ["automobile", "car", "truck"], descriptor: "Fine Art Automobile Photography", when: isTransportationContext },
  ];

  for (const rule of rules) {
    if (rule.when === false) continue;
    if (rule.terms.some((term) => haystack.includes(term))) {
      return rule.descriptor;
    }
  }

  return "";
}

export function getImagePageSeoMeta(input: ImageSeoMetaInput) {
  const artworkTitle = cleanSeoText(input.title || "") || "Untitled Fine Art Photograph";
  const descriptor =
    resolveImageSpecificDescriptor(input) ||
    resolveGallerySeoDescriptor(input.galleryPath) ||
    DEFAULT_DESCRIPTOR;

  const pageTitle = `${artworkTitle} | ${descriptor} | Wayne Heim`;
  const fallbackDescription = input.alt
    ? `${artworkTitle} is part of Wayne Heim's ${descriptor.toLowerCase()} collection at K4 Studios. ${input.alt}`
    : `${artworkTitle} is part of Wayne Heim's ${descriptor.toLowerCase()} collection at K4 Studios.`;

  const metaDescription = truncateSeoDescription(input.description || fallbackDescription, 165);

  return {
    artworkTitle,
    descriptor,
    pageTitle,
    metaDescription,
  };
}
