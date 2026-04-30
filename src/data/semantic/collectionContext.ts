export type CollectionContextEntry = {
  seriesName: string;
  parentCollection?: string;
  mediumLabel: string;
  seriesType?: string;
  seriesFocus?: string;
  collectionUrl?: string;
};

export const collectionContext = {
  "Western-Narratives": {
    seriesName: "Western Narratives",
    parentCollection: "Facing History",
    mediumLabel: "painterly Western fine art photography",
    seriesType: "pictorial series",
    seriesFocus:
      "single cinematic stories shaped by consequence, silence, and unresolved frontier tension",
    collectionUrl:
      "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives",
  },

  "Western-Cowboy-Portraits": {
    seriesName: "Western Cowboy Portraits",
    parentCollection: "Facing History",
    mediumLabel: "painterly Western fine art photography",
    seriesType: "pictorial series",
    seriesFocus:
      "character, posture, clothing, and expression as part of the visual language of frontier life",
    collectionUrl:
      "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits",
  },

  "Native-Americans": {
    seriesName: "Native Americans",
    parentCollection: "Facing History",
    mediumLabel: "painterly Western fine art photography",
    seriesType: "pictorial series",
    seriesFocus:
      "presence, dignity, cultural memory, and the human gravity of the Western frontier",
    collectionUrl:
      "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans",
  },

  "Roaring-20s-Portraits": {
    seriesName: "Roaring 20s Portraits",
    parentCollection: "Facing History",
    mediumLabel: "painterly historical fine art photography",
    seriesType: "pictorial series",
    seriesFocus:
      "character, style, atmosphere, and the theatrical presence of the Jazz Age",
    collectionUrl:
      "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits",
  },

  "Civil-War": {
    seriesName: "Civil War",
    parentCollection: "Facing History",
    mediumLabel: "painterly historical fine art photography",
    seriesType: "pictorial series",
    seriesFocus:
      "memory, consequence, sacrifice, and the human presence within American history",
    collectionUrl:
      "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits",
  },

  WWII: {
    seriesName: "World War II",
    parentCollection: "Facing History",
    mediumLabel: "painterly historical fine art photography",
    seriesType: "pictorial series",
    seriesFocus:
      "service, sacrifice, memory, and the human presence within wartime history",
    collectionUrl: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII",
  },

  "Painterly-Landscape-Photography": {
    seriesName: "Painterly Landscape Photography",
    mediumLabel: "painterly fine art landscape photography",
    seriesType: "collection",
    seriesFocus:
      "atmosphere, place, light, and the enduring visual character of the natural world",
    collectionUrl: "/Galleries/Painterly-Fine-Art-Photography/Landscapes",
  },

  "Traditional-Fine-Art": {
    seriesName: "Traditional Fine Art Photography",
    mediumLabel: "traditional fine art photography",
    seriesType: "collection",
    seriesFocus: "place, subject, atmosphere, and visual study",
    collectionUrl: "/Galleries/Fine-Art-Photography",
  },
} as const satisfies Record<string, CollectionContextEntry>;

export type CollectionContextKey = keyof typeof collectionContext;

export function resolveCollectionContextKey(pathname = ""): CollectionContextKey | null {
  const path = String(pathname || "").toLowerCase();

  if (path.includes("/western-narratives/")) return "Western-Narratives";
  if (path.includes("/western-cowboy-portraits/")) return "Western-Cowboy-Portraits";
  if (path.includes("/native-americans/")) return "Native-Americans";
  if (path.includes("/roaring-20s-portraits/")) return "Roaring-20s-Portraits";
  if (path.includes("/civil-war-portraits/") || path.includes("/civil-war/")) return "Civil-War";
  if (path.includes("/wwii/")) return "WWII";

  if (path.includes("/painterly-fine-art-photography/landscapes/")) {
    return "Painterly-Landscape-Photography";
  }

  if (path.includes("/galleries/fine-art-photography/")) {
    return "Traditional-Fine-Art";
  }

  return null;
}

export function getCollectionContextEntry(pathname = ""): CollectionContextEntry | null {
  const key = resolveCollectionContextKey(pathname);
  return key ? collectionContext[key] : null;
}

export function buildCollectionContextStatement(entry: CollectionContextEntry): string {
  const seriesType = entry.seriesType || "collection";

  if (entry.parentCollection && entry.seriesFocus) {
    return `This image is part of the K4 Studios ${entry.seriesName} ${seriesType}, a curated collection of ${entry.mediumLabel} within the broader ${entry.parentCollection} collection. The series focuses on ${entry.seriesFocus}.`;
  }

  if (entry.parentCollection) {
    return `This image is part of the K4 Studios ${entry.seriesName} ${seriesType}, a curated collection of ${entry.mediumLabel} within the broader ${entry.parentCollection} collection.`;
  }

  if (entry.seriesFocus) {
    return `This image is part of the K4 Studios ${entry.seriesName} ${seriesType}, a curated collection of ${entry.mediumLabel} focused on ${entry.seriesFocus}.`;
  }

  return `This image is part of the K4 Studios ${entry.seriesName} ${seriesType}, a curated collection of ${entry.mediumLabel}.`;
}
