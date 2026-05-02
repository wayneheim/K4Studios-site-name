

// data/semantic/K4-Sem.ts

export const phrases = [];
export const landingPhrases = [];
export const imagePhrases = [];

export const semanticGroups = {
  facingHistory: [],
  cowboy: [],
  civilwar: [],
  wwii: [],
  roaring20s: [],
  landscapes: [],
  engrained: [],
  transportation: [],
  portraits: [],
  miscellaneous: [],
};

export const categoryMap = {
  facingHistory: "Facing History",
  cowboy: "Cowboy",
  civilwar: "Civil War",
  wwii: "WWII",
  roaring20s: "Roaring 20s",
  landscapes: "Landscapes",
  engrained: "Engrained",
  transportation: "Transportation",
  portraits: "Portraits",
  miscellaneous: "Miscellaneous",
};

export const semantic = {
 reenactorsTraditional: {
  path: "/Galleries/Fine-Art-Photography/Portraits/Reenactors",
  def: "Portraits of historical reenactors—character, costume, and story rendered in classic style.",

  landingPhrases: [
    // Primary targets — high intent, high relevance
    { phrase: "historical reenactment photography", rating: 5, use: true },
    { phrase: "fine art reenactment photography", rating: 5, use: true },
    { phrase: "Reenactor Portraits", rating: 5, use: true },
    { phrase: "historic reenactment", rating: 5, use: true },

    // Secondary support / expansion routes
    { phrase: "timeless reenactor portraits", rating: 4, use: true },
    { phrase: "living history portraiture", rating: 4, use: true },
    { phrase: "living history photography", rating: 4, use: true },
    { phrase: "historically inspired portrait photography", rating: 4, use: true },

    // Long-tail / glossary only / supplemental
    { phrase: "fine art reenactor prints", rating: 3, use: true },
    { phrase: "reenactor photography", rating: 3, use: true },
    { phrase: "reenactment photography", rating: 4, use: true },
    { phrase: "reenacting photos", rating: 3, use: true },
    { phrase: "living history reenactment photos", rating: 3, use: true }
  ],

  imagePhrases: [
    // Image-level triggers (non-landing)
    { phrase: "reenactment portraits", rating: 5, use: true },
    { phrase: "historic reenactor prints", rating: 4, use: true },
    { phrase: "period costume photography", rating: 4, use: true },
    { phrase: "living history art", rating: 3, use: true },
    { phrase: "reenactor character studies", rating: 3, use: true }
  ]
},

// --- PRINT OPTIONS & PRESENTATION ---
printOptions: {
  path: "/Other/Print-Options",
  def: "A guide to Wayne's museum-quality print options, paper types, mounting, and finishing—crafted for collectors and those who want their art to last.",

  landingPhrases: [
    // Primary / High-Intent (WritingBrain core)
    { phrase: "fine art print options", rating: 5, use: true },
    { phrase: "print options", rating: 5, use: true },
    { phrase: "Archival Paper Prints", rating: 5, use: true },
    { phrase: "Fine Art Prints", rating: 5, use: true },
    { phrase: "Acrylic Prints", rating: 5, use: true },

    // Secondary (WritingBrain fallback tier)
    { phrase: "museum quality prints", rating: 4, use: true },
    { phrase: "paper types", rating: 4, use: true },
    { phrase: "framing and mounting", rating: 4, use: true },
    { phrase: "display and presentation", rating: 4, use: true },
    { phrase: "archival print materials", rating: 4, use: true },

    // Long-tail (semantic only / glossary)
    { phrase: "archival finishing", rating: 3, use: true },
    { phrase: "gallery wrap", rating: 3, use: true },
    { phrase: "canvas prints", rating: 3, use: true },
    { phrase: "metal prints", rating: 3, use: true },
    { phrase: "wood prints", rating: 3, use: true, link: "/Other/K4-Select-Series/Engrained" },
    { phrase: "matting options", rating: 3, use: true },
    { phrase: "ordering fine art", rating: 3, use: true },
    { phrase: "how to buy art", rating: 3, use: true }
  ]
},

 architectureTraditional: {
  path: "/Galleries/Fine-Art-Photography/Architecture/Gallery",
  def: "Classic architectural studies—form, light, and permanence rendered in traditional style.",

  landingPhrases: [
    // Primary, high-intent for this *specific gallery*
    { phrase: "traditional architecture photography", rating: 5, use: true },
    { phrase: "fine art architecture photography", rating: 5, use: true },
    { phrase: "architectural fine art prints", rating: 5, use: true },

    // Secondary (WritingBrain fallback)
    { phrase: "classic architecture wall art", rating: 4, use: true },
    { phrase: "timeless architectural studies", rating: 4, use: true },
    { phrase: "fine art architecture prints", rating: 4, use: true },

    // Long-tail (semantic only)
    { phrase: "historic building photography", rating: 3, use: true },
    { phrase: "architectural detail art", rating: 3, use: true },
    { phrase: "architecture gallery", rating: 3, use: true }
  ],

  imagePhrases: [
    // Image-specific triggers (no duplicates with landingList)
    { phrase: "architecture photography", rating: 5, use: true },
    { phrase: "classic buildings", rating: 5, use: true },
    { phrase: "iconic landmarks", rating: 5, use: true },
    { phrase: "beauty of architecture", rating: 4, use: true },
    { phrase: "classic architecture", rating: 4, use: true },
    { phrase: "building portraits", rating: 4, use: true },
    { phrase: "traditional architecture art", rating: 3, use: true },
    { phrase: "architectural fine art", rating: 3, use: true },
    { phrase: "quiet architectural grandeur", rating: 3, use: true }
  ]
},
facingHistory: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History",
  def: "Facing History is Wayne Heim's historically themed fine art photography series, blending research, real subjects, living history, and painterly craft into character-driven visual narratives.",

  landingPhrases: [
    // Primary, high-authority terms (WritingBrain core)
    { phrase: "Facing History", rating: 5, use: true },
    { phrase: "Facing History historically themed fine art photography collection", rating: 5, use: true },
    { phrase: "historically themed fine art photography collection", rating: 5, use: true },
    { phrase: "K4 Studios historically themed fine art photography collection", rating: 5, use: true },
    { phrase: "historical portraiture", rating: 4, use: true },
    { phrase: "story-driven historical photography", rating: 5, use: true },
    { phrase: "moments from history", rating: 5, use: true },
    { phrase: "Step inside the story", rating: 5, use: true },
    { phrase: "historic photography prints", rating: 5, use: true },

    // Secondary (WritingBrain fallback, painterly + historical tone)
    { phrase: "living history fine art", rating: 4, use: true },
    { phrase: "evocative historical imagery", rating: 4, use: true },
    { phrase: "Pictorialism", rating: 4, use: true },
    { phrase: "Pictorialist movement", rating: 4, use: true },
    { phrase: "painterly compositions", rating: 4, use: true },
    { phrase: "painterly photographer", rating: 4, use: true },
    { phrase: "historical prints", rating: 4, use: true },
    { phrase: "historic photography", rating: 4, use: true },

    // Western-historical bridge (door page cross-authority)
    { phrase: "historical western photography", rating: 4, use: true },
    { phrase: "historically themed western photography", rating: 4, use: true },
    { phrase: "historical themed western photography", rating: 3, use: true },
    { phrase: "american frontier history", rating: 4, use: true },

    // Long-tail / glossary only (semantic expansion)
    { phrase: "History in Fine Art", rating: 3, use: true },
    { phrase: "fine art painterly photography", rating: 3, use: true },
    { phrase: "grit and grace", rating: 3, use: true },
    { phrase: "raw emotional storytelling", rating: 3, use: true }
  ],
},

// ============================================================================
// DEFINITION ARTICLE: WESTERN ART (ROOT DEFINITION)
// The semantic root that feeds authority to all Western-related definition pages.
// ============================================================================

westernArtDefinition: {
  path: "/Blog/what-is-western-art",
  def: "Western art is a visual language built around the landscapes, people, conflicts, and ideals of the American West—defined not by medium but by authorship, intent, and vision.",
  landingPhrases: [
    { phrase: "what is western art", rating: 5, use: true },
    { phrase: "western art", rating: 5, use: true },
    { phrase: "western art definition", rating: 5, use: true },
    { phrase: "western art history", rating: 4, use: true },
    { phrase: "american western art", rating: 4, use: true },
    { phrase: "define western art", rating: 4, use: true },
  ],
  imagePhrases: []
},

artOfTheAmericanWestDefinition: {
  path: "/Art-of-the-American-West",
  def: "Art of the American West names the historical and continuing artistic tradition that interprets the land, people, memory, and mythology of the American West through serious artistic intent.",
  landingPhrases: [
    { phrase: "art of the american west", rating: 5, use: true, link: "/Art-of-the-American-West" },
    { phrase: "american west art history", rating: 4, use: true, link: "/Art-of-the-American-West" },
    { phrase: "american west in art", rating: 4, use: true, link: "/Art-of-the-American-West" },
    { phrase: "western american art history", rating: 4, use: true, link: "/Art-of-the-American-West" },
    { phrase: "creating the american west in art", rating: 3, use: true, link: "/Art-of-the-American-West" },
  ],
  imagePhrases: []
},

// ============================================================================
// DEFINITION ARTICLE: WESTERN FINE ART PHOTOGRAPHY
// Cornerstone definition page — requires high internal link authority.
// ============================================================================

westernFineArtPhotographyDefinition: {
  path: "/Blog/what-is-western-fine-art-photography",
  def: "Western fine art photography is photography of the American West created as fine art through authorship, intent, and compositional control—not documentation, décor, or stock imagery.",
  landingPhrases: [
    { phrase: "what is western fine art photography", rating: 5, use: true },
    { phrase: "western fine art photography definition", rating: 5, use: true },
    { phrase: "define western fine art photography", rating: 4, use: true },
    { phrase: "western fine art photography meaning", rating: 4, use: true },
  ],
  imagePhrases: []
},

 westernHubLanding: {
  path: "/Western-Fine-Art-Photography",
  def: "The subject-focused hub for Western Fine Art Photography — exploring cowboys, Indigenous portraits, and the human experience of the American West.",
  fallbackImagePath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color",
  landingPhrases: [
    { phrase: "Western Fine Art Photography", rating: 5, use: true },
    { phrase: "western photography", rating: 5, use: true },
    { phrase: "western fine art", rating: 5, use: true },
    { phrase: "American West photography", rating: 4, use: true },
    { phrase: "fine art western", rating: 4, use: true },
    { phrase: "western portrait photography", rating: 4, use: true },
    { phrase: "western themed fine art", rating: 4, use: true },
    { phrase: "frontier fine art photography", rating: 4, use: true },
    { phrase: "western fine art prints", rating: 3, use: true },
    { phrase: "western art prints", rating: 3, use: true },
  ],
  imagePhrases: []
},

westernArtworkCommercialHub: {
  path: "/western-artwork",
  def: "The commercial and collector-facing route for Western artwork by Wayne Heim, bridging painterly photography with the language buyers use for Western art, Western paintings, and frontier fine art prints.",
  fallbackImagePath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color",
  landingPhrases: [
    { phrase: "western artwork", rating: 6, use: true, link: "/western-artwork" },
    { phrase: "western artwork for sale", rating: 5, use: true, link: "/western-artwork" },
    { phrase: "western art paintings", rating: 5, use: true, link: "/western-artwork" },
    { phrase: "western paintings", rating: 5, use: true, link: "/western-artwork" },
    { phrase: "western fine art photography", rating: 5, use: true, link: "/western-artwork" },
    { phrase: "famous western paintings", rating: 3, use: true, link: "/western-artwork" },
  ],
  imagePhrases: []
},

