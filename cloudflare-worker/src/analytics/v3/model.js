export const V3_CORE_EVENT_TYPES = Object.freeze([
  'page_view', 'chapter_view', 'nav_next', 'nav_prev', 'sister_image_click',
  'cowboy_jump', 'picture_shows_jump', 'presentation_last_image_back_to_start',
  'grid_open', 'grid_image_click', 'grid_show_more', 'grid_show_previous',
  'gallery_preview_click', 'gallery_hero_click', 'browse_all_click',
  'browse_all_image_click', 'gallery_explore_click', 'exit_to_gallery',
  'theme_click', 'all_list_click', 'story_audio_toggle', 'story_slider_click',
  'frontier_story_video_widget_click', 'guide_open', 'guide_close', 'guide_done',
  'guide_click_outside', 'order_clicked', 'order_submitted', 'xl_zoom',
  'series_info', 'more_info_open', 'collector_notes_open', 'slideshow_start'
]);

export const V3_ENGAGEMENT_EVENT_TYPES = new Set(V3_CORE_EVENT_TYPES.filter((type) => type !== 'page_view'));

// Narrowly exclude known datacenter/search infrastructure from human-facing
// totals. Those rows remain available through manually loaded diagnostics.
export const V3_DATACENTER_ASNS = Object.freeze([
  6939, 13335, 209242, 14618, 16509, 15169, 396982, 8075, 395973,
  54113, 63949, 32934, 20940, 16625, 24940, 14061, 12876, 202306,
  132203, 136907, 45102
]);

// Known owner/test traffic is not useful in the human-facing totals. Keeping
// this exclusion in the updater means dashboard reads never need raw IP data.
const V3_INTERNAL_IPS = new Set(['184.56.48.57']);

const AUTOMATION_UA_PATTERN = /bot|spider|crawler|headless|python|curl|wget|scrapy|httpclient|axios|node-fetch|okhttp/i;
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

export function getV3ActionLabel(type) {
  return ({
    order_clicked: 'Pricing opened', order_submitted: 'Order submitted',
    grid_open: 'Grid opened', grid_image_click: 'Grid image clicked',
    gallery_preview_click: 'Gallery preview clicked', gallery_hero_click: 'Gallery hero clicked',
    browse_all_click: 'Browse all clicked', browse_all_image_click: 'Browse-all image clicked',
    gallery_explore_click: 'Gallery explored', theme_click: 'Theme clicked',
    nav_next: 'Next image', nav_prev: 'Previous image',
    sister_image_click: 'Related image clicked', cowboy_jump: 'Picture-show jump',
    picture_shows_jump: 'Picture-show jump', story_audio_toggle: 'Narration toggled',
    story_slider_click: 'Story slide clicked',
    frontier_story_video_widget_click: 'Story video clicked', xl_zoom: 'XL zoom opened',
    series_info: 'Series information opened', more_info_open: 'More information opened',
    collector_notes_open: 'Collector notes opened', slideshow_start: 'Slideshow started'
  })[type] || null;
}

export function getV3ActionGroup(type) {
  if (['order_clicked', 'order_submitted'].includes(type)) return 'Commerce';
  if (type.startsWith('grid_')) return 'Grid';
  if (type.startsWith('gallery_') || ['browse_all_click', 'browse_all_image_click', 'theme_click', 'all_list_click', 'exit_to_gallery'].includes(type)) return 'Gallery';
  if (['nav_next', 'nav_prev', 'sister_image_click', 'cowboy_jump', 'picture_shows_jump', 'presentation_last_image_back_to_start'].includes(type)) return 'Image navigation';
  if (type.startsWith('story_') || type === 'frontier_story_video_widget_click') return 'Story';
  if (type.startsWith('guide_')) return 'Guide';
  if (['xl_zoom', 'series_info', 'more_info_open', 'collector_notes_open', 'slideshow_start'].includes(type)) return 'Engagement';
  return null;
}

export function getV3GeoLabel(row) {
  const city = String(row?.city || '').trim();
  const region = String(row?.region || '').trim();
  const country = String(row?.country || '').trim();
  if (city) return `${city}${region ? `, ${region}` : country ? `, ${country}` : ''}`;
  if (region) return `${region}${country ? `, ${country}` : ''}`;
  return country || null;
}

export function isV3CoreEvent(row) {
  return Boolean(row && row.source === 'js' && row.session_id && row.visitor_id
    && V3_CORE_EVENT_TYPES.includes(String(row.event_type || ''))
    && !V3_INTERNAL_IPS.has(String(row.ip || row.ip_hash || '').trim())
    && !V3_DATACENTER_ASNS.includes(Number(row.cf_asn))
    && String(row.country || '').toUpperCase() !== 'T1'
    && !AUTOMATION_UA_PATTERN.test(String(row.ua || '')));
}

function addCount(map, key, amount = 1) {
  if (key) map.set(key, (map.get(key) || 0) + amount);
}

