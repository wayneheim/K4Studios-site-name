/**
 * update-western-descriptions.mjs
 * 
 * Programmatically updates description fields in Color.mjs or Black-White.mjs
 * using a consistent SEO template for western themed photography.
 * 
 * Run modes:
 *   node scripts/update-western-descriptions.mjs --dry-run     (preview only)
 *   node scripts/update-western-descriptions.mjs --limit=25    (first 25 matches)
 *   node scripts/update-western-descriptions.mjs               (full run with .tmp safety)
 *   node scripts/update-western-descriptions.mjs --bw          (target Black-White gallery)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const IS_BW = args.includes('--bw');
const IS_NA = args.includes('--na');
const IS_CW = args.includes('--cw');
const IS_WWII = args.includes('--wwii');
const IS_R20S = args.includes('--r20s');
const IS_LANDSCAPE = args.includes('--landscape');
// WWII sub-galleries
const IS_WWII_PORTRAITS = args.includes('--portraits');
const IS_WWII_MACHINES = args.includes('--machines');
const IS_WWII_WAR = args.includes('--war');
// Landscape theme sub-galleries
const IS_LANDSCAPE_MOUNTAINS = args.includes('--mountains');
const IS_LANDSCAPE_SUNSETS = args.includes('--sunsets');
const IS_LANDSCAPE_WATER = args.includes('--water');
// Landscape location sub-galleries
const IS_LOCATION = args.includes('--location');
const IS_LOCATION_WEST = args.includes('--west');
const IS_LOCATION_MIDWEST = args.includes('--midwest');
const IS_LOCATION_NORTHEAST = args.includes('--northeast');
const IS_LOCATION_SOUTH = args.includes('--south');
const IS_LOCATION_INTERNATIONAL = args.includes('--international');
const LIMIT_MATCH = args.find(a => a.startsWith('--limit='));
const MAX_UPDATES = LIMIT_MATCH ? parseInt(LIMIT_MATCH.split('=')[1], 10) : Infinity;

// Determine gallery type for display
let GALLERY_TYPE = 'Color';
let GALLERY_SUBDIR = 'Western-Cowboy-Portraits';
let GALLERY_BASE = 'Facing-History'; // default base path
let GALLERY_FILENAME_OVERRIDE = null; // for non-standard filenames
if (IS_LOCATION) {
  GALLERY_BASE = 'Landscapes/By-Location';
  let locationSub = 'West'; // default
  if (IS_LOCATION_MIDWEST) locationSub = 'Midwest';
  else if (IS_LOCATION_NORTHEAST) locationSub = 'Northeast';
  else if (IS_LOCATION_SOUTH) locationSub = 'South';
  else if (IS_LOCATION_INTERNATIONAL) locationSub = 'International';
  GALLERY_TYPE = `Location ${locationSub}`;
  GALLERY_SUBDIR = locationSub;
  GALLERY_FILENAME_OVERRIDE = 'Gallery.mjs';
} else if (IS_LANDSCAPE) {
  GALLERY_BASE = 'Landscapes/By-Theme';
  let landscapeSub = 'Mountains'; // default
  let landscapeFilename = 'Mountains.mjs';
  if (IS_LANDSCAPE_SUNSETS) {
    landscapeSub = 'Sunsets';
    landscapeFilename = 'Sunsets.mjs';
  } else if (IS_LANDSCAPE_WATER) {
    landscapeSub = 'Water';
    landscapeFilename = 'Water.mjs';
  }
  GALLERY_TYPE = `Landscape ${landscapeSub}`;
  GALLERY_SUBDIR = landscapeSub;
  GALLERY_FILENAME_OVERRIDE = landscapeFilename;
} else if (IS_R20S) {
  GALLERY_TYPE = IS_BW ? 'Roaring 20s Black-White' : 'Roaring 20s Color';
  GALLERY_SUBDIR = 'Roaring-20s-Portraits';
} else if (IS_WWII) {
  let wwiiSub = 'Portraits'; // default
  if (IS_WWII_MACHINES) wwiiSub = 'Machines';
  else if (IS_WWII_WAR) wwiiSub = 'War';
  GALLERY_TYPE = IS_BW ? `WWII ${wwiiSub} Black-White` : `WWII ${wwiiSub} Color`;
  GALLERY_SUBDIR = `WWII/${wwiiSub}`;
} else if (IS_CW) {
  GALLERY_TYPE = IS_BW ? 'Civil War Black-White' : 'Civil War Color';
  GALLERY_SUBDIR = 'Civil-War-Portraits';
} else if (IS_NA) {
  GALLERY_TYPE = 'Native American';
} else if (IS_BW) {
  GALLERY_TYPE = 'Black-White';
}

console.log(`\n=== Gallery Description Updater ===`);
console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
console.log(`Gallery: ${GALLERY_TYPE}`);
console.log(`Limit: ${MAX_UPDATES === Infinity ? 'none' : MAX_UPDATES} images\n`);

// Path to the gallery file based on flags
let GALLERY_FILENAME;
if (GALLERY_FILENAME_OVERRIDE) {
  GALLERY_FILENAME = GALLERY_FILENAME_OVERRIDE;
} else if (IS_NA) {
  GALLERY_FILENAME = 'NA-Color.mjs';
} else if (IS_BW) {
  GALLERY_FILENAME = 'Black-White.mjs';
} else {
  GALLERY_FILENAME = 'Color.mjs';
}
const GALLERY_PATH = join(__dirname, `../src/data/Galleries/Painterly-Fine-Art-Photography/${GALLERY_BASE}/${GALLERY_SUBDIR}/`, GALLERY_FILENAME);
const GALLERY_TMP_PATH = GALLERY_PATH + '.tmp';

// B/W specific openers - rotate between these
const BW_OPENERS = [
  'A monochrome Western photograph of',
  'A black and white Western photograph of'
];

// Civil War B/W openers
const CW_BW_OPENERS = [
  'A monochrome Civil War photograph of',
  'A black and white Civil War photograph of'
];

// Native American specific openers - rotate between these
const NA_OPENERS = [
  'A painterly photograph honoring',
  'A fine art photograph celebrating',
  'A painterly portrait of'
];

// Civil War authority sentences - rotate through these
const CW_AUTHORITY_SENTENCES = [
  "Wayne Heim's Civil War fine art photography uses a disciplined, historically grounded approach to explore the human cost of conflict beyond reenactment.",
  "This image is part of Wayne Heim's Civil War fine art photography, focused on memory, consequence, and the lived experience of those shaped by war.",
  "Wayne Heim approaches Civil War photography with restraint and historical awareness, emphasizing presence, duty, and the weight carried by individuals rather than pageantry."
];

// Civil War dominant states - specific to the era
const CW_DOMINANT_STATES = [
  'duty',
  'exhaustion',
  'resolve',
  'uncertainty',
  'aftermath',
  'vigilance',
  'burden'
];

// Civil War historical truths
const CW_HISTORICAL_TRUTHS = {
  duty: 'obligation bound men to causes larger than themselves',
  exhaustion: 'the weight of conflict wore down body and spirit alike',
  resolve: 'purpose held steady even when hope faltered',
  uncertainty: 'the next moment was never guaranteed',
  aftermath: 'what followed the battle defined those who survived',
  vigilance: 'awareness meant the difference between life and death',
  burden: 'the cost of war was carried long after the fighting ended'
};

// WWII B/W openers - rotate between these (same pattern as Western B/W)
const WWII_BW_OPENERS = [
  'A monochrome World War II photograph of',
  'A black and white World War II photograph of'
];

// WWII authority sentences - rotate through these
const WWII_AUTHORITY_SENTENCES = [
  "Wayne Heim's World War II fine art photography is grounded in historical respect and restraint, focusing on the individuals who carried the weight of global conflict rather than its spectacle.",
  "This image is part of Wayne Heim's World War II fine art photography, emphasizing service, sacrifice, and the quiet burden carried by those who lived through the war.",
  "Approaching World War II imagery with documentary discipline, Wayne Heim's work prioritizes memory, presence, and lived consequence over reenactment theatrics."
];

// WWII dominant states - specific to the era
const WWII_DOMINANT_STATES = [
  'duty',
  'resolve',
  'fatigue',
  'vigilance',
  'aftermath',
  'uncertainty',
  'quiet determination',
  'endurance'
];

// WWII historical truths
const WWII_HISTORICAL_TRUTHS = {
  duty: 'service demanded everything and promised nothing',
  resolve: 'purpose held steady when the world did not',
  fatigue: 'exhaustion was constant, rest was rare',
  vigilance: 'awareness meant survival in every theater',
  aftermath: 'what followed the fighting defined those who returned',
  uncertainty: 'the next moment was never guaranteed',
  'quiet determination': 'endurance was silent, steady, and unbroken',
  endurance: 'the weight of war was carried day after day'
};

// WWII subject hints from title
const WWII_TITLE_HINTS = {
  'infantry': 'a WWII infantryman',
  'soldier': 'a WWII soldier',
  'airman': 'a WWII airman',
  'bomber': 'a bomber crewman',
  'pilot': 'a WWII pilot',
  'medic': 'a WWII medic',
  'paratrooper': 'a paratrooper',
  'nurse': 'a WWII nurse',
  'marine': 'a WWII Marine',
  'sailor': 'a WWII sailor',
  'gunner': 'a WWII gunner',
  'tank': 'a tank crewman',
  'jeep': 'a WWII soldier',
  'plane': 'a WWII aircraft',
  'ship': 'a WWII vessel',
  'truck': 'a military vehicle'
};

// Roaring 20s B/W openers - rotate between these
const R20S_BW_OPENERS = [
  'A monochrome Roaring 20s photograph of',
  'A black and white Roaring 20s photograph of'
];

// Roaring 20s authority sentences - rotate through these
const R20S_AUTHORITY_SENTENCES = [
  "Wayne Heim's Roaring 20s fine art photography explores a society in transition, focusing on individuals shaped by changing power, expectation, and consequence.",
  "Rather than romanticizing the era, Wayne Heim's Roaring 20s photography examines character, posture, and social tension beneath the surface of the period.",
  "Approached with painterly restraint, this work treats the Roaring 20s as lived history - where identity was negotiated quietly, not performed."
];

// Roaring 20s dominant states - specific to the era
const R20S_DOMINANT_STATES = [
  'restraint',
  'tension',
  'anticipation',
  'authority',
  'ambition',
  'uncertainty',
  'composure',
  'consequence'
];

// Roaring 20s historical truths
const R20S_HISTORICAL_TRUTHS = {
  restraint: 'control defined those who navigated shifting social ground',
  tension: 'the space between old rules and new freedoms held its own weight',
  anticipation: 'the future was uncertain but unavoidable',
  authority: 'power was held by those who understood the changing landscape',
  ambition: 'aspiration shaped identity in an era of reinvention',
  uncertainty: 'the next decade would rewrite everything',
  composure: 'stillness masked the currents running beneath the surface',
  consequence: 'choices made in transition echoed forward'
};

// Roaring 20s subject hints from title
const R20S_TITLE_HINTS = {
  'bootlegger': 'a bootlegger',
  'speakeasy': 'a speakeasy patron',
  'flapper': 'a woman of the era',
  'gangster': 'a gangster',
  'agent': 'a federal agent',
  'detective': 'a detective',
  'officer': 'a police officer',
  'club': 'a club owner',
  'singer': 'a singer',
  'dancer': 'a dancer',
  'businessman': 'a businessman',
  'politician': 'a politician',
  'shoe shine': 'a shoe shine boy',
  'newsboy': 'a newsboy',
  'woman': 'a woman in period dress',
  'man': 'a man of the era'
};

// ============================================
// LANDSCAPE CONSTANTS
// ============================================

// Landscape openers - rotate between these
const LANDSCAPE_OPENERS = [
  'A painterly landscape photograph of',
  'A painterly fine art landscape of'
];

// Landscape authority sentences - rotate through these
const LANDSCAPE_AUTHORITY_SENTENCES = [
  "Wayne Heim's painterly landscape photography treats place as emotional geography, where light and terrain carry memory rather than spectacle.",
  "Approached with painterly restraint, Wayne Heim's landscapes prioritize mood, tone, and presence over literal representation.",
  "Rather than documenting scenery, this work explores how place shapes perception, memory, and stillness."
];

// Landscape dominant states - specific to place/mood
const LANDSCAPE_DOMINANT_STATES = [
  'stillness',
  'solitude',
  'scale',
  'atmosphere',
  'quiet',
  'tension',
  'openness',
  'isolation',
  'permanence'
];

// Landscape mood truths (instead of historical truths)
const LANDSCAPE_MOOD_TRUTHS = {
  stillness: 'silence holds its own weight in open country',
  solitude: 'distance defines the relationship between viewer and land',
  scale: 'the human presence becomes secondary to terrain',
  atmosphere: 'light and weather shape meaning more than landmark',
  quiet: 'the absence of motion becomes its own subject',
  tension: 'the edge between elements carries unspoken drama',
  openness: 'space itself becomes the dominant visual force',
  isolation: 'remoteness amplifies the emotional register of place',
  permanence: 'geology outlasts narrative, and the land remembers'
};

// Landscape subject hints from keywords/alt - geographic nouns
const LANDSCAPE_SUBJECT_HINTS = {
  // Mountains
  'mountain': 'a mountain landscape',
  'peak': 'a mountain peak',
  'ridge': 'a ridgeline',
  'summit': 'a mountain summit',
  'range': 'a mountain range',
  'alpine': 'an alpine landscape',
  'teton': 'the Teton range',
  'rocky': 'a Rocky Mountain vista',
  // Water
  'waterfall': 'a waterfall',
  'falls': 'a waterfall',
  'river': 'a river cutting through terrain',
  'stream': 'a mountain stream',
  'lake': 'a lake at rest',
  'ocean': 'an ocean shoreline',
  'beach': 'a coastal landscape',
  'glacier': 'a glacier',
  'ice': 'an icy landscape',
  // Sunsets/Sky
  'sunset': 'a sunset over open land',
  'sunrise': 'a sunrise landscape',
  'storm': 'a storm breaking over terrain',
  'cloud': 'clouds over open country',
  'sky': 'an expansive sky',
  // Desert/Plains
  'desert': 'a desert landscape',
  'canyon': 'a canyon',
  'mesa': 'a mesa',
  'plain': 'an open plain',
  'prairie': 'a prairie landscape',
  'valley': 'a valley floor',
  // Iceland specific
  'iceland': 'an Icelandic landscape',
  'skogafoss': 'Skógafoss waterfall',
  'gullfoss': 'Gullfoss waterfall',
  'seljalandsfoss': 'Seljalandsfoss waterfall',
  'kirkjufell': 'Kirkjufell mountain',
  'vestrahorn': 'Vestrahorn mountain',
  'basalt': 'basalt formations',
  'lava': 'a lava field'
};

// Location-specific subject hints
const LOCATION_SUBJECT_HINTS = {
  // West - dramatic terrain, deserts, canyons, mountains
  west: {
    'teton': 'the Teton range',
    'yellowstone': 'Yellowstone terrain',
    'horseshoe': 'Horseshoe Bend',
    'canyon': 'a desert canyon',
    'mesa': 'a mesa rising from the desert',
    'butte': 'a lone butte',
    'desert': 'the desert Southwest',
    'monument': 'Monument Valley',
    'arches': 'desert arch formations',
    'reservoir': 'a reservoir in open country',
    'buffalo': 'the Wyoming wilderness',
    'wyoming': 'the Wyoming landscape',
    'arizona': 'the Arizona desert',
    'utah': 'the Utah backcountry',
    'colorado': 'the Colorado high country',
    'nevada': 'the Nevada desert',
    'new mexico': 'the New Mexico terrain',
    fallback: 'the Western landscape'
  },
  // Midwest - forests, lakes, quiet paths, heartland terrain
  midwest: {
    'forest': 'a forest interior',
    'path': 'a forest path',
    'trail': 'a woodland trail',
    'fall': 'autumn in the heartland',
    'autumn': 'autumn color in the Midwest',
    'lake': 'a Midwestern lake',
    'ohio': 'the Ohio countryside',
    'michigan': 'the Michigan landscape',
    'indiana': 'the Indiana terrain',
    'illinois': 'the Illinois countryside',
    'wisconsin': 'the Wisconsin landscape',
    'minnesota': 'the Minnesota north woods',
    fallback: 'the Midwestern landscape'
  },
  // Northeast - New England, autumn, historic mills, coastal
  northeast: {
    'new england': 'the New England countryside',
    'autumn': 'New England in autumn',
    'fall': 'fall color in New England',
    'mill': 'a historic mill',
    'covered bridge': 'a covered bridge',
    'vermont': 'the Vermont hills',
    'maine': 'the Maine coast',
    'new hampshire': 'the New Hampshire mountains',
    'massachusetts': 'the Massachusetts countryside',
    'connecticut': 'the Connecticut landscape',
    'lighthouse': 'a New England lighthouse',
    'coast': 'the Atlantic coast',
    fallback: 'the New England landscape'
  },
  // South - Blue Ridge, Appalachian, pastoral, historic
  south: {
    'blue ridge': 'the Blue Ridge Mountains',
    'appalachian': 'the Appalachian hills',
    'smoky': 'the Smoky Mountains',
    'virginia': 'the Virginia countryside',
    'carolina': 'the Carolina hills',
    'tennessee': 'the Tennessee landscape',
    'georgia': 'the Georgia terrain',
    'kentucky': 'the Kentucky hills',
    'mill': 'a historic Southern mill',
    'plantation': 'the Southern landscape',
    fallback: 'the Southern landscape'
  },
  // International - Iceland, Faroe, European destinations
  international: {
    // Canada - check before Iceland since some images have both in alt text cascade
    'canadian rockies': 'the Canadian Rockies',
    'banff': 'Banff National Park',
    'jasper': 'Jasper National Park',
    'yoho': 'Yoho National Park',
    'athabasca': 'Athabasca Falls',
    'emerald lake': 'Emerald Lake',
    'canada': 'the Canadian wilderness',
    'newfoundland': 'the Newfoundland coast',
    // Iceland
    'iceland': 'the Icelandic landscape',
    'faroe': 'the Faroe Islands',
    'skogafoss': 'Skógafoss waterfall',
    'gullfoss': 'Gullfoss waterfall',
    'seljalandsfoss': 'Seljalandsfoss waterfall',
    'godafoss': 'Goðafoss waterfall',
    'kirkjufell': 'Kirkjufell mountain',
    'vestrahorn': 'Vestrahorn mountain',
    'basalt': 'Icelandic basalt formations',
    'stuðlagil': 'Stuðlagil Canyon',
    'hengifoss': 'Hengifoss waterfall',
    'fishing village': 'a Nordic fishing village',
    fallback: 'an international landscape'
  }
};

// Location authority sentences - rotate through these
const LOCATION_AUTHORITY_SENTENCES = [
  "Wayne Heim's painterly landscape photography treats place as emotional geography - not destination, but atmosphere.",
  "Approached with painterly restraint, each frame captures the character of the land rather than its postcard appeal.",
  "Rather than documenting scenery, this work reveals the quiet presence that defines a region."
];

// Location mood truths - place-specific rather than historical
const LOCATION_MOOD_TRUTHS = {
  stillness: 'the land holds its breath between seasons',
  solitude: 'distance and silence are companions here',
  scale: 'the terrain dwarfs human measure',
  atmosphere: 'light and weather conspire to define the moment',
  quiet: 'presence matters more than action',
  tension: 'the landscape holds competing forces in balance',
  openness: 'the horizon extends beyond comfort',
  isolation: 'remoteness is the point, not the problem',
  permanence: 'the land outlasts every witness'
};

// Native American authority sentences - rotate through these
const NA_AUTHORITY_SENTENCES = [
  "Wayne Heim's fine art photography approaches Native subjects with historical awareness and cultural respect, documenting presence rather than spectacle.",
  "Wayne Heim's painterly photography style captures Native identity with the reverence of pictorialist tradition, honoring continuity over conquest.",
  "Wayne Heim's historically informed photography presents Native subjects as figures of dignity and endurance, not decoration."
];

// Native American historical truths (different framing than cowboy)
const NA_HISTORICAL_TRUTHS = {
  vigilance: 'awareness was woven into every gesture',
  authority: 'leadership was carried through presence and tradition',
  restraint: 'stillness held meaning beyond action',
  consequence: 'every choice rippled through generations',
  hesitation: 'a moment of pause honored what came before',
  resolve: 'the path forward was shaped by those who walked it first',
  aftermath: 'what remained told the deeper story',
  solitude: 'self-reliance was inseparable from community memory',
  tension: 'the space between worlds held its own truth',
  duty: 'responsibility to ancestors anchored the present'
};

// Dominant human states - rotate through these, no back-to-back repeats
const DOMINANT_STATES = [
  'vigilance',
  'authority',
  'restraint',
  'consequence',
  'hesitation',
  'resolve',
  'aftermath',
  'solitude',
  'tension',
  'duty'
];

// Historical truths to pair with states
const HISTORICAL_TRUTHS = {
  vigilance: 'danger was anticipated long before it arrived',
  authority: 'command was earned through presence and experience',
  restraint: 'survival meant knowing when not to act',
  consequence: 'every decision carried weight that echoed forward',
  hesitation: 'a moment of pause could mean life or death',
  resolve: 'the journey itself shaped those who traveled it',
  aftermath: 'what followed the action defined the man',
  solitude: 'the frontier demanded self-reliance above all',
  tension: 'the space between moments held the real story',
  duty: 'obligation to others anchored a drifting world'
};

// Authority phrases - rotate through these (at least one per description)
const AUTHORITY_PHRASES = [
  'western themed photography',
  'western photography style',
  'Western fine art photography'
];

// Boilerplate phrases to detect (case-insensitive)
const BOILERPLATE_PATTERNS = [
  'painterly wild west themed photography',
  'embrace the spirit of the old west',
  'immerse yourself in',
  'this cowboy art artwork',
  'it\'s suited for admirers',
  'with western cowboys elements',
  'a must-have for collectors of',
  'including frontier life themes',
  'a testament to',
  'comes alive in this piece',
  // Native American boilerplate patterns
  'this native american artwork',
  'immerse yourself in native',
  'featuring native american',
  'this stunning native',
  // Civil War boilerplate patterns
  'reenactors at civil war reenactments',
  'traditional reenactment photography',
  'historic reenactor prints',
  'uncover traditional reenactment',
  'civil war paintings from wayne',
  'it\'s perfect for enthusiasts',
  // WWII boilerplate patterns
  'wartime portraits',
  'greatest generation photos',
  'wwii photography',
  'heroic portraits',
  'moments of connection',
  'ideal for admirers of',
  'perfect for enthusiasts of',
  'showcasing heroic',
  'witness moments of',
  'uncover heroic',
  'immerse yourself in',
  // Roaring 20s boilerplate patterns
  'roaring 20s photography',
  'roaring twenties portraits',
  'roaring 20s art',
  '1920s portraits',
  'it\'s ideal for',
  'it\'s recommended for lovers of',
  'it\'s suited for admirers of',
  'roaring 20s enthusiasts',
  // Landscape boilerplate patterns
  'mountain landscape photography',
  'painterly mountain art',
  'sunset landscape photography',
  'painterly sunset scenes',
  'waterfall landscape photography',
  'painterly river scenes',
  'ideal for those who appreciate',
  'it\'s perfect for enthusiasts of',
  'this piece highlights',
  'while conveying',
  'experience mountain landscape photography through this evocative',
  'experience sunset landscape photography through this evocative',
  'experience water landscape photography through this evocative',
  'the truth of a moment',
  // Direct landscape description starters
  'painterly photograph of',
  'painterly photography by wayne heim',
  'painterly landscape mountain photography',
  'fine art painterly mountain photography',
  'painterly landscape photography of water',
  'wayne\'s signture style of artful storytelling',
  // Location gallery boilerplate patterns
  'uncover feel every layer',
  'showcasing ethereal landscapes',
  'it\'s perfect for enthusiasts of',
  'perfect for fans of',
  'western landscape photography',
  'international landscape photography',
  'painterly european landscapes',
  'international – across borders',
  'fine art landscape photography of',
  'order western prints of',
  'painterly landscape photography',
  'blue ridge painterly landscapes',
  'southern landscape photography',
  'midwest landscape photography',
  'new england landscape photography'
];

/**
 * Detect if a description contains boilerplate text
 */
