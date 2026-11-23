import { mergeEntryEvidence, parseEntryEvidence } from './entry-engagement.js';
import { SHOPPING_STAGES, shoppingTotal, mergeShoppingCounts, shoppingImageIds } from './shopping.js';
import { isRotatingProxyCrawler } from '../../shared/rotating-proxy-crawl.js';

export const V3_CORE_EVENT_TYPES = Object.freeze([
  'zone_h1_click',
  'page_view', 'chapter_view', 'nav_next', 'nav_prev', 'sister_image_click',
  'cowboy_jump', 'picture_shows_jump', 'presentation_last_image_back_to_start',
  'grid_open', 'grid_image_click', 'grid_show_more', 'grid_show_previous',
  'gallery_preview_click', 'gallery_hero_click', 'browse_all_click',
  'browse_all_image_click', 'gallery_explore_click', 'exit_to_gallery',
  'theme_click', 'all_list_click', 'story_audio_toggle', 'story_slider_click',
  'frontier_story_video_widget_click', 'guide_open', 'guide_close', 'guide_done',
  'guide_click_outside', 'order_clicked', 'order_submitted',
  'order_smugmug_clicked', 'order_email_clicked', 'xl_zoom', 'wall_preview_open',
  'native_cart_add', 'native_cart_view', 'native_checkout_start',
  'native_checkout_quote', 'native_payment_start', 'native_order_complete',
  'native_checkout_error', 'native_checkout_cancel',
  'order_native_cart_opened',
  'series_info', 'more_info_open', 'collector_notes_open', 'slideshow_start',
  'slideshow_nav_next', 'slideshow_nav_prev'
]);

export const V3_ENGAGEMENT_EVENT_TYPES = new Set(V3_CORE_EVENT_TYPES.filter((type) => type !== 'page_view'));
export const V3_SHOPPING_EVENT_TYPES = new Set(SHOPPING_STAGES.map(stage => stage.event));

export const V3_OIM_DOMAINS = Object.freeze([
  'one-image-movie.com',
  'one-image-movies.com',
  'one-imagemovie.com',
  'one-imagemovies.com',
  'oneimagemovie.com',
  'oneimagemovies.com'
]);

// Narrowly exclude known datacenter/search infrastructure from human-facing
// totals. Those rows remain available through manually loaded diagnostics.
export const V3_DATACENTER_ASNS = Object.freeze([
  6939, 13335, 209242, 14618, 16509, 15169, 396982, 8075, 395973,
  54113, 63949, 32934, 20940, 16625, 24940, 14061, 12876, 202306,
  132203, 136907, 45102,
  // Confirmed hosting infrastructure observed in the same coordinated burst:
  // M247, EGIHosting, FDC Servers, SYNLINQ, and Leaseweb.
  9009, 18779, 30058, 44486, 396362,
  // Confirmed distributed proxy networks behind the 2026-11-06 sitewide crawl.
  214483, 62610,
  // HostRoyale hosting/proxy pool. A November 2026 browser-automation burst
  // rotated one identical mobile fingerprint through this ASN.
  207990
]);

// Known owner/test traffic is not useful in the human-facing totals. Keeping
// this exclusion in the updater means dashboard reads never need raw IP data.
const V3_INTERNAL_IPS = new Set(['184.56.48.57']);

// Keep network exclusions narrow when the parent ASN also carries ordinary
// consumer traffic. Palo Alto Networks uses this reassigned /24 for automated
// scanning, while excluding all of AS3356 would hide legitimate visitors.
const V3_EXCLUDED_IPV4_PREFIXES = Object.freeze(['205.169.39.']);

const AUTOMATION_UA_PATTERN = /bot|spider|crawler|headless|python|curl|wget|scrapy|httpclient|axios|node-fetch|okhttp/i;
const GOOGLE_SCREENSHOT_REFERRER_PATTERN = /(?:^|\.)screenshot\.corp\.google\.com$/i;
const easternDayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
});

function easternDay(timestamp) {
  const raw = String(timestamp || '').trim();
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const date = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(normalized) ? normalized : `${normalized}Z`);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = Object.fromEntries(easternDayFormatter.formatToParts(date)
    .filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function normalizeV3Path(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) {
    try { return new URL(raw).pathname || '/'; } catch { return null; }
  }
  return raw.startsWith('/') ? raw : `/${raw}`;
}