export function buildV3RollupBatch(rows) {
  const daily = new Map();
  const dimensions = new Map();
  const sessions = new Map();
  const visitors = new Set();
  const images = new Map();
  let accepted = 0;
  let lastRawEventId = 0;
  let lastEventTs = null;

  for (const row of rows) {
    const rawId = Number(row?.id || 0);
    if (rawId >= lastRawEventId) {
      lastRawEventId = rawId;
      lastEventTs = row?.ts || lastEventTs;
    }
    if (!isV3CoreEvent(row)) continue;
    const day = easternDay(row.ts);
    if (!day) continue;
    accepted += 1;
    const metric = daily.get(day) || { day, pageViews: 0, imageViews: 0, pricingOpens: 0, orderSubmits: 0, coreEvents: 0 };
    metric.coreEvents += 1;
    if (row.event_type === 'page_view') metric.pageViews += 1;
    if (row.event_type === 'chapter_view') metric.imageViews += 1;
    if (row.event_type === 'order_clicked') metric.pricingOpens += 1;
    if (row.event_type === 'order_submitted') metric.orderSubmits += 1;
    daily.set(day, metric);

    const engaged = V3_ENGAGEMENT_EVENT_TYPES.has(row.event_type) ? 1 : 0;
    const sessionKey = `${day}\u0000${row.session_id}`;
    const session = sessions.get(sessionKey) || {
      day, sessionId: row.session_id, visitorId: row.visitor_id, engaged: 0,
      landingPage: null, entrySource: null, visitorGeo: null, imageGeo: null
    };
    session.engaged = Math.max(session.engaged, engaged);
    if (row.event_type === 'page_view' && !session.landingPage) {
      session.landingPage = normalizeV3Path(row.page) || 'Unknown page';
      session.entrySource = getV3AcquisitionLabel(row.entry_referrer || row.referer);
      session.visitorGeo = getV3GeoLabel(row);
    }
    if (row.event_type === 'chapter_view' && !session.imageGeo) {
      session.imageGeo = getV3GeoLabel(row);
    }
    sessions.set(sessionKey, session);
    visitors.add(`${day}\u0000${row.visitor_id}`);

    const incrementDimension = (dimension, label) => addCount(dimensions, `${day}\u0000${dimension}\u0000${label}`);
    if (row.event_type === 'page_view') {
      incrementDimension('page', normalizeV3Path(row.page) || 'Unknown page');
    }
    if (row.event_type === 'chapter_view' || row.event_type === 'order_clicked') {
      const imageId = row.target_id || 'Unknown image';
      const pagePath = normalizeV3Path(row.page);
      const imageKey = `${day}\u0000${imageId}\u0000${pagePath || ''}`;
      const image = images.get(imageKey) || { views: 0, pricingOpens: 0 };
      if (row.event_type === 'chapter_view') image.views += 1;
      if (row.event_type === 'order_clicked') image.pricingOpens += 1;
      images.set(imageKey, image);
    }
    if (row.event_type === 'chapter_view') {
      incrementDimension('image_geo_views', getV3GeoLabel(row) || 'Unknown location');
    }
    const action = getV3ActionLabel(row.event_type);
    if (action) incrementDimension('action', action);
    const actionGroup = getV3ActionGroup(row.event_type);
    if (actionGroup) incrementDimension('action_group', actionGroup);
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
      count: counts.views, pricingOpens: counts.pricingOpens
    }; })
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
  const topDistinctVisitors = (field, limit, predicate = () => true) => {
    const merged = new Map();
    batch.sessions.filter(predicate).forEach((row) => {
      if (!row[field]) return;
      if (!merged.has(row[field])) merged.set(row[field], new Set());
      merged.get(row[field]).add(row.visitorId || row.sessionId);
    });
    return [...merged].map(([itemLabel, visitors]) => ({ label: itemLabel, count: visitors.size }))
      .sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label)).slice(0, limit);
  };
  return {
    window: { key: 'archive', label },
    state: { lastRawEventId: batch.lastRawEventId, lastEventTs: batch.lastEventTs },
    counts: {
      visitors: new Set(batch.visitors.map((row) => row.visitorId)).size,
      sessions: new Set(batch.sessions.map((row) => row.sessionId)).size,
      page_views: sum('pageViews'), image_views: sum('imageViews'),
      engaged_sessions: new Set(batch.sessions.filter((row) => row.engaged).map((row) => row.sessionId)).size,
      pricing_opens: sum('pricingOpens'), order_submits: sum('orderSubmits')
    },
    topPages: top('page', 10),
    topImages: (() => {
      const all = batch.images.map((row) => ({
        label: row.imageId, imageId: row.imageId, pagePath: row.pagePath,
        count: row.count, pricingOpens: row.pricingOpens
      }));
      const selected = new Map(all.filter((row) => row.count > 0)
        .sort((a, b) => b.count - a.count).slice(0, 25)
        .map((row) => [row.imageId, row]));
      all.filter((row) => row.pricingOpens > 0).forEach((row) => selected.set(row.imageId, row));
      return [...selected.values()].sort((a, b) => (b.count - a.count)
        || (b.pricingOpens - a.pricingOpens) || a.imageId.localeCompare(b.imageId));
    })(),
    entryPages: topSessionField('landingPage', 25),
    acquisition: topSessionField('entrySource', 10),
    visitorGeography: topDistinctVisitors('visitorGeo', 20),
    imageGeography: (() => {
      const viewCounts = new Map(top('image_geo_views', Number.MAX_SAFE_INTEGER)
        .map((row) => [row.label, row.count]));
      return topDistinctVisitors('imageGeo', 20, (row) => Boolean(row.imageGeo))
        .map((row) => ({ ...row, imageViews: viewCounts.get(row.label) || 0 }));
    })(),
    actionGroups: top('action_group', 10), actions: top('action', 20),
    population: { scanned: batch.scanned, accepted: batch.accepted }
  };
}