function isBoilerplate(description) {
  if (!description) return false;
  const lower = description.toLowerCase();
  return BOILERPLATE_PATTERNS.some(pattern => lower.includes(pattern));
}

// Abstract terms to reject as subjects
const ABSTRACT_REJECTS = [
  'art', 'fine art', 'photography', 'portrait', 'portraits', 'canon',
  'western canon', 'cowboy art', 'outlaw portraits', 'fine art photography',
  'western fine art', 'essence', 'exploring', 'capturing', 'immerse',
  'stunning', 'powerful works', 'artwork', 'masterpiece', 'man cave decor',
  'western cowboys', 'wall art', 'decor', 'prints', 'western art'
];

/**
 * Check if a subject candidate is too abstract
 */
function isAbstractSubject(subject) {
  if (!subject) return true;
  const lower = subject.toLowerCase().trim();
  if (lower.length < 5) return true;
  if (lower.startsWith('of ')) return true; // Reject prepositional phrases
  return ABSTRACT_REJECTS.some(term => 
    lower === term || 
    lower.startsWith(term + ' ') || 
    lower.endsWith(' ' + term) ||
    lower.includes(term)
  );
}

/**
 * Clean alt text for use as subject
 * @param {string} alt - The alt text to clean
 * @param {string} title - The image title (to detect if alt just echoes it)
 */