export function getV3AcquisitionLabel(referer) {
  const value = String(referer || '').toLowerCase();
  if (!value || value.includes('k4studios.com')) return 'Direct / internal';
  if (value.includes('google.')) return 'Google';
  if (value.includes('bing.')) return 'Bing';
  if (value.includes('facebook.') || value.includes('instagram.')) return 'Facebook / Instagram';
  if (value.includes('pinterest.')) return 'Pinterest';
  return 'Other external';
}

export function getV3OimDomain(row) {
  const source = String(row?.utm_source || '').trim().toLowerCase();
  const medium = String(row?.utm_medium || '').trim().toLowerCase();
  const campaign = String(row?.utm_campaign || '').trim().toLowerCase();
  return medium === 'vanity_domain' && campaign === 'oim_doorway' && V3_OIM_DOMAINS.includes(source)
    ? source
    : null;
}

export function getV3ActionLabel(type, sourceLayer = null) {
  if (type === 'native_checkout_error' || type === 'native_checkout_cancel') {
    const stage = ({ config: 'Checkout configuration', quote: 'Final total',
      paypal_setup: 'PayPal loading / initialization', paypal_open: 'Opening PayPal',
      paypal_capture: 'Capturing PayPal payment', paypal_error: 'PayPal SDK',
      card_open: 'Opening card checkout', card_capture: 'Capturing card payment',
      card_error: 'Card SDK', card_validation: 'Card validation',
      paypal_cancel: 'PayPal', card_cancel: 'Card' })[sourceLayer] || 'Unknown step';
    return `${type === 'native_checkout_error' ? 'Checkout error' : 'Checkout canceled'}: ${stage}`;
  }
  if (type === 'order_clicked') {
    return ({
      pricing_main_button_v1: 'Pricing opened - main button',
      pricing_zoom_summary_v1: 'Pricing opened - zoom summary',
      pricing_more_info_summary_v1: 'Pricing opened - More Info summary',
      pricing_story_button_v1: 'Pricing opened - Picture Show'
    })[String(sourceLayer || '')] || 'Pricing opened - legacy/unknown source';
  }
  return ({
    zone_h1_click: 'Zone H1 clicked',
    order_submitted: 'Order choice clicked (legacy)',
    order_smugmug_clicked: 'Order clicked — SmugMug',
    order_email_clicked: 'Order clicked — email',
    order_native_cart_opened: 'Opened ordering options',
    native_cart_add: 'Added to cart', native_cart_view: 'Viewed cart',
    native_checkout_start: 'Started checkout', native_checkout_quote: 'Calculated final total',
    native_payment_start: 'Started payment', native_order_complete: 'Order completed',
    grid_open: 'Grid opened', grid_image_click: 'Grid image clicked',
    gallery_preview_click: 'Gallery preview clicked', gallery_hero_click: 'Gallery hero clicked',
    browse_all_click: 'Browse all clicked', browse_all_image_click: 'Browse-all image clicked',
    gallery_explore_click: 'Gallery explored', theme_click: 'Theme clicked',
    nav_next: 'Next image', nav_prev: 'Previous image',
    sister_image_click: 'Related image clicked', cowboy_jump: 'Cowboy widget clicked',
    picture_shows_jump: 'Picture Shows widget clicked', story_audio_toggle: 'Narration toggled',
    story_slider_click: 'Story slide clicked',
    frontier_story_video_widget_click: 'Story video clicked', xl_zoom: 'XL zoom opened',
    wall_preview_open: 'See on Wall opened',
    series_info: 'Series information opened', more_info_open: 'More information opened',
    collector_notes_open: 'Collector notes opened', slideshow_start: 'Slideshow started',
    slideshow_nav_next: 'Slideshow image advance', slideshow_nav_prev: 'Slideshow previous image'
  })[type] || null;
}

export function getV3ActionGroup(type) {
  if (['order_clicked', 'order_submitted', 'order_smugmug_clicked', 'order_email_clicked', 'order_native_cart_opened',
    'native_cart_add', 'native_cart_view', 'native_checkout_start', 'native_checkout_quote',
    'native_payment_start', 'native_order_complete', 'native_checkout_error', 'native_checkout_cancel'].includes(type)) return 'Commerce';
  if (type.startsWith('grid_')) return 'Grid';
  if (type.startsWith('gallery_') || ['browse_all_click', 'browse_all_image_click', 'theme_click', 'all_list_click', 'exit_to_gallery'].includes(type)) return 'Gallery';
  if (['nav_next', 'nav_prev', 'slideshow_nav_next', 'slideshow_nav_prev', 'sister_image_click', 'cowboy_jump', 'picture_shows_jump', 'presentation_last_image_back_to_start'].includes(type)) return 'Image navigation';
  if (type.startsWith('story_') || type === 'frontier_story_video_widget_click') return 'Story';
  if (type.startsWith('guide_')) return 'Guide';
  if (['xl_zoom', 'wall_preview_open', 'series_info', 'more_info_open', 'collector_notes_open', 'slideshow_start'].includes(type)) return 'Engagement';
  return null;
}