westernPrintsCommercialHub: {
  path: "/Western-Wall-Art",
  def: "The buyer-intent route for Western art prints, Western prints, Western wall decor, and Western wall artwork, with clear commercial language for homes, offices, lodges, and interior projects.",
  fallbackImagePath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color",
  landingPhrases: [
    { phrase: "western art prints", rating: 6, use: true, link: "/Western-Wall-Art" },
    { phrase: "western prints", rating: 6, use: true, link: "/Western-Wall-Art" },
    { phrase: "western wall artwork", rating: 6, use: true, link: "/Western-Wall-Art" },
    { phrase: "western wall decor", rating: 6, use: true, link: "/Western-Wall-Art" },
    { phrase: "western wall art", rating: 6, use: true, link: "/Western-Wall-Art" },
  ],
  imagePhrases: []
},

cowboyWallArtCommercialHub: {
  path: "/cowboy-wall-art",
  def: "The commercial route for cowboy wall art and cowboy artwork, positioning Wayne Heim's painterly cowboy photography as collector-grade Western cowboy art for rooms and display.",
  fallbackImagePath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color",
  landingPhrases: [
    { phrase: "cowboy wall art", rating: 6, use: true, link: "/cowboy-wall-art" },
    { phrase: "cowboy artwork", rating: 6, use: true, link: "/cowboy-wall-art" },
    { phrase: "cowboy paintings", rating: 5, use: true, link: "/cowboy-wall-art" },
    { phrase: "cowboy photos", rating: 4, use: true, link: "/cowboy-wall-art" },
    { phrase: "western cowboy art", rating: 5, use: true, link: "/cowboy-wall-art" },
  ],
  imagePhrases: []
},

cowboyArtPrintsCommercialHub: {
  path: "/cowboy-art-prints",
  def: "The print-focused route for cowboy art prints, Western cowboy art prints, and cowboy artwork prints.",
  fallbackImagePath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color",
  landingPhrases: [
    { phrase: "cowboy art prints", rating: 6, use: true, link: "/cowboy-art-prints" },
    { phrase: "western cowboy art prints", rating: 6, use: true, link: "/cowboy-art-prints" },
    { phrase: "cowboy artwork prints", rating: 6, use: true, link: "/cowboy-art-prints" },
    { phrase: "cowboy photography prints", rating: 5, use: true, link: "/cowboy-art-prints" },
  ],
  imagePhrases: []
},

vintageWesternArtCommercialHub: {
  path: "/vintage-western-art",
  def: "The commercial route for vintage Western art, vintage cowboy art, old western art, old west art, and vintage Western prints by Wayne Heim.",
  fallbackImagePath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color",
  landingPhrases: [
    { phrase: "vintage western art", rating: 6, use: true, link: "/vintage-western-art" },
    { phrase: "vintage cowboy art", rating: 6, use: true, link: "/vintage-western-art" },
    { phrase: "vintage western prints", rating: 6, use: true, link: "/vintage-western-art" },
    { phrase: "vintage cowboy print", rating: 5, use: true, link: "/vintage-western-art" },
    { phrase: "old western art", rating: 5, use: true, link: "/vintage-western-art" },
    { phrase: "old west art", rating: 5, use: true, link: "/vintage-western-art" },
    { phrase: "old west posters", rating: 4, use: true, link: "/vintage-western-art" },
  ],
  imagePhrases: []
},

wildWestArtCommercialHub: {
  path: "/wild-west-art",
  def: "The visual-art route for Wild West art, Wild West artwork, Wild West photos, Wild West pictures, and Western frontier art.",
  fallbackImagePath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West",
  landingPhrases: [
    { phrase: "wild west art", rating: 6, use: true, link: "/wild-west-art" },
    { phrase: "wild west artwork", rating: 6, use: true, link: "/wild-west-art" },
    { phrase: "wild west photos", rating: 5, use: true, link: "/wild-west-art" },
    { phrase: "wild west pictures", rating: 5, use: true, link: "/wild-west-art" },
    { phrase: "pictures wild west", rating: 4, use: true, link: "/wild-west-art" },
    { phrase: "western frontier art", rating: 5, use: true, link: "/wild-west-art" },
  ],
  imagePhrases: []
},

americanWildWestInfoHub: {
  path: "/american-wild-west",
  def: "The informational route for American Wild West questions: what the Wild West was, the time period, cowboys, outlaws, frontier life, and the art it inspired.",
  fallbackImagePath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West",
  landingPhrases: [
    { phrase: "american wild west", rating: 6, use: true, link: "/american-wild-west" },
    { phrase: "what is the wild west", rating: 6, use: true, link: "/american-wild-west" },
    { phrase: "what was the wild west", rating: 6, use: true, link: "/american-wild-west" },
    { phrase: "wild west time period", rating: 6, use: true, link: "/american-wild-west" },
    { phrase: "era of the wild west", rating: 5, use: true, link: "/american-wild-west" },
    { phrase: "wild wild west era", rating: 5, use: true, link: "/american-wild-west" },
    { phrase: "wild west cowboys", rating: 5, use: true, link: "/american-wild-west" },
    { phrase: "wild west outlaws", rating: 4, use: true, link: "/american-wild-west" },
  ],
  imagePhrases: []
},

womenWildWestInfoHub: {
  path: "/women-of-the-wild-west",
  def: "The informational and narrative-art route for women of the Wild West, frontier women, and the women behind Wayne Heim's Women of the West video/story work.",
  fallbackImagePath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives",
  landingPhrases: [
    { phrase: "women of the wild west", rating: 6, use: true, link: "/women-of-the-wild-west" },
    { phrase: "frontier women", rating: 5, use: true, link: "/women-of-the-wild-west" },
    { phrase: "women of the west", rating: 5, use: true, link: "/women-of-the-wild-west" },
  ],
  imagePhrases: []
},

westernInteriorDesignCommercialHub: {
  path: "/Western-Interior-Design-Art",
  def: "The interior-design route for Western interior design art, Western artwork for interiors, and statement Western art in designed spaces.",
  fallbackImagePath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color",
  landingPhrases: [
    { phrase: "western interior design", rating: 6, use: true, link: "/Western-Interior-Design-Art" },
    { phrase: "western interior design art", rating: 6, use: true, link: "/Western-Interior-Design-Art" },
    { phrase: "western artwork for interiors", rating: 5, use: true, link: "/Western-Interior-Design-Art" },
  ],
  imagePhrases: []
},

modernWesternInteriorDesignCommercialHub: {
  path: "/Modern-Western-Interior-Design-Art",
  def: "The modern and contemporary interior-design route for contemporary Western interior design and modern Western art in refined spaces.",
  fallbackImagePath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color",
  landingPhrases: [
    { phrase: "contemporary western interior design", rating: 6, use: true, link: "/Modern-Western-Interior-Design-Art" },
    { phrase: "modern western interior design", rating: 6, use: true, link: "/Modern-Western-Interior-Design-Art" },
    { phrase: "modern western interior design art", rating: 5, use: true, link: "/Modern-Western-Interior-Design-Art" },
  ],
  imagePhrases: []
},

westernPhotographyArtHub: {
  path: "/Western-Photography-Art",
  def: "The bridge page for Western photography art — also phrased as Western art photography — connecting photographic authorship to the larger Western art tradition.",
  fallbackImagePath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color",
  landingPhrases: [
    { phrase: "Western Photography Art", rating: 5, use: true },
    { phrase: "western photography art", rating: 5, use: true },
    { phrase: "Western Art Photography", rating: 5, use: true },
    { phrase: "western art photography", rating: 5, use: true },
    { phrase: "American West photography art", rating: 4, use: true },
    { phrase: "frontier photography art", rating: 4, use: true },
  ],
  imagePhrases: []
},

painterlyWesternHub: {
  path: "/Painterly-Western-Photography",
  def: "The craft-focused hub for Painterly Western Photography—discipline, light, and narrative philosophy behind the work.",
  fallbackImagePath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color",
  landingPhrases: [
    { phrase: "Painterly Western Photography", rating: 5, use: true },
  ],
  imagePhrases: []
},

westernBlackWhiteHub: {
  path: "/Western-Black-and-White-Photography",
  def: "Western fine art photography in black and white—emphasizing contrast, character, and the timeless human experience of the American West.",
  fallbackImagePath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White",
  landingPhrases: [
    { phrase: "Western Black and White Photography", rating: 5, use: true },
    { phrase: "Black and White Western Photography", rating: 5, use: true },
    { phrase: "Black and White Cowboy Photography", rating: 5, use: true },
    { phrase: "black and white cowboy art", rating: 5, use: true },
    { phrase: "black and white western wall art", rating: 4, use: true },
    { phrase: "black and white western art", rating: 4, use: true },
    { phrase: "Western Black and White Art", rating: 4, use: true },
    { phrase: "Black and White Western Fine Art", rating: 4, use: true },
    { phrase: "Monochrome Western Photography", rating: 4, use: true },
    { phrase: "black and white pictures of cowboys", rating: 3, use: true },
  ],
  imagePhrases: []
},

// ============================================================================
// WESTERN WALL ART HUB
// Commercial-intent semantic buffer — contains "wall art" terms without
// contaminating galleries. Translates collector intent into fine art context.
// ============================================================================

westernWallArtHub: {
  path: "/Western-Wall-Art",
  def: "Museum-quality Western wall art for collectors of narrative fine art. Unlike decorative posters or mass-produced prints, fine art Western wall art emphasizes archival quality, narrative depth, and the craftsmanship of original photographic work.",
  fallbackImagePath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color",
  landingPhrases: [
    // Primary commercial-intent phrases (rating 5)
    { phrase: "western wall art", rating: 5, use: true },
    { phrase: "wild west cowboy photography", rating: 5, use: true },
    { phrase: "western fine art prints", rating: 5, use: true },
    { phrase: "cowboy art", rating: 5, use: true },
    // Strong commercial modifiers (rating 4)
    { phrase: "vintage western wall art", rating: 4, use: true },
    { phrase: "vintage cowboy art", rating: 4, use: true },
    { phrase: "old west wall art", rating: 4, use: true },
    { phrase: "old cowboy photography", rating: 4, use: true },
    { phrase: "old cowboy art", rating: 4, use: true },
    { phrase: "rustic western wall art", rating: 4, use: true },
    { phrase: "cowboy artwork", rating: 4, use: true },
    { phrase: "western prints", rating: 4, use: true },
    { phrase: "cowboy pictures", rating: 4, use: true },
    { phrase: "western photos", rating: 4, use: true },
    { phrase: "cowboy photographs", rating: 4, use: true },
    { phrase: "western home decor", rating: 4, use: true },
    { phrase: "cowboy home decor", rating: 4, use: true },
    { phrase: "western art for collectors", rating: 4, use: true },
    { phrase: "museum quality western art", rating: 4, use: true },
    // Supporting commercial phrases (rating 3)
    { phrase: "western wall decor", rating: 3, use: true },
    { phrase: "old western pictures", rating: 3, use: true },
    { phrase: "old cowboy pictures", rating: 3, use: true },
    { phrase: "rustic cowboy art", rating: 3, use: true },
    { phrase: "wild west prints", rating: 3, use: true },
    { phrase: "western interior design art", rating: 3, use: true },
  ],
  imagePhrases: []
},