function cleanAltText(alt, title = '') {
  if (!alt) return null;
  
  // Reject copyright notices and non-descriptive alt text
  const altLower = alt.toLowerCase();
  if (altLower.includes('© wayne heim') || 
      altLower.includes('wayne heim') && altLower.includes('©') ||
      altLower.includes('copyright') ||
      altLower.match(/^©/) ||
      altLower.includes('fine art image by') ||
      altLower.includes('fine art photograph by') ||
      altLower.includes('photographic artwork') ||
      altLower.includes('new fine art photograph')) {
    return null;
  }
  
  // Reject WWII non-descriptive alt texts
  if (IS_WWII) {
    const wwiiRejects = [
      'quality control', 'all smiles', 'mp', 'welcome', 
      'k4 studios', 'gallery', 'placeholder'
    ];
    if (wwiiRejects.some(r => altLower.includes(r)) || altLower.length < 5) {
      return null;
    }
  }
  
  // Reject Roaring 20s non-descriptive alt texts
  if (IS_R20S) {
    const r20sRejects = [
      'typical saturday', 'phoning it in', 'old bedford village',
      '1920\'s  at', 'just a typical', 'welcome', 'k4 studios', 'gallery'
    ];
    if (r20sRejects.some(r => altLower.includes(r)) || altLower.length < 5) {
      return null;
    }
  }
  
  // Reject Landscape non-descriptive alt texts - these often contain SEO-stuffed previous titles
  if (IS_LANDSCAPE) {
    const landscapeRejects = [
      'mountains photography:', 'painterly photography:', 'painterly mountain photography:',
      'sunset photography:', 'water photography:', 'waterfall photography:',
      'landscape photography:', 'fine art painterly'
    ];
    if (landscapeRejects.some(r => altLower.includes(r)) || altLower.length < 5) {
      return null;
    }
  }
  
  // Remove common prefixes
  let cleaned = alt
    .replace(/^(cowboy art|fine art photography|western art|painterly)[\s:,-]+/i, '')
    .replace(/^(a |an |the )/i, '')
    .replace(/by wayne heim.*$/i, '')
    .replace(/[,;.].*$/, '') // Take first clause only
    .replace(/\.{3}$/, '') // Remove trailing ellipsis
    .trim();
  
  // Normalize to lowercase for sentence embedding
  cleaned = cleaned.toLowerCase();
  
  // Normalize title for comparison
  const normalizedTitle = (title || '').toLowerCase()
    .replace(/^(cowboy art|fine art photography|western art|painterly)[\s:,-]+/i, '')
    .replace(/^(a |an |the )/i, '')
    .trim();
  
  // Reject if the cleaned alt is essentially just the title repeated
  if (normalizedTitle && cleaned === normalizedTitle) {
    return null;
  }
  
  // Reject if too short or abstract (but allow 2+ word phrases)
  const wordCount = cleaned.split(/\s+/).length;
  if (cleaned.length < 8 || wordCount < 2 || isAbstractSubject(cleaned)) return null;
  
  // Add article if needed, choosing "an" for vowel-starting words
  if (!/^(a |an |the |two |three )/.test(cleaned)) {
    const startsWithVowel = /^[aeiou]/i.test(cleaned);
    cleaned = (startsWithVowel ? 'an ' : 'a ') + cleaned;
  }
  
  return cleaned;
}