export function getV3GeoLabel(row) {
  const city = String(row?.city || '').trim();
  const region = String(row?.region || '').trim();
  const country = String(row?.country || '').trim().toUpperCase();
  // Keep the country in the compact label even when a region is available.
  // The V3 renderer can then group locations without querying raw events.
  if (city) return [city, region, country].filter(Boolean).join(', ');
  if (region) return [region, country].filter(Boolean).join(', ');
  return country || null;
}

export function getV3DeviceLabel(userAgent) {
  const value = String(userAgent || '').toLowerCase();
  if (/android/.test(value)) return 'Android';
  // Modern iPads can identify as Macintosh while still including Mobile.
  if (/iphone|ipad|ipod/.test(value) || (/macintosh/.test(value) && /mobile/.test(value))) return 'Apple mobile';
  if (/windows/.test(value)) return 'Windows';
  if (/macintosh|mac os x/.test(value)) return 'Mac';
  return 'Other';
}

export function isV3GoogleScreenshotAutomation(row) {
  return [row?.entry_referrer, row?.document_referrer, row?.referer].some((value) => {
    if (!value) return false;
    try {
      return GOOGLE_SCREENSHOT_REFERRER_PATTERN.test(new URL(String(value)).hostname);
    } catch {
      return /screenshot\.corp\.google\.com/i.test(String(value));
    }
  });
}

export function getV3ExpeditionActionLabel(pagePath, eventType) {
  const path = normalizeV3Path(pagePath);
  const prefix = '/Other/Expeditions/';
  if (!path?.startsWith(prefix)) return null;

  const slug = path.slice(prefix.length).split('/')[0];
  if (!slug || slug === 'echoes-api-test') return null;

  const expeditionName = ({
    'echoes-of-the-west-2026': 'Echoes of the West 2026',
    'fiddlers-green-2026': 'Fiddlers Green 2026',
    'obv-wild-west-2026': 'OBV Wild West 2026'
  })[slug] || slug.split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  const action = ({
    grid_image_click: 'Photograph opened',
    nav_next: 'Next photograph',
    nav_prev: 'Previous photograph',
    slideshow_start: 'Slideshow started',
    slideshow_nav_next: 'Slideshow auto-advance',
    slideshow_nav_prev: 'Slideshow previous photograph',
    order_smugmug_clicked: 'Order Prints clicked',
    grid_show_more: 'Next gallery page',
    grid_show_previous: 'Previous gallery page'
  })[eventType];

  return action ? `${expeditionName} | ${action}` : null;
}

function isV3BrowserEvent(row) {
  const sourceIp = String(row?.ip || row?.ip_hash || '').trim();
  return Boolean(row && row.source === 'js' && row.session_id && row.visitor_id
    && !isRotatingProxyCrawler(row)
    && !V3_INTERNAL_IPS.has(sourceIp)
    && !V3_EXCLUDED_IPV4_PREFIXES.some((prefix) => sourceIp.startsWith(prefix))
    && !V3_DATACENTER_ASNS.includes(Number(row.cf_asn))
    && String(row.country || '').toUpperCase() !== 'T1'
    && !isV3GoogleScreenshotAutomation(row)
    && !AUTOMATION_UA_PATTERN.test(String(row.ua || '')));
}

export function isV3CoreEvent(row) {
  return isV3BrowserEvent(row) && V3_CORE_EVENT_TYPES.includes(String(row.event_type || ''));
}

function addCount(map, key, amount = 1) {
  if (key) map.set(key, (map.get(key) || 0) + amount);
}

function eventDay(row) {
  const lifecycle = ['page_engagement', 'session_exit'].includes(row.event_type);
  const startedAt = lifecycle && parseEntryEvidence(row.engagement_meta)?.startedAt;
  return easternDay(startedAt || row.ts);
}

export function getV3EvidenceSessionKeys(rows) {
  const keys = new Map();
  for (const row of rows) {
    if (!isV3BrowserEvent(row) || !(V3_CORE_EVENT_TYPES.includes(row.event_type)
      || ['page_engagement', 'session_exit'].includes(row.event_type))) continue;
    const day = eventDay(row);
    if (day) keys.set(`${day}\u0000${row.session_id}`, { day, sessionId: row.session_id });
  }
  return [...keys.values()];
}

