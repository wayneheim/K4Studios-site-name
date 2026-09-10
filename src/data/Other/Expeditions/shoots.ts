export type Expedition = {
  title: string;
  year: number;
  slug: string;
  formerName?: string;
  description: string;
  image?: string;
  imageAlt?: string;
  galleryUrl: string;
  status: "Expedition Gallery";
  location?: string;
};

// Replace each placeholder galleryUrl (and optional image) when its SmugMug
// participant gallery is ready. Array order controls the expedition card order.
export const expeditions: Expedition[] = [
  {
    title: "Echoes of the West 2026",
    year: 2026,
    slug: "echoes-of-the-west-2026",
    description:
      "Western historical portraits, scenes, and photography created during the 2026 Echoes of the West expedition.",
    galleryUrl: "https://wayne-heim.smugmug.com/Other/Photo-Shoots/North-Dakota/Echoes-of-the-West-2026-E",
    status: "Expedition Gallery",
  },
  {
    title: "Fiddlers Green 2026",
    year: 2026,
    slug: "fiddlers-green-2026",
    formerName: "Formerly Artist Ride",
    description:
      "Western portraits, scenes, and photography created during the 2026 Fiddlers Green expedition, formerly known as Artist Ride.",
    galleryUrl: "https://wayne-heim.smugmug.com/Other/Photo-Shoots/South-Dakota/Fiddlers-Green-26-E",
    status: "Expedition Gallery",
  },
];