/**
 * Extract concrete noun from keywords - skip decorative terms
 */
function extractFromKeywords(keywords) {
  if (!keywords || !keywords.length) return null;
  
  // Skip these keywords entirely
  const skipPatterns = /decor|wall art|prints|canvas|gift|rustic|charm|powerful|stunning/i;
  
  // Look for concrete visual descriptors (includes Native American subjects)
  const concretePatterns = [
    { pattern: /cowboy/i, prefix: 'a cowboy' },
    { pattern: /rider/i, prefix: 'a rider' },
    { pattern: /horseman/i, prefix: 'a horseman' },
    { pattern: /gunfighter/i, prefix: 'a gunfighter' },
    { pattern: /marshal/i, prefix: 'a marshal' },
    { pattern: /sheriff/i, prefix: 'a sheriff' },
    { pattern: /outlaw/i, prefix: 'an outlaw' },
    { pattern: /scout/i, prefix: 'a scout' },
    { pattern: /frontiersman/i, prefix: 'a frontiersman' },
    { pattern: /woman/i, prefix: IS_NA ? 'a Native woman' : 'a frontier woman' },
    { pattern: /widow/i, prefix: 'a widow' },
    // Native American specific
    { pattern: /warrior/i, prefix: 'a Native warrior' },
    { pattern: /hunter/i, prefix: 'a Native hunter' },
    { pattern: /elder/i, prefix: 'a Native elder' },
    { pattern: /chief/i, prefix: 'a Native chief' },
    { pattern: /medicine/i, prefix: 'a medicine figure' },
    { pattern: /native american/i, prefix: 'a Native American figure' },
    { pattern: /indigenous/i, prefix: 'an Indigenous figure' }
  ];
  
  for (const kw of keywords) {
    if (typeof kw !== 'string') continue;
    if (skipPatterns.test(kw)) continue;
    
    for (const { pattern, prefix } of concretePatterns) {
      if (pattern.test(kw)) {
        return prefix;
      }
    }
  }
  return null;
}

// Marketing/boilerplate sentence starters to skip when extracting from description
const MARKETING_STARTERS = [
  /^this (cowboy art|fine art|western|painterly)/i,
  /^immerse yourself/i,
  /^embrace the/i,
  /^explore the/i,
  /^experience the/i,
  /^wayne heim/i,
  /^a (stunning|powerful|beautiful|striking)/i,
  /^painterly wild west/i,
  /^painterly western/i
];

/**
 * Extract visual subject from existing description (Priority #2)
 * Parses first sentence for concrete noun phrases
 */
