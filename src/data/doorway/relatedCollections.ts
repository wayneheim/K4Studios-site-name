export type DoorwayClusterId = "A" | "B" | "C" | "D" | "E" | "F";

export type RelatedCollectionEntry = {
  clusterId: DoorwayClusterId;
  siblings: string[];
  pillar: "/cinematic-western-art";
  locked?: boolean;
};

const pillar = "/cinematic-western-art" as const;

export const relatedCollectionsBySlug: Record<string, RelatedCollectionEntry> = {
  "/old-western-art": {
    clusterId: "A",
    siblings: ["/vintage-cowboy-art", "/wild-west-art", "/Western-Frontier-Art", "/1800s-cowboy-art", "/old-west-pictures"],
    pillar,
  },
  "/vintage-cowboy-art": {
    clusterId: "A",
    siblings: ["/old-western-art", "/wild-west-art", "/1800s-cowboy-art", "/old-west-pictures", "/historical-fine-art-photography-collection"],
    pillar,
  },
  "/wild-west-art": {
    clusterId: "A",
    siblings: ["/old-western-art", "/vintage-cowboy-art", "/Western-Frontier-Art", "/1800s-cowboy-art", "/historical-fine-art-photography-collection"],
    pillar,
  },
  "/Western-Frontier-Art": {
    clusterId: "A",
    siblings: ["/old-western-art", "/wild-west-art", "/1800s-cowboy-art", "/old-west-pictures", "/historical-fine-art-photography-collection"],
    pillar,
  },
  "/1800s-cowboy-art": {
    clusterId: "A",
    siblings: ["/old-western-art", "/vintage-cowboy-art", "/wild-west-art", "/Western-Frontier-Art", "/old-west-pictures"],
    pillar,
  },
  "/old-west-pictures": {
    clusterId: "A",
    siblings: ["/old-western-art", "/vintage-cowboy-art", "/Western-Frontier-Art", "/1800s-cowboy-art", "/historical-fine-art-photography-collection"],
    pillar,
  },
  "/historical-fine-art-photography-collection": {
    clusterId: "A",
    siblings: ["/old-western-art", "/wild-west-art", "/Western-Frontier-Art", "/1800s-cowboy-art", "/old-west-pictures"],
    pillar,
  },

  "/Rustic-Western-Interior-Design-Art": {
    clusterId: "B",
    siblings: ["/Western-Interior-Design-Art", "/Modern-Western-Interior-Design-Art", "/Western-Wall-Art-for-Interior-Designers"],
    pillar,
  },
  "/Western-Interior-Design-Art": {
    clusterId: "B",
    siblings: ["/Rustic-Western-Interior-Design-Art", "/Modern-Western-Interior-Design-Art", "/Western-Wall-Art-for-Interior-Designers"],
    pillar,
  },
  "/Modern-Western-Interior-Design-Art": {
    clusterId: "B",
    siblings: ["/Rustic-Western-Interior-Design-Art", "/Western-Interior-Design-Art", "/Western-Wall-Art-for-Interior-Designers"],
    pillar,
  },
  "/Western-Wall-Art-for-Interior-Designers": {
    clusterId: "B",
    siblings: ["/Rustic-Western-Interior-Design-Art", "/Western-Interior-Design-Art", "/Modern-Western-Interior-Design-Art"],
    pillar,
  },

  "/Fine-Art-Photography-of-the-American-West": {
    clusterId: "C",
    siblings: ["/Western-Cowboy-Photography", "/Cowboy-Fine-Art-Photography", "/western-fine-art-photography-collection", "/Western-Fine-Art-Photography", "/western-storytelling-photography"],
    pillar,
  },
  "/Western-Cowboy-Photography": {
    clusterId: "C",
    siblings: ["/Fine-Art-Photography-of-the-American-West", "/Cowboy-Fine-Art-Photography", "/cowboy-fine-art-prints", "/western-portrait-photography", "/cowboy-themed-photography"],
    pillar,
  },
  "/Cowboy-Fine-Art-Photography": {
    clusterId: "C",
    siblings: ["/Fine-Art-Photography-of-the-American-West", "/Western-Cowboy-Photography", "/cowboy-fine-art-prints", "/Western-Fine-Art-Photography", "/western-portrait-photography"],
    pillar,
  },
  "/cowboy-fine-art-prints": {
    clusterId: "C",
    siblings: ["/Cowboy-Fine-Art-Photography", "/Western-Cowboy-Photography", "/Western-Fine-Art-Photography", "/western-fine-art-photography-collection", "/cowboy-themed-photography"],
    pillar,
  },
  "/western-fine-art-photography-collection": {
    clusterId: "C",
    siblings: ["/Fine-Art-Photography-of-the-American-West", "/Western-Fine-Art-Photography", "/western-photos", "/western-storytelling-photography", "/Cowboy-Fine-Art-Photography"],
    pillar,
  },
  "/Western-Fine-Art-Photography": {
    clusterId: "C",
    siblings: ["/Fine-Art-Photography-of-the-American-West", "/western-fine-art-photography-collection", "/Cowboy-Fine-Art-Photography", "/cowboy-fine-art-prints", "/western-photos"],
    pillar,
  },
  "/western-photos": {
    clusterId: "C",
    siblings: ["/western-fine-art-photography-collection", "/Western-Fine-Art-Photography", "/Western-Cowboy-Photography", "/western-portrait-photography", "/western-storytelling-photography"],
    pillar,
  },
  "/western-portrait-photography": {
    clusterId: "C",
    siblings: ["/Western-Cowboy-Photography", "/Cowboy-Fine-Art-Photography", "/western-photos", "/western-storytelling-photography", "/cowboy-themed-photography"],
    pillar,
  },
  "/western-storytelling-photography": {
    clusterId: "C",
    siblings: ["/Fine-Art-Photography-of-the-American-West", "/western-fine-art-photography-collection", "/western-photos", "/western-portrait-photography", "/cowboy-themed-photography"],
    pillar,
  },
  "/cowboy-themed-photography": {
    clusterId: "C",
    siblings: ["/Western-Cowboy-Photography", "/Cowboy-Fine-Art-Photography", "/cowboy-fine-art-prints", "/western-portrait-photography", "/western-storytelling-photography"],
    pillar,
  },

  "/American-Western-Art": {
    clusterId: "D",
    siblings: ["/Contemporary-Western-Art", "/Art-of-the-West", "/cowboy-pictures", "/western-cowboy-art", "/western-cowboy-pictures"],
    pillar,
  },
  "/Contemporary-Western-Art": {
    clusterId: "D",
    siblings: ["/American-Western-Art", "/Art-of-the-West", "/cowboy-themed-artwork", "/cowboy-artwork-prints", "/western-cowboy-art"],
    pillar,
  },
  "/Art-of-the-West": {
    clusterId: "D",
    siblings: ["/American-Western-Art", "/Contemporary-Western-Art", "/cowboy-themed-artwork", "/western-cowboy-art", "/western-cowboy-pictures"],
    pillar,
  },
  "/cowboy-pictures": {
    clusterId: "D",
    siblings: ["/American-Western-Art", "/western-cowboy-pictures", "/western-cowboy-art", "/cowboy-themed-artwork", "/cowboy-artwork-prints"],
    pillar,
  },
  "/cowboy-themed-artwork": {
    clusterId: "D",
    siblings: ["/Contemporary-Western-Art", "/Art-of-the-West", "/cowboy-artwork-prints", "/western-cowboy-art", "/cowboy-pictures"],
    pillar,
  },
  "/cowboy-artwork-prints": {
    clusterId: "D",
    siblings: ["/cowboy-themed-artwork", "/western-cowboy-art", "/cowboy-pictures", "/western-cowboy-pictures", "/Contemporary-Western-Art"],
    pillar,
  },
  "/western-cowboy-art": {
    clusterId: "D",
    siblings: ["/American-Western-Art", "/Art-of-the-West", "/cowboy-themed-artwork", "/cowboy-artwork-prints", "/western-cowboy-pictures"],
    pillar,
  },
  "/western-cowboy-pictures": {
    clusterId: "D",
    siblings: ["/American-Western-Art", "/cowboy-pictures", "/western-cowboy-art", "/cowboy-artwork-prints", "/Art-of-the-West"],
    pillar,
  },

  "/black-and-white-cowboy-art": {
    clusterId: "E",
    siblings: ["/black-and-white-cowboy-photography", "/cowboy-painterly-fine-art-photography", "/Painterly-Western-Photography"],
    pillar,
  },
  "/black-and-white-cowboy-photography": {
    clusterId: "E",
    siblings: ["/black-and-white-cowboy-art", "/cowboy-painterly-fine-art-photography", "/Painterly-Western-Photography"],
    pillar,
  },
  "/cowboy-painterly-fine-art-photography": {
    clusterId: "E",
    siblings: ["/black-and-white-cowboy-art", "/black-and-white-cowboy-photography", "/Painterly-Western-Photography"],
    pillar,
    locked: true,
  },
  "/Painterly-Western-Photography": {
    clusterId: "E",
    siblings: ["/black-and-white-cowboy-art", "/black-and-white-cowboy-photography", "/cowboy-painterly-fine-art-photography"],
    pillar,
    locked: true,
  },

  "/WWII-Themed-Fine-Art-Prints": {
    clusterId: "F",
    siblings: ["/historical-fine-art-photography-collection", "/old-western-art", "/Western-Frontier-Art", "/wild-west-art"],
    pillar,
  },
  "/women-of-the-wild-west": {
    clusterId: "F",
    siblings: ["/old-western-art", "/vintage-cowboy-art", "/American-Western-Art", "/western-cowboy-art", "/cowboy-pictures"],
    pillar,
  },
};

export const relatedCollectionsClusterOrder: DoorwayClusterId[] = ["D", "A", "B", "C", "E", "F"];