westernCowboyHub: {
  path: "/Western-Cowboy-Photography",
  def: "Western cowboy photography captures the authentic people of the American frontier—cowboys, ranchers, and frontier figures—with an emphasis on character, grit, and narrative depth rather than nostalgic spectacle.",
  fallbackImagePath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color",
  landingPhrases: [
    // Primary targets — high intent, exact match phrases
    { phrase: "Western Cowboy Photography", rating: 5, use: true },
    { phrase: "Wild West Cowboy Photography", rating: 5, use: true },
    { phrase: "cowboy photography", rating: 5, use: true },
    { phrase: "cowboy photographer", rating: 5, use: true },
    { phrase: "western photographer", rating: 5, use: true },
    { phrase: "cowboy portrait photography", rating: 5, use: true },
    // Secondary — broader western terms (shared authority with Western-Fine-Art hub)
    { phrase: "western photography", rating: 4, use: true },
    { phrase: "wild west photography", rating: 4, use: true },
    { phrase: "authentic cowboy photography", rating: 4, use: true },
    { phrase: "wild west photography portraits", rating: 4, use: true },
    { phrase: "cowboy character portraits", rating: 4, use: true },
    { phrase: "frontier cowboy photography", rating: 4, use: true },
    { phrase: "cowboy fine art photography", rating: 4, use: true },
    { phrase: "American West cowboy photography", rating: 4, use: true },
    // Long-tail semantic enrichers
    { phrase: "cowboy wall art photography", rating: 3, use: true },
    { phrase: "western cowboy wall art", rating: 3, use: true },
    { phrase: "cowboy photo art", rating: 3, use: true },
    { phrase: "wild west cowboy art", rating: 3, use: true },
    { phrase: "cowboy portraiture", rating: 3, use: true },
    { phrase: "historic western photography", rating: 3, use: true },
    { phrase: "frontier photography", rating: 3, use: true },
  ],
  imagePhrases: []
},

// ✅ COWBOY AUTHORITY HUB – "Cowboy" as PRIMARY subject entity
cowboyFineArtHub: {
  path: "/Cowboy-Fine-Art-Photography",
  def: "Cowboy fine art photography is fine art photography that features cowboys as the primary subject—portraits of working cowboys, rodeo riders, ranchers, and frontier characters rendered with artistic depth and narrative intent.",
  fallbackImagePath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color",
  landingPhrases: [
    // Primary targets — "cowboy" as root entity
    { phrase: "cowboy fine art photography", rating: 5, use: true },
    { phrase: "cowboy photography", rating: 5, use: true },
    { phrase: "black and white cowboy photography", rating: 5, use: true },
    { phrase: "cowboy portraits", rating: 5, use: true },
    { phrase: "cowboy fine art", rating: 5, use: true },
    // Secondary — cowboy-centric variants
    { phrase: "cowboy wall art", rating: 4, use: true },
    { phrase: "cowboy art photography", rating: 4, use: true },
    { phrase: "authentic cowboy photography", rating: 4, use: true },
    { phrase: "cowboy portrait photography", rating: 4, use: true },
    { phrase: "fine art cowboy prints", rating: 4, use: true },
    { phrase: "cowboy photographer", rating: 4, use: true },
    // Long-tail enrichers
    { phrase: "black and white cowboy portraits", rating: 3, use: true },
    { phrase: "cowboy character photography", rating: 3, use: true },
    { phrase: "rodeo cowboy photography", rating: 3, use: true },
    { phrase: "working cowboy photography", rating: 3, use: true },
    { phrase: "cowboy photo art", rating: 3, use: true },
  ],
  imagePhrases: []
},

// ============================================================================
// CONCEPTUAL AUTHORITY NODES
// Style/themed terms tied to existing hubs—definitions for Glossary + Google.
// NO new pages, NO image phrases. Semantic authority only.
// ============================================================================

westernThemedPhotography: {
  path: "/Western-Fine-Art-Photography",
  def: "Western themed photography refers to fine art imagery rooted in the lived culture, people, and landscapes of the American West—emphasizing narrative, authenticity, and human presence rather than decorative motifs or nostalgia.",
  landingPhrases: [
    { phrase: "western themed photography", rating: 9, use: true },
    { phrase: "western themed art", rating: 8, use: true },
    { phrase: "western themed wall art", rating: 7, use: true },
    { phrase: "western themed fine art", rating: 7, use: true },
    { phrase: "western themed prints", rating: 6, use: true },
  ],
},

westernPhotographyStyle: {
  path: "/Western-Fine-Art-Photography",
  def: "Western photography style describes a visual approach that captures the character, spirit, and rugged beauty of the American West—distinguished by tonal depth, narrative intent, and authentic human subjects rather than staged or decorative scenes.",
  landingPhrases: [
    { phrase: "western photography style", rating: 9, use: true },
    { phrase: "western style photography", rating: 9, use: true },
    { phrase: "western style fine art", rating: 7, use: true },
    { phrase: "western style art photography", rating: 7, use: true },
    { phrase: "western style wall art", rating: 6, use: true },
  ],
},

painterlyPhotographyStyle: {
  path: "/Galleries/Painterly-Fine-Art-Photography",
  def: "Painterly photography style is a fine art approach that merges photographic realism with the tonal richness, texture, and emotional depth of classical painting—crafted for collectors who value narrative and permanence over decoration.",
  landingPhrases: [
    { phrase: "painterly photography style", rating: 9, use: true },
    { phrase: "painterly style photography", rating: 9, use: true },
    { phrase: "painterly style fine art", rating: 7, use: true },
    { phrase: "painterly style art", rating: 7, use: true },
    { phrase: "painterly style prints", rating: 6, use: true },
  ],
},

painterlyPhotographyDefinition: {
  path: "/Blog/what-is-painterly-photography",
  def: "Painterly photography is a photographic approach where light, tone, composition, atmosphere, and selective detail are shaped to create images with the emotional presence and visual structure associated with painting.",
  landingPhrases: [
    { phrase: "painterly photography", rating: 9, use: true, link: "/Blog/what-is-painterly-photography" },
    { phrase: "what is painterly photography", rating: 9, use: true, link: "/Blog/what-is-painterly-photography" },
    { phrase: "painterly photography definition", rating: 9, use: true, link: "/Blog/what-is-painterly-photography" },
  ],
  imagePhrases: []
},

historicallyThemedPhotography: {
  path: "/Blog/what-is-historically-themed-photography",
  def: "Historically themed photography is contemporary fine art photography that interprets people, events, and eras from the past through research, real subjects, period detail, and visual storytelling. At K4 Studios, it is treated as lived narrative - not archival historical photography, costume spectacle, or AI-generated nostalgia.",
  landingPhrases: [
    { phrase: "historically themed photography", rating: 9, use: true },
    { phrase: "historically themed fine art photography", rating: 9, use: true },
    { phrase: "historically themed art", rating: 8, use: true },
    { phrase: "historically themed fine art", rating: 7, use: true },
    { phrase: "historically themed wall art", rating: 7, use: true },
    { phrase: "historical themed photography", rating: 8, use: true },
    { phrase: "history themed photography", rating: 7, use: true },
    { phrase: "history inspired photography", rating: 8, use: true },
    { phrase: "historically inspired photography", rating: 8, use: true },
    { phrase: "historical fine art photography", rating: 6, use: true },
  ],
},

// ============================================================================
// GLOSSARY-ONLY ENTRIES (definition + hub links, no pages or auto-linking)
// These terms are modifiers captured via glossary, NOT landing page targets.
// ============================================================================

glossaryPainterlyPhotography: {
  path: "/Galleries/Painterly-Fine-Art-Photography",
  def: "Painterly fine art photography is the collector-facing K4 Studios gallery discipline where photographic realism, tonal richness, texture, and emotional depth are shaped into finished fine art prints.",
  fallbackImagePath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color",
  landingPhrases: [
    { phrase: "painterly fine art photography", rating: 5, use: true, link: "/Galleries/Painterly-Fine-Art-Photography" },
  ],
  imagePhrases: []
},

glossaryCowboyArt: {
  path: "/Western-Wall-Art",
  def: "Cowboy art encompasses visual representations of Western ranch life, frontier work, and the iconic cowboy figure. In fine art contexts, it moves beyond decor clichés to explore character, story, and the lived reality of the American West. See <a href='/Western-Wall-Art'>Western Wall Art</a> | <a href='/Western-Fine-Art-Photography'>Western Fine Art Photography</a>.",
  landingPhrases: [
    { phrase: "cowboy art", rating: 5, use: true, link: "/Western-Wall-Art" },
    { phrase: "cowboy wall art", rating: 4, use: true, link: "/Western-Wall-Art" },
  ],
  imagePhrases: []
},

glossaryWesternStylePhotography: {
  def: "Western style photography refers to imagery evoking the aesthetic of the American West—rustic, rugged, and frontier-inspired. Fine art Western photography distinguishes itself from decorative or mass-produced imagery by emphasizing narrative depth, authentic character, and photographic craft. Explore <a href='/Western-Fine-Art-Photography'>Western Fine Art Photography</a> | <a href='/Painterly-Western-Photography'>Painterly Western Photography</a>.",
  landingPhrases: [
    { phrase: "western style photography", rating: 3, use: false },
  ],
  imagePhrases: []
},

glossaryVintageWesternPhotography: {
  path: "/Western-Wall-Art",
  def: "Vintage Western photography refers to imagery that evokes historical Western eras through tone, restraint, and narrative structure—rather than literal age or archival origin. It captures the spirit of the frontier through deliberate craft, not nostalgic imitation. Explore <a href='/Western-Wall-Art'>Western Wall Art</a> | <a href='/Western-Fine-Art-Photography'>Western Fine Art Photography</a>.",
  landingPhrases: [
    { phrase: "vintage western photography", rating: 4, use: true, link: "/Western-Wall-Art" },
    { phrase: "vintage cowboy photography", rating: 4, use: true, link: "/Western-Wall-Art" },
    { phrase: "vintage western art", rating: 4, use: true, link: "/Western-Wall-Art" },
  ],
  imagePhrases: []
},

glossaryWesternThemedPhotography: {
  def: "Western themed photography captures subjects, settings, and narratives inspired by the American frontier—cowboys, ranches, open landscapes, and frontier figures. Fine art Western photography transcends themed decoration by grounding imagery in real people, lived experience, and cinematic storytelling. See <a href='/Western-Fine-Art-Photography'>Western Fine Art Photography</a> | <a href='/Western-Black-and-White-Photography'>Western Black and White Photography</a>.",
  landingPhrases: [
    { phrase: "western themed photography", rating: 3, use: false },
  ],
  imagePhrases: []
},

