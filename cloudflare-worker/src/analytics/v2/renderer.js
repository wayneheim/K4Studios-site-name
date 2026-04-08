import { V2_CANONICAL_PAGE_LOAD_RULES, V2_EVENT_FAMILIES, V2_EXCLUDED_RAW_EVENT_TYPES } from './canonical.js';

function renderSchemaStatus(schema) {
  const items = [
    ['canonical_events_v2', schema?.canonicalEvents],
    ['session_facts_v2', schema?.sessionFacts],
    ['visitor_facts_v2', schema?.visitorFacts],
    ['canonical_page_loads_v2', schema?.pageLoadsView]
  ];

  return items.map(([label, ok]) => `
    <div class="status-row">
      <span>${label}</span>
      <strong class="${ok ? 'ok' : 'pending'}">${ok ? 'ready' : 'pending'}</strong>
    </div>
  `).join('');
}

function humanizeCoreActionLabel(row) {
  const family = row?.event_family || '';
  const action = row?.event_action || '';
  const rawEventType = row?.raw_event_type || '';
  const rawSourceLayer = row?.raw_source_layer || '';
  const actionMap = {
    order_clicked: 'Buy Button Click',
    order_submitted: 'Order Submitted',
    open: 'Grid Open',
    image_click: 'Grid Image Click',
    next: 'Next Image',
    prev: 'Previous Image',
    jump: 'Cowboy Jump',
    back_to_start: 'Back To Start',
    audio_toggle: 'Story Narration Toggle',
    slider_click: 'Story Slide Click',
    xl_zoom: 'XL Zoom',
    more_info_open: 'More Info',
    collector_notes_open: 'Collector Notes',
    slideshow_start: 'Slideshow Start',
    hero_click: 'Gallery Hero Click',
    preview_click: 'Gallery Preview Click',
    show_banner_image: 'Show Banner Image',
    show_banner_cta: 'Show Banner CTA',
    show_banner_audio: 'Show Banner Audio',
    browse_all: 'Browse All Click',
    exit: 'Exit to Gallery',
    series_info: 'Series Info',
    chapter_view: 'Image View',
    load: 'Browser Page Load',
    all_list_click: 'All Galleries Click'
  };

  const titleizeToken = (value) => String(value || '')
    .replace(/_pixel_v\d+$/i, '')
    .replace(/_v\d+$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

  if (actionMap[action]) {
    return actionMap[action];
  }

  if (action) {
    return titleizeToken(action);
  }

  if (rawEventType) {
    return titleizeToken(rawEventType);
  }

  if (rawSourceLayer) {
    return titleizeToken(rawSourceLayer);
  }

  const familyMap = {
    buy_click: 'Buy Click',
    grid_action: 'Grid Action',
    gallery_action: 'Gallery Action',
    image_nav: 'Image Navigation',
    story_action: 'Story Action',
    image_view: 'Image View',
    page_view: 'Browser Page Load',
    engagement_hint: 'Engagement Hint'
  };

  return familyMap[family] || `${family}${action ? `: ${action}` : ''}`;
}

function getFamilyColorClass(family) {
  const colorMap = {
    buy_click: 'family-buy',
    grid_action: 'family-grid',
    gallery_action: 'family-gallery',
    image_nav: 'family-nav',
    story_action: 'family-story',
    engagement_hint: 'family-hint',
    image_view: 'family-image',
    page_view: 'family-page'
  };

  return colorMap[family] || 'family-default';
}

function getFamilyDisplayLabel(family) {
  const familyMap = {
    buy_click: 'Buy Button Clicks',
    grid_action: 'Grid Actions',
    gallery_action: 'Gallery Actions',
    image_nav: 'Image Navigation',
    story_action: 'Story Actions',
    engagement_hint: 'Engagement Hints'
  };

  return familyMap[family] || family;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatHopLabel(hopCount) {
  const normalized = Number(hopCount || 0);
  return `${normalized} hop${normalized === 1 ? '' : 's'}`;
}

function buildHopPathTooltip(hopCount, pathRows) {
  const matchingRows = pathRows.filter((row) => Number(row?.hop_count || 0) === Number(hopCount || 0));
  if (!matchingRows.length) {
    return '';
  }

  return matchingRows
    .map((row) => `${row.sessions} session${Number(row.sessions || 0) === 1 ? '' : 's'}: ${row.path_sequence}`)
    .join('\n');
}

export function renderDashboardV2({ summary, authHeader = '' }) {
  const schema = summary?.schema || {};
  const window = summary?.window || { key: 'today', label: 'Today' };
  const filters = summary?.filters || { excludeIp: null, viewerIp: null, hideChardon: false };
  const refreshStatus = summary?.refreshStatus || null;
  const counts = summary?.counts;
  const recentFamilies = summary?.recentFamilies || [];
  const interactionActions = summary?.interactionActions || [];
  const topEntryPages = summary?.topEntryPages || [];
  const topSitePages = summary?.topSitePages || [];
  const topImages = summary?.topImages || [];
  const externalSources = summary?.externalSources || [];
  const sessionGeography = summary?.sessionGeography || [];
  const imageViewGeography = summary?.imageViewGeography || [];
  const entrySourceMix = summary?.entrySourceMix || [];
  const firstImageHopMix = summary?.firstImageHopMix || [];
  const firstImagePathMix = summary?.firstImagePathMix || [];
  const suspiciousSessionGeography = summary?.suspiciousSessionGeography || [];
  const suspiciousDatacenterSessionGeography = summary?.suspiciousDatacenterSessionGeography || [];
  const internalReentryMix = summary?.internalReentryMix || [];
  const pageLoads = Number(counts?.canonical_page_loads || 0);
  const sessions = Number(counts?.sessions_with_page_loads || 0);
  const visitors = Number(counts?.visitors_with_page_loads || 0);
  const engagedSessions = Number(counts?.engaged_sessions || 0);
  const engagedRate = sessions > 0 ? ((engagedSessions / sessions) * 100).toFixed(1) : '0.0';
  const imageViews = Number(counts?.image_views || 0);
  const directImageFetches = Number(counts?.direct_image_fetches || 0);
  const proxyImageViews = Number(counts?.proxy_image_views || 0);
  const suspiciousInternalShallowSessions = Number(counts?.suspicious_internal_shallow_sessions || 0);
  const suspiciousInternalShallowVisitors = Number(counts?.suspicious_internal_shallow_visitors || 0);
  const suspiciousInternalShallowImageViews = Number(counts?.suspicious_internal_shallow_image_views || 0);
  const suspiciousDatacenterSessions = Number(counts?.suspicious_datacenter_shallow_sessions || 0);
  const suspiciousDatacenterVisitors = Number(counts?.suspicious_datacenter_shallow_visitors || 0);
  const suspiciousDatacenterImageViews = Number(counts?.suspicious_datacenter_shallow_image_views || 0);
  const internalTestSessions = Number(counts?.internal_test_sessions || 0);
  const internalTestVisitors = Number(counts?.internal_test_visitors || 0);
  const internalTestImageViews = Number(counts?.internal_test_image_views || 0);
  const homePageViews = Number(counts?.home_page_view_events || 0);
  const pilotHomePageViews = Number(counts?.pilot_home_page_view_events || 0);
  const homeCowboyJumpClicks = Number(counts?.home_cowboy_jump_events || 0);
  const pilotHomeCowboyJumpClicks = Number(counts?.pilot_home_cowboy_jump_events || 0);
  const pilotHomeCowboyGeoCoverage = Number(counts?.pilot_home_cowboy_geo_coverage || 0);
  const pilotHomeCowboyUaCoverage = Number(counts?.pilot_home_cowboy_ua_coverage || 0);
  const pilotHomeCowboyReferrerCoverage = Number(counts?.pilot_home_cowboy_referrer_coverage || 0);
  const pilotHomeCowboyIpCoverage = Number(counts?.pilot_home_cowboy_ip_coverage || 0);
  const pilotHomeCowboyCityRegionCoverage = Number(counts?.pilot_home_cowboy_city_region_coverage || 0);
  const pilotHomeCowboySessions = Number(counts?.pilot_home_cowboy_sessions || 0);
  const pilotHomeCowboyVisitors = Number(counts?.pilot_home_cowboy_visitors || 0);
  const showPilotTrustMismatchNote = sessions === 0 && (homePageViews > 0 || pilotHomePageViews > 0);
  const sessionsReachingFirstImage = Number(counts?.sessions_reaching_first_image || 0);
  const directToFirstImageSessions = Number(counts?.direct_to_first_image_sessions || 0);
  const sessionsWithoutImageReach = Math.max(0, sessions - sessionsReachingFirstImage);
  const pilotPageViewParity = homePageViews > 0 ? ((pilotHomePageViews / homePageViews) * 100).toFixed(1) : '0.0';
  const pilotCowboyParity = homeCowboyJumpClicks > 0 ? ((pilotHomeCowboyJumpClicks / homeCowboyJumpClicks) * 100).toFixed(1) : '0.0';
  const pilotGeoCoveragePct = pilotHomeCowboyJumpClicks > 0 ? ((pilotHomeCowboyGeoCoverage / pilotHomeCowboyJumpClicks) * 100).toFixed(1) : '0.0';
  const pilotUaCoveragePct = pilotHomeCowboyJumpClicks > 0 ? ((pilotHomeCowboyUaCoverage / pilotHomeCowboyJumpClicks) * 100).toFixed(1) : '0.0';
  const pilotReferrerCoveragePct = pilotHomeCowboyJumpClicks > 0 ? ((pilotHomeCowboyReferrerCoverage / pilotHomeCowboyJumpClicks) * 100).toFixed(1) : '0.0';
  const pilotIpCoveragePct = pilotHomeCowboyJumpClicks > 0 ? ((pilotHomeCowboyIpCoverage / pilotHomeCowboyJumpClicks) * 100).toFixed(1) : '0.0';
  const pilotCityRegionCoveragePct = pilotHomeCowboyJumpClicks > 0 ? ((pilotHomeCowboyCityRegionCoverage / pilotHomeCowboyJumpClicks) * 100).toFixed(1) : '0.0';
  const interactionGroups = [
    { family: 'buy_click', label: 'Buy Button Clicks', count: Number(counts?.buy_clicks ?? 0), colorClass: getFamilyColorClass('buy_click') },
    { family: 'grid_action', label: 'Grid Actions', count: Number(counts?.grid_actions ?? 0), colorClass: getFamilyColorClass('grid_action') },
    { family: 'gallery_action', label: 'Gallery Actions', count: Number(counts?.gallery_actions ?? 0), colorClass: getFamilyColorClass('gallery_action') },
    { family: 'image_nav', label: 'Image Navigation', count: Number(counts?.image_nav_actions ?? 0), colorClass: getFamilyColorClass('image_nav') },
    { family: 'story_action', label: 'Story Actions', count: Number(counts?.story_actions ?? 0), colorClass: getFamilyColorClass('story_action') },
    { family: 'engagement_hint', label: 'Engagement Hints', count: Number(counts?.engagement_hints ?? 0), colorClass: getFamilyColorClass('engagement_hint') }
  ].sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label));
  const topInteractionRows = interactionActions.map((row) => {
    return {
      label: humanizeCoreActionLabel(row),
      count: Number(row.count || 0),
      family: row.event_family,
      colorClass: getFamilyColorClass(row.event_family)
    };
  });
  const groupedInteractionRows = interactionGroups
    .map((group) => ({
      ...group,
      actions: topInteractionRows
        .filter((row) => row.family === group.family)
        .sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label))
    }))
    .filter((group) => group.count > 0 || group.actions.length > 0);
  const windowOptions = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: '24h', label: 'Last 24h' },
    { key: '7d', label: 'Last 7 days' },
    { key: 'all', label: 'All time' }
  ];
  const isSingleDayWindow = window.key === 'today' || window.key === 'yesterday';
  const baseParams = new URLSearchParams();
  if (filters.excludeIp) baseParams.set('excludeIp', filters.excludeIp);
  if (filters.hideChardon) baseParams.set('hideChardon', '1');
  const buildDashboardUrl = (overrides = {}) => {
    const params = new URLSearchParams(baseParams.toString());
    Object.entries(overrides).forEach(([key, value]) => {
      if (value === null || value === undefined || value === false || value === '') {
        params.delete(key);
        return;
      }
      params.set(key, String(value));
    });
    const query = params.toString();
    return query ? `/__k4stats-v2?${query}` : '/__k4stats-v2';
  };
  const excludeMeUrl = filters.viewerIp ? buildDashboardUrl({ window: window.key, excludeIp: filters.viewerIp }) : null;
  const showAllUrl = buildDashboardUrl({ window: window.key, excludeIp: null });
  const hideTeamUrl = buildDashboardUrl({ window: window.key, hideChardon: '1' });
  const showTeamUrl = buildDashboardUrl({ window: window.key, hideChardon: null });
  const topImagesTitle = isSingleDayWindow
    ? `Images Accessed ${window.key === 'today' ? 'Today' : 'Yesterday'}`
    : 'Top 10 Images';
  const topImagesIntro = isSingleDayWindow
    ? 'All trusted images accessed in this calendar-day window. Buy-clicked images are pinned to the top and highlighted in green.'
    : 'Most-active trusted image IDs from image views plus image-linked interactions. Buy-clicked images are pinned to the top and highlighted in green.';
  const topImagesFootnote = isSingleDayWindow
    ? 'External/direct proxy image fetches and suspicious/internal-test sessions are excluded from this daily list.'
    : 'External/direct proxy image fetches and suspicious/internal-test sessions are excluded from this top-10 list.';
  const renderImageRows = (rows) => rows.map((row, index) => {
    const imageId = row.image_id;
    const buyClicks = Number(row.buy_clicks || 0);
    const rawPath = row.page_path || '';
    const pagePath = rawPath ? (rawPath.startsWith('/') ? rawPath : `/${rawPath}`) : '';
    const imageUrl = pagePath ? `https://www.k4studios.com${pagePath}` : `https://www.k4studios.com/art/${imageId}`;
    const thumbHtml = imageId
      ? `<img src="https://www.k4studios.com/img/${imageId}/s" alt="" loading="${index < 4 ? 'eager' : 'lazy'}" class="image-thumb">`
      : '<span class="image-thumb image-thumb-fallback">🖼</span>';
    const buyBadge = buyClicks > 0
      ? `<span class="image-buy-badge">Buy ${buyClicks}</span>`
      : '';
    return `
      <a class="image-list-row${buyClicks > 0 ? ' image-list-row-buy' : ''}" href="${imageUrl}" target="_blank" rel="noopener">
        <span class="image-thumb-wrap">${thumbHtml}</span>
        <span class="image-meta">
          <span class="image-id" title="${imageId}">${imageId}${buyBadge}</span>
          <span class="image-link-path" title="${pagePath || imageUrl}">${pagePath || '/art/' + imageId}</span>
        </span>
        <strong>${row.views}</strong>
      </a>`;
  });
  const topTenImageRows = renderImageRows(topImages.slice(0, 10));
  const allImageRows = renderImageRows(topImages);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>K4 Analytics V2</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #161616; color: #e6e6e6; margin: 0; padding: 24px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1, h2 { margin: 0 0 12px; }
    p { color: #b7b7b7; line-height: 1.5; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin: 20px 0; align-items: stretch; }
    .hero-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin: 20px 0; }
    .primary-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 16px; margin: 20px 0; align-items: stretch; }
    .card { background: #232323; border: 1px solid #343434; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; min-height: 0; }
    .grid > .card { height: 420px; min-height: 420px; overflow: hidden; }
    .primary-grid > .card { height: 420px; min-height: 420px; overflow: hidden; }
    .metric { font-size: 32px; font-weight: 700; color: #66aaff; }
    .metric.small { font-size: 26px; }
    .muted { color: #8d8d8d; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
    .status-row { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid #333; }
    .status-row:last-child, .list-row:last-child { border-bottom: none; }
    .list-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: start; column-gap: 12px; padding: 8px 4px 8px 0; border-bottom: 1px solid #333; }
    .list-row span { min-width: 0; overflow-wrap: anywhere; word-break: break-word; padding-right: 10px; }
    .list-row strong { flex: 0 0 auto; padding-right: 4px; }
    .list-row-label { display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
    .family-dot { width: 10px; height: 10px; border-radius: 999px; flex: 0 0 auto; box-shadow: 0 0 0 1px rgba(255,255,255,0.08) inset; }
    .family-buy .family-dot { background: #ff9f43; }
    .family-grid .family-dot { background: #54a0ff; }
    .family-gallery .family-dot { background: #1dd1a1; }
    .family-nav .family-dot { background: #a29bfe; }
    .family-story .family-dot { background: #ff6b9a; }
    .family-hint .family-dot { background: #f368e0; }
    .family-image .family-dot { background: #feca57; }
    .family-page .family-dot { background: #48dbfb; }
    .family-default .family-dot { background: #8395a7; }
    .family-buy .list-row-label { color: #ffd2a6; }
    .family-grid .list-row-label { color: #b9d8ff; }
    .family-gallery .list-row-label { color: #b9f5e5; }
    .family-nav .list-row-label { color: #d5d0ff; }
    .family-story .list-row-label { color: #ffd0e0; }
    .family-hint .list-row-label { color: #f7c6ef; }
    .family-image .list-row-label { color: #ffe4a0; }
    .family-page .list-row-label { color: #b8f4ff; }
    .family-default .list-row-label { color: #d7dbe3; }
    .group-row { border-radius: 8px; margin-top: 10px; padding: 10px 12px; border: 1px solid transparent; }
    .group-row:first-of-type { margin-top: 0; }
    .group-row.family-buy { background: rgba(255, 159, 67, 0.14); border-color: rgba(255, 159, 67, 0.3); }
    .group-row.family-grid { background: rgba(84, 160, 255, 0.14); border-color: rgba(84, 160, 255, 0.3); }
    .group-row.family-gallery { background: rgba(29, 209, 161, 0.14); border-color: rgba(29, 209, 161, 0.3); }
    .group-row.family-nav { background: rgba(162, 155, 254, 0.14); border-color: rgba(162, 155, 254, 0.3); }
    .group-row.family-story { background: rgba(255, 107, 154, 0.14); border-color: rgba(255, 107, 154, 0.3); }
    .group-row.family-hint { background: rgba(243, 104, 224, 0.14); border-color: rgba(243, 104, 224, 0.3); }
    .ok { color: #2ecc71; }
    .pending { color: #f39c12; }
    .subtle { color: #9fa7b3; font-size: 13px; }
    .subtle strong { color: #d7dbe3; }
    .btn { background: #2b2b2b; color: #e6e6e6; border: 1px solid #4b4b4b; border-radius: 8px; padding: 8px 12px; cursor: pointer; }
    .btn:disabled { opacity: 0.6; cursor: wait; }
    .window-nav { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0 8px; }
    .filter-nav { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 12px; }
    .window-chip { display: inline-flex; align-items: center; justify-content: center; min-width: 90px; padding: 8px 12px; border-radius: 999px; border: 1px solid #3b3b3b; background: #202020; color: #cfd6df; text-decoration: none; font-size: 13px; }
    .window-chip.active { background: #163251; border-color: #2d5f92; color: #e8f3ff; }
    .filter-chip { display: inline-flex; align-items: center; gap: 8px; padding: 7px 11px; border-radius: 999px; border: 1px solid #3b3b3b; background: #1d1d1d; color: #d5dce5; text-decoration: none; font-size: 12px; }
    .filter-chip.active { background: rgba(46, 204, 113, 0.12); border-color: rgba(46, 204, 113, 0.4); color: #c9f7d8; }
    .filter-chip.badge { border-style: dashed; color: #f0d2a6; }
    .card-title-row { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; }
    .card-title-row h2 { margin: 0; }
    .info-dot { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 999px; border: 1px solid #4a5a6d; color: #9ecbff; font-size: 11px; font-weight: 700; cursor: help; flex: 0 0 auto; }
    .info-dot::after { content: attr(data-tooltip); position: absolute; left: 50%; top: calc(100% + 8px); transform: translateX(-50%); width: 240px; padding: 8px 10px; border-radius: 8px; background: #11161c; border: 1px solid #35506b; color: #d8e8f8; font-size: 12px; line-height: 1.4; white-space: normal; opacity: 0; pointer-events: none; box-shadow: 0 10px 28px rgba(0,0,0,0.35); z-index: 20; }
    .info-dot:hover::after { opacity: 1; }
    code { background: #111; padding: 2px 6px; border-radius: 4px; }
    ol, ul { margin: 12px 0 0 20px; color: #cfcfcf; }
    a { color: #66aaff; }
    .section-title { margin-top: 28px; margin-bottom: 6px; }
    .section-copy { margin-top: 0; }
    .system-details { margin-top: 24px; }
    .scroll-panel { flex: 1 1 auto; min-height: 0; max-height: 260px; overflow-y: auto; padding-right: 14px; scrollbar-width: thin; scrollbar-color: #4a4a4a #1c1c1c; }
    .card-compact .scroll-panel { max-height: none; }
    .card-scroll-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding-right: 14px; scrollbar-width: thin; scrollbar-color: #4a4a4a #1c1c1c; }
    .card-scroll-body::-webkit-scrollbar { width: 8px; height: 8px; }
    .card-scroll-body::-webkit-scrollbar-track { background: #1c1c1c; border-radius: 999px; }
    .card-scroll-body::-webkit-scrollbar-thumb { background: #4a4a4a; border-radius: 999px; border: 1px solid #1c1c1c; }
    .card-scroll-body::-webkit-scrollbar-thumb:hover { background: #5a5a5a; }
    .scroll-panel::-webkit-scrollbar { width: 8px; height: 8px; }
    .scroll-panel::-webkit-scrollbar-track { background: #1c1c1c; border-radius: 999px; }
    .scroll-panel::-webkit-scrollbar-thumb { background: #4a4a4a; border-radius: 999px; border: 1px solid #1c1c1c; }
    .scroll-panel::-webkit-scrollbar-thumb:hover { background: #5a5a5a; }
    .image-list-row { display: grid; grid-template-columns: 56px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 8px 0; border-bottom: 1px solid #333; color: #e6e6e6; text-decoration: none; }
    .image-list-row:last-child { border-bottom: none; }
    .image-list-row:hover { background: rgba(255,255,255,0.03); }
    .image-list-row-buy { background: rgba(46, 204, 113, 0.10); }
    .image-list-row-buy:hover { background: rgba(46, 204, 113, 0.16); }
    .image-thumb-wrap { display: inline-flex; align-items: center; justify-content: center; width: 56px; }
    .image-thumb { width: 48px; height: 48px; object-fit: cover; border-radius: 6px; border: 1px solid #3f4a57; }
    .image-thumb-fallback { display: inline-flex; align-items: center; justify-content: center; background: #333; color: #aaa; font-size: 18px; }
    .image-meta { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .image-id { color: #9ac7ff; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-flex; align-items: center; gap: 8px; }
    .image-list-row-buy .image-id { color: #bdf3cf; }
    .image-link-path { color: #8d8d8d; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .image-buy-badge { display: inline-flex; align-items: center; justify-content: center; padding: 2px 8px; border-radius: 999px; background: rgba(46, 204, 113, 0.18); border: 1px solid rgba(46, 204, 113, 0.38); color: #7ef0a8; font-size: 11px; font-weight: 600; }
    .warn-note { margin: 0 0 12px; padding: 10px 12px; border-radius: 8px; background: rgba(243, 156, 18, 0.10); border: 1px solid rgba(243, 156, 18, 0.26); color: #f6cf8c; font-size: 12px; line-height: 1.45; }
    details.system-details { background: #1c1c1c; border: 1px solid #343434; border-radius: 10px; padding: 0; overflow: hidden; }
    details.system-details summary { list-style: none; cursor: pointer; padding: 16px 18px; font-weight: 600; background: #202020; }
    details.system-details summary::-webkit-details-marker { display: none; }
    .system-body { padding: 4px 18px 18px; }
    .system-body .list-row { grid-template-columns: 140px minmax(0, 1fr); align-items: start; column-gap: 14px; }
    .system-body .list-row span { overflow-wrap: normal; word-break: normal; white-space: normal; }
    .system-body .list-row strong { justify-self: end; text-align: right; white-space: normal; overflow-wrap: anywhere; word-break: break-word; max-width: 100%; }
    .refresh-status-copy { margin: 12px 0; padding: 10px 12px; border-radius: 8px; background: #1b1b1b; border: 1px solid #303030; color: #cfd6df; overflow-wrap: anywhere; word-break: break-word; }
    .card > .subtle:last-child,
    .card > p.subtle:last-child { margin-top: auto; }
    .split-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
    @media (max-width: 900px) {
      .primary-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>K4 Analytics V2</h1>
    <p>Phase 1 minimal trusted dashboard. The top section is the site view. System wiring, refresh, schema, and debug details are kept below as operational context.</p>
    <div class="window-nav">
      ${windowOptions.map((option) => `<a class="window-chip${option.key === window.key ? ' active' : ''}" href="${buildDashboardUrl({ window: option.key })}">${option.label}</a>`).join('')}
        <a class="window-chip" href="/__k4stats-v2/legacy-patterns?days=7">Legacy Pattern Lab</a>
    </div>
    <div class="filter-nav">
      ${filters.excludeIp
        ? `<span class="filter-chip badge active">Excluding IP: ${escapeHtml(filters.excludeIp)}</span><a class="filter-chip" href="${showAllUrl}">Show All IPs</a>`
        : (excludeMeUrl ? `<a class="filter-chip" href="${excludeMeUrl}">Exclude My IP</a>` : '<span class="filter-chip badge">Viewer IP unavailable</span>')}
      ${filters.hideChardon
        ? `<span class="filter-chip active">Team Traffic Hidden</span><a class="filter-chip" href="${showTeamUrl}">Show Team</a>`
        : `<a class="filter-chip" href="${hideTeamUrl}">Hide Team</a>`}
    </div>
    <p class="subtle">Current window: <strong>${window.label}</strong>. Today and Yesterday use Eastern calendar-day boundaries; Last 24h and Last 7 days use rolling trailing durations.</p>

    <script>
      const _k4auth = ${JSON.stringify(authHeader || '')};

      function k4AdminFetch(url, opts) {
        const requestOptions = Object.assign({ credentials: 'same-origin' }, opts || {});
        requestOptions.headers = Object.assign({ 'Authorization': _k4auth }, requestOptions.headers || {});
        return fetch(url, requestOptions);
      }

      async function refreshV2Incremental() {
        const button = document.getElementById('v2-refresh-button');
        const status = document.getElementById('v2-refresh-status');
        const batchSize = 1000;
        const maxBatches = 10;
        if (button) {
          button.disabled = true;
          button.textContent = 'Refreshing...';
        }
        if (status) {
          status.textContent = 'Running V2 refresh...';
        }
        try {
          if (status) {
            status.textContent = 'Refreshing V2...';
          }

          const response = await k4AdminFetch('/__k4stats-v2/refresh?batch=' + batchSize + '&maxBatches=' + maxBatches + '&forceFacts=1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data && data.error ? data.error : 'Refresh failed');
          }

          const summary = data && data.summary ? data.summary : null;
          const processedRows = Number(summary ? summary.processedRawRows || 0 : 0);
          const batchCount = Number(summary ? summary.batchCount || 0 : 0);
          const hasMore = Boolean(summary && summary.hasMore);

          if (hasMore) {
            throw new Error('Refresh processed ' + processedRows + ' raw rows across ' + batchCount + ' batches, but more data is still pending. Click refresh again.');
          }

          if (status) {
            status.textContent = 'Refresh complete. Processed ' + processedRows + ' raw rows across ' + batchCount + ' batch' + (batchCount === 1 ? '' : 'es') + '. Reloading...';
          }
          window.location.reload();
        } catch (error) {
          if (status) {
            status.textContent = 'Refresh failed: ' + (error && error.message ? error.message : String(error));
          }
          if (button) {
            button.disabled = false;
            button.textContent = 'Refresh V2';
          }
        }
      }
    </script>

    <h2 class="section-title">Site Activity</h2>
    <p class="section-copy">Trusted V2 metrics only. These cards and lists read canonical or fact tables, not raw events.</p>

    <div class="hero-grid">
      <div class="card">
        <div class="muted">Page Loads</div>
        <div class="metric">${pageLoads}</div>
        <div class="subtle">Persisted canonical page loads only for ${window.label.toLowerCase()}, excluding suspicious internal-shallow and datacenter-like sessions.</div>
      </div>
      <div class="card">
        <div class="muted">Sessions</div>
        <div class="metric">${sessions}</div>
        <div class="subtle">Sessions with trusted page loads in ${window.label.toLowerCase()}, excluding suspicious internal-shallow and datacenter-like sessions.</div>
      </div>
      <div class="card">
        <div class="muted">Visitors</div>
        <div class="metric">${visitors}</div>
        <div class="subtle">Visitors with trusted page loads in ${window.label.toLowerCase()}, excluding suspicious internal-shallow and datacenter-like sessions.</div>
      </div>
      <div class="card">
        <div class="muted">Engaged Sessions</div>
        <div class="metric">${engagedSessions}</div>
        <div class="subtle">${engagedRate}% of trusted sessions triggered an interaction in ${window.label.toLowerCase()}.</div>
      </div>
      <div class="card">
        <div class="muted">Image Views</div>
        <div class="metric">${imageViews}</div>
        <div class="subtle">Session-backed canonical image views only for ${window.label.toLowerCase()}, excluding suspicious internal-shallow and datacenter-like sessions plus external/direct fetches.</div>
      </div>
    </div>

    <div class="grid">
      <div class="card card-compact">
        <div class="card-title-row">
          <h2>Top 25 Entry Pages</h2>
          <span class="info-dot" data-tooltip="Where trusted sessions began on the site, excluding suspicious internal-shallow and datacenter-like entries.">i</span>
        </div>
        <div class="scroll-panel">
          ${topEntryPages.length ? topEntryPages.map((row) => `<div class="list-row"><span>${row.page_path}</span><strong>${row.sessions}</strong></div>`).join('') : '<p>No populated session facts yet.</p>'}
        </div>
      </div>
      <div class="card card-compact">
        <div class="card-title-row">
          <h2>Top 25 Site Pages</h2>
          <span class="info-dot" data-tooltip="Most-viewed trusted non-image pages on the site, excluding suspicious internal-shallow and datacenter-like sessions.">i</span>
        </div>
        <div class="scroll-panel">
          ${topSitePages.length ? topSitePages.map((row) => `<div class="list-row"><span>${row.page_path}</span><strong>${row.loads}</strong></div>`).join('') : '<p>No trusted non-image page loads in this window.</p>'}
        </div>
      </div>
      <div class="card card-compact">
        <div class="card-title-row">
          <h2>Top 10 Images</h2>
          <span class="info-dot" data-tooltip="Most-active trusted image IDs from image views plus image-linked interactions. Buy-clicked images are pinned to the top and highlighted in green. External/direct proxy image fetches and suspicious/internal-test sessions are excluded from this list.">i</span>
        </div>
        <div class="scroll-panel">
          ${topTenImageRows.length ? topTenImageRows.join('') : '<p>No trusted image-linked activity yet.</p>'}
        </div>
      </div>
    </div>

    <div class="grid">
      ${isSingleDayWindow ? `
      <div class="card card-compact">
        <div class="card-title-row">
          <h2>${topImagesTitle}</h2>
          <span class="info-dot" data-tooltip="${escapeHtml(`${topImagesIntro} ${topImagesFootnote}`)}">i</span>
        </div>
        <div class="scroll-panel">
          ${allImageRows.length ? allImageRows.join('') : '<p>No trusted image-linked activity yet.</p>'}
        </div>
      </div>
      ` : ''}
      <div class="card">
        <h2>Home Pilot Shadow Test</h2>
        <p class="subtle">Raw-event comparison for the home-only pilot tracker. This is diagnostic parity, not trusted canonical V2 scoring.</p>
        ${showPilotTrustMismatchNote ? '<p class="warn-note">Raw home or pilot homepage events exist in this window, but trusted site metrics remain at 0 because the observed homepage session was excluded from trusted V2 scoring as a shallow K4-internal re-entry.</p>' : ''}
        <div class="card-scroll-body">
          <div class="list-row"><span>Baseline home page views (<code>page_view</code>)</span><strong>${homePageViews}</strong></div>
          <div class="list-row"><span>Pilot home page views (<code>pilot_home_page_view</code>)</span><strong>${pilotHomePageViews}</strong></div>
          <div class="list-row"><span>Page-view parity</span><strong>${pilotPageViewParity}%</strong></div>
          <div class="list-row"><span>Baseline Cowboy Jump clicks (<code>cowboy_jump</code>)</span><strong>${homeCowboyJumpClicks}</strong></div>
          <div class="list-row"><span>Pilot Cowboy Jump clicks (<code>pilot_home_cowboy_jump_click</code>)</span><strong>${pilotHomeCowboyJumpClicks}</strong></div>
          <div class="list-row"><span>Click parity</span><strong>${pilotCowboyParity}%</strong></div>
          <div class="list-row"><span>Pilot click sessions</span><strong>${pilotHomeCowboySessions}</strong></div>
          <div class="list-row"><span>Pilot click visitors</span><strong>${pilotHomeCowboyVisitors}</strong></div>
          <div class="list-row"><span>Geo coverage (country)</span><strong>${pilotHomeCowboyGeoCoverage} (${pilotGeoCoveragePct}%)</strong></div>
          <div class="list-row"><span>Geo coverage (city/region)</span><strong>${pilotHomeCowboyCityRegionCoverage} (${pilotCityRegionCoveragePct}%)</strong></div>
          <div class="list-row"><span>UA coverage (OS parse source)</span><strong>${pilotHomeCowboyUaCoverage} (${pilotUaCoveragePct}%)</strong></div>
          <div class="list-row"><span>Referrer coverage</span><strong>${pilotHomeCowboyReferrerCoverage} (${pilotReferrerCoveragePct}%)</strong></div>
          <div class="list-row"><span>IP coverage</span><strong>${pilotHomeCowboyIpCoverage} (${pilotIpCoveragePct}%)</strong></div>
        </div>
      </div>
    </div>

    <div class="primary-grid">
      <div class="card">
        <h2>Session Geography</h2>
        <p class="subtle">Location for trusted session-backed canonical page loads only. External/direct fetch traffic plus suspicious internal-shallow and datacenter-like sessions are excluded.</p>
        <div class="scroll-panel" style="max-height: 360px; margin-top: 8px;">
          ${sessionGeography.length ? sessionGeography.map((row) => `<div class="list-row"><span>${row.geo_label}</span><strong>${row.sessions}</strong></div>`).join('') : '<p>No session geography in this window.</p>'}
        </div>
      </div>
      <div class="card">
        <h2>External Entry Sources</h2>
        <p class="subtle">External or direct source families for trusted session entries only. Internal re-entry and internal test traffic are excluded from this card.</p>
        <div class="scroll-panel" style="max-height: 360px; margin-top: 8px;">
          ${entrySourceMix.length ? entrySourceMix.map((row) => `<div class="list-row"><span>${row.source_label}</span><strong>${row.sessions}</strong></div>`).join('') : '<p>No entry source data in this window.</p>'}
        </div>
      </div>
    </div>

    <div class="primary-grid">
      <div class="card">
        <h2>Image View Geography</h2>
        <p class="subtle">Location for trusted session-backed canonical image views only. External/direct fetch traffic plus suspicious internal-shallow and datacenter-like sessions are excluded.</p>
        <div class="scroll-panel" style="max-height: 360px; margin-top: 8px;">
          ${imageViewGeography.length ? imageViewGeography.map((row) => `<div class="list-row"><span>${row.geo_label}</span><strong>${row.views}</strong></div>`).join('') : '<p>No image-view geography in this window.</p>'}
        </div>
      </div>
      <div class="card">
        <h2>Entry to 1st Image</h2>
        <p class="subtle">Trusted sessions only. Each session is counted once, from entry until its first image chapter page. Later image-to-image browsing does not affect this distribution.</p>
        <div class="scroll-panel" style="max-height: 360px; margin-top: 8px;">
          ${firstImageHopMix.length ? firstImageHopMix.map((row) => `<div class="list-row" title="${escapeHtml(buildHopPathTooltip(row.hop_count, firstImagePathMix))}"><span>${formatHopLabel(row.hop_count)}</span><strong>${row.sessions}</strong></div>`).join('') : '<p>No trusted sessions reached an image in this window.</p>'}
        </div>
        <p class="subtle">${sessionsReachingFirstImage} trusted sessions reached a first image. ${directToFirstImageSessions} landed on an image directly. ${sessionsWithoutImageReach} never reached an image.</p>
        <p class="subtle">Hover a hop row to see the most common path variants that produced that hop count.</p>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-title-row">
          <h2>Core Actions and Groups</h2>
          <span class="info-dot" data-tooltip="Human-readable action labels from trusted canonical rows. Family totals include all trusted rows in that family; detail rows only show explicitly labeled actions, so vague blank-action entries are not listed as generic lines.">i</span>
        </div>
        <div class="card-scroll-body">
          ${groupedInteractionRows.length ? groupedInteractionRows.map((group) => `
            <div class="list-row group-row ${group.colorClass}"><span class="list-row-label"><span class="family-dot"></span><strong>${getFamilyDisplayLabel(group.family)}</strong></span><strong>${group.count}</strong></div>
            ${group.actions.map((row) => `<div class="list-row ${row.colorClass}"><span class="list-row-label" style="padding-left: 18px;"><span class="family-dot"></span>${row.label}</span><strong>${row.count}</strong></div>`).join('')}
          `).join('') : '<p>No trusted interaction rows yet.</p>'}
        </div>
        <p class="subtle">Engagement hints currently include zoom, series info, more info, collector notes, and slideshow start.</p>
      </div>
    </div>

    <details class="system-details">
      <summary>System Details</summary>
      <div class="system-body">
        <p class="section-copy">Operational and debug context for V2. These explain how the system works; they are not the primary site-activity dashboard.</p>
        <div class="split-list">
          <div class="card">
            <div class="muted">Refresh Status</div>
            <div class="list-row"><span>Last refresh</span><strong>${refreshStatus?.lastRefreshAt || 'not yet run'}</strong></div>
            <div class="list-row"><span>Last processed raw ID</span><strong>${refreshStatus?.lastProcessedRawEventId ?? 0}</strong></div>
            <div class="list-row"><span>Pending raw rows</span><strong>${refreshStatus?.pendingRawRows ?? 0}</strong></div>
            <div class="list-row"><span>Last batch inserted</span><strong>${refreshStatus?.lastSummary?.insertedCanonicalRows ?? 0}</strong></div>
            <div class="list-row"><span>Has more batches</span><strong>${refreshStatus?.lastSummary?.hasMore ? 'yes' : 'no'}</strong></div>
            <p id="v2-refresh-status" class="refresh-status-copy">Use incremental refresh to materialize fresh raw events into V2 canonical/fact tables.</p>
            <button id="v2-refresh-button" class="btn" onclick="refreshV2Incremental()">Refresh V2</button>
          </div>
          <div class="card">
            <div class="muted">Schema Status</div>
            ${renderSchemaStatus(schema)}
          </div>
          <div class="card">
            <div class="muted">External / Direct Image Fetches</div>
            <div class="metric small">${directImageFetches}</div>
            <p class="subtle">Sessionless proxy/direct-image fetches in ${window.label.toLowerCase()}. These are diagnostic only and are excluded from the primary Image Views and Top Images panels.</p>
            <div class="list-row"><span>Total proxy image-view diagnostics</span><strong>${proxyImageViews}</strong></div>
            <div class="scroll-panel" style="max-height: 240px; margin-top: 8px;">
              ${externalSources.length ? externalSources.map((row) => `<div class="list-row"><span>${row.source_label}</span><strong>${row.views}</strong></div>`).join('') : '<p>No external/direct image fetches in this window.</p>'}
            </div>
          </div>
          <div class="card">
            <div class="muted">Suspicious Internal-Shallow Sessions</div>
            <div class="metric small">${suspiciousInternalShallowSessions}</div>
            <p class="subtle">Sessions excluded from the main human-like cards because they start from a K4 referrer on <code>/</code>, contain a single page load, and have zero interactions.</p>
            <div class="list-row"><span>Distinct visitors</span><strong>${suspiciousInternalShallowVisitors}</strong></div>
            <div class="list-row"><span>Image views in bucket</span><strong>${suspiciousInternalShallowImageViews}</strong></div>
            <div class="scroll-panel" style="max-height: 220px; margin-top: 8px;">
              ${suspiciousSessionGeography.length ? suspiciousSessionGeography.map((row) => `<div class="list-row"><span>${row.geo_label}</span><strong>${row.sessions}</strong></div>`).join('') : '<p>No suspicious internal-shallow sessions in this window.</p>'}
            </div>
          </div>
          <div class="card">
            <div class="muted">Suspicious Datacenter-Like Sessions</div>
            <div class="metric small">${suspiciousDatacenterSessions}</div>
            <p class="subtle">Sessions excluded from the main human-like cards because they look shallow and also carry Ashburn, datacenter-IP, or browser-automation signals.</p>
            <div class="list-row"><span>Distinct visitors</span><strong>${suspiciousDatacenterVisitors}</strong></div>
            <div class="list-row"><span>Image views in bucket</span><strong>${suspiciousDatacenterImageViews}</strong></div>
            <div class="scroll-panel" style="max-height: 220px; margin-top: 8px;">
              ${suspiciousDatacenterSessionGeography.length ? suspiciousDatacenterSessionGeography.map((row) => `<div class="list-row"><span>${row.geo_label}</span><strong>${row.sessions}</strong></div>`).join('') : '<p>No suspicious datacenter-like sessions in this window.</p>'}
            </div>
          </div>
          <div class="card">
            <div class="muted">Internal Test Sessions</div>
            <div class="metric small">${internalTestSessions}</div>
            <p class="subtle">Local dev and edge-host test sessions such as <code>localhost:8888</code> and <code>edge.k4studios.com</code>. Excluded from the main human-like cards.</p>
            <div class="list-row"><span>Distinct visitors</span><strong>${internalTestVisitors}</strong></div>
            <div class="list-row"><span>Image views in bucket</span><strong>${internalTestImageViews}</strong></div>
          </div>
          <div class="card">
            <div class="muted">Internal Re-entry Sessions</div>
            <p class="subtle">Trusted sessions whose first canonical page load was referred by another K4 page. This is a session-boundary diagnostic, not an acquisition source.</p>
            <div class="scroll-panel" style="max-height: 220px; margin-top: 8px;">
              ${internalReentryMix.length ? internalReentryMix.map((row) => `<div class="list-row"><span>${row.source_label}</span><strong>${row.sessions}</strong></div>`).join('') : '<p>No internal re-entry sessions in this window.</p>'}
            </div>
          </div>
          <div class="card">
            <div class="muted">Canonical Rules</div>
            <div class="list-row"><span>Authority</span><strong>${V2_CANONICAL_PAGE_LOAD_RULES.canonicalAuthority}</strong></div>
            <div class="list-row"><span>Preferred signal</span><strong>${V2_CANONICAL_PAGE_LOAD_RULES.preferredSignal}</strong></div>
            <div class="list-row"><span>Fallback signal</span><strong>${V2_CANONICAL_PAGE_LOAD_RULES.fallbackSignal}</strong></div>
            <div class="list-row"><span>Dedupe window</span><strong>${V2_CANONICAL_PAGE_LOAD_RULES.dedupeWindowSeconds}s</strong></div>
            <div class="list-row"><span>Visit count rule</span><strong>${V2_CANONICAL_PAGE_LOAD_RULES.visitCountRule}</strong></div>
          </div>
          <div class="card">
            <div class="muted">Debug Surface</div>
            <p>Use <code>/__k4stats-v2/debug</code> with <code>session_id</code>, <code>visitor_id</code>, or <code>page_path</code> to inspect raw → canonical mapping.</p>
            <p><a href="/__k4stats-v2/debug?limit=25">Open debug route</a></p>
            <p><strong>Note:</strong> Debug shows raw events plus pre-persistence canonical candidates. The persisted <code>canonical_events_v2</code> table is the actual truth layer used for V2 counts.</p>
            <p><strong>Refresh behavior:</strong> Summary metrics update through the incremental refresh path. Fresh raw events still appear in debug immediately.</p>
          </div>
          <div class="card">
            <h2>Enabled Families</h2>
            ${V2_EVENT_FAMILIES.map((family) => `<div class="list-row"><span>${family}</span><strong>enabled</strong></div>`).join('')}
          </div>
          <div class="card">
            <h2>Recent Canonical Families</h2>
            ${recentFamilies.length ? recentFamilies.map((row) => `<div class="list-row"><span>${row.event_family}</span><strong>${row.count}</strong></div>`).join('') : '<p>No canonical rows yet. Apply the migration and backfill/population pass next.</p>'}
          </div>
          <div class="card">
            <h2>Excluded In Phase 1</h2>
            ${V2_EXCLUDED_RAW_EVENT_TYPES.map((eventType) => `<div class="list-row"><span>${eventType}</span><strong>excluded</strong></div>`).join('')}
          </div>
        </div>
      </div>
    </details>
  </div>
</body>
</html>`;
}

export function renderDebugTraceV2({ filters, trace }) {
  const rows = trace?.rawRows || [];
  const canonicalIndex = new Map((trace?.matchedCanonicalRows || []).map((row) => [row.dedupe_key, row]));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>K4 Analytics V2 Debug</title>
  <style>
    body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #111; color: #eee; margin: 0; padding: 20px; }
    .container { max-width: 1400px; margin: 0 auto; }
    .card { background: #1c1c1c; border: 1px solid #333; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
    pre { white-space: pre-wrap; word-break: break-word; background: #0b0b0b; padding: 12px; border-radius: 8px; overflow: auto; }
    a { color: #66aaff; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <strong>Filters</strong>
      <pre>${JSON.stringify(filters, null, 2)}</pre>
      <p><a href="/__k4stats-v2">Back to V2 dashboard</a></p>
      <p><strong>Important:</strong> This debug view shows raw events and pre-persistence canonical candidates for inspection. The persisted <code>canonical_events_v2</code> rows are the actual truth layer for V2 metrics.</p>
    </div>
    ${rows.map((row, index) => {
      const matched = row.canonical?.accepted ? canonicalIndex.get(row.canonical.dedupeKey) || null : null;
      return `
        <div class="card">
          <strong>Trace ${index + 1}</strong>
          <pre>${JSON.stringify({ raw: row.raw, canonicalCandidate: row.canonical, matchedCanonicalRow: matched }, null, 2)}</pre>
        </div>
      `;
    }).join('') || '<div class="card"><pre>No matching raw events found for this trace window.</pre></div>'}
  </div>
</body>
</html>`;
}