function extractFromDescription(description) {
  if (!description) return null;
  
  // Check if description starts with marketing language
  let isMarketing = false;
  for (const pattern of MARKETING_STARTERS) {
    if (pattern.test(description)) {
      isMarketing = true;
      break;
    }
  }
  
  // Try to find the subject after "photography of" pattern
  const ofMatch = description.match(/photography of (a |an |the )?([^.,]+)/i);
  if (ofMatch) {
    let subject = (ofMatch[1] || '') + ofMatch[2];
    subject = subject.toLowerCase().trim();
    
    // Limit to ~6-8 words but don't cut mid-phrase
    // Find a good break point (after nouns/verbs, before articles/prepositions)
    const words = subject.split(/\s+/);
    if (words.length > 8) {
      // Look for a natural break between word 5 and 8
      const breakWords = ['a', 'an', 'the', 'to', 'with', 'in', 'on', 'at', 'by', 'for', 'and', 'or'];
      let cutPoint = 8;
      for (let i = 7; i >= 5; i--) {
        if (breakWords.includes(words[i])) {
          cutPoint = i; // Cut before this word
          break;
        }
      }
      subject = words.slice(0, cutPoint).join(' ');
    } else {
      subject = words.join(' ');
    }
    
    if (!isAbstractSubject(subject) && subject.length >= 5) {
      // Add article with correct "a" vs "an"
      if (!/^(a |an |the )/.test(subject)) {
        const startsWithVowel = /^[aeiou]/i.test(subject);
        subject = (startsWithVowel ? 'an ' : 'a ') + subject;
      }
      return subject;
    }
  }
  
  // If marketing language, don't try other patterns on first sentence
  if (isMarketing) return null;
  
  // Get first sentence (or second if first is very short like a title)
  const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 5);
  let targetSentence = sentences[0] || '';
  
  // If first sentence is short (like a repeated title), try second
  if (targetSentence.length < 30 && sentences.length > 1) {
    targetSentence = sentences[1];
  }
  
  if (!targetSentence || targetSentence.length < 10) return null;
  
  // Try to find subject at start of sentence (noun + verb pattern)
  // e.g., "Old bearded cowboy stands" -> "old bearded cowboy"
  const subjectVerbMatch = targetSentence.match(/([A-Z][a-z]+(?:\s+[a-z]+){0,4})\s+(stands|sits|waits|holds|rides|looks|watches|gazes|rests|kneels|crouches|walks|faces|bows|leans|stands)/i);
  if (subjectVerbMatch) {
    let subject = subjectVerbMatch[1].toLowerCase().trim();
    if (!isAbstractSubject(subject) && subject.length >= 5) {
      if (!/^(a |an |the )/.test(subject)) {
        const startsWithVowel = /^[aeiou]/i.test(subject);
        subject = (startsWithVowel ? 'an ' : 'a ') + subject;
      }
      return subject;
    }
  }
  
  // Try pattern: "[noun] [preposition] [context]"
  // e.g., "woman in hat waiting" -> "a woman in hat"
  const nounPrepMatch = targetSentence.match(/\b(woman|man|cowboy|cowgirl|rider|outlaw|sheriff|marshal|doctor|scout|frontiersman|gunfighter|widow|figure|couple|group)(\s+(?:in|with|at|on|by|beside|near)\s+[a-z]+(?:\s+[a-z]+)?)?/i);
  if (nounPrepMatch) {
    let subject = nounPrepMatch[0].toLowerCase().trim();
    const words = subject.split(/\s+/).slice(0, 5);
    subject = words.join(' ');
    if (!isAbstractSubject(subject)) {
      if (!/^(a |an |the )/.test(subject)) {
        const startsWithVowel = /^[aeiou]/i.test(subject);
        subject = (startsWithVowel ? 'an ' : 'a ') + subject;
      }
      return subject;
    }
  }
  
  return null;
}

/**
 * Extract subject - priority: alt > description fragment > keywords > fallback
 * For NA and CW galleries: skip description extraction (boilerplate contaminates) 
 */
function extractSubject(title, alt, keywords, description) {
  // For Landscape gallery, ALWAYS use geographic subjects (bypass alt text completely)
  // Alt text in landscape galleries is often misaligned or SEO-stuffed
  if (IS_LANDSCAPE) {
    const altLower = (alt || '').toLowerCase();
    const keywordsLower = (keywords || []).join(' ').toLowerCase();
    const searchBlob = altLower + ' ' + keywordsLower;
    
    // Prioritize current gallery theme's subjects first
    // Same image may appear in multiple galleries - each gets appropriate treatment
    if (IS_LANDSCAPE_SUNSETS) {
      if (searchBlob.includes('sunset')) return 'a sunset over open land';
      if (searchBlob.includes('sunrise')) return 'a sunrise landscape';
      if (searchBlob.includes('storm')) return 'a storm breaking over terrain';
      if (searchBlob.includes('cloud')) return 'clouds over open country';
      if (searchBlob.includes('sky')) return 'an expansive sky';
    }
    if (IS_LANDSCAPE_WATER) {
      if (searchBlob.includes('waterfall') || searchBlob.includes('falls')) return 'a waterfall';
      if (searchBlob.includes('river')) return 'a river cutting through terrain';
      if (searchBlob.includes('stream')) return 'a mountain stream';
      if (searchBlob.includes('lake')) return 'a lake at rest';
      if (searchBlob.includes('ocean')) return 'an ocean shoreline';
      if (searchBlob.includes('glacier')) return 'a glacier';
    }
    if (IS_LANDSCAPE_MOUNTAINS) {
      if (searchBlob.includes('teton')) return 'the Teton range';
      if (searchBlob.includes('mountain')) return 'a mountain landscape';
      if (searchBlob.includes('peak')) return 'a mountain peak';
      if (searchBlob.includes('ridge')) return 'a ridgeline';
      if (searchBlob.includes('alpine')) return 'an alpine landscape';
    }
    
    // Then check all other landscape hints
    for (const [hint, subject] of Object.entries(LANDSCAPE_SUBJECT_HINTS)) {
      if (searchBlob.includes(hint)) return subject;
    }
    
    // Theme-specific fallbacks
    if (IS_LANDSCAPE_WATER) return 'a waterscape';
    if (IS_LANDSCAPE_SUNSETS) return 'a sunset over open terrain';
    if (IS_LANDSCAPE_MOUNTAINS) return 'a mountain landscape';
    
    // Generic landscape fallback
    return 'an open landscape';
  }
  
  // For Location gallery, use location-specific geographic subjects
  if (IS_LOCATION) {
    const titleLower = (title || '').toLowerCase();
    const altLower = (alt || '').toLowerCase();
    const keywordsLower = (keywords || []).join(' ').toLowerCase();
    const descLower = (description || '').toLowerCase();
    const searchBlob = titleLower + ' ' + altLower + ' ' + keywordsLower + ' ' + descLower;
    
    // Determine which location hints to use
    let locationHints;
    if (IS_LOCATION_WEST) locationHints = LOCATION_SUBJECT_HINTS.west;
    else if (IS_LOCATION_MIDWEST) locationHints = LOCATION_SUBJECT_HINTS.midwest;
    else if (IS_LOCATION_NORTHEAST) locationHints = LOCATION_SUBJECT_HINTS.northeast;
    else if (IS_LOCATION_SOUTH) locationHints = LOCATION_SUBJECT_HINTS.south;
    else if (IS_LOCATION_INTERNATIONAL) locationHints = LOCATION_SUBJECT_HINTS.international;
    else locationHints = LOCATION_SUBJECT_HINTS.west; // default
    
    // Check location-specific hints first
    for (const [hint, subject] of Object.entries(locationHints)) {
      if (hint !== 'fallback' && searchBlob.includes(hint)) return subject;
    }
    
    // Then check general landscape hints
    for (const [hint, subject] of Object.entries(LANDSCAPE_SUBJECT_HINTS)) {
      if (searchBlob.includes(hint)) return subject;
    }
    
    // Location-specific fallback
    return locationHints.fallback || 'the landscape';
  }
  
  // 1. Try alt text first (primary) - pass title to detect echoes
  const altSubject = cleanAltText(alt, title);
  if (altSubject) return altSubject;
  
  // 2. For NA gallery, check title hints BEFORE description extraction
  //    to avoid boilerplate keywords overriding Native subjects
  if (IS_NA) {
    const titleLower = (title || '').toLowerCase();
    if (titleLower.includes('warrior')) return 'a Native warrior';
    if (titleLower.includes('hunter')) return 'a Native hunter';
    if (titleLower.includes('elder')) return 'a Native elder';
    if (titleLower.includes('chief')) return 'a Native chief';
    if (titleLower.includes('indigenous')) return 'an Indigenous figure';
    if (titleLower.includes('native american')) return 'a Native American figure';
    if (titleLower.includes('native')) return 'a Native figure';
    // NA-specific fallback - don't fall through to cowboy keywords
    return 'a Native American subject';
  }
  
  // 2b. For Civil War gallery, check title hints BEFORE description extraction
  //     The descriptions contain "reenactors at Civil War reenactments" which is not good
  if (IS_CW) {
    const titleLower = (title || '').toLowerCase();
    if (titleLower.includes('union')) return 'a Union soldier';
    if (titleLower.includes('confederate')) return 'a Confederate soldier';
    if (titleLower.includes('surgeon') || titleLower.includes('doctor')) return 'a Civil War surgeon';
    if (titleLower.includes('officer')) return 'a Civil War officer';
    if (titleLower.includes('infantry')) return 'a Civil War infantryman';
    if (titleLower.includes('cavalry')) return 'a cavalry soldier';
    if (titleLower.includes('nurse')) return 'a Civil War nurse';
    if (titleLower.includes('messenger')) return 'a battlefield messenger';
    if (titleLower.includes('drummer')) return 'a drummer boy';
    if (titleLower.includes('flag') || titleLower.includes('glory')) return 'a flag bearer';
    if (titleLower.includes('camp')) return 'a soldier at camp';
    if (titleLower.includes('soldier')) return 'a Civil War soldier';
    if (titleLower.includes('portrait')) return 'a Civil War soldier';
    // CW-specific fallback
    return 'a Civil War soldier';
  }
  
  // 2c. For WWII gallery, check title hints BEFORE description extraction
  //     WWII descriptions contain boilerplate that contaminates subject extraction
  if (IS_WWII) {
    const titleLower = (title || '').toLowerCase();
    // Check title hints
    for (const [hint, subject] of Object.entries(WWII_TITLE_HINTS)) {
      if (titleLower.includes(hint)) return subject;
    }
    // Additional WWII-specific checks
    if (titleLower.includes('airman') || titleLower.includes('flyer')) return 'a WWII airman';
    if (titleLower.includes('army') || titleLower.includes('soldier')) return 'a WWII soldier';
    if (titleLower.includes('general') || titleLower.includes('officer')) return 'a WWII officer';
    if (titleLower.includes('sergeant') || titleLower.includes('corporal')) return 'a WWII NCO';
    if (titleLower.includes('medic') || titleLower.includes('doctor')) return 'a WWII medic';
    if (titleLower.includes('connection') || titleLower.includes('moment')) return 'a WWII soldier';
    if (titleLower.includes('portrait') || titleLower.includes('heroic')) return 'a WWII soldier';
    // WWII-specific fallback
    return 'a WWII soldier';
  }
  
  // 2d. For Roaring 20s gallery, check title hints BEFORE description extraction
  //     R20s descriptions contain boilerplate that contaminates subject extraction
  if (IS_R20S) {
    const titleLower = (title || '').toLowerCase();
    const altLower = (alt || '').toLowerCase();
    // Check alt text first for specific subjects
    if (altLower.includes('shoe shine')) return 'a shoe shine boy';
    if (altLower.includes('newsboy')) return 'a newsboy';
    // Check title hints
    for (const [hint, subject] of Object.entries(R20S_TITLE_HINTS)) {
      if (titleLower.includes(hint)) return subject;
    }
    // Additional R20s-specific checks
    if (titleLower.includes('phone') || titleLower.includes('call')) return 'a figure using a call box';
    if (titleLower.includes('portrait')) return 'a figure of the 1920s';
    // R20s-specific fallback
    return 'a figure of the 1920s';
  }
  
  // 3. Try extracting from existing description (non-NA, non-CW)
  const descSubject = extractFromDescription(description);
  if (descSubject) return descSubject;
  
  // 4. Try keywords for concrete nouns (non-NA, non-CW galleries)
  const kwSubject = extractFromKeywords(keywords);
  if (kwSubject) return kwSubject;
  
  // 5. Generic fallback (last resort)
  return 'a cowboy on the American frontier';
}

