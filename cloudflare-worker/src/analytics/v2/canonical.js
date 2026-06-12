const PAGE_LOAD_DEDUPE_WINDOW_SECONDS = 10;
const INTERACTION_DEDUPE_WINDOW_SECONDS = 5;

export const V2_EVENT_FAMILIES = Object.freeze([
  'page_view',
  'image_view',
  'image_nav',
  'grid_action',
  'gallery_action',
  'story_action',
  'guide_action',
  'engagement_hint',
  'buy_click',
  'order_submit'
]);

export const V2_EXCLUDED_RAW_EVENT_TYPES = Object.freeze([
  'page_pixel',
  'state_pixel',
  'action_pixel',
  'session_exit',
  'qualified_chapter_view'
]);

export const V2_CANONICAL_PAGE_LOAD_RULES = Object.freeze({
  canonicalAuthority: 'first qualifying page load per session_id + normalized page_path',
  preferredSignal: 'js:page_view',
  fallbackSignal: 'none in Phase 1',
  dedupeWindowSeconds: PAGE_LOAD_DEDUPE_WINDOW_SECONDS,
  visitCountRule: 'Only canonical_page_load = 1 can create page or visit counts.',
  duplicateRule: 'Ignore subsequent qualifying duplicates inside the page-load dedupe window for the same session + path.',
  notes: [
    'Phase 1 builds canonical rows from existing raw_events.',
    'Pixel signals can support later canonicalization, but they do not create page or visit counts in Phase 1.',
    'All user-facing V2 metrics must read canonical/fact tables only; raw_events is debug-only.'
  ]
});

function normalizePath(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      return url.pathname || '/';
    } catch (_) {
      return null;
    }
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function getReferrerParts(referer) {
  if (!referer) return { host: null, path: null };
  try {
    const parsed = new URL(referer);
    return {
      host: parsed.hostname || null,
      path: parsed.pathname || null
    };
  } catch (_) {
    return { host: null, path: null };
  }
}

function inferImageId(rawEvent) {
  if (rawEvent?.target_id && typeof rawEvent.target_id === 'string' && rawEvent.target_id.startsWith('i-')) {
    return rawEvent.target_id;
  }

  const pagePath = normalizePath(rawEvent?.page || rawEvent?.page_path || rawEvent?.target_id);
  const match = pagePath && pagePath.match(/\/i-([A-Za-z0-9]+)/);
  return match ? `i-${match[1]}` : null;
}

function classifySourceSurface(pagePath) {
  if (!pagePath) return 'unknown';
  if (pagePath === '/') return 'homepage';
  if (pagePath.startsWith('/Blog/')) return 'blog';
  if (pagePath.includes('/i-')) return 'image_detail';
  if (pagePath.startsWith('/Galleries/')) return 'gallery';
  if (pagePath.startsWith('/__k4')) return 'internal_tool';
  return 'site_page';
}

function getMetricScope(rawEvent, mapped) {
  if (
    mapped?.eventFamily === 'image_view' &&
    mapped?.eventAction === 'direct_image' &&
    rawEvent?.source === 'proxy'
  ) {
    return 'diagnostic';
  }

  return 'primary';
}

function getDiagnosticClass(rawEvent, mapped) {
  if (
    mapped?.eventFamily === 'image_view' &&
    mapped?.eventAction === 'direct_image' &&
    rawEvent?.source === 'proxy'
  ) {
    return 'external_direct_image_fetch';
  }

  return null;
}

function buildIdentityKey(rawEvent) {
  return rawEvent?.session_id || rawEvent?.visitor_id || rawEvent?.ip_hash || rawEvent?.ip || 'anonymous';
}