export function buildV3RollupBatch(rows, previousSessions = []) {
  const daily = new Map();
  const dimensions = new Map();
  const sessions = new Map();
  const visitors = new Set();
  const images = new Map();
  const imageGeography = new Map();
  const previous = new Map(previousSessions.map((row) => [`${row.day}\u0000${row.session_id}`, row]));
  const evidenceRows = new Map();
  let accepted = 0;
  let lastRawEventId = 0;
  let lastEventTs = null;
  const screenshotSessionIds = new Set();
  const screenshotVisitorIds = new Set();
  const recordedMerchantSessionDays = new Set();
  const merchantActionLabels = {
    order_clicked: 'Pricing opened',
    native_cart_add: 'Added to cart',
    native_cart_view: 'Viewed cart',
    native_checkout_start: 'Started checkout',
    native_checkout_quote: 'Calculated final total',
    native_payment_start: 'Started payment',
    native_order_complete: 'Order completed'
  };
  const incrementDimension = (day, dimension, label) => {
    if (day && label) addCount(dimensions, `${day}\u0000${dimension}\u0000${label}`);
  };

  // Google screenshot/commerce inspection can navigate through several pages
  // with a normal Chrome UA. Exclude the whole batch-local cohort when any row
  // exposes its definitive screenshot.corp.google.com referrer, including the
  // internal-navigation rows that preceded the marked page.
  for (const row of rows) {
    if (!isV3GoogleScreenshotAutomation(row)) continue;
    if (row?.session_id) screenshotSessionIds.add(row.session_id);
    if (row?.visitor_id) screenshotVisitorIds.add(row.visitor_id);
  }

  for (const row of rows) {
    const rawId = Number(row?.id || 0);
    if (rawId >= lastRawEventId) {
      lastRawEventId = rawId;
      lastEventTs = row?.ts || lastEventTs;
    }
    const day = eventDay(row);
    if (!day) continue;
    const isMerchantInspection = screenshotSessionIds.has(row?.session_id)
      || screenshotVisitorIds.has(row?.visitor_id);
    if (isMerchantInspection) {
      const sessionDayKey = `${day}\u0000${row.session_id || row.visitor_id}`;
      if (!recordedMerchantSessionDays.has(sessionDayKey)) {
        recordedMerchantSessionDays.add(sessionDayKey);
        incrementDimension(day, 'merchant_inspection_session', 'Google Merchant review / validation');
        incrementDimension(day, 'merchant_inspection_location', getV3GeoLabel(row) || 'Unknown location');
      }
      incrementDimension(day, 'merchant_inspection_action', merchantActionLabels[row.event_type]);
      if (row.event_type === 'order_clicked') {
        incrementDimension(day, 'merchant_inspection_product', normalizeV3Path(row.page) || row.target_id || 'Unknown product');
      }
      continue;
    }
    if (!isV3BrowserEvent(row)) continue;
    const sessionKey = `${day}\u0000${row.session_id}`;
    const core = V3_CORE_EVENT_TYPES.includes(String(row.event_type || ''));
    const lifecycle = ['page_engagement', 'session_exit'].includes(row.event_type);
    if (!core && !lifecycle) continue;
    const prior = previous.get(sessionKey);
    if (!evidenceRows.has(sessionKey)) evidenceRows.set(sessionKey, []);
    evidenceRows.get(sessionKey).push({ ...row, page: normalizeV3Path(row.page) });
    if (!sessions.has(sessionKey)) {
      sessions.set(sessionKey, {
        day, sessionId: row.session_id, visitorId: row.visitor_id, visitorStatus: null, engaged: 0,
        landingPage: prior?.landing_page || null, entrySource: prior?.entry_source || null,
        visitorGeo: prior?.visitor_geo || null, imageGeo: null,
        entryIsImageFallback: Number(prior?.entry_is_image_fallback || 0), pageViewCount: 0,
        siteDevice: null, imageDevice: null, oimDomain: null, entryEvidence: prior?.entry_evidence || null,
        shoppingActivity: {}
      });
    }
    // Lifecycle facts enrich an existing visit but never count as page loads,
    // engagement actions, new visitors, or newly discovered entry sessions.
    if (!core) continue;
    accepted += 1;
    const metric = daily.get(day) || { day, pageViews: 0, imageViews: 0, pricingOpens: 0, orderSubmits: 0, smugmugClicks: 0, emailClicks: 0, coreEvents: 0 };
    metric.coreEvents += 1;
    if (row.event_type === 'page_view') metric.pageViews += 1;
    if (row.event_type === 'chapter_view') metric.imageViews += 1;
    if (row.event_type === 'order_clicked') metric.pricingOpens += 1;
    if (row.event_type === 'order_submitted') metric.orderSubmits += 1;
    if (row.event_type === 'order_smugmug_clicked') metric.smugmugClicks += 1;
    if (row.event_type === 'order_email_clicked') metric.emailClicks += 1;
    daily.set(day, metric);

    const engaged = V3_ENGAGEMENT_EVENT_TYPES.has(row.event_type) ? 1 : 0;
    const session = sessions.get(sessionKey);
    if (V3_SHOPPING_EVENT_TYPES.has(row.event_type)) {
      session.shoppingActivity[row.event_type] = (session.shoppingActivity[row.event_type] || 0) + 1;
      session.visitorGeo ||= getV3GeoLabel(row);
    }
    if (!session.visitorStatus && ['new', 'returning'].includes(row.visitor_status)) {
      session.visitorStatus = row.visitor_status;
    }
    session.engaged = Math.max(session.engaged, engaged);
    if (row.event_type === 'page_view') {
      session.pageViewCount += 1;
      if (!session.siteDevice) session.siteDevice = getV3DeviceLabel(row.ua);
      if (!session.landingPage || session.entryIsImageFallback) {
        session.landingPage = normalizeV3Path(row.page) || 'Unknown page';
        session.entrySource = getV3AcquisitionLabel(row.entry_referrer || row.referer);
        session.oimDomain = getV3OimDomain(row) || session.oimDomain;
        session.visitorGeo = getV3GeoLabel(row);
        session.entryIsImageFallback = 0;
      }
    }
    if (row.event_type === 'chapter_view') {
      if (!session.imageGeo) session.imageGeo = getV3GeoLabel(row);
      if (!session.imageDevice) session.imageDevice = getV3DeviceLabel(row.ua);
      if (!session.landingPage) {
        session.landingPage = normalizeV3Path(row.page) || 'Unknown page';
        session.entrySource = getV3AcquisitionLabel(row.entry_referrer || row.referer);
        session.oimDomain = getV3OimDomain(row) || session.oimDomain;
        session.visitorGeo = getV3GeoLabel(row);
        session.entryIsImageFallback = 1;
      }
    }
    sessions.set(sessionKey, session);
    visitors.add(`${day}\u0000${row.visitor_id}`);

    if (row.event_type === 'page_view') {
      incrementDimension(day, 'page', normalizeV3Path(row.page) || 'Unknown page');
    }
    if (['chapter_view', 'order_clicked', 'order_smugmug_clicked', 'order_email_clicked'].includes(row.event_type)) {
      const imageId = row.target_id || 'Unknown image';
      const pagePath = normalizeV3Path(row.page);
      const imageKey = `${day}\u0000${imageId}\u0000${pagePath || ''}`;
      const image = images.get(imageKey) || { views: 0, pricingOpens: 0, smugmugClicks: 0, emailClicks: 0 };
      if (row.event_type === 'chapter_view') image.views += 1;
      if (row.event_type === 'order_clicked') image.pricingOpens += 1;
      if (row.event_type === 'order_smugmug_clicked') image.smugmugClicks += 1;
      if (row.event_type === 'order_email_clicked') image.emailClicks += 1;
      images.set(imageKey, image);
    }
    if (V3_SHOPPING_EVENT_TYPES.has(row.event_type)) {
      for (const imageId of shoppingImageIds(row.target_id)) {
        // Cart pages are not artwork links. Keep the path empty so a real
        // image view can supply it, or the renderer can use the /art resolver.
        const imageKey = `${day}\u0000${imageId}\u0000`;
        const image = images.get(imageKey) || { views: 0, pricingOpens: 0, smugmugClicks: 0, emailClicks: 0 };
        image.shoppingActivity ||= {};
        image.shoppingActivity._sessions ||= [];
        if (!image.shoppingActivity._sessions.includes(row.session_id)) image.shoppingActivity._sessions.push(row.session_id);
        image.shoppingActivity[row.event_type] = (image.shoppingActivity[row.event_type] || 0) + 1;
        images.set(imageKey, image);
      }
    }
    if (row.event_type === 'chapter_view') {
      incrementDimension(day, 'image_geo_views', getV3GeoLabel(row) || 'Unknown location');
      const imageId = row.target_id || 'Unknown image';
      const country = String(row.country || '').trim().toUpperCase();
      const region = String(row.region || '').trim();
      const city = String(row.city || '').trim();
      addCount(imageGeography, `${day}\u0000${imageId}\u0000${country}\u0000${region}\u0000${city}`);
    }
    const action = getV3ActionLabel(row.event_type, row.source_layer);
    if (row.event_type === 'wall_preview_open') {
      const size = String(row.source_layer || '').match(/^wall_preview_size_(5x7|8x10|11x14|16x20|20x24|30x40|40x60)_v1$/)?.[1];
      incrementDimension(day, 'wall_preview_size', size ? size.replace('x', ' × ') : 'Unknown size');
    }
    if (action) incrementDimension(day, 'action', action);
    const expeditionAction = getV3ExpeditionActionLabel(row.page, row.event_type);
    if (expeditionAction) incrementDimension(day, 'expedition_action', expeditionAction);
    const actionGroup = getV3ActionGroup(row.event_type);
    if (actionGroup) incrementDimension(day, 'action_group', actionGroup);
  }

  for (const [key, session] of sessions) {
    session.entryEvidence = mergeEntryEvidence(session.entryEvidence, evidenceRows.get(key), session.landingPage);
    // A lifecycle event without a core session is not an entry visit.
    if (!session.landingPage && !previous.has(key) && !session.engaged && !session.pageViewCount) sessions.delete(key);
  }
  const split = (key) => key.split('\u0000');
  return {
    scanned: rows.length,
    accepted,
    lastRawEventId,
    lastEventTs,
    daily: [...daily.values()],
    dimensions: [...dimensions].map(([key, count]) => { const [day, dimension, label] = split(key); return { day, dimension, label, count }; }),
    sessions: [...sessions.values()],
    visitors: [...visitors].map((key) => { const [day, visitorId] = split(key); return { day, visitorId }; }),
    images: [...images].map(([key, counts]) => { const [day, imageId, pagePath] = split(key); return {
      day, imageId, pagePath: pagePath || null,
      count: counts.views, pricingOpens: counts.pricingOpens,
      smugmugClicks: counts.smugmugClicks, emailClicks: counts.emailClicks,
      shoppingActivity: counts.shoppingActivity || {}
    }; }),
    imageGeography: [...imageGeography].map(([key, count]) => {
      const [day, imageId, country, region, city] = split(key);
      return { day, imageId, country, region, city, count };
    })
  };
}