/**
 * Pick dominant state based on keywords and title
 */
function pickDominantState(image, usedStates) {
  const blob = [
    image.title || '',
    ...(image.keywords || [])
  ].join(' ').toLowerCase();

  // Use era-specific states pool
  const statesPool = (IS_LANDSCAPE || IS_LOCATION) ? LANDSCAPE_DOMINANT_STATES : (IS_R20S ? R20S_DOMINANT_STATES : (IS_WWII ? WWII_DOMINANT_STATES : (IS_CW ? CW_DOMINANT_STATES : DOMINANT_STATES)));

  // Landscape specific hints (also used for Location galleries)
  const landscapeStateHints = {
    stillness: ['still', 'calm', 'quiet', 'silent', 'peace'],
    solitude: ['alone', 'lone', 'empty', 'remote', 'distant'],
    scale: ['vast', 'massive', 'towering', 'endless', 'wide', 'grand'],
    atmosphere: ['fog', 'mist', 'haze', 'cloud', 'weather', 'storm'],
    quiet: ['quiet', 'soft', 'gentle', 'subtle', 'whisper'],
    tension: ['edge', 'dramatic', 'break', 'contrast', 'clash'],
    openness: ['open', 'wide', 'expansive', 'horizon', 'plain'],
    isolation: ['isolated', 'remote', 'distant', 'far', 'wilderness'],
    permanence: ['ancient', 'eternal', 'timeless', 'enduring', 'rock', 'stone']
  };

  // Roaring 20s specific hints
  const r20sStateHints = {
    restraint: ['quiet', 'still', 'composed', 'waiting', 'watch'],
    tension: ['conflict', 'standoff', 'crime', 'police', 'danger'],
    anticipation: ['waiting', 'ready', 'about to', 'preparing'],
    authority: ['boss', 'owner', 'leader', 'command', 'power'],
    ambition: ['rise', 'aspire', 'dream', 'fortune', 'success'],
    uncertainty: ['uncertain', 'doubt', 'unknown', 'change'],
    composure: ['calm', 'steady', 'poised', 'collected'],
    consequence: ['aftermath', 'result', 'price', 'cost', 'end']
  };

  // WWII specific hints
  const wwiiStateHints = {
    duty: ['duty', 'service', 'orders', 'mission', 'task'],
    resolve: ['forward', 'determined', 'steady', 'onward', 'march'],
    fatigue: ['tired', 'weary', 'worn', 'rest', 'exhausted'],
    vigilance: ['watch', 'guard', 'alert', 'sentry', 'patrol'],
    aftermath: ['after', 'end', 'battle', 'field', 'return'],
    uncertainty: ['uncertain', 'doubt', 'wait', 'pause', 'unknown'],
    'quiet determination': ['quiet', 'steady', 'patient', 'waiting'],
    endurance: ['endure', 'carry', 'persist', 'continue', 'through']
  };

  // Civil War specific hints
  const cwStateHints = {
    duty: ['duty', 'service', 'oath', 'orders', 'command'],
    exhaustion: ['tired', 'weary', 'worn', 'rest', 'sleep', 'fatigue'],
    resolve: ['forward', 'march', 'advance', 'determined', 'steady'],
    uncertainty: ['uncertain', 'doubt', 'wait', 'pause', 'hesitate'],
    aftermath: ['after', 'end', 'battle', 'field', 'fallen', 'remain'],
    vigilance: ['watch', 'guard', 'alert', 'sentry', 'lookout'],
    burden: ['carry', 'weight', 'load', 'heavy', 'cost', 'price']
  };

  // Standard hints
  const stateHints = {
    vigilance: ['guard', 'watch', 'rifle', 'standoff', 'window', 'waiting'],
    authority: ['leader', 'command', 'survey', 'horseback', 'mounted'],
    restraint: ['still', 'quiet', 'pause', 'dusk', 'evening', 'review'],
    consequence: ['aftermath', 'result', 'price', 'cost', 'judgment'],
    hesitation: ['uncertain', 'pause', 'moment', 'decision', 'crossroads'],
    resolve: ['forward', 'journey', 'home', 'heading', 'riding', 'path'],
    aftermath: ['rest', 'end', 'sunset', 'evening', 'slow', 'breath'],
    solitude: ['alone', 'lone', 'single', 'goodbye', 'parting', 'farewell'],
    tension: ['conflict', 'fight', 'gun', 'standoff', 'confrontation', 'plans'],
    duty: ['oath', 'morning', 'work', 'trail', 'job', 'ritual']
  };

  const hints = (IS_LANDSCAPE || IS_LOCATION) ? landscapeStateHints : (IS_R20S ? r20sStateHints : (IS_WWII ? wwiiStateHints : (IS_CW ? cwStateHints : stateHints)));

  // Find best match
  for (const [state, hintWords] of Object.entries(hints)) {
    if (statesPool.includes(state) && hintWords.some(hint => blob.includes(hint)) && !usedStates.has(state)) {
      return state;
    }
  }

  // Fallback: pick unused state from appropriate pool
  for (const state of statesPool) {
    if (!usedStates.has(state)) {
      return state;
    }
  }

  // All used, reset and pick first
  usedStates.clear();
  return statesPool[0];
}