glossaryWildWestPhotography: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West",
  def: "Wild West photography evokes the American frontier through legend, labor, endurance, and the human stories beneath the myth. On this site, the Wild West section opens into the broader frontier landing, then branches into Western Narratives, Western Portraits, and Native Americans as separate paths through that story. Explore <a href='/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West'>Wild West</a> | <a href='/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives'>Western Narratives</a> | <a href='/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans'>Native Americans</a>.",
  landingPhrases: [
    { phrase: "Wild West", rating: 5, use: true, link: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West" },
    { phrase: "wild west photography", rating: 5, use: true, link: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West" },
    { phrase: "wild west art", rating: 4, use: true, link: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West" },
    { phrase: "old west photography", rating: 4, use: true, link: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West" },
  ],
  imagePhrases: []
},

glossaryWesternNarratives: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives",
  def: "Western Narratives is the story-driven branch within the Wild West section. These works emphasize implication, atmosphere, psychological weight, and the larger chapter pressing just beyond the frame rather than portraiture alone. Explore <a href='/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives'>Western Narratives</a> | <a href='/Narrative-Western-Art'>Narrative Western Art</a>.",
  landingPhrases: [
    { phrase: "Western Narratives", rating: 5, use: true, link: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives" },
    { phrase: "narrative western photography", rating: 5, use: true, link: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives" },
    { phrase: "western storytelling photography", rating: 4, use: true, link: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives" },
    { phrase: "cinematic western photography", rating: 4, use: true, link: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives" },
  ],
  imagePhrases: []
},

glossaryNativeAmericanPortraits: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans",
  def: "Native Americans is a dedicated Wild West section focused on painterly Native American portraiture and narrative work shaped by presence, identity, atmosphere, and memory. It is not a side note to the Western story, but one of the primary paths through this frontier structure. Explore <a href='/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans'>Native Americans</a>.",
  landingPhrases: [
    { phrase: "Native Americans", rating: 5, use: true, link: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans" },
    { phrase: "Native American portraits", rating: 5, use: true, link: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans" },
    { phrase: "Native American fine art photography", rating: 5, use: true, link: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans" },
    { phrase: "Indigenous portrait photography", rating: 4, use: true, link: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans" },
  ],
  imagePhrases: []
},

glossaryBlackWhiteWesternArt: {
  def: "Black and white Western art strips the American frontier to its essential elements—contrast, character, and timeless form. Unlike decorative Western wall art, fine art monochrome Western photography emphasizes tonal craft, emotional weight, and narrative depth that transcends trend. See <a href='/Western-Black-and-White-Photography'>Western Black and White Photography</a> | <a href='/Western-Fine-Art-Photography'>Western Fine Art Photography</a>.",
  landingPhrases: [
    { phrase: "black and white western art", rating: 3, use: false },
  ],
  imagePhrases: []
},

glossaryContemporaryWesternArt: {
  path: "/Contemporary-Western-Art",
  def: "Contemporary Western art carries the subject, history, and emotional weight of the American West into present-day visual language. In photography, it extends the Western tradition through current craft, psychological presence, and authorship rather than nostalgia alone. Explore <a href='/Contemporary-Western-Art'>Contemporary Western Art</a> | <a href='/Western-Fine-Art-Photography'>Western Fine Art Photography</a>.",
  landingPhrases: [
    { phrase: "contemporary Western art", rating: 5, use: true, link: "/Contemporary-Western-Art" },
    { phrase: "modern Western art", rating: 4, use: true, link: "/Contemporary-Western-Art" },
    { phrase: "contemporary Western photography", rating: 4, use: true, link: "/Contemporary-Western-Art" },
    { phrase: "contemporary art of the American West", rating: 4, use: true, link: "/Contemporary-Western-Art" },
  ],
  imagePhrases: []
},

 cowboy: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits",
  def: "Painterly Western portraits—dust, leather, and long light—balancing grit and myth.",

  landingPhrases: [
    { phrase: "Western Cowboy Portraits", rating: 5, use: true },
    { phrase: "Western portrait photography", rating: 5, use: true },
    { phrase: "cowboy portrait photography", rating: 5, use: true },
    { phrase: "painterly cowboy photography", rating: 5, use: true },
    { phrase: "Western character portraits", rating: 5, use: true },
    { phrase: "frontier portraiture", rating: 4, use: true },
    { phrase: "historical Western portraiture", rating: 4, use: true },
    { phrase: "Old West portrait photography", rating: 4, use: true },
    { phrase: "Western figure studies", rating: 4, use: true },
    { phrase: "cowboy portrait art", rating: 4, use: true },
    { phrase: "western themed portrait photography", rating: 3, use: true },
    { phrase: "western portrait art", rating: 3, use: true },
    { phrase: "fine art cowboy photography", rating: 3, use: true },
    { phrase: "western portraits", rating: 3, use: true },
    { phrase: "cowboy fine art prints", rating: 3, use: true },
    { phrase: "cowboy portrait", rating: 3, use: true },
    { phrase: "vintage cowboy art photography", rating: 3, use: true },
    { phrase: "cowboy artwork prints", rating: 3, use: true }
  ],

  imagePhrases: [
    { phrase: "western cowboy art", rating: 5, use: true },
    { phrase: "cowboy portraits", rating: 5, use: true },
    { phrase: "cowboy art", rating: 5, use: true },
    { phrase: "frontier cowboy", rating: 5, use: true },
    { phrase: "cowboys", rating: 5, use: true },
    { phrase: "Western cowboys", rating: 5, use: true },
    { phrase: "cowboy artwork", rating: 5, use: true },
    { phrase: "western portrait photography", rating: 5, use: true },
    { phrase: "cowboy portrait photography", rating: 5, use: true },
    { phrase: "frontier portraits", rating: 5, use: true },
    { phrase: "rugged spirit", rating: 5, use: true },

    { phrase: "outlaw portraits", rating: 4, use: true },
    { phrase: "American frontier portraits", rating: 4, use: true },
    { phrase: "Western character study", rating: 4, use: true },
    { phrase: "historic western prints", rating: 3, use: true },
    { phrase: "painterly cowboy portraits", rating: 3, use: true },
    { phrase: "cowboy painting art", rating: 3, use: true },
    { phrase: "western art", rating: 3, use: true },
    { phrase: "western portrait wall art", rating: 3, use: true },
    { phrase: "frederic remington", rating: 3, use: false },
    { phrase: "powerful works of art", rating: 3, use: true },
    { phrase: "rustic charm", rating: 3, use: true },
    { phrase: "western canon", rating: 3, use: true },
    { phrase: "painterly Western photograph", rating: 5, use: true, link: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits" },
    { phrase: "painterly Western images", rating: 5, use: true, link: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits" },
    { phrase: "Pictorialist tradition", rating: 5, use: true, link: "/Pictorialist-Photography" },
    { phrase: "narrative Western art", rating: 5, use: true, link: "/Narrative-Western-Art" },
    { phrase: "Baltic Birch", rating: 4, use: true, link: "/Other/K4-Select-Series/Engrained" }
  ]
},

wildWest: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West",
  def: "Wild West photography centered on the larger frontier story: legend, labor, endurance, and the lives that lived beneath the myth.",

  landingPhrases: [
    { phrase: "Wild West", rating: 5, use: true },
    { phrase: "Wild West photography", rating: 5, use: true },
    { phrase: "Wild West fine art photography", rating: 5, use: true },
    { phrase: "American frontier photography", rating: 5, use: true },
    { phrase: "frontier storytelling photography", rating: 5, use: true },
    { phrase: "story driven Western art", rating: 4, use: true },
    { phrase: "painterly frontier photography", rating: 4, use: true },
    { phrase: "Western legends reimagined", rating: 4, use: true },
    { phrase: "historical Western fine art", rating: 4, use: true },
    { phrase: "frontier life photography", rating: 4, use: true },
    { phrase: "American West storytelling", rating: 3, use: true },
    { phrase: "contemporary Western art", rating: 3, use: true },
    { phrase: "Western atmosphere and legend", rating: 3, use: true }
  ],

  imagePhrases: [
    { phrase: "wild west photography", rating: 5, use: true },
    { phrase: "American frontier", rating: 5, use: true },
    { phrase: "frontier life", rating: 5, use: true },
    { phrase: "Western legends", rating: 5, use: true },
    { phrase: "frontier storytelling", rating: 4, use: true },
    { phrase: "Western lore", rating: 4, use: true },
    { phrase: "frontier atmosphere", rating: 4, use: true },
    { phrase: "story pressure", rating: 4, use: true },
    { phrase: "painterly Wild West", rating: 3, use: true },
    { phrase: "historical frontier art", rating: 3, use: true },
    { phrase: "American West narrative", rating: 3, use: true }
  ]
},

westernNarratives: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives",
  def: "Narrative Western photography shaped by implication, atmosphere, and the pressure of a larger story just beyond the frame.",

  landingPhrases: [
    { phrase: "narrative Western photography", rating: 5, use: true },
    { phrase: "Western narratives", rating: 5, use: true },
    { phrase: "narrative Western art", rating: 5, use: true },
    { phrase: "cinematic Western photography", rating: 5, use: true },
    { phrase: "Western storytelling photography", rating: 4, use: true },
    { phrase: "story driven Western images", rating: 4, use: true },
    { phrase: "frontier narrative art", rating: 4, use: true },
    { phrase: "psychological Western art", rating: 4, use: true },
    { phrase: "painterly Western narratives", rating: 4, use: true },
    { phrase: "One-Image Movie", rating: 3, use: true },
    { phrase: "implied story photography", rating: 3, use: true },
    { phrase: "atmospheric Western fine art", rating: 3, use: true }
  ],

  imagePhrases: [
    { phrase: "narrative Western art", rating: 5, use: true },
    { phrase: "cinematic Western photography", rating: 5, use: true },
    { phrase: "Western storytelling", rating: 5, use: true },
    { phrase: "frontier narrative", rating: 4, use: true },
    { phrase: "implied story", rating: 4, use: true },
    { phrase: "Western atmosphere", rating: 4, use: true },
    { phrase: "psychological frontier art", rating: 4, use: true },
    { phrase: "One-Image Movie", rating: 4, use: true },
    { phrase: "story pressure", rating: 4, use: true },
    { phrase: "unfinished lives of the frontier", rating: 3, use: true },
    { phrase: "narrative fine art photography", rating: 3, use: true }
  ]
},

nativeAmericans: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans",
  def: "Painterly Native American portraiture and narrative work shaped by presence, memory, identity, and lives that remain larger than the legend.",

  landingPhrases: [
    { phrase: "Native Americans", rating: 5, use: true },
    { phrase: "Native American fine art photography", rating: 5, use: true },
    { phrase: "Native American portraits", rating: 5, use: true },
    { phrase: "Indigenous portrait photography", rating: 5, use: true },
    { phrase: "painterly Native American portraits", rating: 5, use: true },
    { phrase: "Native American narrative art", rating: 4, use: true },
    { phrase: "Indigenous fine art photography", rating: 4, use: true },
    { phrase: "Native American portrait photography", rating: 4, use: true },
    { phrase: "Native American black and white photography", rating: 4, use: true },
    { phrase: "Native American color portrait photography", rating: 4, use: true },
    { phrase: "Indigenous heritage photography", rating: 3, use: true },
    { phrase: "Native presence in the American West", rating: 3, use: true },
    { phrase: "story driven Native American art", rating: 3, use: true }
  ],

  imagePhrases: [
    { phrase: "Native American photography", rating: 5, use: true },
    { phrase: "Native American portraits", rating: 5, use: true },
    { phrase: "Indigenous portrait art", rating: 5, use: true },
    { phrase: "Native American presence", rating: 4, use: true },
    { phrase: "Native American heritage art", rating: 4, use: true },
    { phrase: "Indigenous experience", rating: 4, use: true },
    { phrase: "Native American narrative work", rating: 4, use: true },
    { phrase: "painterly Native American images", rating: 3, use: true },
    { phrase: "presence before narrative", rating: 3, use: true },
    { phrase: "identity and atmosphere", rating: 3, use: true }
  ]
},

cowboyNativeAmerican: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans",
  def: "Painterly portraits honoring Native American heritage—dignity, tradition, and spirit in every image.",

  landingPhrases: [
    // --- Primary gallery signals (WritingBrain core, SEO strong) ---
    { phrase: "Native American fine art photography", rating: 5, use: true },
    { phrase: "Western Native American gallery", rating: 5, use: true },
    { phrase: "painterly Native American portraits", rating: 5, use: true },

    // --- Secondary / controlled expansion ---
    { phrase: "Native American wall art", rating: 4, use: true },
    { phrase: "heritage and tradition in art", rating: 4, use: true },
    { phrase: "spirit of the American West", rating: 4, use: true },

    // (Removed ambiguous or redundant phrases; tightened message)
  ],

  imagePhrases: [
    // --- Image-level identity triggers ---
    { phrase: "Native American photography", rating: 5, use: true },
    { phrase: "Native American Portraits", rating: 5, use: true },
    { phrase: "Native American art prints", rating: 5, use: true },
    { phrase: "spirit of the West", rating: 5, use: true },

    // --- Secondary contextual image hooks ---
    { phrase: "Native American heritage art", rating: 4, use: true },
    { phrase: "Native American tradition", rating: 4, use: true },
    { phrase: "Indigenous experience", rating: 4, use: true },

    // --- Long-tail semantic enrichers (glossary, KWLinker only) ---
    { phrase: "painterly Native American images", rating: 3, use: true }
  ]
},

civilWarArtCommercialHub: {
  path: "/Civil-War-Art",
  def: "The commercial and narrative-art route for Civil War art, Civil War artwork, Civil War art prints, Civil War wall art, and Civil War photography art by Wayne Heim.",
  fallbackImagePath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits",
  landingPhrases: [
    { phrase: "civil war art", rating: 6, use: true, link: "/Civil-War-Art" },
    { phrase: "civil war artwork", rating: 6, use: true, link: "/Civil-War-Art" },
    { phrase: "civil war art prints", rating: 6, use: true, link: "/Civil-War-Art" },
    { phrase: "civil war wall art", rating: 6, use: true, link: "/Civil-War-Art" },
    { phrase: "civil war photography art", rating: 5, use: true, link: "/Civil-War-Art" },
    { phrase: "historical fine art photography", rating: 5, use: true, link: "/Civil-War-Art" },
  ],
  imagePhrases: []
},

civilwar: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits",
  def: "Portraits that echo 19th-century mood and method—duty, brotherhood, and loss.",

  landingPhrases: [
    // --- Primary (WritingBrain / highest authority) ---
    { phrase: "Civil War Portraits", rating: 5, use: true },
    { phrase: "American Civil War", rating: 5, use: true },
    { phrase: "Civil War", rating: 5, use: true },
    { phrase: "civil war valor & loss", rating: 5, use: true },
    { phrase: "Civil War collections", rating: 5, use: true },
    { phrase: "Civil War encampments", rating: 4, use: true },

    // --- Secondary (tone expansion, still high-value) ---
    { phrase: "Faces of Conflict", rating: 4, use: true },
    { phrase: "civil war themed photography", rating: 4, use: true },

    // --- Long-tail / supplemental (glossary + semantic linker only) ---
    { phrase: "civil war inspired photography", rating: 3, use: true },
    { phrase: "civil war art for history lovers", rating: 3, use: true },
    { phrase: "american history wall decor", rating: 3, use: true }
  ],

  imagePhrases: [
    // --- Image-level key hooks (core 5s) ---
    { phrase: "civil war photography", rating: 5, use: true },
    { phrase: "Explore Civil War Photography", rating: 5, use: true },

    // --- Secondary image hooks (strong but not primary) ---
    { phrase: "civil war art", rating: 4, use: true },
    { phrase: "civil war art prints", rating: 4, use: true },
    { phrase: "civil war reenactment photography", rating: 4, use: true },

    // --- Long-tail historical / reenactment contextual terms ---
    { phrase: "19th-century photography", rating: 3, use: true },
    { phrase: "historic reenactor prints", rating: 3, use: true },
    { phrase: "civil war paintings", rating: 3, use: true },
    { phrase: "traditional reenactment photography collection", rating: 3, use: true },
    { phrase: "legacy portraits for collectors", rating: 3, use: true }
  ]
},
portraitsTraditional: {
  path: "/Galleries/Fine-Art-Photography/Portraits",
  def: "Classic portrait photography—timeless expressions captured in traditional style.",

  landingPhrases: [
    // --- Primary gallery identifiers (WritingBrain core) ---
    { phrase: "Traditional Portraits", rating: 5, use: true },
    { phrase: "Classic Portrait Photography", rating: 5, use: true },
    { phrase: "Fine Art Portraits", rating: 5, use: true },

    // --- Secondary expansion (used when needed) ---
    { phrase: "Timeless Portraits", rating: 4, use: true },
    { phrase: "fine art portrait photography", rating: 3, use: true },

    // --- Long-tail semantic support ---
    { phrase: "Portrait Gallery", rating: 3, use: true }
  ],

  imagePhrases: [
    // --- Image-level triggers (strongest, no overlap with landing) ---
    { phrase: "portrait photography", rating: 5, use: true },
    { phrase: "traditional portrait", rating: 5, use: true },

    // --- Secondary supporting micro-phrases ---
    { phrase: "classic portrait", rating: 4, use: true },
    { phrase: "fine art portrait", rating: 4, use: true },
    { phrase: "timeless portrait", rating: 4, use: true },

    // --- Semantic enrichers / glossary long-tails ---
    { phrase: "portrait art", rating: 3, use: true },
    { phrase: "portraiture", rating: 3, use: true }
  ]
},
wwii: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII",
  def: "Cinematic portraits honoring the Greatest Generation—service, sacrifice, resilience.",

  landingPhrases: [
    // --- Primary gallery identity (WritingBrain core, strongest SERP value) ---
    { phrase: "WWII Portraits", rating: 5, use: true },
    { phrase: "Discover WWII Photography", rating: 5, use: true },
    { phrase: "WWII narrative", rating: 5, use: true },
    { phrase: "the Greatest Generation", rating: 5, use: true },
    { phrase: "WWII Sacrifice & Brotherhood", rating: 5, use: true },
    { phrase: "wwii themed fine art photography", rating: 5, use: true },
    { phrase: "historical themed photography", rating: 5, use: true },

    // --- Secondary high-value expansion (WritingBrain fallback) ---
    { phrase: "wartime photography", rating: 4, use: true },
    { phrase: "wwii inspired photography", rating: 4, use: true },

    // --- Long-tail / supplemental (glossary + semantic linking only) ---
    { phrase: "wwii reenactment photography", rating: 3, use: true }
  ]
},

// --- WWII SECTIONS (OPTIMIZED 2025-12-10) ---

wwiiPortraits: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits",
  def: "Faces from a difficult era—quiet strength rendered with painterly tone.",

  landingPhrases: [
    { phrase: "WWII Portraits", rating: 5, use: true },
    { phrase: "Discover WWII Photography", rating: 5, use: true },
    { phrase: "the Greatest Generation", rating: 5, use: true },
    { phrase: "WWII Sacrifice & Brotherhood", rating: 5, use: true },
    { phrase: "wartime portrait photography", rating: 4, use: true },
    { phrase: "painterly WWII portraits", rating: 4, use: true }
  ],

  imagePhrases: [
    { phrase: "wwii photography", rating: 5, use: true },
    { phrase: "wartime portraits", rating: 4, use: true },
    { phrase: "greatest generation photos", rating: 4, use: true },
    { phrase: "heroic portraits", rating: 3, use: true },
    { phrase: "moments of connection", rating: 3, use: true }
  ]
},

wwiiArtOfWar: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War",
  def: "Motion, tension, and resolve—fragments from the front rendered as art.",

  landingPhrases: [
    { phrase: "The Art of War", rating: 5, use: true },
    { phrase: "WWII Battle Photography", rating: 5, use: true },
    { phrase: "Scenes from the Front", rating: 4, use: true },
    { phrase: "WWII combat photography", rating: 4, use: true },
    { phrase: "wartime action photography", rating: 3, use: true }
  ],

  imagePhrases: [
    { phrase: "war zone photography", rating: 5, use: true },
    { phrase: "Second World War", rating: 5, use: true },
    { phrase: "battlefield moments", rating: 4, use: true },
    { phrase: "WWII action art", rating: 3, use: true },
    { phrase: "wwii artistic documentary", rating: 3, use: true }
  ]
},

wwiiMenAndMachines: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines",
  def: "Human presence beside steel and fuel—a study of scale, sound, and craft.",

  landingPhrases: [
    { phrase: "Men & Machines", rating: 5, use: true },
    { phrase: "WWII Military Equipment", rating: 4, use: true },
    { phrase: "Life Behind the Lines", rating: 4, use: true },
    { phrase: "WWII Mechanized Might", rating: 3, use: true }
  ],

  imagePhrases: [
    { phrase: "wwii tanks and trucks", rating: 4, use: true },
    { phrase: "mechanical war art", rating: 3, use: true },
    { phrase: "battle-ready machines", rating: 3, use: true },
    { phrase: "military machinery prints", rating: 2, use: true },
    { phrase: "history's greatest conflicts", rating: 2, use: true }
  ]
},

wwiiMenAndMachinesBW: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White",
  def: "Human presence beside steel and fuel—a study of scale, sound, and craft in black and white.",

  landingPhrases: [
    { phrase: "Men & Machines B/W", rating: 5, use: true },
    { phrase: "Black & White WWII Machines", rating: 4, use: true },
    { phrase: "WWII Military Equipment B/W", rating: 4, use: true },
    { phrase: "Monochrome WWII Mechanized Might", rating: 3, use: true }
  ],

  imagePhrases: [
    { phrase: "wwii tanks and trucks", rating: 4, use: true },
    { phrase: "mechanical war art", rating: 3, use: true },
    { phrase: "battle-ready machines", rating: 3, use: true },
    { phrase: "military machinery prints", rating: 2, use: true },
    { phrase: "history's greatest conflicts", rating: 2, use: true }
  ]
},

