// Shared constants extracted from k4-image-proxy.js
// Phase 1 Step 1 - Zero logic changes

// --------------------
// GATEWAY BOT / SCRAPER LOGIC
// --------------------
export const ALLOWED_BOTS =
  /(googlebot|google-inspectiontool|adsbot-google|googleother|apis-google|bingbot|bingpreview|msnbot|duckduckbot|yandex|baiduspider|slurp|petalbot|ahrefsbot|ahrefssiteaudit|semrushbot|screaming\s*frog|sitebulb|applebot|facebookexternalhit|facebot|linkedinbot|twitterbot|pinterestbot|slackbot|discordbot|telegrambot|uptimerobot|uptime[- ]?kuma)/i;

export const BLOCKED_BOTS =
  /(python|curl|scrapy|spider(?!.*google)|httpclient|axios|wget|postman|libwww-perl|powershell|java\/|node-fetch|okhttp)/i;

// --------------------
// BLOCKED IP RANGES (scrapers, AI harvesters)
// --------------------
export const BLOCKED_IP_PREFIXES = [
  '45.148.10.',   // NL scraper - systematic image harvester (identified 2026-02-13)
  '146.59.19.',   // PL datacenter - no referrer bot pattern
  '135.181.213.', // FI datacenter - no referrer bot pattern
  '51.81.32.',    // US datacenter - no referrer bot pattern
  '51.81.210.',   // US datacenter - no referrer bot pattern
  '51.38.125.',   // DE datacenter - no referrer bot pattern
  '51.68.143.',   // PL datacenter - no referrer bot pattern
  '57.129.15.',   // DE datacenter - no referrer bot pattern
  '57.128.197.',  // PL datacenter - no referrer bot pattern
  '216.244.66.',  // DotBot crawler
];

// Datacenter IP ranges that suggest bot behavior when combined with no referrer
export const DATACENTER_PREFIXES = [
  // OVH hosting (specific ranges, not broad /8)
  '51.81.', '51.68.', '51.38.',     // OVH US/EU
  '135.148.', '135.181.',            // OVH US / Hetzner FI
  '146.59.',                         // OVH PL
  '57.128.', '57.129.',              // OVH DE/EU
  // AWS (specific known hosting /16 ranges)
  '3.145.', '3.148.',               // AWS Ohio
  '18.117.', '18.118.', '18.218.', '18.222.', // AWS Ohio
  '34.205.', '34.224.', '34.235.',   // AWS US-East
  '52.55.', '52.70.', '52.73.',      // AWS US-East
  '54.236.',                         // AWS US-East
  '15.204.',                         // OVH
  // Hetzner, DigitalOcean, Vultr
  '159.138.',                         // Huawei Cloud
  '162.19.',                          // OVH
  '185.170.',                         // Datacenter
  '216.244.',                         // DotBot / hosting
  // Chinese cloud (specific ranges)
  '43.154.', '43.155.', '43.159.',   // Tencent Cloud specific
  '101.32.', '101.33.',              // Tencent Cloud
  '119.28.', '124.243.',             // Alibaba/Huawei
];

// Verified search bots (never block, never throttle)
export const VERIFIED_BOTS = [
  { name: 'Googlebot', pattern: /googlebot|google-inspectiontool|googleother|apis-google/i },
  { name: 'Bingbot', pattern: /bingbot|bingpreview|msnbot/i },
  { name: 'Applebot', pattern: /applebot/i },
  { name: 'DuckDuckBot', pattern: /duckduckbot/i },
  { name: 'Yandex', pattern: /yandex/i },
  { name: 'Baidu', pattern: /baiduspider/i },
  { name: 'Facebook', pattern: /facebookexternalhit|facebot/i },
  { name: 'Twitter', pattern: /twitterbot/i },
  { name: 'Pinterest', pattern: /pinterestbot/i },
  { name: 'LinkedIn', pattern: /linkedinbot/i },
  { name: 'OpenAI', pattern: /gptbot|chatgpt-user|oai-searchbot/i },
  { name: 'Claude', pattern: /claudebot|anthropic-ai|claude-web/i },
];

// ═══════════════════════════════════════════════════════════════════════════
// DATACENTER DETECTION CONSTANTS (for synthetic traffic filtering)
// ═══════════════════════════════════════════════════════════════════════════
export const DATACENTER_CITIES = [
  'Ashburn', 'Moses Lake', 'Leesburg', 'Dublin', 'Prineville',
  'Boardman', 'The Dalles', 'Forest City', 'Council Bluffs', 'Clonee'
];

export const DATACENTER_ASNS = [
  16509, 14618,  // Amazon AWS
  8075,          // Microsoft Azure
  15169, 396982, // Google Cloud
  13335          // Cloudflare
];