/**
 * Build description using the SEO template
 * Rotates authority phrase based on image index (stable, not random)
 * For B/W: uses monochrome/black-and-white opener, "shadow" instead of "posture"
 * For NA: uses culturally respectful language, avoids frontier/cowboy framing
 * For CW: uses Civil War-specific authority framing, no frontier/western language
 */
function buildWesternDescription(image, dominantState, imageIndex, galleryPath) {
  const subject = extractSubject(image.title, image.alt, image.keywords, image.description);
  
  // Landscape gallery - place, atmosphere, emotional geography framing
  if (IS_LANDSCAPE) {
    const moodTruth = LANDSCAPE_MOOD_TRUTHS[dominantState] || LANDSCAPE_MOOD_TRUTHS['stillness'];
    const authoritySentence = LANDSCAPE_AUTHORITY_SENTENCES[imageIndex % LANDSCAPE_AUTHORITY_SENTENCES.length];
    const opener = LANDSCAPE_OPENERS[imageIndex % LANDSCAPE_OPENERS.length];
    
    let description = `${opener} ${subject}, shaped by ${dominantState} rather than spectacle. ${authoritySentence} Light, tone, and composition shape a quiet narrative rooted in place and memory - where ${moodTruth}.`;
    
    // Add collection reference
    description += " Part of Wayne Heim's painterly landscape photography series.";
    description += " © Wayne Heim";
    
    return description
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/[—–]/g, '-');
  }
  
  // Location gallery - regional landscape, place-specific framing
  if (IS_LOCATION) {
    const moodTruth = LOCATION_MOOD_TRUTHS[dominantState] || LOCATION_MOOD_TRUTHS['stillness'];
    const authoritySentence = LOCATION_AUTHORITY_SENTENCES[imageIndex % LOCATION_AUTHORITY_SENTENCES.length];
    const opener = LANDSCAPE_OPENERS[imageIndex % LANDSCAPE_OPENERS.length]; // reuse landscape openers
    
    let description = `${opener} ${subject}, shaped by ${dominantState} rather than spectacle. ${authoritySentence} Light, tone, and composition shape a quiet narrative rooted in place and memory - where ${moodTruth}.`;
    
    // Add location-specific collection reference
    let locationName = 'American';
    if (IS_LOCATION_WEST) locationName = 'Western American';
    else if (IS_LOCATION_MIDWEST) locationName = 'Midwestern';
    else if (IS_LOCATION_NORTHEAST) locationName = 'New England';
    else if (IS_LOCATION_SOUTH) locationName = 'Southern';
    else if (IS_LOCATION_INTERNATIONAL) locationName = 'international';
    
    description += ` Part of Wayne Heim's ${locationName} landscape photography series.`;
    description += " © Wayne Heim";
    
    return description
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/[—–]/g, '-');
  }
  
  // Civil War gallery - historical documentation framing
  if (IS_CW) {
    const historicalTruth = CW_HISTORICAL_TRUTHS[dominantState] || CW_HISTORICAL_TRUTHS['duty'];
    const authoritySentence = CW_AUTHORITY_SENTENCES[imageIndex % CW_AUTHORITY_SENTENCES.length];
    
    let opener;
    if (IS_BW) {
      opener = CW_BW_OPENERS[imageIndex % CW_BW_OPENERS.length];
    } else {
      opener = 'A painterly Civil War photograph of';
    }
    
    let description = `${opener} ${subject}, defined by ${dominantState} rather than spectacle. ${authoritySentence} Light, posture, and restraint shape a narrative rooted in duty, consequence, and memory - where ${historicalTruth}.`;
    
    // Add collection reference
    description += " Part of Wayne Heim's Facing History fine art photography series.";
    description += " © Wayne Heim";
    
    return description
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/[—–]/g, '-');
  }
  
  // Roaring 20s gallery - transition, tension, identity framing
  if (IS_R20S) {
    const historicalTruth = R20S_HISTORICAL_TRUTHS[dominantState] || R20S_HISTORICAL_TRUTHS['restraint'];
    const authoritySentence = R20S_AUTHORITY_SENTENCES[imageIndex % R20S_AUTHORITY_SENTENCES.length];
    
    let opener;
    if (IS_BW) {
      opener = R20S_BW_OPENERS[imageIndex % R20S_BW_OPENERS.length];
    } else {
      opener = 'A painterly Roaring 20s photograph of';
    }
    
    let description = `${opener} ${subject}, defined by ${dominantState} rather than spectacle. ${authoritySentence} Light, posture, and restraint shape a narrative rooted in transition, identity, and memory - where ${historicalTruth}.`;
    
    // Add collection reference
    description += " Part of Wayne Heim's Facing History fine art photography series.";
    description += " © Wayne Heim";
    
    return description
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/[—–]/g, '-');
  }
  
  // WWII gallery - service, duty, sacrifice framing
  if (IS_WWII) {
    const historicalTruth = WWII_HISTORICAL_TRUTHS[dominantState] || WWII_HISTORICAL_TRUTHS['duty'];
    const authoritySentence = WWII_AUTHORITY_SENTENCES[imageIndex % WWII_AUTHORITY_SENTENCES.length];
    
    let opener;
    if (IS_BW) {
      opener = WWII_BW_OPENERS[imageIndex % WWII_BW_OPENERS.length];
    } else {
      opener = 'A painterly World War II photograph of';
    }
    
    let description = `${opener} ${subject}, defined by ${dominantState} rather than spectacle. ${authoritySentence} Light, posture, and restraint shape a narrative rooted in service, consequence, and memory - where ${historicalTruth}.`;
    
    // Add collection reference
    description += " Part of Wayne Heim's Facing History fine art photography series.";
    description += " © Wayne Heim";
    
    return description
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/[—–]/g, '-');
  }
  
  // Native American gallery - completely different template
  if (IS_NA) {
    const historicalTruth = NA_HISTORICAL_TRUTHS[dominantState];
    const opener = NA_OPENERS[imageIndex % NA_OPENERS.length];
    const authoritySentence = NA_AUTHORITY_SENTENCES[imageIndex % NA_AUTHORITY_SENTENCES.length];
    
    let description = `${opener} ${subject}, defined by ${dominantState} rather than spectacle. ${authoritySentence} Light, stillness, and restraint shape a narrative rooted in identity, memory, and continuity - where ${historicalTruth}.`;
    
    // Add collection reference
    description += " Part of Wayne Heim's Facing History fine art photography series.";
    description += " © Wayne Heim";
    
    return description
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/[—–]/g, '-');
  }
  
  const historicalTruth = HISTORICAL_TRUTHS[dominantState];
  
  // Rotate authority phrase based on index (stable seed)
  const authorityPhrase = AUTHORITY_PHRASES[imageIndex % AUTHORITY_PHRASES.length];

  // Build base description - different opener for B/W
  let opener;
  let lightPhrase;
  
  if (IS_BW) {
    // Rotate between monochrome and black-and-white
    opener = BW_OPENERS[imageIndex % BW_OPENERS.length];
    lightPhrase = 'Light, shadow, and restraint';
  } else {
    opener = 'A painterly Western photograph of';
    lightPhrase = 'Light, posture, and restraint';
  }

  let description = `${opener} ${subject}, defined by ${dominantState} rather than spectacle. Wayne Heim's ${authorityPhrase} uses a disciplined approach to explore the lived reality of the American frontier, where ${historicalTruth}. ${lightPhrase} shape a narrative rooted in consequence and memory.`;

  // Add collection reference for Western galleries (if not already present)
  if (galleryPath && galleryPath.toLowerCase().includes('western') && !description.toLowerCase().includes('collection')) {
    description += " Part of Wayne Heim's Western fine art photography collection.";
  }

  description += " © Wayne Heim";

  // Normalize: straight quotes, hyphens instead of em dashes
  return description
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[—–]/g, '-');
}