function mapRawEventToFamily(rawEvent) {
  const eventType = String(rawEvent?.event_type || '').trim();

  switch (eventType) {
    case 'page_view':
      return { eventFamily: 'page_view', eventAction: 'load', canonicalPageLoad: rawEvent?.source === 'js' ? 1 : 0 };
    case 'chapter_view':
    case 'chapter_exposure':
    case 'image_page':
    case 'external_image_page':
    case 'direct_image':
      return { eventFamily: 'image_view', eventAction: eventType, canonicalPageLoad: 0 };
    case 'nav_next':
      return { eventFamily: 'image_nav', eventAction: 'next', canonicalPageLoad: 0 };
    case 'nav_prev':
      return { eventFamily: 'image_nav', eventAction: 'prev', canonicalPageLoad: 0 };
    case 'sister_image_click':
      return { eventFamily: 'image_nav', eventAction: 'sister', canonicalPageLoad: 0 };
    case 'cowboy_jump':
      return { eventFamily: 'image_nav', eventAction: 'jump', canonicalPageLoad: 0 };
    case 'picture_shows_jump':
      return { eventFamily: 'image_nav', eventAction: 'jump', canonicalPageLoad: 0 };
    case 'presentation_last_image_back_to_start':
      return { eventFamily: 'image_nav', eventAction: 'back_to_start', canonicalPageLoad: 0 };
    case 'grid_open':
      return { eventFamily: 'grid_action', eventAction: 'open', canonicalPageLoad: 0 };
    case 'grid_image_click':
      return { eventFamily: 'grid_action', eventAction: 'image_click', canonicalPageLoad: 0 };
    case 'grid_show_more':
      return { eventFamily: 'grid_action', eventAction: 'show_more', canonicalPageLoad: 0 };
    case 'grid_show_previous':
      return { eventFamily: 'grid_action', eventAction: 'show_previous', canonicalPageLoad: 0 };
    case 'gallery_preview_click':
      return { eventFamily: 'gallery_action', eventAction: 'preview_click', canonicalPageLoad: 0 };
    case 'gallery_hero_click':
      return { eventFamily: 'gallery_action', eventAction: 'hero_click', canonicalPageLoad: 0 };
    case 'home_lore_legacy_image_click':
      return { eventFamily: 'gallery_action', eventAction: 'show_banner_image', canonicalPageLoad: 0 };
    case 'home_lore_legacy_cta_click':
      return { eventFamily: 'gallery_action', eventAction: 'show_banner_cta', canonicalPageLoad: 0 };
    case 'home_lore_legacy_audio_click':
      return { eventFamily: 'gallery_action', eventAction: 'show_banner_audio', canonicalPageLoad: 0 };
    case 'browse_all_click':
      return { eventFamily: 'gallery_action', eventAction: 'browse_all', canonicalPageLoad: 0 };
    case 'browse_all_image_click':
      return { eventFamily: 'gallery_action', eventAction: 'browse_all_image_click', canonicalPageLoad: 0 };
    case 'gallery_explore_click':
      return { eventFamily: 'gallery_action', eventAction: 'explore', canonicalPageLoad: 0 };
    case 'exit_to_gallery':
      return { eventFamily: 'gallery_action', eventAction: 'exit', canonicalPageLoad: 0 };
    case 'theme_click':
      return { eventFamily: 'gallery_action', eventAction: 'theme_click', canonicalPageLoad: 0 };
    case 'all_list_click':
      return { eventFamily: 'gallery_action', eventAction: 'all_list_click', canonicalPageLoad: 0 };
    case 'story_audio_toggle':
      return { eventFamily: 'story_action', eventAction: 'audio_toggle', canonicalPageLoad: 0 };
    case 'story_slider_click':
      return { eventFamily: 'story_action', eventAction: 'slider_click', canonicalPageLoad: 0 };
    case 'frontier_story_video_widget_click':
      return { eventFamily: 'story_action', eventAction: 'frontier_video_click', canonicalPageLoad: 0 };
    case 'guide_open':
      return { eventFamily: 'guide_action', eventAction: 'open', canonicalPageLoad: 0 };
    case 'guide_close':
      return { eventFamily: 'guide_action', eventAction: 'close', canonicalPageLoad: 0 };
    case 'guide_done':
      return { eventFamily: 'guide_action', eventAction: 'done', canonicalPageLoad: 0 };
    case 'guide_click_outside':
      return { eventFamily: 'guide_action', eventAction: 'click_outside', canonicalPageLoad: 0 };
    case 'order_clicked':
      return { eventFamily: 'buy_click', eventAction: 'order_clicked', canonicalPageLoad: 0 };
    case 'order_submitted':
      return { eventFamily: 'order_submit', eventAction: 'order_submitted', canonicalPageLoad: 0 };
    case 'xl_zoom':
      return { eventFamily: 'engagement_hint', eventAction: 'xl_zoom', canonicalPageLoad: 0 };
    case 'series_info':
      return { eventFamily: 'engagement_hint', eventAction: 'series_info', canonicalPageLoad: 0 };
    case 'more_info_open':
      return { eventFamily: 'engagement_hint', eventAction: 'more_info_open', canonicalPageLoad: 0 };
    case 'collector_notes_open':
      return { eventFamily: 'engagement_hint', eventAction: 'collector_notes_open', canonicalPageLoad: 0 };
    case 'slideshow_start':
      return { eventFamily: 'engagement_hint', eventAction: 'slideshow_start', canonicalPageLoad: 0 };
    default:
      return null;
  }
}

