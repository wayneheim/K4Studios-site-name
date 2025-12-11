

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
      { phrase: "Reenactor Portraits", rating: 5, use: true },
      { phrase: "historical reenactment photography", rating: 5, use: true },
      { phrase: "timeless reenactor portraits", rating: 4, use: true },
      { phrase: "living history portraiture", rating: 4, use: true },
       { phrase: "historic reenactment", rating: 5, use: true },
      { phrase: "fine art reenactor prints", rating: 3, use: true },

      { phrase: "fine art reenactment photography", rating: 5, use: true },
      { phrase: "reenactor photography", rating: 3, use: true },
      { phrase: "reenactment photography", rating: 3, use: true },
      { phrase: "reenacting photos", rating: 3, use: true }

    ],
    imagePhrases: [
      { phrase: "reenactor photography", rating: 5, use: true },
      { phrase: "historic reenactor prints", rating: 4, use: true },
      { phrase: "reenactment portraits", rating: 4, use: true },
      { phrase: "period costume photography", rating: 3, use: true },
      { phrase: "living history art", rating: 3, use: true }
    ]
  },
  // --- PRINT OPTIONS & PRESENTATION ---
  printOptions: {
    path: "/Other/Print-Options",
    def: "A guide to Wayne's museum-quality print options, paper types, mounting, and finishing—crafted for collectors and those who want their art to last.",
    landingPhrases: [
      { phrase: "print options", rating: 5, use: true },
      { phrase: "Archival Paper Prints", rating: 5, use: true },
      { phrase: "Acrylic", rating: 5, use: true },
      { phrase: "fine art print options", rating: 5, use: true },
      { phrase: "paper types", rating: 4, use: true },
      { phrase: "framing and mounting", rating: 4, use: true },
      { phrase: "display and presentation", rating: 4, use: true },
      { phrase: "museum quality prints", rating: 4, use: true },
      { phrase: "archival finishing", rating: 3, use: true },
      { phrase: "gallery wrap", rating: 3, use: true },
       { phrase: "Fine Art Prints", rating: 5, use: true },
      { phrase: "canvas prints", rating: 3, use: true },
      { phrase: "metal prints", rating: 3, use: true },
      { phrase: "wood prints", rating: 3, use: true },
      { phrase: "acrylic prints", rating: 3, use: true },
      { phrase: "matting options", rating: 3, use: true },
      { phrase: "ordering fine art", rating: 3, use: true },
      { phrase: "how to buy art", rating: 3, use: true }
    ]
  },
  architectureTraditional: {
    path: "/Galleries/Fine-Art-Photography/Architecture/Gallery",
    def: "Classic architectural studies—form, light, and permanence rendered in traditional style.",
    landingPhrases: [
      { phrase: "Traditional Architecture Photography", rating: 5, use: true },
      { phrase: "classic architecture wall art", rating: 4, use: true },
      { phrase: "fine art architecture prints", rating: 4, use: true },
      { phrase: "timeless architectural studies", rating: 4, use: true },
      { phrase: "architecture gallery", rating: 3, use: true },
      { phrase: "historic building photography", rating: 3, use: true },
      { phrase: "architectural detail art", rating: 3, use: true }
    ],
    imagePhrases: [
      { phrase: "architecture photography", rating: 5, use: true },
      { phrase: "classic buildings", rating: 5, use: true },
      { phrase: "beauty of architecture", rating: 5, use: true },
      { phrase: "iconic landmarks", rating: 5, use: true },
      { phrase: "quiet grandeur of architecture", rating: 5, use: true },
      { phrase: "Landmarks & Icons", rating: 5, use: true },
      { phrase: "classic architecture", rating: 4, use: true },
      { phrase: "building portraits", rating: 4, use: true },
      { phrase: "traditional architecture art", rating: 3, use: true },
      { phrase: "architectural fine art", rating: 3, use: true }
    ]
  },

  architectureTraditionalTraditional: {
  path: "/Galleries/Fine-Art-Photography/Architecture", // matches LANDING_PAGE href
    def: "Architectural fine art studies that capture geometry, symmetry, and atmosphere — where light, line, and shadow define character as vividly as any portrait.",
    landingPhrases: [
      { phrase: "architectural fine art photography", rating: 5, use: true },
      { phrase: "traditional architecture photography", rating: 5, use: true },
      { phrase: "building photography", rating: 4, use: true },
      { phrase: "fine art architecture prints", rating: 4, use: true },
      { phrase: "black and white architecture", rating: 3, use: true },
      { phrase: "modern architecture photography", rating: 3, use: true },
    ],
    imagePhrases: [
      { phrase: "architectural details", rating: 4, use: true },
      { phrase: "city architecture", rating: 3, use: true },
      { phrase: "historic buildings", rating: 3, use: true },
    ]
  },

  facingHistory: {
    path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History",
    def: "An ongoing series that blends living history and painterly craft into character-driven portraiture.",
    landingPhrases: [
      { phrase: "Facing History", rating: 5, use: true },
      { phrase: "historical portraiture", rating: 5, use: true },
      { phrase: "story-driven reenactment photography", rating: 5, use: true },
      { phrase: "living history fine art", rating: 4, use: true },
       { phrase: "moments from history", rating: 5, use: true },
      { phrase: "timeless reenactor portraits", rating: 4, use: true },
      { phrase: "Step inside the story", rating: 5, use: true },
      { phrase: "evocative historical imagery", rating: 4, use: true },
      { phrase: "Pictorialism", rating: 4, use: true },
        { phrase: "Pictorialist movement", rating: 4, use: true },
         { phrase: "fantastic places", rating: 4, use: true },
      { phrase: "History in Fine Art", rating: 3, use: true },

      { phrase: "fine art painterly photography", rating: 3, use: true }

    ],
  },

  // --- PAINTERLY: FACING HISTORY ---
  cowboy: {
    path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits",
    def: "Painterly Western portraits—dust, leather, and long light—balancing grit and myth.",
    landingPhrases: [
      { phrase: "a living journey", rating: 5, use: true },
      { phrase: "Western themed art", rating: 5, use: true },
      { phrase: "Western Cowboy Portraits", rating: 5, use: true },
      { phrase: "Explore Western Photography", rating: 5, use: true },
      { phrase: "western cowboy wall art for collectors", rating: 4, use: true },
      { phrase: "the American West", rating: 5, use: true },
      { phrase: "grit & glory of the west", rating: 4, use: true },
      { phrase: "authentic frontier art prints", rating: 4, use: true },
      { phrase: "western art for rustic interiors", rating: 3, use: true },
      { phrase: "historical reenactment", rating: 3, use: true },
      { phrase: "painterly cowboy photography", rating: 5, use: true },
      { phrase: "wild west painterly photography", rating: 5, use: true },
      { phrase: "western painterly photography", rating: 4, use: true },
      { phrase: "wild west fine art prints", rating: 3, use: true },
      { phrase: "wild west inspired photography", rating: 3, use: true },
      { phrase: "old west fine art prints", rating: 3, use: true },
      { phrase: "vintage cowboy art photography", rating: 3, use: true },
      { phrase: "western inspired photography", rating: 3, use: true },
      { phrase: "western photography fine art prints", rating: 3, use: true },
      { phrase: "western fine art photography", rating: 5, use: true },
      { phrase: "western themed portrait photography", rating: 3, use: true },
      { phrase: "western photography prints", rating: 3, use: true },
      { phrase: "western portrait art", rating: 3, use: true },
      { phrase: "fine art cowboy photography", rating: 3, use: true },
      { phrase: "fine art western photography", rating: 3, use: true },
      { phrase: "western portraits", rating: 3, use: true },
      { phrase: "cowboy portraits", rating: 3, use: true },
      { phrase: "western themed photography", rating: 5, use: true },
      { phrase: "cowboy fine art prints", rating: 3, use: true },
      { phrase: "old west cowboy art", rating: 3, use: true },
      { phrase: "cowboy portrait", rating: 3, use: true },
      { phrase: "wild west cowboy art", rating: 3, use: true },
      { phrase: "photography western", rating: 3, use: true },
      { phrase: "vintage western photography", rating: 3, use: true },
      { phrase: "western artwork prints", rating: 3, use: true },
      { phrase: "cowboy artwork prints", rating: 3, use: true },
      { phrase: "western themed art", rating: 3, use: true },
      { phrase: "western cowboy paintings art", rating: 3, use: true }

    ],
    imagePhrases: [
      { phrase: "western cowboy art", rating: 5, use: true },
       { phrase: "rugged spirit", rating: 5, use: true },
      { phrase: "cowboy portraits", rating: 5, use: true },
       { phrase: "cowboy art", rating: 5, use: true },
       { phrase: "Western cowboys", rating: 5, use: true },
       { phrase: "western canon", rating: 3, use: true },
        { phrase: "cowboy artwork", rating: 5, use: true },
        { phrase: "western fine art", rating: 5, use: true },
        { phrase: "fine art Western photography", rating: 5, use: true },
       { phrase: "frontier life", rating: 5, use: true },
      { phrase: "wild west photography", rating: 5, use: true },
      { phrase: "outlaw portraits", rating: 4, use: true },
      { phrase: "historic western prints", rating: 3, use: true },
      { phrase: "painterly cowboy portraits", rating: 3, use: true },
      { phrase: "cowboy painting art", rating: 3, use: true },
      { phrase: "western art", rating: 5, use: true },
      { phrase: "western landscapes fine art", rating: 3, use: true },
      { phrase: "frederic remington", rating: 3, use: true },
      { phrase: "powerful works of art", rating: 3, use: true },
      { phrase: "rustic charm", rating: 3, use: true }
    ]
  },

  cowboyNativeAmerican: {
    path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color",
    def: "Painterly portraits honoring Native American heritage—dignity, tradition, and spirit in every image.",
    landingPhrases: [
      
      { phrase: "Native American fine art photography", rating: 5, use: true },
      { phrase: "Western Native American gallery", rating: 5, use: true },
      { phrase: "heritage and tradition in art", rating: 4, use: true },
      { phrase: "Native American wall art", rating: 4, use: true },
      { phrase: "painterly Native American portraits", rating: 4, use: true },
      { phrase: "spirit of the American West", rating: 4, use: true }
    ],
    imagePhrases: [
      { phrase: "Native American photography", rating: 5, use: true },
      { phrase: "spirit of the West", rating: 5, use: true },
      { phrase: "Native American Portraits", rating: 5, use: true },
      { phrase: "Native American art prints", rating: 5, use: true },
      { phrase: "Native American heritage art", rating: 4, use: true },
      { phrase: "Native American tradition", rating: 4, use: true },
      { phrase: "Indigenous experience", rating: 4, use: true },
      { phrase: "painterly Native American images", rating: 3, use: true }
    ]
  },

  civilwar: {
    path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits",
    def: "Portraits that echo 19th-century mood and method—duty, brotherhood, and loss.",
    landingPhrases: [
      { phrase: "Civil War Portraits", rating: 5, use: true },
      { phrase: "civil war valor & loss", rating: 5, use: true },
      { phrase: "Faces of Conflict", rating: 4, use: true },
       { phrase: "American Civil War", rating: 5, use: true },
      { phrase: "Civil War collections", rating: 5, use: true },
      { phrase: "american history wall decor", rating: 3, use: true },
      { phrase: "civil war art for history lovers", rating: 3, use: true },

      { phrase: "civil war themed photography", rating: 4, use: true },
      { phrase: "civil war inspired photography", rating: 3, use: true }

    ],
    imagePhrases: [
      { phrase: "civil war photography", rating: 5, use: true },
      { phrase: "Explore Civil War Photography", rating: 5, use: true },
      { phrase: "civil war art", rating: 4, use: true },
      { phrase: "civil war art prints", rating: 4, use: true },
      { phrase: "civil war reenactment photography", rating: 4, use: true },
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
      { phrase: "Traditional Portraits", rating: 5, use: true },
      { phrase: "Classic Portrait Photography", rating: 5, use: true },
      { phrase: "Fine Art Portraits", rating: 4, use: true },
      { phrase: "Timeless Portraits", rating: 4, use: true },
      { phrase: "Portrait Gallery", rating: 3, use: true }
    ],
    imagePhrases: [
      { phrase: "portrait photography", rating: 5, use: true },
      { phrase: "traditional portrait", rating: 5, use: true },
      { phrase: "classic portrait", rating: 4, use: true },
      { phrase: "fine art portrait", rating: 4, use: true },
      { phrase: "timeless portrait", rating: 4, use: true },
      { phrase: "portrait art", rating: 3, use: true },
      { phrase: "portraiture", rating: 3, use: true }
    ]
  },

  wwii: {
    path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII",
    def: "Cinematic portraits honoring the Greatest Generation—service, sacrifice, resilience.",
    landingPhrases: [
      { phrase: "WWII Portraits", rating: 5, use: true },
      { phrase: "Discover WWII Photography", rating: 5, use: true },
      { phrase: "the Greatest Generation", rating: 5, use: true },
      { phrase: "WWII Sacrifice & Brotherhood", rating: 5, use: true },
      { phrase: "wartime photography", rating: 4, use: true },

      { phrase: "historical themed photography", rating: 5, use: true },
      { phrase: "historically themed photography", rating: 5, use: true },
      { phrase: "wwii themed fine art photography", rating: 5, use: true },
      { phrase: "wwii themed photography", rating: 5, use: true },
      { phrase: "wwii inspired photography", rating: 4, use: true },
      { phrase: "wwii reenactment photography", rating: 3, use: true }

    ],
  },

  wwiiPortraits: {
    path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits",
    def: "Faces from a difficult era—quiet strength rendered with painterly tone.",
    landingPhrases: [
      { phrase: "WWII Portraits", rating: 5, use: true },
      { phrase: "Discover WWII Photography", rating: 5, use: true },
      { phrase: "the Greatest Generation", rating: 5, use: true },
      { phrase: "WWII Sacrifice & Brotherhood", rating: 5, use: true },
      { phrase: "wartime photography", rating: 4, use: true },
      { phrase: "portraits", rating: 4, use: true },
    ],
    imagePhrases: [
      { phrase: "wwii photography", rating: 5, use: true },
      { phrase: "wartime portraits", rating: 4, use: true },
      { phrase: "greatest generation photos", rating: 4, use: true },
      { phrase: "moments of connection", rating: 3, use: true },
      { phrase: "heroic portraits", rating: 3, use: true },
    ],
  },

  wwiiArtOfWar: {
    path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War",
    def: "Motion, tension, and resolve—fragments from the front rendered as art.",
    landingPhrases: [
      { phrase: "The Art of War", rating: 5, use: true },
      { phrase: "WWII Battle Photography", rating: 5, use: true },
      { phrase: "Scenes from the Front", rating: 4, use: true },
      { phrase: "combat documentary photography", rating: 3, use: true },
      { phrase: "Art of War", rating: 3, use: true },
    ],
    imagePhrases: [
      { phrase: "war zone photography", rating: 5, use: true },
       { phrase: "Second World War", rating: 5, use: true },
      { phrase: "battlefield moments", rating: 4, use: true },
      { phrase: "WWII action art", rating: 3, use: true },
      { phrase: "wwii artistic documentary", rating: 3, use: true },
      { phrase: "WWII battlefield", rating: 3, use: true },
    ],
  },

  wwiiMenAndMachines: {
    path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines",
    def: "Human presence beside steel and fuel—a study of scale, sound, and craft.",
    landingPhrases: [
      { phrase: "Men & Machines", rating: 5, use: true },
      { phrase: "Men and Machines", rating: 5, use: true },
      { phrase: "WWII Military Equipment", rating: 4, use: true },
      { phrase: "Life Behind the Lines", rating: 4, use: true },
      { phrase: "WWII Mechanized Might", rating: 3, use: true },
    ],
    imagePhrases: [
      { phrase: "wwii tanks and trucks", rating: 4, use: true },
      { phrase: "mechanical war art", rating: 3, use: true },
      { phrase: "battle-ready machines", rating: 3, use: true },
      { phrase: "military machinery prints", rating: 2, use: true },
      { phrase: "history's greatest conflicts", rating: 2, use: true },
    ],
  },

  wwiiMenAndMachinesBW: {
    path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White",
    def: "Human presence beside steel and fuel—a study of scale, sound, and craft in black and white.",
    landingPhrases: [
      { phrase: "Men & Machines B/W", rating: 5, use: true },
      { phrase: "WWII Military Equipment B/W", rating: 4, use: true },
      { phrase: "Black & White WWII Machines", rating: 4, use: true },
      { phrase: "Monochrome WWII Mechanized Might", rating: 3, use: true },
    ],
    imagePhrases: [
      { phrase: "wwii tanks and trucks", rating: 4, use: true },
      { phrase: "mechanical war art", rating: 3, use: true },
      { phrase: "battle-ready machines", rating: 3, use: true },
      { phrase: "military machinery prints", rating: 2, use: true },
      { phrase: "history's greatest conflicts", rating: 2, use: true },
    ],
  },

  wwiiMenAndMachinesColor: {
    path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color",
    def: "Human presence beside steel and fuel—a study of scale, sound, and craft in vivid color.",
    landingPhrases: [
      { phrase: "Men & Machines Color", rating: 5, use: true },
      { phrase: "WWII Military Equipment Color", rating: 4, use: true },
      { phrase: "Color WWII Machines", rating: 4, use: true },
      { phrase: "Vivid WWII Mechanized Might", rating: 3, use: true },
    ],
    imagePhrases: [
      { phrase: "wwii tanks and trucks", rating: 4, use: true },
      { phrase: "mechanical war art", rating: 3, use: true },
      { phrase: "battle-ready machines", rating: 3, use: true },
      { phrase: "military machinery prints", rating: 2, use: true },
      { phrase: "history's greatest conflicts", rating: 2, use: true },
    ],
  },

  roaring20s: {
    path: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits",
    def: "Deco mood and velvet light—jazz-age portraits with a modern finish.",
    landingPhrases: [
      { phrase: "Roaring 20s Portraits", rating: 5, use: true },
      { phrase: "The Roaring 20s", rating: 5, use: true },
       { phrase: "Roaring 20s", rating: 5, use: true },
      { phrase: "Step into the Roaring 20s", rating: 5, use: true },
      { phrase: "gatsby era art", rating: 4, use: true },
      { phrase: "roaring 20s wall art for jazz fans", rating: 4, use: true },
      { phrase: "Bootleggers", rating: 4, use: true },

      { phrase: "roaring 20s inspired photography", rating: 3, use: true }

    ],
    imagePhrases: [
      { phrase: "roaring 20s photography", rating: 5, use: true },
      { phrase: "roaring twenties portraits", rating: 4, use: true },
      { phrase: "1920s portraits", rating: 4, use: true },
      { phrase: "roaring 20s art", rating: 3, use: true },
    ],
  },

  engrained: {
    path: "/Other/K4-Select-Series/Engrained/Engrained-Series",
    def: "Photographic prints on wood—tone and grain working together for a tactile finish.",
    landingPhrases: [
      { phrase: "engrained series", rating: 5, use: true },
      { phrase: "stories etched in wood", rating: 4, use: true },
      { phrase: "Engrained Prints", rating: 5, use: true },
      { phrase: "engrained wood prints for rustic interiors", rating: 4, use: true },
      { phrase: "fine art prints on wood", rating: 3, use: true },
    ],
    imagePhrases: [
      { phrase: "photography printed on wood", rating: 5, use: true },
      { phrase: "wood panel art", rating: 4, use: true },
      { phrase: "printed on birch", rating: 4, use: true },
      { phrase: "baltic birch wall art", rating: 3, use: true },
      { phrase: "wood-mounted art", rating: 3, use: true },
      { phrase: "historically inspired photo on wood", rating: 3, use: true },
      { phrase: "photo printed on wood panel", rating: 3, use: true },
      { phrase: "museum quality historical prints", rating: 3, use: true },
    ],
  },

  // --- PAINTERLY: LANDSCAPES BY LOCATION ---
  landscapeIntPainterly: {
    path: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/International",
    def: "Abroad—where light behaves differently enough to make you look twice.",
    landingPhrases: [
      { phrase: "natural grain", rating: 5, use: true },
      { phrase: "cinematic landscapes", rating: 3, use: true },
      { phrase: "International Painterly Landscapes", rating: 5, use: true },
      { phrase: "european landscape art", rating: 4, use: true },
      { phrase: "world landscapes fine art", rating: 3, use: true },
    ],
    imagePhrases: [
      { phrase: "International – Across Borders", rating: 4, use: true },
      { phrase: "fantastic places", rating: 4, use: true },
      { phrase: "international landscape photography", rating: 5, use: true },
      { phrase: "painterly european landscapes", rating: 4, use: true },
    ],
  },

  landscapeWestPainterly: {
    path: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West",
    def: "Big sky and long light—landscapes that breathe at horizon scale.",
    landingPhrases: [
      { phrase: "Western Painterly Landscapes", rating: 5, use: true },
      { phrase: "mountain west fine art photography", rating: 4, use: true },

      { phrase: "painterly fine art landscape photography", rating: 4, use: true },
      { phrase: "painterly landscape photography", rating: 3, use: true },
      { phrase: "painterly sunset photography", rating: 3, use: true },
      { phrase: "western landscape photography", rating: 3, use: true }

    ],
    imagePhrases: [
      { phrase: "western landscape photography", rating: 5, use: true },
       { phrase: "ethereal landscapes", rating: 5, use: true },
      { phrase: "feel every layer of it", rating: 4, use: true },
    ],
  },

  landscapeMidwestPainterly: {
    path: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Midwest",
    def: "Quiet fields, big weather, and patient color.",
    landingPhrases: [
      { phrase: "Midwest Painterly Landscapes", rating: 5, use: true },
      { phrase: "midwestern landscape art", rating: 4, use: true },
    ],
    imagePhrases: [
      { phrase: "midwest landscape photography", rating: 5, use: true },

    ],
  },

  landscapeNortheastPainterly: {
    path: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Northeast",
    def: "Stone walls, tide, and autumn—rendered with soft detail.",
    landingPhrases: [
      { phrase: "Northeast Painterly Landscapes", rating: 5, use: true },
      { phrase: "new england landscape art", rating: 4, use: true },
    ],
    imagePhrases: [
      { phrase: "The Northeast", rating: 5, use: true },
      { phrase: "see beauty in simplicity", rating: 5, use: true },
      { phrase: "autumn in new england", rating: 4, use: true },
    ],
  },

  landscapeSouthPainterly: {
    path: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/South",
    def: "Humidity, Spanish moss, and late-day glow.",
    landingPhrases: [
      { phrase: "Southern Painterly Landscapes", rating: 5, use: true },
      { phrase: "southern landscape fine art", rating: 4, use: true },
    ],
    imagePhrases: [
      { phrase: "southern landscape photography", rating: 5, use: true },
      { phrase: "blue ridge painterly landscapes", rating: 4, use: true },
    ],
  },

  // --- PAINTERLY: LANDSCAPES BY THEME ---
  mountainsPainterly: {
    path: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains",
    def: "Ridges and weather rendered in layered tone.",
    landingPhrases: [
      { phrase: "Painterly Mountain Photography", rating: 5, use: true },
      { phrase: "mountain landscapes fine art", rating: 4, use: true },

      { phrase: "painterly mountain photography", rating: 5, use: true }

    ],
    imagePhrases: [
      { phrase: "mountain landscape photography", rating: 5, use: true },
      { phrase: "painterly mountain art", rating: 4, use: true },
    ],
  },

  waterPainterly: {
    path: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water",
    def: "Rivers, falls, and coasts where time looks slower than it felt.",
    landingPhrases: [
      { phrase: "Painterly Water Photography", rating: 5, use: true },
      { phrase: "fine art waterfall prints", rating: 4, use: true },
    ],
    imagePhrases: [
      { phrase: "waterfall landscape photography", rating: 5, use: true },
      { phrase: "the truth of a moment", rating: 5, use: true },       
      { phrase: "painterly river scenes", rating: 4, use: true },
    ],
  },

  sunsetsPainterly: {
    path: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Sunsets",
    def: "Color at the edge of day—softened, not saturated.",
    landingPhrases: [
      { phrase: "Painterly Sunset Photography", rating: 5, use: true },
       { phrase: "Golden Prairie Sunsets", rating: 5, use: true },
      { phrase: "dramatic sunset wall art", rating: 4, use: true },
    ],
    imagePhrases: [
      { phrase: "sunset landscape photography", rating: 5, use: true },
      { phrase: "painterly sunset scenes", rating: 4, use: true },
    ],
  },

  // --- TRADITIONAL FINE ART LANDSCAPES ---
  landscapeIntTraditional: {
    path: "/Galleries/Fine-Art-Photography/Landscapes/By-Location/International",
    def: "Classic field work abroad—composition and craft first.",
    landingPhrases: [
      { phrase: "International Traditional Landscapes", rating: 5, use: true },
      { phrase: "international photography", rating: 5, use: true },  
      { phrase: "International Landscapes – Global Wonders in Fine Art", rating: 5, use: true },
       { phrase: "Traditional Landscapes collection", rating: 5, use: true },
       { phrase: "International – Global Landscapes", rating: 5, use: true }, 
      { phrase: "international prints", rating: 5, use: true },   
      { phrase: "classic international landscape art", rating: 4, use: true },
    ],
  },

  canadaWesternTraditional: {
    path: "/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/Canada-Western",
    def: "Classic Canadian West—prairie, mountain, and sky in traditional landscape style.",
    landingPhrases: [
      { phrase: "Canada Western Landscapes", rating: 5, use: true },
      { phrase: "Canadian Rockies", rating: 5, use: true },   
      { phrase: "Canadian West landscape photography", rating: 5, use: true },
      { phrase: "Canada fine art landscapes", rating: 4, use: true },
       { phrase: "Western Canada – Towering peaks", rating: 5, use: true },
      { phrase: "prairie and mountain art", rating: 4, use: true },
      { phrase: "Canadian landscape prints", rating: 3, use: true }
    ],
    imagePhrases: [
      { phrase: "Canada landscape photography", rating: 5, use: true },
      { phrase: "Canadian West scenery", rating: 4, use: true },
       { phrase: " bridge for discovery", rating: 5, use: true },
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
      { phrase: "classic western landscape prints", rating: 4, use: true },
    ],
    imagePhrases: [
      { phrase: "traditional western landscape photography", rating: 5, use: true },
       { phrase: "American West – Vast Horizons", rating: 5, use: true },
        { phrase: "Western skies", rating: 5, use: true },
      { phrase: "western scenery wall art", rating: 4, use: true },
    ],
  },

  landscapeMidwestTraditional: {
    path: "/Galleries/Fine-Art-Photography/Landscapes/By-Location/Midwest/Gallery",
    def: "Plainspoken scenes—shape, light, and season.",
    landingPhrases: [
      { phrase: "Midwest Traditional Landscapes", rating: 5, use: true },
 { phrase: "Midwest Landscapes – Beauty in Simplicity", rating: 5, use: true },
  { phrase: "Midwest Rivers & Lakes", rating: 5, use: true },
      { phrase: "heartland landscape prints", rating: 4, use: true },
    ],
    imagePhrases: [
      { phrase: "traditional midwest landscape photography", rating: 5, use: true },
         { phrase: "Midwest – The Heartland Preserved", rating: 5, use: true },
        { phrase: "Ohio river valleys", rating: 5, use: true },
      { phrase: "classic heartland scenery", rating: 4, use: true },
    ],
  },

  landscapeNortheastTraditional: {
    path: "/Galleries/Fine-Art-Photography/Landscapes/By-Location/Northeast",
    def: "Granite, tide, and a certain understatement.",
    landingPhrases: [
      { phrase: "Northeast Traditional Landscapes", rating: 5, use: true },
      { phrase: "new england scenery wall art", rating: 4, use: true },
    ],
    imagePhrases: [
      { phrase: "traditional northeast landscape photography", rating: 5, use: true },
       { phrase: "Northeast – History and Contrast", rating: 5, use: true },
      { phrase: "new england landscapes fine art", rating: 4, use: true },
    ],
  },

  landscapeSouthTraditional: {
    path: "/Galleries/Fine-Art-Photography/Landscapes/By-Location/South",
    def: "Still water, heavy air, and generous shadow.",
    landingPhrases: [
      { phrase: "Southern Traditional Landscapes", rating: 5, use: true },
      { phrase: "southern scenery wall art", rating: 4, use: true },
    ],
    imagePhrases: [
      { phrase: "traditional southern landscape photography", rating: 5, use: true },
         { phrase: "South – Light and Legacy", rating: 5, use: true },
      { phrase: "southern landscape prints", rating: 4, use: true },
    ],
  },

  mountainsTraditional: {
    path: "/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Mountains",
    def: "Clean lines, honest color, and a long view.",
    landingPhrases: [
      { phrase: "Traditional Mountain Photography", rating: 5, use: true },
      { phrase: "classic mountain landscape art", rating: 4, use: true },
    ],
    imagePhrases: [
      { phrase: "mountain landscape photography", rating: 5, use: true },
      { phrase: "mountain storm", rating: 3, use: true },
      { phrase: "mountain scenery fine art", rating: 4, use: true },
    ],
  },

  waterTraditional: {
    path: "/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Water",
    def: "Water recorded simply and well—composition and tone carry the rest.",
    landingPhrases: [
      { phrase: "Traditional Water Photography", rating: 5, use: true },
       { phrase: "Water & Waterfall Photography – Nature in Motion", rating: 5, use: true },
      { phrase: "classic water landscape prints", rating: 4, use: true },
    ],
    imagePhrases: [
      { phrase: "water landscape photography", rating: 5, use: true },
      { phrase: "river and waterfall wall art", rating: 4, use: true },
    ],
  },

  sunsetsTraditional: {
    path: "/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Sunsets",
    def: "The end of day in measured color and line.",
    landingPhrases: [
      { phrase: "Traditional Sunset Photography", rating: 5, use: true },
      { phrase: "sunset landscape wall art", rating: 4, use: true },
    ],
    imagePhrases: [
      { phrase: "sunset photography", rating: 5, use: true },
      { phrase: "classic sunset scenery", rating: 4, use: true },
    ],
  },

  // --- GENERAL ---
  landscape: {
    path: "/Galleries/Painterly-Fine-Art-Photography/Landscapes",
    def: "Landscapes developed for tone, texture, and lyrical depth.",
    landingPhrases: [
      { phrase: "Painterly Landscape Photography", rating: 5, use: true },
      { phrase: "western painterly landscape photography", rating: 4, use: true },
       { phrase: "feel the landscape", rating: 5, use: true },
      { phrase: "mountain photography", rating: 4, use: true },
      { phrase: "fine art landscape prints for collectors", rating: 3, use: true },
    ],
  },

  landscapeTraditional: {
    path: "/Galleries/Fine-Art-Photography/Landscapes",
    def: "Traditional landscapes—composition, craft, and honest light.",
    landingPhrases: [
      { phrase: "Traditional Landscape Photography", rating: 5, use: true },
      { phrase: "classic landscape wall art", rating: 4, use: true },
      { phrase: "landscape photography", rating: 5, use: true },     
       { phrase: "traditional fine art style", rating: 5, use: true },
      { phrase: "fine art landscape prints", rating: 4, use: true },
      { phrase: "timeless landscape photography", rating: 4, use: true },
      { phrase: "traditional landscape gallery", rating: 3, use: true },
      { phrase: "landscape art for collectors", rating: 3, use: true }
    ],
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
      { phrase: "wildlife photography", rating: 5, use: true },
      { phrase: "animal portraits", rating: 4, use: true },
      { phrase: "nature's creatures", rating: 4, use: true },
      { phrase: "wildlife art", rating: 3, use: true }
    ],
    imagePhrases: [
      { phrase: "wildlife photography", rating: 5, use: true },
      { phrase: "animal portrait", rating: 5, use: true },
      { phrase: "nature's beauty", rating: 4, use: true },
      { phrase: "wildlife art", rating: 4, use: true },
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
      { phrase: "visual storytelling", rating: 5, use: true },
      { phrase: "Transportation", rating: 5, use: true },
      { phrase: "Classic Cars & Trucks Collection", rating: 5, use: true },
      { phrase: "Route 66 Photography", rating: 5, use: true },
      { phrase: "Steam Engine Photography", rating: 5, use: true },
      { phrase: "painterly transportation photography", rating: 4, use: true },

      { phrase: "painterly car photography", rating: 5, use: true },
      { phrase: "painterly train photography", rating: 5, use: true }

    ],
    imagePhrases: [
      { phrase: "classic car photography", rating: 5, use: true },
      { phrase: "vintage train photography", rating: 5, use: true },
      { phrase: "boat photography", rating: 5, use: true },
      { phrase: "plane photography", rating: 5, use: true },
      { phrase: "military vehicle photography", rating: 5, use: true },
      { phrase: "steam engine photography", rating: 4, use: true },
      { phrase: "steam engine art", rating: 4, use: true },
      { phrase: "nautical art", rating: 4, use: true },
      { phrase: "aviation art", rating: 4, use: true },
      { phrase: "military art", rating: 4, use: true },
      { phrase: "route 66 car photography prints", rating: 4, use: true },
      { phrase: "americana wall art", rating: 4, use: true },
      { phrase: "classic car art prints for enthusiasts", rating: 3, use: true },
      { phrase: "painterly classic car photos for auto lovers", rating: 3, use: true },
      { phrase: "boat art prints for enthusiasts", rating: 3, use: true },
      { phrase: "painterly boat photos for nautical lovers", rating: 3, use: true },
      { phrase: "plane art prints for enthusiasts", rating: 3, use: true },
      { phrase: "painterly plane photos for aviation lovers", rating: 3, use: true },
      { phrase: "military vehicle art prints for enthusiasts", rating: 3, use: true },
      { phrase: "painterly military photos for history lovers", rating: 3, use: true },
      { phrase: "americana wall art for garages", rating: 3, use: true },
      { phrase: "automotive art prints", rating: 3, use: true },
      { phrase: "nautical art prints", rating: 3, use: true },
      { phrase: "aviation art prints", rating: 3, use: true },
      { phrase: "military art prints", rating: 3, use: true },
      { phrase: "vintage train photography for man cave", rating: 3, use: true },
      { phrase: "steam engine wall art for collectors", rating: 3, use: true },
      { phrase: "route 66 art", rating: 3, use: true },
      { phrase: "americana photography", rating: 3, use: true },
      { phrase: "vintage auto art", rating: 3, use: true },
      { phrase: "rust and chrome photography", rating: 3, use: true },
      { phrase: "timeless automotive prints", rating: 3, use: true },
      { phrase: "timeless nautical prints", rating: 3, use: true },
      { phrase: "timeless aviation prints", rating: 3, use: true },
      { phrase: "timeless military prints", rating: 3, use: true },
      { phrase: "locomotive painterly photography for home decor", rating: 3, use: true },
      { phrase: "steam engine wall art for collectors", rating: 3, use: true },
      { phrase: "boat wall art for collectors", rating: 3, use: true },
      { phrase: "plane wall art for collectors", rating: 3, use: true },
      { phrase: "military wall art for collectors", rating: 3, use: true },
    ],
  },

  transportationTraditional: {
  path: "/Galleries/Fine-Art-Photography/Transportation",
    def: "Classic cars, trucks, and rails—timeworn texture, story-first framing in traditional style.",
    landingPhrases: [
      { phrase: "visual storytelling", rating: 5, use: true },
      { phrase: "Transportation", rating: 5, use: true },
      { phrase: "Classic Cars & Trucks Collection", rating: 5, use: true },
      { phrase: "Route 66 Photography", rating: 5, use: true },
      { phrase: "Steam Engine Photography", rating: 5, use: true },
      { phrase: "traditional transportation photography", rating: 4, use: true },

      { phrase: "traditional car photography", rating: 5, use: true },
      { phrase: "traditional train photography", rating: 5, use: true }

    ],
    imagePhrases: [
      { phrase: "classic car photography", rating: 5, use: true },
      { phrase: "vintage train photography", rating: 5, use: true },
      { phrase: "boat photography", rating: 5, use: true },
      { phrase: "plane photography", rating: 5, use: true },
      { phrase: "military vehicle photography", rating: 5, use: true },
      { phrase: "steam engine photography", rating: 4, use: true },
      { phrase: "steam engine art", rating: 4, use: true },
      { phrase: "nautical art", rating: 4, use: true },
      { phrase: "aviation art", rating: 4, use: true },
      { phrase: "military art", rating: 4, use: true },
      { phrase: "route 66 car photography prints", rating: 4, use: true },
      { phrase: "americana wall art", rating: 4, use: true },
      { phrase: "classic car art prints for enthusiasts", rating: 3, use: true },
      { phrase: "painterly classic car photos for auto lovers", rating: 3, use: true },
      { phrase: "boat art prints for enthusiasts", rating: 3, use: true },
      { phrase: "painterly boat photos for nautical lovers", rating: 3, use: true },
      { phrase: "plane art prints for enthusiasts", rating: 3, use: true },
      { phrase: "painterly plane photos for aviation lovers", rating: 3, use: true },
      { phrase: "military vehicle art prints for enthusiasts", rating: 3, use: true },
      { phrase: "painterly military photos for history lovers", rating: 3, use: true },
      { phrase: "americana wall art for garages", rating: 3, use: true },
      { phrase: "automotive art prints", rating: 3, use: true },
      { phrase: "nautical art prints", rating: 3, use: true },
      { phrase: "aviation art prints", rating: 3, use: true },
      { phrase: "military art prints", rating: 3, use: true },
      { phrase: "transportation art", rating: 3, use: true },
      { phrase: "vintage transportation photography", rating: 3, use: true },
      { phrase: "classic transportation art", rating: 3, use: true },
      { phrase: "timeless transportation prints", rating: 3, use: true },
      { phrase: "timeless car prints", rating: 3, use: true },
      { phrase: "timeless train prints", rating: 3, use: true },
      { phrase: "timeless boat prints", rating: 3, use: true },
      { phrase: "timeless plane prints", rating: 3, use: true },
      { phrase: "timeless military prints", rating: 3, use: true },
      { phrase: "locomotive painterly photography for home decor", rating: 3, use: true },
      { phrase: "steam engine wall art for collectors", rating: 3, use: true },
      { phrase: "boat wall art for collectors", rating: 3, use: true },
      { phrase: "plane wall art for collectors", rating: 3, use: true },
      { phrase: "military wall art for collectors", rating: 3, use: true },
    ],
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
      { phrase: "plane photography", rating: 5, use: true },
      { phrase: "military equipment photography", rating: 4, use: true },
      { phrase: "vintage military machine", rating: 4, use: true },
      { phrase: "historic tank", rating: 4, use: true },
      { phrase: "classic jeep", rating: 4, use: true },
      { phrase: "military aviation photography", rating: 4, use: true },
      { phrase: "military vehicle art", rating: 3, use: true },
      { phrase: "tank art prints", rating: 3, use: true },
      { phrase: "jeep art prints", rating: 3, use: true },
      { phrase: "plane art prints", rating: 3, use: true },
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
      { phrase: "Steam Engine Gallery", rating: 4, use: true },
      { phrase: "Locomotive Art Collection", rating: 4, use: true },
      { phrase: "Historic Trains", rating: 3, use: true }
    ],
    imagePhrases: [
      { phrase: "train photography", rating: 5, use: true },
      { phrase: "steam engine photography", rating: 5, use: true },
      { phrase: "locomotive photography", rating: 4, use: true },
      { phrase: "railway photography", rating: 4, use: true },
      { phrase: "vintage train photography", rating: 4, use: true },
      { phrase: "historic locomotive photography", rating: 3, use: true },
      { phrase: "steam train art", rating: 3, use: true },
      { phrase: "railway art prints", rating: 3, use: true },
      { phrase: "locomotive wall art", rating: 3, use: true },
      { phrase: "train photography prints", rating: 3, use: true },
      { phrase: "vintage railway wall art", rating: 3, use: true },
      { phrase: "timeless locomotive prints", rating: 3, use: true }
    ]
  },

  // --- PAINTERLY: MAIN LANDING ---
  painterly: {
    path: "/Galleries/Painterly-Fine-Art-Photography",
    def: "A signature blend of photographic realism and painterly depth.",
    landingPhrases: [
      { phrase: "Painterly Fine Art Photography", rating: 5, use: true },
      { phrase: "painterly photography", rating: 5, use: true },
      { phrase: "painterly storytelling", rating: 5, use: true },
      { phrase: "Read the full story here", rating: 5, use: true },
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
      { phrase: "Traditional Fine Art collection", rating: 5, use: true },      
      { phrase: "traditional fine art photography", rating: 5, use: true },
      { phrase: "fine art gallery", rating: 4, use: true },
      { phrase: "classic fine art photos", rating: 4, use: true },
      { phrase: "timeless fine art", rating: 4, use: true },
    ],
  },

  // Keep universal.path for branch-based image selection, as expected by the linker
  universal: {
    path: "/Galleries",
    imagePhrases: [
      { phrase: "every turn of the page", rating: 5, use: true },
      { phrase: "Embrace the Past – Live the Story", rating: 5, use: true },
      { phrase: "award-winning fine art photographer", rating: 5, use: true },
      { phrase: "museum quality prints", rating: 5, use: true },
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
      { phrase: "museum quality historical prints", rating: 3, use: true },
      { phrase: "timeless portrait", rating: 3, use: true },
      { phrase: "window into the past", rating: 3, use: true },
      { phrase: "with striking realism", rating: 3, use: true },
      { phrase: "custom painterly portraits", rating: 3, use: true },
      { phrase: "framed photography", rating: 3, use: true },
      { phrase: "wayne heim's work", rating: 3, use: true },
      { phrase: "changed the course of time", rating: 3, use: true },
      { phrase: "painterly photography for galleries", rating: 3, use: true },
      { phrase: "fine art for story lovers", rating: 3, use: true },
      { phrase: "timeless photography for lodges", rating: 3, use: true },
      { phrase: "Vintage Trucks", rating: 3, use: true },
      { phrase: "Classic Cars", rating: 3, use: true },
      { phrase: "powerful works of art", rating: 3, use: true },
      { phrase: "tactile storytelling", rating: 3, use: true },
      { phrase: "bringing history to life", rating: 3, use: true }
    ]
  },

  // --- SYNONYMS (unchanged) ---
  synonymMap: {
    "civil war photography": [
      "civil war art", "civil war prints", "civil war reenactment art", "civil war battle art", "historic civil war photo", "valor & loss art"
    ],
    "civil war art prints": [
      "battle of gettysburg print", "antietam art", "union army wall art", "confederate art", "vintage war prints"
    ],
    "western cowboy art": [
      "western art", "cowboy art prints", "cowboy painting art"
    ],
    "wild west photography": [
      "old west art", "painterly cowboy portraits"
    ],
    "roaring 20s photography": [
      "gatsby art", "flapper portraits", "speakeasy wall art", "bootlegger art", "prohibition era photography"
    ],
    "roaring twenties portraits": [
      "1920s art", "jazz age portraits", "vintage roaring twenties photo", 
    ],
    "wwii photography": [
      "world war ii art", "wartime prints", "greatest generation art", "historic war photography", "brotherhood & sacrifice art"
    ],
    "world war ii art": [
      "wwii wall art", "wwii fine art", "vintage wartime prints", "men & machines photography"
    ],
    "engrained series": [
      "photography on wood", "printed on birch", "baltic birch wall art", "photography on baltic birch"
    ],
    "painterly photography": [
      "photo painting", "artistic photography", "emotional storytelling photography"
    ],
    "historic wall art": [
      "american history art", "legacy photography", "vintage story prints"
    ],
    "collector photography": [
      "award-winning fine art"
    ],
    "story-driven photography": [
      "visual storytelling", "narrative art"
    ],
    "legacy portraits": [
      "generational photography"
    ],
    "painterly fine art photography": [
      "pictorialist photography", "fine art photography", "narrative photography", "storytelling photography"
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
  "western art", "cowboy fine art", "fine art western photography", "western wall decor"
],
    "custom painterly portraits": [
      "commissioned art", "bespoke portrait photography"
    ],
    "painterly transportation photography": [
      "vintage transportation prints", "railroad fine art", "classic vehicle photography", "locomotive wall art"
    ],
    "vintage train photography": [
      "steam locomotive prints", "railroad art", "historic train wall art", "engine yard photography"
    ],
    "classic car photography": [
      "vintage auto art", "rust and chrome photography"
    ],
    "americana wall art": [
      "classic american cars", "vintage roadside photography", "freedom of the road prints"
    ]
  }
};