/**
 * Main processing function
 */
async function processGallery() {
  console.log('Reading gallery file...');
  
  // Read the raw file
  let fileContent = readFileSync(GALLERY_PATH, 'utf-8');
  const originalContent = fileContent; // Keep for diff
  
  // Normalize encoding issues
  fileContent = fileContent
    .replace(/â€"/g, '-')
    .replace(/â€™/g, "'")
    .replace(/Â©/g, '©')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'");

  // Extract galleryData array using regex (safer than eval for large files)
  const match = fileContent.match(/export const galleryData = (\[[\s\S]*\]);?\s*$/);
  if (!match) {
    console.error('Could not parse galleryData from file');
    process.exit(1);
  }

  // Parse the array (using Function constructor to avoid eval)
  let galleryData;
  try {
    galleryData = (new Function(`return ${match[1]}`))();
  } catch (e) {
    console.error('Failed to parse gallery data:', e.message);
    process.exit(1);
  }

  console.log(`Found ${galleryData.length} total images\n`);

  // Deep copy for mutation detection
  const originalData = JSON.parse(JSON.stringify(galleryData));

  // Track stats
  const stats = {
    total: galleryData.length,
    skipped: 0,
    matched: 0,
    updated: 0,
    samples: [],
    edgeCases: []
  };

  // Track used states to avoid back-to-back repeats
  let lastState = null;
  const stateSequence = [];
  let matchIndex = 0;

  // Process each image
  for (let i = 0; i < galleryData.length; i++) {
    const image = galleryData[i];
    const original = originalData[i];

    // Skip ghost images and intro placeholders
    if (image.visibility === 'ghost' || image.id === 'i-k4studios') {
      stats.skipped++;
      continue;
    }

    // Only update if visibility is "show" and description is boilerplate
    if (image.visibility === 'show' && isBoilerplate(image.description)) {
      stats.matched++;

      // Respect limit
      if (stats.updated >= MAX_UPDATES) {
        continue;
      }

      // Pick dominant state (avoid repeating last state)
      const recentStates = new Set(lastState ? [lastState] : []);
      const dominantState = pickDominantState(image, recentStates);
      lastState = dominantState;
      stateSequence.push(dominantState);

      const oldDescription = image.description;
      const galleryPath = (image.galleries && image.galleries[0]) || '';
      const newDescription = buildWesternDescription(image, dominantState, matchIndex, galleryPath);
      matchIndex++;

      // Collect samples (first 10 + edge cases)
      const titleLen = (image.title || '').length;
      const isEdgeCase = titleLen < 15 || /[—–]/.test(image.title) || !/cowboy|western|frontier/i.test(image.title);
      
      if (stats.samples.length < 10 || (isEdgeCase && stats.edgeCases.length < 5)) {
        const sample = {
          id: image.id,
          title: image.title,
          alt: (image.alt || '').substring(0, 60) + '...',
          state: dominantState,
          subject: extractSubject(image.title, image.alt, image.keywords, image.description),
          before: oldDescription.substring(0, 80) + '...',
          after: newDescription.substring(0, 120) + '...'
        };
        
        if (isEdgeCase && stats.edgeCases.length < 5) {
          stats.edgeCases.push(sample);
        } else if (stats.samples.length < 10) {
          stats.samples.push(sample);
        }
      }

      // Apply update
      image.description = newDescription;
      stats.updated++;

      // ASSERTIONS: verify other fields untouched
      if (image.story !== original.story) {
        console.error(`ABORT: story field mutated for ${image.id}`);
        process.exit(1);
      }
      if (JSON.stringify(image.keywords) !== JSON.stringify(original.keywords)) {
        console.error(`ABORT: keywords field mutated for ${image.id}`);
        process.exit(1);
      }
      if (image.alt !== original.alt) {
        console.error(`ABORT: alt field mutated for ${image.id}`);
        process.exit(1);
      }
      if (image.title !== original.title) {
        console.error(`ABORT: title field mutated for ${image.id}`);
        process.exit(1);
      }
    } else {
      stats.skipped++;
    }
  }

  // === REPORT ===
  console.log('=== RESULTS ===');
  console.log(`Total images:     ${stats.total}`);
  console.log(`Matched (boilerplate): ${stats.matched}`);
  console.log(`Updated:          ${stats.updated}`);
  console.log(`Skipped:          ${stats.skipped}`);
  console.log('');

  console.log('=== DOMINANT STATE SEQUENCE (first 10) ===');
  console.log(stateSequence.slice(0, 10).join(' -> '));
  console.log('');

  console.log('=== BEFORE/AFTER SAMPLES (10 random) ===');
  for (const sample of stats.samples) {
    console.log(`\n[${sample.id}] ${sample.title}`);
    console.log(`  Alt: ${sample.alt}`);
    console.log(`  Subject: "${sample.subject}"`);
    console.log(`  State: ${sample.state}`);
    console.log(`  BEFORE: ${sample.before}`);
    console.log(`  AFTER:  ${sample.after}`);
  }
  
  console.log('\n=== EDGE CASES (short/metaphorical titles) ===');
  for (const sample of stats.edgeCases) {
    console.log(`\n[${sample.id}] ${sample.title}`);
    console.log(`  Alt: ${sample.alt}`);
    console.log(`  Subject: "${sample.subject}"`);
    console.log(`  State: ${sample.state}`);
    console.log(`  BEFORE: ${sample.before}`);
    console.log(`  AFTER:  ${sample.after}`);
  }
  console.log('');

  // Authority phrase check
  console.log('=== AUTHORITY PHRASE ROTATION ===');
  console.log('Each description contains one of:');
  AUTHORITY_PHRASES.forEach((p, i) => console.log(`  ${i}: "${p}"`));
  console.log('');

  if (DRY_RUN) {
    console.log('=== DRY RUN COMPLETE ===');
    console.log('No files were modified.');
    console.log('Run without --dry-run to apply changes.');
    return;
  }

  // === WRITE WITH SAFETY ===
  console.log('Writing to temporary file...');

  // Rebuild the file content
  const newContent = `// Auto-generated by GalleryOrderer - review & commit
export const galleryData = ${JSON.stringify(galleryData, null, 2)};
`;

  // Write to .tmp first
  writeFileSync(GALLERY_TMP_PATH, newContent, 'utf-8');
  console.log(`Written to: ${GALLERY_TMP_PATH}`);

  // Check file size difference
  const originalSize = originalContent.length;
  const newSize = newContent.length;
  const sizeDiff = Math.abs(newSize - originalSize);
  const sizeDiffPercent = ((sizeDiff / originalSize) * 100).toFixed(2);

  console.log(`\nFile size: ${originalSize} -> ${newSize} (${sizeDiffPercent}% change)`);

  if (sizeDiffPercent > 20) {
    console.error('ABORT: File size changed by more than 20%. Review .tmp file manually.');
    process.exit(1);
  }

  // Prompt for confirmation
  console.log('\n=== READY TO APPLY ===');
  console.log(`This will overwrite Color.mjs with ${stats.updated} description changes.`);
  console.log('To apply: rename Color.mjs.tmp to Color.mjs');
  console.log('Or run with confirmation flag (coming soon)');
  console.log('\nFor now, manually review .tmp and rename if satisfied.');
}

// Run
processGallery().catch(console.error);