export function summarizeV3Rollup(batch, label = 'Archive sample') {
  const sum = (field) => batch.daily.reduce((total, row) => total + Number(row[field] || 0), 0);
  const top = (dimension, limit) => {
    const merged = new Map();
    batch.dimensions.filter((row) => row.dimension === dimension)
      .forEach((row) => addCount(merged, row.label, row.count));
    return [...merged].map(([itemLabel, count]) => ({ label: itemLabel, count }))
      .sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label)).slice(0, limit);
  };
  const topSessionField = (field, limit, predicate = () => true) => {
    const merged = new Map();
    batch.sessions.filter(predicate).forEach((row) => addCount(merged, row[field]));
    return [...merged].map(([itemLabel, count]) => ({ label: itemLabel, count }))
      .sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label)).slice(0, limit);
  };
  const topDistinctVisitors = (field, limit, predicate = () => true, includeMix = false) => {
    const merged = new Map();
    batch.sessions.filter(predicate).forEach((row) => {
      const value = typeof field === 'function' ? field(row) : row[field];
      if (!value) return;
      if (!merged.has(value)) merged.set(value, new Set());
      merged.get(value).add(row.visitorId || row.sessionId);
    });
    return [...merged].map(([itemLabel, visitors]) => {
      const shoppingSessions = batch.sessions.filter((row) => shoppingTotal(row.shoppingActivity) && predicate(row)
        && (typeof field === 'function' ? field(row) : row[field]) === itemLabel);
      const shoppers = new Set(shoppingSessions.map((row) => row.visitorId || row.sessionId));
      return { label: itemLabel, count: visitors.size,
        ...(includeMix ? { visitorMix: classifyVisitorMix([...visitors].map((id) => periodVisitors.get(id) || {})),
          ...(shoppers.size ? { shoppingVisitors: shoppers.size,
            shoppingEvents: mergeShoppingCounts(shoppingSessions.map(row => row.shoppingActivity)) } : {}) } : {}) };
    })
      .sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label)).slice(0, limit);
  };
  const fallbackPageCount = batch.sessions.filter((row) => row.entryIsImageFallback && !row.pageViewCount).length;
  const topPagesWithFallback = (() => {
    const merged = new Map(top('page', Number.MAX_SAFE_INTEGER).map((row) => [row.label, row.count]));
    batch.sessions.filter((row) => row.entryIsImageFallback && !row.pageViewCount)
      .forEach((row) => addCount(merged, row.landingPage));
    return [...merged].map(([itemLabel, count]) => ({ label: itemLabel, count }))
      .sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label)).slice(0, 25);
  })();
  const entryNavigation = (() => {
    const grouped = new Map();
    batch.sessions.forEach((row) => {
      if (!row.landingPage) return;
      const item = grouped.get(row.landingPage) || { label: row.landingPage, entries: 0, continued: 0, chapters: 0, graded: 0, gradeTotal: 0 };
      item.entries += 1;
      if (row.pageViewCount >= 2) item.continued += 1;
      if (row.imageDevice || row.imageGeo) item.chapters += 1;
      if (row.entryEvidence?.grade != null) { item.graded += 1; item.gradeTotal += row.entryEvidence.grade; }
      grouped.set(row.landingPage, item);
    });
    return [...grouped.values()]
      .sort((a, b) => (b.entries - a.entries) || a.label.localeCompare(b.label))
      .slice(0, 25);
  })();
  const oimDomainFunnel = (() => {
    const grouped = new Map();
    batch.sessions.forEach((row) => {
      if (!row.oimDomain) return;
      const item = grouped.get(row.oimDomain) || { label: row.oimDomain, entries: 0, continued: 0, chapters: 0 };
      item.entries += 1;
      if (row.pageViewCount >= 2) item.continued += 1;
      if (row.imageDevice || row.imageGeo) item.chapters += 1;
      grouped.set(row.oimDomain, item);
    });
    return V3_OIM_DOMAINS.filter((domain) => grouped.has(domain)).map((domain) => grouped.get(domain));
  })();
  const cartFunnelLabels = ['Added to cart', 'Viewed cart', 'Started checkout', 'Calculated final total', 'Started payment', 'Order completed'];
  const actionCounts = new Map(top('action', Number.MAX_SAFE_INTEGER).map((row) => [row.label, row.count]));
  const visitorMixByDay = new Map();
  batch.sessions.forEach((row) => {
    const dayVisitors = visitorMixByDay.get(row.day) || new Map();
    const visitor = dayVisitors.get(row.visitorId) || { sawNew: false, sawReturning: false };
    visitor.sawNew ||= row.visitorStatus === 'new';
    visitor.sawReturning ||= row.visitorStatus === 'returning';
    dayVisitors.set(row.visitorId, visitor);
    visitorMixByDay.set(row.day, dayVisitors);
  });
  const classifyVisitorMix = (visitors) => {
    const result = { newVisitors: 0, returningVisitors: 0, unknownVisitors: 0 };
    visitors.forEach((visitor) => {
      if (visitor.sawNew) result.newVisitors += 1;
      else if (visitor.sawReturning) result.returningVisitors += 1;
      else result.unknownVisitors += 1;
    });
    return result;
  };
  const periodVisitors = new Map();
  visitorMixByDay.forEach((dayVisitors) => dayVisitors.forEach((visitor, visitorId) => {
    const periodVisitor = periodVisitors.get(visitorId) || { sawNew: false, sawReturning: false };
    periodVisitor.sawNew ||= visitor.sawNew;
    periodVisitor.sawReturning ||= visitor.sawReturning;
    periodVisitors.set(visitorId, periodVisitor);
  }));
  return {
    window: { key: 'archive', label },
    state: { lastRawEventId: batch.lastRawEventId, lastEventTs: batch.lastEventTs },
    counts: {
      visitors: new Set(batch.visitors.map((row) => row.visitorId)).size,
      sessions: new Set(batch.sessions.map((row) => row.sessionId)).size,
      page_views: sum('pageViews') + fallbackPageCount, image_views: sum('imageViews'),
      engaged_sessions: new Set(batch.sessions.filter((row) => row.engaged).map((row) => row.sessionId)).size,
      pricing_opens: sum('pricingOpens'), order_submits: sum('orderSubmits'),
      smugmug_clicks: sum('smugmugClicks'), email_clicks: sum('emailClicks'),
      cowboy_widget_clicks: actionCounts.get('Cowboy widget clicked') || 0,
      picture_shows_widget_clicks: actionCounts.get('Picture Shows widget clicked') || 0
    },
    topPages: topPagesWithFallback,
    topImages: (() => {
      const byImage = new Map();
      for (const row of batch.images) {
        const item = byImage.get(row.imageId) || { label: row.imageId, imageId: row.imageId, pagePath: null,
          count: 0, pricingOpens: 0, smugmugClicks: 0, emailClicks: 0, shoppingEvents: {} };
        item._shoppingSessionKeys ||= new Set();
        for (const sessionId of row.shoppingActivity?._sessions || []) item._shoppingSessionKeys.add(row.day + '|' + sessionId);
        item.pagePath ||= row.pagePath;
        for (const key of ['count', 'pricingOpens', 'smugmugClicks', 'emailClicks']) item[key] += Number(row[key] || 0);
        item.shoppingEvents = mergeShoppingCounts([item.shoppingEvents, row.shoppingActivity]);
        byImage.set(row.imageId, item);
      }
      const all = [...byImage.values()].map(item => {
        const { _shoppingSessionKeys, ...image } = item;
        return { ...image, shoppingProgress: mergeShoppingCounts(batch.sessions
          .filter(session => _shoppingSessionKeys.has(session.day + '|' + session.sessionId))
          .map(session => session.shoppingActivity)) };
      });
      const selected = new Map(all.filter((row) => row.count > 0)
        .sort((a, b) => b.count - a.count).slice(0, 25)
        .map((row) => [row.imageId, row]));
      all.filter((row) => row.pricingOpens > 0 || shoppingTotal(row.shoppingEvents) > 0).forEach((row) => selected.set(row.imageId, row));
      all.filter((row) => row.smugmugClicks > 0 || row.emailClicks > 0)
        .forEach((row) => selected.set(row.imageId, row));
      const geoByImage = new Map();
      batch.imageGeography.forEach((row) => {
        if (!geoByImage.has(row.imageId)) geoByImage.set(row.imageId, new Map());
        const key = `${row.country}\u0000${row.region}\u0000${row.city}`;
        addCount(geoByImage.get(row.imageId), key, row.count);
      });
      return [...selected.values()].map((row) => {
        const dominant = [...(geoByImage.get(row.imageId) || new Map())]
          .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))[0];
        if (!dominant) return row;
        const [country, region, city] = dominant[0].split('\u0000');
        return { ...row, dominantGeo: getV3GeoLabel({ country, region, city }), dominantGeoViews: dominant[1] };
      }).sort((a, b) => (b.count - a.count)
        || (b.pricingOpens - a.pricingOpens) || a.imageId.localeCompare(b.imageId));
    })(),
    entryPages: topSessionField('landingPage', 25), entryNavigation, oimDomainFunnel,
    visitorMix: {
      ...classifyVisitorMix(periodVisitors),
      daily: [...visitorMixByDay].sort((a, b) => b[0].localeCompare(a[0]))
        .map(([day, visitors]) => ({ day, ...classifyVisitorMix(visitors) }))
    },
    acquisition: topSessionField('entrySource', 10),
    visitorGeography: topDistinctVisitors((row) => row.visitorGeo || row.imageGeo, 20, () => true, true),
    siteDevices: topDistinctVisitors('siteDevice', 5, (row) => Boolean(row.siteDevice)),
    imageDevices: topDistinctVisitors('imageDevice', 5, (row) => Boolean(row.imageDevice)),
    imageGeography: (() => {
      const viewCounts = new Map(top('image_geo_views', Number.MAX_SAFE_INTEGER)
        .map((row) => [row.label, row.count]));
      return topDistinctVisitors('imageGeo', 20, (row) => Boolean(row.imageGeo), true)
        .map((row) => ({ ...row, imageViews: viewCounts.get(row.label) || 0 }));
    })(),
    wallPreviews: top('wall_preview_size', 20),
    expeditionActions: top('expedition_action', 30),
    actionGroups: top('action_group', 10),
    actions: top('action', 20).filter((row) => !['Order clicked — SmugMug', 'Order clicked — email'].includes(row.label)),
    cartFunnel: cartFunnelLabels.map((label) => ({ label, count: actionCounts.get(label) || 0 })),
    checkoutIssues: [...actionCounts].filter(([label]) => /^Checkout (error|canceled):/.test(label))
      .map(([label, count]) => ({ label, count })),
    population: { scanned: batch.scanned, accepted: batch.accepted }
  };
}