wwiiMenAndMachinesColor: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color",
  def: "Human presence beside steel and fuel—a study of scale, sound, and craft in vivid color.",

  landingPhrases: [
    { phrase: "Men & Machines Color", rating: 5, use: true },
    { phrase: "WWII Military Equipment Color", rating: 4, use: true },
    { phrase: "Color WWII Machines", rating: 4, use: true },
    { phrase: "Vivid WWII Mechanized Might", rating: 3, use: true }
  ],

  imagePhrases: [
    { phrase: "wwii tanks and trucks", rating: 4, use: true },
    { phrase: "mechanical war art", rating: 3, use: true },
    { phrase: "battle-ready machines", rating: 3, use: true },
    { phrase: "military machinery prints", rating: 2, use: true },
    { phrase: "history's greatest conflicts", rating: 2, use: true }
  ]
},
roaring20s: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits",
  def: "Deco mood and velvet light—jazz-age portraits with a modern finish.",

  landingPhrases: [
    // --- Primary identity (WritingBrain core + SEO strongest) ---
    { phrase: "Roaring 20s Portraits", rating: 5, use: true },
    { phrase: "The Roaring 20s", rating: 5, use: true },
    { phrase: "Roaring 20s", rating: 5, use: true },
    { phrase: "Roaring 20s vignette", rating: 4, use: true },
    { phrase: "Step into the Roaring 20s", rating: 5, use: true },
    { phrase: "1920s fine art photography", rating: 5, use: true },
    { phrase: "jazz age portraits", rating: 5, use: true },

    // --- Secondary high-value (supports long-tail & semantic context) ---
    { phrase: "gatsby era art", rating: 4, use: true },
    { phrase: "Bootleggers", rating: 4, use: true },
    { phrase: "roaring twenties art prints", rating: 4, use: true },

    // --- Supplemental long-tail (glossary + semantic linking only) ---
    { phrase: "roaring 20s inspired photography", rating: 3, use: true },
    { phrase: "speakeasy portraits", rating: 4, use: true },
    { phrase: "silent film era photography", rating: 3, use: true }
  ],

  imagePhrases: [
    { phrase: "roaring 20s photography", rating: 5, use: true },
    { phrase: "roaring twenties portraits", rating: 4, use: true },
    { phrase: "1920s portraits", rating: 4, use: true },
    { phrase: "deco era fine art", rating: 4, use: true },
    { phrase: "roaring 20s art", rating: 3, use: true }
  ]
},
engrained: {
  path: "/Other/K4-Select-Series/Engrained",
  def: "Photographic prints on wood—tone and grain working together for a tactile finish.",

  landingPhrases: [
    // --- Core identity & strongest SEO drivers ---
    { phrase: "Engrained Series", rating: 5, use: true },
    { phrase: "Engrained Prints", rating: 5, use: true },
    { phrase: "wood print fine art", rating: 5, use: true },
    { phrase: "fine art wood prints", rating: 5, use: true },
    { phrase: "natural grain", rating: 5, use: true },

    // --- Secondary high-value expansion ---
    { phrase: "stories etched in wood", rating: 4, use: true },
    { phrase: "engrained wood prints for rustic interiors", rating: 4, use: true },
    { phrase: "photographic art on wood", rating: 4, use: true },

    // --- Supplemental semantic longtails (glossary + deep linking only) ---
    { phrase: "fine art prints on wood", rating: 3, use: true }
  ],

  imagePhrases: [
    { phrase: "photography printed on wood", rating: 5, use: true },
    { phrase: "wood panel art", rating: 4, use: true },
    { phrase: "printed on birch", rating: 4, use: true },
    { phrase: "baltic birch wall art", rating: 3, use: true },
    { phrase: "wood-mounted art", rating: 3, use: true },
    { phrase: "photo printed on wood panel", rating: 3, use: true },
    { phrase: "historically inspired photo on wood", rating: 3, use: true },
    { phrase: "museum quality historical prints", rating: 3, use: true }
  ]
},
// --- PAINTERLY: LANDSCAPES BY LOCATION ---

