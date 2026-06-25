export const chapterDoorwayFrames = [
  "What is [Term]? ->",
  "Learn more about [Term] ->",
  "Explore [Term] ->",
  "Discover more [Term] ->",
  "See more on [Term] ->",
];

export const chapterDoorwayThemes = [
  {
    key: "nativeAmerican",
    matchPaths: [
      "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans",
    ],
    doorwayPaths: [
      "/American-Western-Art",
      "/Western-Fine-Art-Photography",
      "/Western-Photography-Art",
      "/Western-Black-and-White-Photography",
      "/western-art-prints",
      "/Western-Photography-Prints",
      "/western-photos",
      "/wild-west-art",
      "/american-wild-west",
      "/vintage-western-art",
    ],
  },
  {
    key: "western",
    matchPaths: [
      "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West",
      "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits",
    ],
    doorwayPaths: [
      "/western-cowboy-art",
      "/Narrative-Western-Art",
      "/Western-Black-and-White-Photography",
      "/Cowboy-Fine-Art-Photography",
      "/american-wild-west",
      "/old-west-pictures",
      "/vintage-western-art",
      "/wild-west-art",
      "/Western-Frontier-Art",
      "/American-Western-Art",
      "/western-artwork",
      "/western-art-prints",
      "/Western-Photography-Prints",
      "/western-photos",
      "/cowboy-pictures",
      "/western-cowboy-pictures",
      "/cowboy-art-prints",
      "/cowboy-fine-art-prints",
      "/Western-Cowboy-Photography",
      "/Cowboy-Photography",
      "/western-portrait-photography",
      "/Western-Photography-Art",
      "/Western-Wall-Art",
    ],
  },
  {
    key: "civilWar",
    matchPaths: [
      "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits",
    ],
    doorwayPaths: [
      "/Civil-War-Art",
      "/historical-fine-art-photography-collection",
      "/Historical-Reenactment-Photography",
      "/Western-Black-and-White-Photography",
      "/Western-Photography-Art",
    ],
  },
  {
    key: "wwii",
    matchPaths: [
      "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII",
    ],
    doorwayPaths: [
      "/WWII-Themed-Fine-Art-Prints",
      "/historical-fine-art-photography-collection",
      "/Western-Photography-Art",
    ],
  },
  {
    key: "roaring20s",
    matchPaths: [
      "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits",
    ],
    doorwayPaths: [
      "/historical-fine-art-photography-collection",
      "/Western-Photography-Art",
    ],
  },
  {
    key: "landscapes",
    matchPaths: [
      "/Galleries/Painterly-Fine-Art-Photography/Landscapes",
      "/Galleries/Fine-Art-Photography/Landscapes",
    ],
    doorwayPaths: [
      "/western-landscape-art",
      "/Fine-Art-Photography-of-the-American-West",
      "/Western-Fine-Art-Photography",
    ],
  },
  {
    key: "transportation",
    matchPaths: [
      "/Galleries/Painterly-Fine-Art-Photography/Transportation",
      "/Galleries/Fine-Art-Photography/Transportation",
    ],
    doorwayPaths: [
      "/Fine-Art-Photography-of-the-American-West",
      "/Western-Photography-Art",
    ],
  },
  {
    key: "portraits",
    matchPaths: [
      "/Galleries/Fine-Art-Photography/Portraits",
      "/Galleries/Painterly-Fine-Art-Photography/Miscellaneous/Portraits",
    ],
    doorwayPaths: [
      "/western-portrait-photography",
      "/Fine-Art-Photography-of-the-American-West",
    ],
  },
  {
    key: "engrained",
    matchPaths: [
      "/Other/K4-Select-Series/Engrained",
      "/Engrained",
    ],
    doorwayPaths: [
      "/Engrained",
      "/Western-Wall-Art",
    ],
  },
];

export function normalizeDoorwayPath(path) {
  const raw = String(path || "").trim();
  if (!raw) return "";
  return `/${raw.replace(/^\/+/, "").replace(/\/+$/, "")}`;
}

export function getChapterDoorwayThemeForPaths(paths = []) {
  const normalizedPaths = paths.map(normalizeDoorwayPath);
  return chapterDoorwayThemes.find((theme) =>
    normalizedPaths.some((path) =>
      theme.matchPaths.some((prefix) =>
        path.toLowerCase().startsWith(normalizeDoorwayPath(prefix).toLowerCase())
      )
    )
  ) || null;
}