export function canonicalizeRawEventV2(rawEvent) {
  const mapped = mapRawEventToFamily(rawEvent);
  if (!mapped) {
    return {
      accepted: false,
      reason: 'unmapped_event_type',
      rawEventType: rawEvent?.event_type || null
    };
  }

  const pagePath = normalizePath(rawEvent?.page || rawEvent?.page_path || rawEvent?.target_id);
  const imageId = inferImageId(rawEvent);
  const referrerParts = getReferrerParts(rawEvent?.referer);
  const sourceSurface = classifySourceSurface(pagePath);
  const metricScope = getMetricScope(rawEvent, mapped);
  const diagnosticClass = getDiagnosticClass(rawEvent, mapped);
  const identityKey = buildIdentityKey(rawEvent);
  const occurredAt = rawEvent?.ts || rawEvent?.raw_ts || new Date().toISOString();
  const timestamp = new Date(occurredAt);
  const epochSeconds = Number.isFinite(timestamp.getTime()) ? Math.floor(timestamp.getTime() / 1000) : 0;
  const dedupeWindow = mapped.canonicalPageLoad ? PAGE_LOAD_DEDUPE_WINDOW_SECONDS : INTERACTION_DEDUPE_WINDOW_SECONDS;
  const dedupeBucket = Math.floor(epochSeconds / dedupeWindow);
  const dedupeTarget = mapped.canonicalPageLoad ? (pagePath || 'unknown-page') : (imageId || pagePath || rawEvent?.target_id || mapped.eventAction || 'unknown-target');
  const dedupeKey = [mapped.eventFamily, identityKey, dedupeTarget, dedupeBucket].join('::');

  return {
    accepted: true,
    canonicalPageLoad: mapped.canonicalPageLoad,
    eventFamily: mapped.eventFamily,
    eventAction: mapped.eventAction,
    pagePath,
    imageId,
    galleryId: rawEvent?.gallery_id || null,
    sourceSurface,
    metricScope,
    diagnosticClass,
    sourceSignal: rawEvent?.source || null,
    referrerHost: referrerParts.host,
    referrerPath: referrerParts.path,
    sessionId: rawEvent?.session_id || null,
    visitorId: rawEvent?.visitor_id || null,
    identityConfidence: rawEvent?.visitor_id ? 'persistent' : rawEvent?.session_id ? 'session_only' : 'fallback',
    isBot: Number(rawEvent?.is_bot || 0),
    occurredAt,
    dedupeKey,
    dedupeWindowSeconds: dedupeWindow,
    dedupeBucket,
    rawEventType: rawEvent?.event_type || null,
    rawSourceLayer: rawEvent?.source_layer || null
  };
}