landscapeIntPainterly: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/International/Gallery",
  def: "Abroad—where light behaves differently enough to make you look twice.",

  landingPhrases: [
    { phrase: "International Painterly Landscapes", rating: 5, use: true },
    { phrase: "european landscape art", rating: 4, use: true },
    { phrase: "painterly international landscapes", rating: 4, use: true },
    { phrase: "world landscapes fine art", rating: 3, use: true },
    { phrase: "cinematic landscapes", rating: 3, use: true }
  ],

  imagePhrases: [
    { phrase: "international landscape photography", rating: 5, use: true },
    { phrase: "International – Across Borders", rating: 4, use: true },
    { phrase: "fantastic places", rating: 4, use: true },
    { phrase: "painterly european landscapes", rating: 4, use: true }
  ]
},

landscapeWestPainterly: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery",
  def: "Big sky and long light—landscapes that breathe at horizon scale.",

  landingPhrases: [
    { phrase: "Western Painterly Landscapes", rating: 5, use: true },
    { phrase: "Painterly Western Landscapes", rating: 5, use: true },
    { phrase: "Mountain West", rating: 5, use: true },
    { phrase: "Mountain West landscapes", rating: 5, use: true },
    { phrase: "western landscape photography", rating: 5, use: true },
    { phrase: "western landscape art", rating: 3, use: true },
    { phrase: "mountain west fine art photography", rating: 4, use: true },
    { phrase: "painterly fine art landscape photography", rating: 4, use: true },
    { phrase: "painterly landscape photography", rating: 3, use: true },
    { phrase: "painterly sunset photography", rating: 3, use: true }
  ],

  imagePhrases: [
    { phrase: "ethereal landscapes", rating: 5, use: true },
    { phrase: "feel every layer of it", rating: 4, use: true }
  ]
},

landscapeMidwestPainterly: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Midwest/Gallery",
  def: "Quiet fields, big weather, and patient color.",

  landingPhrases: [
    { phrase: "Midwest Painterly Landscapes", rating: 5, use: true },
    { phrase: "midwestern landscape art", rating: 4, use: true }
  ],

  imagePhrases: [
    { phrase: "midwest landscape photography", rating: 5, use: true }
  ]
},

landscapeNortheastPainterly: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Northeast/Gallery",
  def: "Stone walls, tide, and autumn—rendered with soft detail.",

  landingPhrases: [
    { phrase: "Northeast Painterly Landscapes", rating: 5, use: true },
    { phrase: "new england landscape art", rating: 4, use: true }
  ],

  imagePhrases: [
    { phrase: "The Northeast", rating: 5, use: true },
    { phrase: "see beauty in simplicity", rating: 5, use: true },
    { phrase: "autumn in new england", rating: 4, use: true }
  ]
},

landscapeSouthPainterly: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/South/Gallery",
  def: "Humidity, Spanish moss, and late-day glow.",

  landingPhrases: [
    { phrase: "Southern Painterly Landscapes", rating: 5, use: true },
    { phrase: "southern landscape fine art", rating: 4, use: true }
  ],

  imagePhrases: [
    { phrase: "southern landscape photography", rating: 5, use: true },
    { phrase: "blue ridge painterly landscapes", rating: 4, use: true }
  ]
},

// --- PAINTERLY: LANDSCAPES BY THEME ---

mountainsPainterly: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains",
  def: "Ridges and weather rendered in layered tone.",

  landingPhrases: [
    { phrase: "Painterly Mountain Photography", rating: 5, use: true },
    { phrase: "mountain landscapes fine art", rating: 4, use: true }
  ],

  imagePhrases: [
    { phrase: "mountain landscape photography", rating: 5, use: true },
    { phrase: "painterly mountain art", rating: 4, use: true }
  ]
},

waterPainterly: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water",
  def: "Rivers, falls, and coasts where time looks slower than it felt.",

  landingPhrases: [
    { phrase: "Painterly Water Photography", rating: 5, use: true },
    { phrase: "waterfall photography", rating: 5, use: true },
    { phrase: "fine art waterfall prints", rating: 4, use: true },
    { phrase: "fine art waterfall photography", rating: 4, use: true }
  ],

  imagePhrases: [
    { phrase: "waterfall landscape photography", rating: 5, use: true },
    { phrase: "the truth of a moment", rating: 5, use: true },
    { phrase: "painterly river scenes", rating: 4, use: true }
  ]
},

sunsetsPainterly: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Sunsets",
  def: "Color at the edge of day—softened, not saturated.",

  landingPhrases: [
    { phrase: "Painterly Sunset Photography", rating: 5, use: true },
    { phrase: "Golden Prairie Sunsets", rating: 5, use: true },
    { phrase: "dramatic sunset wall art", rating: 4, use: true }
  ],

  imagePhrases: [
    { phrase: "sunset landscape photography", rating: 5, use: true },
    { phrase: "painterly sunset scenes", rating: 4, use: true }
  ]
},
// --- TRADITIONAL FINE ART LANDSCAPES ---

landscapeIntTraditional: {
  path: "/Galleries/Fine-Art-Photography/Landscapes/By-Location/International",
  def: "Classic field work abroad—composition and craft first.",

  landingPhrases: [
    { phrase: "International Traditional Landscapes", rating: 5, use: true },
    { phrase: "Traditional Landscapes collection", rating: 5, use: true },
    { phrase: "International – Global Landscapes", rating: 5, use: true },
    { phrase: "classic international landscape art", rating: 4, use: true },
    { phrase: "international fine art landscapes", rating: 4, use: true }
  ]
},

canadaWesternTraditional: {
  path: "/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/Canada-Western",
  def: "Classic Canadian West—prairie, mountain, and sky in traditional landscape style.",

  landingPhrases: [
    { phrase: "Canada Western Landscapes", rating: 5, use: true },
    { phrase: "Canadian Rockies", rating: 5, use: true },
    { phrase: "Canadian West landscape photography", rating: 5, use: true },
    { phrase: "Western Canada – Towering peaks", rating: 5, use: true },
    { phrase: "Canada fine art landscapes", rating: 4, use: true },
    { phrase: "prairie and mountain art", rating: 4, use: true },
    { phrase: "Canadian landscape prints", rating: 3, use: true }
  ],

  imagePhrases: [
    { phrase: "Canada landscape photography", rating: 5, use: true },
    { phrase: "Canadian West scenery", rating: 4, use: true },
    { phrase: "bridge for discovery", rating: 5, use: true },
    { phrase: "prairie landscape art", rating: 4, use: true },
    { phrase: "mountain and prairie prints", rating: 3, use: true }
  ]
},

faroeIslandsTraditional: {
  path: "/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/The-Faroe-Islands",
  def: "Moody seascapes and dramatic cliffs—Faroe Islands in classic landscape style.",

  landingPhrases: [
    { phrase: "Faroe Islands Landscapes", rating: 5, use: true },
    { phrase: "Faroe Islands fine art photography", rating: 4, use: true },
    { phrase: "Faroe Islands – Windswept cliffs", rating: 4, use: true }
  ],

  imagePhrases: [
    { phrase: "Faroe Islands landscape photography", rating: 5, use: true },
    { phrase: "Faroe Islands", rating: 5, use: true },
    { phrase: "cliffs of the Faroes", rating: 5, use: true },
    { phrase: "cliffside scenery art", rating: 4, use: true },
    { phrase: "moody ocean prints", rating: 3, use: true }
  ]
},

icelandTraditional: {
  path: "/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/Iceland",
  def: "Iceland’s wild terrain—glaciers, waterfalls, and volcanic drama in traditional style.",

  landingPhrases: [
    { phrase: "Iceland Landscapes", rating: 5, use: true },
    { phrase: "Icelandic volcanoes", rating: 5, use: true },
    { phrase: "Iceland’s volcanic rivers", rating: 5, use: true },
    { phrase: "Iceland’s Waterfalls", rating: 5, use: true },
    { phrase: "Iceland fine art photography", rating: 4, use: true },
    { phrase: "Iceland – Glacial lagoons", rating: 4, use: true }
  ],

  imagePhrases: [
    { phrase: "Iceland landscape photography", rating: 5, use: true },
    { phrase: "basalt waterfalls", rating: 5, use: true },
    { phrase: "Iceland – Volcanic terrain", rating: 5, use: true },
    { phrase: "wilds of Iceland", rating: 5, use: true },
    { phrase: "Icelandic scenery art", rating: 4, use: true },
    { phrase: "northern lights prints", rating: 3, use: true }
  ]
},

newfoundlandTraditional: {
  path: "/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/Newfoundland",
  def: "Rugged coastlines and quiet villages—Newfoundland in classic landscape tradition.",

  landingPhrases: [
    { phrase: "Newfoundland Landscapes", rating: 5, use: true },
    { phrase: "expanse of Newfoundland", rating: 5, use: true },
    { phrase: "Newfoundland fine art photography", rating: 4, use: true },
    { phrase: "Newfoundland – Rugged coastlines", rating: 4, use: true }
  ],

  imagePhrases: [
    { phrase: "Newfoundland landscape photography", rating: 5, use: true },
    { phrase: "Newfoundland and beyond", rating: 5, use: true },
    { phrase: "fjords of Newfoundland", rating: 5, use: true },
    { phrase: "Newfoundland’s coasts", rating: 5, use: true },
    { phrase: "coastal village art", rating: 4, use: true },
    { phrase: "Atlantic coast prints", rating: 3, use: true }
  ]
},

landscapeWestTraditional: {
  path: "/Galleries/Fine-Art-Photography/Landscapes/By-Location/West/Gallery",
  def: "A straight photograph—honest light, strong line.",

  landingPhrases: [
    { phrase: "Western Traditional Landscapes", rating: 5, use: true },
    { phrase: "Western Landscapes – Spirit", rating: 5, use: true },
    { phrase: "Wyoming & Montana", rating: 5, use: true },
    { phrase: "classic western landscape prints", rating: 4, use: true }
  ],

  imagePhrases: [
    { phrase: "traditional western landscape photography", rating: 5, use: true },
    { phrase: "American West – Vast Horizons", rating: 5, use: true },
    { phrase: "Western skies", rating: 5, use: true },
    { phrase: "western scenery wall art", rating: 4, use: true }
  ]
},

landscapeMidwestTraditional: {
  path: "/Galleries/Fine-Art-Photography/Landscapes/By-Location/Midwest/Gallery",
  def: "Plainspoken scenes—shape, light, and season.",

  landingPhrases: [
    { phrase: "Midwest Traditional Landscapes", rating: 5, use: true },
    { phrase: "Midwest Landscapes – Beauty in Simplicity", rating: 5, use: true },
    { phrase: "Midwest Rivers & Lakes", rating: 5, use: true },
    { phrase: "heartland landscape prints", rating: 4, use: true }
  ],

  imagePhrases: [
    { phrase: "traditional midwest landscape photography", rating: 5, use: true },
    { phrase: "Midwest – The Heartland Preserved", rating: 5, use: true },
    { phrase: "Ohio river valleys", rating: 5, use: true },
    { phrase: "classic heartland scenery", rating: 4, use: true }
  ]
},

landscapeNortheastTraditional: {
  path: "/Galleries/Fine-Art-Photography/Landscapes/By-Location/Northeast",
  def: "Granite, tide, and a certain understatement.",

  landingPhrases: [
    { phrase: "Northeast Traditional Landscapes", rating: 5, use: true },
    { phrase: "new england scenery wall art", rating: 4, use: true }
  ],

  imagePhrases: [
    { phrase: "traditional northeast landscape photography", rating: 5, use: true },
    { phrase: "Northeast – History and Contrast", rating: 5, use: true },
    { phrase: "new england landscapes fine art", rating: 4, use: true }
  ]
},

landscapeSouthTraditional: {
  path: "/Galleries/Fine-Art-Photography/Landscapes/By-Location/South",
  def: "Still water, heavy air, and generous shadow.",

  landingPhrases: [
    { phrase: "Southern Traditional Landscapes", rating: 5, use: true },
    { phrase: "southern scenery wall art", rating: 4, use: true }
  ],

  imagePhrases: [
    { phrase: "traditional southern landscape photography", rating: 5, use: true },
    { phrase: "South – Light and Legacy", rating: 5, use: true },
    { phrase: "southern landscape prints", rating: 4, use: true }
  ]
},

mountainsTraditional: {
  path: "/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Mountains",
  def: "Clean lines, honest color, and a long view.",

  landingPhrases: [
    { phrase: "Traditional Mountain Photography", rating: 5, use: true },
    { phrase: "classic mountain landscape art", rating: 4, use: true }
  ],

  imagePhrases: [
    { phrase: "mountain landscape photography", rating: 5, use: true },
    { phrase: "mountain scenery fine art", rating: 4, use: true },
    { phrase: "mountain storm", rating: 3, use: true }
  ]
},

waterTraditional: {
  path: "/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Water",
  def: "Water recorded simply and well—composition and tone carry the rest.",

  landingPhrases: [
    { phrase: "Traditional Water Photography", rating: 5, use: true },
    { phrase: "waterfall photography", rating: 5, use: true },
    { phrase: "Water & Waterfall Photography – Nature in Motion", rating: 5, use: true },
    { phrase: "classic water landscape prints", rating: 4, use: true }
  ],

  imagePhrases: [
    { phrase: "water landscape photography", rating: 5, use: true },
    { phrase: "river and waterfall wall art", rating: 4, use: true }
  ]
},

sunsetsTraditional: {
  path: "/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Sunsets",
  def: "The end of day in measured color and line.",

  landingPhrases: [
    { phrase: "Traditional Sunset Photography", rating: 5, use: true },
    { phrase: "sunset landscape wall art", rating: 4, use: true }
  ],

  imagePhrases: [
    { phrase: "sunset photography", rating: 5, use: true },
    { phrase: "classic sunset scenery", rating: 4, use: true }
  ]
},


  // --- GENERAL ---
  landscape: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Landscapes",
  def: "Landscapes developed for tone, texture, and lyrical depth.",

  landingPhrases: [
    // Core painterly authority
    { phrase: "Painterly Landscape Photography", rating: 5, use: true },
    { phrase: "painterly landscapes", rating: 5, use: true },
    { phrase: "feel the landscape", rating: 5, use: true },

    // High-value secondary painterly expansions
    { phrase: "western painterly landscape photography", rating: 4, use: true },
    { phrase: "mountain photography", rating: 4, use: true },

    // Longtail / glossary only (DON'T use in WritingBrain)
    { phrase: "fine art landscape prints for collectors", rating: 3, use: true },
    { phrase: "Mountain West landscapes", rating: 4, use: true },
    { phrase: "Great Plains photography", rating: 4, use: true },
    { phrase: "High Desert landscapes", rating: 4, use: true }
  ]
},

landscapeTraditional: {
  path: "/Galleries/Fine-Art-Photography/Landscapes",
  def: "Traditional landscapes—composition, craft, and honest light.",

  landingPhrases: [
    // Core traditional authority (WritingBrain uses these)
    { phrase: "Traditional Landscape Photography", rating: 5, use: true },
    { phrase: "landscape photography", rating: 5, use: true },
    { phrase: "traditional fine art style", rating: 5, use: true },

    // High-value traditional expansions
    { phrase: "classic landscape wall art", rating: 4, use: true },
    { phrase: "fine art landscape prints", rating: 4, use: true },
    { phrase: "timeless landscape photography", rating: 4, use: true },

    // Supplemental authority / glossary longtail
    { phrase: "traditional landscape gallery", rating: 3, use: true },
    { phrase: "landscape art for collectors", rating: 3, use: true }
  ]
},

// --- MISCELLANEOUS: TRADITIONAL ---
miscellaneousTraditional: {
  path: "/Galleries/Fine-Art-Photography/Miscellaneous",
  def: "A diverse collection of traditional fine art photographs—unique moments, candid scenes, and subjects that defy easy categorization.",

  landingPhrases: [
    { phrase: "Miscellaneous Traditional Photography", rating: 5, use: true },
    { phrase: "unique fine art photographs", rating: 4, use: true },
    { phrase: "unusual subjects in fine art", rating: 4, use: true },
    { phrase: "eclectic traditional gallery", rating: 3, use: true }
  ],

  imagePhrases: [
    { phrase: "miscellaneous traditional photography", rating: 5, use: true },
    { phrase: "candid moments", rating: 4, use: true },
    { phrase: "unexpected fine art", rating: 3, use: true }
  ]
},

// --- MISCELLANEOUS: PAINTERLY ---
miscellaneousPainterly: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Miscellaneous",
  def: "Painterly fine art images that don’t fit a single theme—creative, experimental, and visually striking.",

  landingPhrases: [
    { phrase: "life’s raw beauty", rating: 5, use: true },
    { phrase: "painterly experimental art", rating: 4, use: true },
    { phrase: "unique painterly gallery", rating: 4, use: true },
    { phrase: "eclectic painterly images", rating: 3, use: true }
  ],

  imagePhrases: [
    { phrase: "miscellaneous painterly photography", rating: 5, use: true },
    { phrase: "creative painterly art", rating: 4, use: true },
    { phrase: "experimental fine art", rating: 3, use: true }
  ]
},
wildlifePainterly: {
  path: "/Galleries/Fine-Art-Photography/Miscellaneous/Wildlife",
  def: "Painterly wildlife photography capturing the beauty and essence of animals in their natural habitats.",

  landingPhrases: [
    { phrase: "painterly wildlife photography", rating: 5, use: true },
    { phrase: "wildlife photography", rating: 5, use: true },
    { phrase: "animal portraits", rating: 4, use: true },
    { phrase: "nature's creatures", rating: 4, use: true },
    { phrase: "wildlife art", rating: 3, use: true }
  ],

  imagePhrases: [
    { phrase: "animal portrait", rating: 5, use: true },
    { phrase: "the quiet wild", rating: 4, use: true },
    { phrase: "nature's beauty", rating: 4, use: true },
    { phrase: "animal kingdom", rating: 4, use: true },
    { phrase: "fauna photography", rating: 3, use: true },
    { phrase: "wild animal art", rating: 3, use: true }
  ]
},

 // --- TRANSPORTATION, UNIVERSAL, SYNONYMS ---
transportation: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Transportation",
  def: "Classic cars, trucks, and rails—timeworn texture, story-first framing.",
  landingPhrases: [
    { phrase: "Transportation", rating: 5, use: true },
    { phrase: "Classic Cars & Trucks Collection", rating: 5, use: true },
    { phrase: "Route 66 Photography", rating: 5, use: true },
    { phrase: "Steam Engine Photography", rating: 5, use: true },
    { phrase: "steam trains", rating: 4, use: true },
    { phrase: "steam engines", rating: 4, use: true },
    { phrase: "vintage cars", rating: 4, use: true },
    { phrase: "vintage autos", rating: 4, use: true },
    { phrase: "boats", rating: 4, use: true },
    { phrase: "aircraft", rating: 4, use: true },
    { phrase: "painterly transportation photography", rating: 4, use: true }
  ],
  imagePhrases: [] // parent landing cannot link to images
},

transportationTraditional: {
  path: "/Galleries/Fine-Art-Photography/Transportation",
  def: "Classic cars, trucks, and rails—timeworn texture, story-first framing in traditional style.",
  landingPhrases: [
    { phrase: "Transportation", rating: 5, use: true },
    { phrase: "Classic Cars & Trucks Collection", rating: 5, use: true },
    { phrase: "Route 66 Photography", rating: 5, use: true },
    { phrase: "Steam Engine Photography", rating: 5, use: true },
    { phrase: "traditional transportation photography", rating: 4, use: true }
  ],
  imagePhrases: [] // parent-level traditional also cannot have images
},

militaryVehiclesTraditional: {
  path: "/Galleries/Fine-Art-Photography/Transportation/Military",
  def: "Military vehicles and equipment—planes, tanks, jeeps, vintage machines in traditional style.",
  landingPhrases: [
    { phrase: "Military Vehicles Photography", rating: 5, use: true },
    { phrase: "Military Equipment Collection", rating: 5, use: true },
    { phrase: "Vintage Military Machines", rating: 4, use: true },
    { phrase: "Military Transportation Gallery", rating: 4, use: true },
    { phrase: "Historic Military Vehicles", rating: 3, use: true }
  ],
  imagePhrases: [
    { phrase: "military vehicle photography", rating: 5, use: true },
    { phrase: "tank photography", rating: 5, use: true },
    { phrase: "jeep photography", rating: 5, use: true },
    { phrase: "military equipment photography", rating: 4, use: true },
    { phrase: "vintage military machine", rating: 4, use: true },
    { phrase: "historic tank", rating: 4, use: true },
    { phrase: "classic jeep", rating: 4, use: true },
    { phrase: "military aviation photography", rating: 4, use: true },
    { phrase: "military vehicle art", rating: 3, use: true },
    { phrase: "tank art prints", rating: 3, use: true },
    { phrase: "jeep art prints", rating: 3, use: true },
    { phrase: "military equipment art", rating: 3, use: true },
    { phrase: "vintage military photography", rating: 3, use: true },
    { phrase: "historic military vehicle prints", rating: 3, use: true },
    { phrase: "military machine wall art", rating: 3, use: true },
    { phrase: "timeless military vehicle prints", rating: 3, use: true }
  ]
},

aviationTraditional: {
  path: "/Galleries/Fine-Art-Photography/Transportation/Planes",
  def: "Aircraft and aviation photography—planes, vintage aircraft, aviation history in traditional style.",
  landingPhrases: [
    { phrase: "Aviation Photography", rating: 5, use: true },
    { phrase: "Plane Photography Collection", rating: 5, use: true },
    { phrase: "Vintage Aircraft Gallery", rating: 4, use: true },
    { phrase: "Aviation Art Collection", rating: 4, use: true },
    { phrase: "Historic Planes", rating: 3, use: true }
  ],
  imagePhrases: [
    { phrase: "plane photography", rating: 5, use: true },
    { phrase: "aviation photography", rating: 5, use: true },
    { phrase: "vintage aircraft photography", rating: 4, use: true },
    { phrase: "airplane photography", rating: 4, use: true },
    { phrase: "historic plane photography", rating: 4, use: true },
    { phrase: "aviation art", rating: 3, use: true },
    { phrase: "plane art prints", rating: 3, use: true },
    { phrase: "aircraft photography prints", rating: 3, use: true },
    { phrase: "vintage plane wall art", rating: 3, use: true },
    { phrase: "aviation history photography", rating: 3, use: true },
    { phrase: "timeless aviation prints", rating: 3, use: true },
    { phrase: "plane wall art for collectors", rating: 3, use: true }
  ]
},

railwayTraditional: {
  path: "/Galleries/Fine-Art-Photography/Transportation/Trains",
  def: "Railway and locomotive photography—trains, steam engines, vintage railways in traditional style.",
  landingPhrases: [
    { phrase: "Railway Photography", rating: 5, use: true },
    { phrase: "Train Photography Collection", rating: 5, use: true },
    { phrase: "train photography", rating: 5, use: true },
    { phrase: "vintage train photography", rating: 5, use: true },
    { phrase: "steam locomotive photography", rating: 4, use: true },
    { phrase: "Steam Engine Gallery", rating: 4, use: true },
    { phrase: "Locomotive Art Collection", rating: 4, use: true },
    { phrase: "Historic Trains", rating: 3, use: true }
  ],
  imagePhrases: [
    { phrase: "steam engine photography", rating: 5, use: true },
    { phrase: "locomotive photography", rating: 4, use: true },
    { phrase: "railway photography", rating: 4, use: true },
    { phrase: "historic locomotive photography", rating: 3, use: true },
    { phrase: "steam train art", rating: 3, use: true },
    { phrase: "railway art prints", rating: 3, use: true },
    { phrase: "locomotive wall art", rating: 3, use: true },
    { phrase: "train photography prints", rating: 3, use: true },
    { phrase: "vintage railway wall art", rating: 3, use: true },
    { phrase: "timeless locomotive prints", rating: 3, use: true }
  ]
},

railwayPainterly: {
  path: "/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Color",
  def: "Painterly train photography—steam locomotives and vintage railways rendered with atmosphere and narrative depth.",
  landingPhrases: [
    { phrase: "Painterly Train Photography", rating: 5, use: true },
    { phrase: "vintage train photography", rating: 5, use: true },
    { phrase: "train photography", rating: 5, use: true },
    { phrase: "steam locomotive art", rating: 4, use: true },
    { phrase: "fine art train photography", rating: 4, use: true }
  ],
  imagePhrases: [
    { phrase: "painterly locomotive photography", rating: 4, use: true },
    { phrase: "steam engine wall art", rating: 4, use: true },
    { phrase: "vintage railroad photography", rating: 3, use: true },
    { phrase: "atmospheric train photography", rating: 3, use: true }
  ]
},



 // --- PAINTERLY: MAIN LANDING ---
painterly: {
  path: "/Galleries/Painterly-Fine-Art-Photography",
  def: "A signature blend of photographic realism and painterly depth.",
  fallbackImagePath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color",
  landingPhrases: [
    { phrase: "Painterly Fine Art Photography", rating: 5, use: true },
    { phrase: "painterly storytelling", rating: 5, use: true },
    { phrase: "painterly compositions", rating: 4, use: true },
    { phrase: "painterly art collection", rating: 4, use: true },
    { phrase: "painterly style wall art", rating: 4, use: true },
    { phrase: "painterly gallery", rating: 4, use: true },
  ],
},

// --- TRADITIONAL FINE ART: MAIN LANDING ---
fineart: {
  path: "/Galleries/Fine-Art-Photography",
  def: "Traditional photographic craft—composition, print, and permanence.",
  landingPhrases: [
    { phrase: "Fine Art Photography", rating: 5, use: true },
    { phrase: "Traditional Fine Art Photography", rating: 5, use: true },
    { phrase: "traditional photography", rating: 5, use: true },
    { phrase: "fine art photographer", rating: 4, use: true },
    { phrase: "Traditional Fine Art collection", rating: 5, use: true },
    { phrase: "fine art gallery", rating: 4, use: true },
    { phrase: "classic fine art photos", rating: 4, use: true },
    { phrase: "timeless fine art", rating: 4, use: true },
  ],
},

// --- ONE-IMAGE MOVIE DEFINITION PAGE ---
oneImageMovie: {
  path: "/Other/One-Image-Movie",
  def: "A One-Image Movie is a fully realized moment of cinema—compressed into a single frame—where character, mood, and narrative arc exist all at once.",

  landingPhrases: [
    // Primary targets — highest intent
    { phrase: "One Image Movie", rating: 5, use: true },
    { phrase: "One Image Movies", rating: 5, use: true },
    { phrase: "One-Image Movie", rating: 5, use: true },
    { phrase: "One-Image Movie™", rating: 5, use: true },
    { phrase: "One-Image Movies", rating: 5, use: true },
    { phrase: "One-Image Movies™", rating: 5, use: true },
    { phrase: "What is a One Image Movie", rating: 5, use: true },
    { phrase: "What is a One-Image Movie", rating: 5, use: true },
    { phrase: "single-frame narrative", rating: 5, use: true },
    { phrase: "cinematic still frame", rating: 5, use: true },

    // Secondary expansion
    { phrase: "One-Image Movie storytelling", rating: 4, use: true },
    { phrase: "single-frame storytelling", rating: 4, use: true },
    { phrase: "narrative photography", rating: 4, use: true },
    { phrase: "cinematic fine art photography", rating: 4, use: true },
    { phrase: "visual literature", rating: 4, use: true },
    { phrase: "story in a single frame", rating: 4, use: true },
    { phrase: "hinge moment", rating: 4, use: true },

    // Long-tail / semantic enrichers
    { phrase: "narrative density", rating: 3, use: true },
    { phrase: "painterly cinematic aesthetic", rating: 3, use: true },
    { phrase: "psychological resonance", rating: 3, use: true },
    { phrase: "lost frame from an unwritten film", rating: 3, use: true },
    { phrase: "step inside the story", rating: 3, use: true },
  ],
},

universal: {
  path: "/", 
  def: "Core K4 Studios concepts—brand pillars, artistic identity, and universal narrative themes.",

  landingPhrases: [
    { phrase: "Embrace the Past. Live the Story.", rating: 5, use: true },
    { phrase: "One-Image Movie™", rating: 5, use: true },
    { phrase: "One-Image Movies™", rating: 5, use: true },
    { phrase: "One-Image Movie storytelling", rating: 4, use: true },
    { phrase: "Fine Art Storytelling", rating: 5, use: true },
    { phrase: "Narrative Fine Art", rating: 5, use: true },
    { phrase: "Award-winning fine art photographer", rating: 5, use: true },
    { phrase: "visual storytelling through photography", rating: 5, use: true },

    { phrase: "every image is a story", rating: 4, use: true },
    { phrase: "cinematic fine art", rating: 4, use: true },
    { phrase: "lyrical photography", rating: 4, use: true },
    { phrase: "evocative fine art", rating: 4, use: true },
    { phrase: "crafted with tone and texture", rating: 4, use: true },
    { phrase: "where history becomes art", rating: 4, use: true },
    { phrase: "Scrapbook of Time", rating: 4, use: true },
    { phrase: "Americana fine art photography", rating: 4, use: true },
    { phrase: "visual memory", rating: 4, use: true },

    { phrase: "stories of forgotten lives", rating: 3, use: true },
    { phrase: "scrapbook of forgotten lives", rating: 3, use: true },
    { phrase: "photo-narrative anthology", rating: 3, use: true },
    { phrase: "mythic storytelling", rating: 3, use: true },
    { phrase: "emotional fine art", rating: 3, use: true },
    { phrase: "timeless visual narratives", rating: 3, use: true },
    { phrase: "historic storytelling art", rating: 3, use: true },
    { phrase: "conversation-starting art", rating: 3, use: true }
  ],

  universalImagePool: [
    { phrase: "visual storytelling", rating: 5, use: true },
    { phrase: "narrative images", rating: 4, use: true },
    { phrase: "emotional stories in art", rating: 4, use: true },
    { phrase: "cinematic imagery", rating: 4, use: true },
    { phrase: "story-driven art", rating: 3, use: true },
    { phrase: "timeless imagery", rating: 3, use: true }
  ],

  imagePhrases: [
    { phrase: "every turn of the page", rating: 5, use: true },
    { phrase: "Embrace the Past – Live the Story", rating: 5, use: true },
    { phrase: "award-winning historical photography", rating: 4, use: true },

    { phrase: "Bring the Story Home", rating: 4, use: true },
    { phrase: "story-driven photography", rating: 5, use: true },
    { phrase: "narrative fine art", rating: 5, use: true },
    { phrase: "timeless photography", rating: 5, use: true },

    { phrase: "collector-worthy prints", rating: 4, use: true },
    { phrase: "handcrafted fine art", rating: 4, use: true },

    { phrase: "gallery highlights", rating: 4, use: true },
    { phrase: "gallery-worthy photography", rating: 3, use: true },
    { phrase: "personalized fine art", rating: 3, use: true },
    { phrase: "art with feeling", rating: 3, use: true },

    { phrase: "window into the past", rating: 3, use: true },
    { phrase: "with striking realism", rating: 3, use: true },

    { phrase: "framed photography", rating: 3, use: true },
    { phrase: "wayne heim's work", rating: 3, use: true },
    { phrase: "changed the course of time", rating: 3, use: true },

    { phrase: "fine art for story lovers", rating: 3, use: true },
    { phrase: "tactile storytelling", rating: 3, use: true },
    { phrase: "bringing history to life", rating: 3, use: true },
    { phrase: "Americana wall art", rating: 4, use: true },
    { phrase: "scrapbook of time imagery", rating: 3, use: true },
    { phrase: "storytelling fine art prints", rating: 4, use: true }
  ]
},



    // --- SYNONYMS (cleaned + validated) ---
  synonymMap: {
    "civil war photography": [
      "civil war art", 
      "civil war prints", 
      "civil war reenactment art", 
      "civil war battle art", 
      "historic civil war photo", 
      "valor & loss art"
    ],

    "civil war art prints": [
      "battle of gettysburg print", 
      "antietam art", 
      "union army wall art", 
      "confederate art", 
      "vintage war prints"
    ],

    "western cowboy art": [
      "western art", 
      "cowboy art prints", 
      "cowboy painting art"
    ],

    "wild west photography": [
      "wild west",
      "old west art", 
      "wild west fine art photography",
      "american frontier photography"
    ],

    "western narratives": [
      "western narrative photography",
      "narrative western photography",
      "western storytelling photography",
      "cinematic western photography"
    ],

    "native american portraits": [
      "native americans",
      "native american fine art photography",
      "native american portrait photography",
      "indigenous portrait photography"
    ],

    "wild west cowboy photography prints": [
      "wild west wall art",
      "cowboy photography prints",
      "western cowboy prints"
    ],

    "vintage western wall art": [
      "vintage cowboy prints",
      "old west wall decor",
      "rustic western prints"
    ],

    "roaring 20s photography": [
      "gatsby art", 
      "flapper portraits", 
      "speakeasy wall art", 
      "bootlegger art", 
      "prohibition era photography"
    ],

    "roaring twenties portraits": [
      "1920s art", 
      "jazz age portraits", 
      "vintage roaring twenties photo"
    ],

    "wwii photography": [
      "world war ii art", 
      "wartime prints", 
      "greatest generation art", 
      "historic war photography", 
      "brotherhood & sacrifice art"
    ],

    "world war ii art": [
      "wwii wall art", 
      "wwii fine art", 
      "vintage wartime prints", 
      "men & machines photography"
    ],

    "engrained series": [
      "photography on wood", 
      "printed on birch", 
      "baltic birch wall art", 
      "photography on baltic birch"
    ],

    "painterly photography": [
      "photo painting", 
      "artistic photography", 
      "emotional storytelling photography"
    ],

    "historic wall art": [
      "american history art", 
      "legacy photography", 
      "vintage story prints"
    ],

    "collector photography": [
      "award-winning fine art"
    ],

    "story-driven photography": [
      "visual storytelling", 
      "narrative art"
    ],

    "legacy portraits": [
      "generational photography"
    ],

    "painterly fine art photography": [
      "pictorialist photography", 
      "fine art photography", 
      "narrative photography", 
      "storytelling photography"
    ],

    "fine art landscape photography": [
      "painterly landscapes"
    ],

    "western landscape photography": [
      "american west art"
    ],

    "emotive wall art": [
      "conversation art"
    ],

    "archival fine art prints": [
      "gallery-quality prints"
    ],

    "handcrafted fine art": [
      "art printed on wood"
    ],

    "western fine art": [
      "western art", 
      "cowboy fine art", 
      "fine art western photography", 
      "western wall decor"
    ],

    "custom painterly portraits": [
      "commissioned art", 
      "bespoke portrait photography"
    ],

    "painterly transportation photography": [
      "vintage transportation prints", 
      "railroad fine art", 
      "classic vehicle photography", 
      "locomotive wall art"
    ],

    "vintage train photography": [
      "steam locomotive prints", 
      "railroad art", 
      "historic train wall art", 
      "engine yard photography"
    ],

    "classic car photography": [
      "vintage auto art", 
      "rust and chrome photography"
    ],

    "americana wall art": [
      "classic american cars", 
      "vintage roadside photography", 
      "freedom of the road prints"
    ]
  }
};
