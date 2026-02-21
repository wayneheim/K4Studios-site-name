// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD RENDERER (Phase 4 — pure HTML generation)
// Accepts assembled dashboardData object, returns HTML string.
// NO DB access, NO env usage, NO filter logic — rendering only.
// ═══════════════════════════════════════════════════════════════════════════

export function renderDashboard({ days, yesterday, selectedDate, galleryFilter, excludeIp, viewerIp, summary, newVisitors, returningVisitors, cowboyJumps, events, entries, galleries, referrers, geo, trend, devices, pages, images, uniqueImagesViewed, totalImageSessions, totalImageViews, themesClicked, topDepthSessions, minEngagement, maxEngagement, avgDepthScore, deepSessionPct, deepSessions, totalSessions, exitPages, exitSummary, exitByCategory, botPct, botSessions, hideBots, hideChardon, edgeEvents, edgeSummary, entryPages, entryRefCounts, imagePageViewsFromEvents, imageEntrySessionsFromEvents, bounceRate, avgDurationFormatted, peakHours, deviceEngagement, artViewsSummary, artViewsByType, topArtViews, externalImageAccess, externalImageAccessTotal, externalReachGeo, externalReachSources, imageAccessOverview, viewerDepth, suppressionStats, botIntelligence }) {
  const s = summary || {};
  const safeDeviceEngagement = Array.isArray(deviceEngagement) ? deviceEngagement : [];
  
  // Canonical list of all trackable events with display labels
  // Alphabetized: high-value events first, then passive/scroll events
  const eventLabels = {
    // -- High-value user interactions --
    'browse_all_click': 'Browse All Click',
    'order_clicked': 'Buy Button Click',
    'collector_notes_open': 'Collector Notes',
    'cowboy_jump': 'Cowboy Jump',
    'exit_to_gallery': 'Exit to Gallery',
    'gallery_explore_click': 'Gallery Explore Click',
    'gallery_preview_click': 'Gallery Preview Click',
    'guide_open': 'Guide',
    'guide_close': 'Guide - Close',
    'guide_done': 'Guide - Done',
    'guide_click_outside': 'Guide - Click Outside',
    'gallery_hero_click': 'Hero Image Click',
    'more_info_open': 'More About Image',
    'nav_next': 'Nav - Next',
    'nav_prev': 'Nav - Prev',
    'order_submitted': 'Order Inquiry Sent',
    'series_info': 'Series Info',
    'sister_image_click': 'Sister Image Click',
    'slideshow_start': 'Slideshow Start',
    'story_slider_click': 'Story Slider Click',
    'theme_click': 'Theme Click',
    // xl_zoom is intentionally omitted: it's counted separately as a user-intent metric (never image request)

    // -- Passive / system events --
    'all_list_click': 'All Galleries Click',
    'grid_open': 'Grid - Open',
    'grid_image_click': 'Grid - Image Click',
    'grid_show_more': 'Grid - Show More',
    'grid_show_previous': 'Grid - Show Previous',
    'scroll_25': 'Page - 25% Scroll',
    'scroll_50': 'Page - 50% Scroll',
    'scroll_75': 'Page - 75% Scroll',
    'scroll_100': 'Page - 100% Scroll',
    'page_view': 'Page View',
    'session_exit': 'Session Exit'
  };
  
  // Merge DB results with canonical list - always show all events
  const eventCounts = {};
  events.forEach(e => { eventCounts[e.event] = e.count; });
  
  // Inject slideshow_start from art_views (Layer B) into event counts
  if (artViewsSummary?.slideshow_starts) {
    eventCounts['slideshow_start'] = (eventCounts['slideshow_start'] || 0) + artViewsSummary.slideshow_starts;
  }
  
  const allEvents = Object.keys(eventLabels).map(key => ({
    event: key,
    label: eventLabels[key],
    count: eventCounts[key] || 0
  })).sort((a, b) => b.count - a.count);
  
  // Helper to format event names (fallback for unlisted events)
  const formatEventName = (name) => {
    if (eventLabels[name]) return eventLabels[name];
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };
  
  // Calculate max for bar chart scaling
  const maxEventCount = Math.max(...allEvents.map(e => e.count), 1);
  const maxRefSessions = Math.max(...referrers.map(r => r.sessions), 1);
  const maxGeoVisitors = Math.max(...geo.map(g => g.visitors), 1);
  const maxPageSessions = Math.max(...pages.map(p => p.sessions), 1);
  
  // Build base URL for filter links (preserves current filters)
  const baseParams = new URLSearchParams();
  if (yesterday) {
    baseParams.set("yesterday", "1");
  } else {
    baseParams.set("days", days.toString());
  }
  if (galleryFilter) baseParams.set("gallery", galleryFilter);
  if (excludeIp) baseParams.set("excludeIp", excludeIp);
  if (hideBots) baseParams.set("hideBots", "1");
  if (hideChardon) baseParams.set("hideChardon", "1");
  
  // URL with IP exclusion
  const excludeMeUrl = (() => {
    const p = new URLSearchParams(baseParams);
    if (viewerIp) p.set("excludeIp", viewerIp);
    return "?" + p.toString();
  })();
  
  // URL without IP exclusion
  const showAllUrl = (() => {
    const p = new URLSearchParams(baseParams);
    p.delete("excludeIp");
    return "?" + p.toString();
  })();

  // URL with bots hidden
  const hideBotsUrl = (() => {
    const p = new URLSearchParams(baseParams);
    p.set("hideBots", "1");
    return "?" + p.toString();
  })();

  // URL with bots shown
  const showBotsUrl = (() => {
    const p = new URLSearchParams(baseParams);
    p.delete("hideBots");
    return "?" + p.toString();
  })();

  // URL with Chardon hidden
  const hideChardonUrl = (() => {
    const p = new URLSearchParams(baseParams);
    p.set("hideChardon", "1");
    return "?" + p.toString();
  })();

  // URL with Chardon shown
  const showChardonUrl = (() => {
    const p = new URLSearchParams(baseParams);
    p.delete("hideChardon");
    return "?" + p.toString();
  })();
  
  // Label for the footer
  const periodLabel = yesterday ? "Yesterday" : `Last ${days} day(s)`;
  
  // Green badge label — always shows context for current view mode
  const greenBadgeLabel = (() => {
    const today = new Date();
    const fmt = d => d.toISOString().slice(0, 10); // YYYY-MM-DD
    if (selectedDate) {
      // Clicked a specific bar — show mode prefix + date
      const prefix = yesterday ? 'Yesterday' : days === 1 ? 'Today' : days === 7 ? '7D' : days === 30 ? '30D' : '3M';
      return `${prefix} — ${selectedDate}`;
    }
    if (days === 1 && !yesterday) return fmt(today);
    if (yesterday) {
      const yd = new Date(today); yd.setDate(yd.getDate() - 1);
      return fmt(yd);
    }
    if (days === 7) return '7 Day Tally';
    if (days === 30) return '30 Day Tally';
    if (days === 90) return '3 Month Tally';
    return `${days}D Tally`;
  })();

  const imageAccessTotals = (() => {
    const rows = imageAccessOverview || [];
    let imageOnlyViews = 0;
    let externalViews = 0;
    let chapterViews = 0;
    let zoomViews = 0;
    for (const row of rows) {
      imageOnlyViews += (row?.unverified_views || 0);
      externalViews += (row?.external_views || 0);
      chapterViews += (row?.chapter_views || 0);
      zoomViews += (row?.xl_zooms || 0);
    }
    const allViews = chapterViews + zoomViews + imageOnlyViews + externalViews;
    return {
      uniqueImages: rows.length,
      allViews,
      chapterViews,
      zoomViews,
      imageOnlyViews,
      externalViews
    };
  })();
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>K4 Analytics</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --k4-scrollbar-size: 5px;
      --k4-scrollbar-track: #111;
      --k4-scrollbar-thumb: #333;
      --k4-scrollbar-thumb-hover: #444;
      --k4-panel-list-max: 450px;
      --k4-grid-panel-max: 420px;
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a1a; color: #e0e0e0; padding: 20px; }
    .container { max-width: 1800px; margin: 0 auto; }
    h1 { color: #fff; margin-bottom: 20px; }
    h2 { color: #888; font-size: 14px; text-transform: uppercase; margin: 20px 0 10px; }
    .controls { margin-bottom: 15px; display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
    .controls a { color: #4a9eff; text-decoration: none; padding: 5px 10px; border-radius: 4px; }
    .controls a:hover, .controls a.active { background: #333; }
    .pulse { display: flex; gap: 8px; margin-bottom: 8px; align-items: stretch; }
    .pulse .pulse-stat { flex: 1 1 0; min-width: 0; justify-content: center; }
    .pulse-row { display: flex; gap: 8px; margin-bottom: 10px; align-items: stretch; }
    .pulse-row .pulse-stat { flex: 1; justify-content: center; }
    .pulse-stat { background: #252525; padding: 6px 12px; border-radius: 6px; display: flex; align-items: center; gap: 6px; position: relative; cursor: help; }
    .pulse-stat.clickable { cursor: pointer; transition: opacity 0.2s, transform 0.1s; }
    .pulse-stat.clickable:hover { transform: scale(1.02); }
    .pulse-stat.clickable.off { opacity: 0.4; }
    .pulse-stat .value { font-size: 18px; font-weight: bold; color: #4a9eff; }
    .pulse-stat .label { font-size: 11px; color: #888; display: flex; align-items: center; gap: 4px; }
    .pulse-stat .info-icon { width: 12px; height: 12px; border-radius: 50%; background: #444; color: #888; font-size: 9px; display: inline-flex; align-items: center; justify-content: center; font-style: italic; }
    .pulse-stat .tooltip { display: none; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: #333; color: #e0e0e0; padding: 8px 12px; border-radius: 6px; font-size: 11px; white-space: nowrap; z-index: 1000; margin-bottom: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); max-width: 280px; white-space: normal; line-height: 1.4; }
    .pulse-stat .tooltip::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 6px solid transparent; border-top-color: #333; }
    .pulse-stat:hover .tooltip { display: block; }
    .pulse-stat.highlight { background: linear-gradient(135deg, #d97706 0%, #b45309 100%); }
    .pulse-stat.highlight .value { color: #fff; }
    .pulse-stat.highlight .label { color: #fde68a; }
    .pulse-stat.highlight .info-icon { background: rgba(255,255,255,0.2); color: #fde68a; }
    .pulse-stat.collector { background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); }
    .pulse-stat.collector .value { color: #fff; }
    .pulse-stat.collector .label { color: #c4b5fd; }
    .pulse-stat.collector .info-icon { background: rgba(255,255,255,0.2); color: #c4b5fd; }
    /* Custom scrollbar (thin + dark) */
    * { scrollbar-width: thin; scrollbar-color: var(--k4-scrollbar-thumb) var(--k4-scrollbar-track); }
    *::-webkit-scrollbar { width: var(--k4-scrollbar-size); height: var(--k4-scrollbar-size); }
    *::-webkit-scrollbar-track { background: var(--k4-scrollbar-track); border-radius: 999px; }
    *::-webkit-scrollbar-thumb { background: var(--k4-scrollbar-thumb); border-radius: 999px; }
    *::-webkit-scrollbar-thumb:hover { background: var(--k4-scrollbar-thumb-hover); }
    table { width: 100%; border-collapse: collapse; background: #252525; border-radius: 8px; overflow: hidden; margin-bottom: 15px; }
    th, td { padding: 5px 8px; text-align: left; border-bottom: 1px solid #333; font-size: 12px; }
    th { background: #1a1a1a; color: #888; font-size: 12px; text-transform: uppercase; }
    tr:last-child td { border-bottom: none; }
    /* Main grid - fixed 5-column layout, centered */
    .grid, .grid-tall { display: grid; grid-template-columns: repeat(5, 348px); gap: 10px; margin: 0 auto 10px auto; width: fit-content; }
    .section { background: #252525; border-radius: 8px; padding: 10px; overflow: visible; }
    .grid > .section, .grid-tall > .section { max-height: var(--k4-grid-panel-max); overflow-y: auto; scrollbar-gutter: stable; }
    .section h3 { color: #fff; font-size: 13px; margin-bottom: 6px; }
    /* Bar chart styles */
    .bar-row { display: flex; align-items: center; padding: 4px 0; border-bottom: 1px solid #333; }
    .bar-row:last-child { border-bottom: none; }
    .bar-label { width: 110px; flex-shrink: 0; font-size: 11px; color: #ccc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bar-container { flex: 1; background: #1a1a1a; border-radius: 4px; height: 16px; margin: 0 6px; overflow: hidden; }
    .bar { height: 100%; background: linear-gradient(90deg, #4a9eff 0%, #2d7dd2 100%); border-radius: 4px; transition: width 0.3s ease; }
    .bar-value { width: 35px; flex-shrink: 0; text-align: right; font-size: 12px; color: #888; }
    .bar-orange .bar { background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%); }
    .bar-green .bar { background: linear-gradient(90deg, #10b981 0%, #059669 100%); }
    /* Section tooltips */
    .section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .section-header h3 { margin: 0; }
    .section-tip { position: relative; cursor: help; }
    .section-tip .info-icon { width: 14px; height: 14px; border-radius: 50%; background: #444; color: #888; font-size: 10px; display: inline-flex; align-items: center; justify-content: center; font-style: italic; }
    .section-tip .tooltip { display: none; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: #333; color: #e0e0e0; padding: 8px 12px; border-radius: 6px; font-size: 11px; z-index: 1000; margin-bottom: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); width: 220px; line-height: 1.4; }
    .section-tip .tooltip::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 6px solid transparent; border-top-color: #333; }
    .section-tip:hover .tooltip { display: block; }
    /* Art Views header bar */
    .artviews-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(255,255,255,0.03); border-radius: 8px; margin: 20px 0 12px 0; }
    .artviews-header .artviews-title { font-weight: 600; font-size: 16px; letter-spacing: 0.04em; }
    .artviews-header .artviews-title .subtle { margin-left: 10px; opacity: 0.6; font-size: 0.85em; color: #10b981; }
    .artviews-header .help-trigger { position: relative; cursor: help; }
    .artviews-header .help-trigger .info-icon { width: 18px; height: 18px; border-radius: 50%; background: #444; color: #888; font-size: 11px; display: inline-flex; align-items: center; justify-content: center; font-style: italic; }
    .artviews-header .help-trigger .tooltip { display: none; position: absolute; bottom: 100%; right: 0; transform: none; background: #333; color: #e0e0e0; padding: 10px 14px; border-radius: 6px; font-size: 11px; z-index: 1000; margin-bottom: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); width: 280px; line-height: 1.5; }
    .artviews-header .help-trigger .tooltip::after { content: ''; position: absolute; top: 100%; right: 8px; border: 6px solid transparent; border-top-color: #333; }
    .artviews-header .help-trigger:hover .tooltip { display: block; }
    /* Wide sections span 2 columns */
    .section.wide { grid-column: span 2; }
    /* Exit blocks - uniform width stacking */
    .exit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; }
    .exit-block { border-radius: 6px; padding: 6px 10px; display: flex; align-items: center; gap: 6px; }
    .exit-block .value { font-size: 14px; font-weight: bold; color: #fff; }
    .exit-block .label { font-size: 10px; }
    /* Art Views 3-column grid - responsive */
    .art-views-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 1780px; margin: 0 auto; }
    @media (max-width: 1000px) { .art-views-grid { grid-template-columns: repeat(2, 1fr); width: 100%; } }
    @media (max-width: 600px) { .art-views-grid { grid-template-columns: 1fr; width: 100%; } }
    /* External traffic 3-column - equal width, fills container */
    .external-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 768px) { .external-grid { grid-template-columns: 1fr; width: 100%; } }
    /* Mobile-friendly */
    @media (max-width: 768px) {
      body { padding: 10px; }
      .container { max-width: 100%; }
      .grid, .grid-tall { grid-template-columns: 1fr; }
      .section.wide { grid-column: span 1; }
      .pulse-row { flex-wrap: wrap; }
      .pulse-row .pulse-stat { flex: none; }
      .pulse { flex-wrap: wrap; gap: 5px; }
      .pulse .pulse-stat { flex: none; }
      .pulse-stat { padding: 4px 8px; }
      .pulse-stat .value { font-size: 14px; }
      .pulse-stat .label { font-size: 9px; }
      h1 { font-size: 18px; }
      h2 { font-size: 13px; margin: 15px 0 8px; }
      .section { padding: 10px; max-height: none; }
      .grid > .section, .grid-tall > .section { max-height: none; overflow: visible; }
      .bar-label { width: 80px; font-size: 10px; }
      .controls { gap: 3px; }
      .controls a { font-size: 10px; padding: 4px 6px; }
      .exit-grid { grid-template-columns: 1fr; }
      .bot-intel-grid { grid-template-columns: 1fr !important; }
    }
    /* Trend chart styles */
    .trend-chart { background: #252525; border-radius: 8px; padding: 20px; margin-top: 10px; margin-bottom: 30px; }
    .trend-chart h3 { color: #fff; font-size: 14px; }
    .trend-bars { display: flex; align-items: flex-end; gap: 4px; height: 100px; padding-bottom: 25px; position: relative; }
    .trend-bar { flex: 1; min-width: 25px; max-width: 70px; background: linear-gradient(180deg, #4a9eff 0%, #2d7dd2 100%); border-radius: 4px 4px 0 0; position: relative; cursor: pointer; transition: all 0.2s; }
    .trend-bar:hover { opacity: 0.8; }
    .trend-bar.selected { background: linear-gradient(180deg, #10b981 0%, #059669 100%); box-shadow: 0 0 12px rgba(16, 185, 129, 0.5); }
    .trend-bar.selected .trend-bar-value { color: #10b981; font-weight: bold; }
    .trend-bar.selected .trend-bar-label { color: #10b981; font-weight: bold; }
    .trend-bar-label { position: absolute; bottom: -26px; left: 50%; transform: translateX(-50%); font-size: 13px; color: #888; white-space: nowrap; }
    .data-change-marker { color: #f59e0b; font-size: 14px; font-weight: bold; cursor: help; position: relative; top: -1px; margin-left: 1px; }
    .trend-bar-value { position: absolute; top: -22px; left: 50%; transform: translateX(-50%); font-size: 14px; color: #aaa; font-weight: 500; }
    .no-chart { color: #666; font-size: 13px; }
    .ip-filter { display: flex; gap: 10px; align-items: center; }
    .ip-filter a { font-size: 12px; }
    .ip-filter .exclude-active { background: #7c3aed; color: #fff; }
    .ip-filter .bot-filter { background: #4b5563; color: #fff; }
    .ip-filter .bot-filter.active { background: #059669; }
    .ip-badge { font-size: 11px; color: #888; background: #333; padding: 3px 8px; border-radius: 4px; }
  </style>
</head>
<body>
<div class="container">
  <h1>K4 Analytics <a href="/__k4serp" target="_blank" style="font-size:14px;color:#4a9eff;text-decoration:none;margin-left:20px">📊 SERP</a> <a href="/__k4serp/launch" target="_blank" style="font-size:14px;color:#4a9eff;text-decoration:none">🚀 Launch Pad</a></h1>
  
  <div class="controls">
    <a href="?days=1${excludeIp ? '&excludeIp=' + excludeIp : ''}${hideBots ? '&hideBots=1' : ''}${hideChardon ? '&hideChardon=1' : ''}" class="${days === 1 && !yesterday ? 'active' : ''}">Today*</a>
    <a href="?yesterday=1${excludeIp ? '&excludeIp=' + excludeIp : ''}${hideBots ? '&hideBots=1' : ''}${hideChardon ? '&hideChardon=1' : ''}" class="${yesterday ? 'active' : ''}">Yesterday*</a>
    <a href="?days=7${excludeIp ? '&excludeIp=' + excludeIp : ''}${hideBots ? '&hideBots=1' : ''}${hideChardon ? '&hideChardon=1' : ''}" class="${days === 7 && !yesterday ? 'active' : ''}">7 Days</a>
    <a href="?days=30${excludeIp ? '&excludeIp=' + excludeIp : ''}${hideBots ? '&hideBots=1' : ''}${hideChardon ? '&hideChardon=1' : ''}" class="${days === 30 && !yesterday ? 'active' : ''}">30 Days</a>
    <a href="?days=90${excludeIp ? '&excludeIp=' + excludeIp : ''}${hideBots ? '&hideBots=1' : ''}${hideChardon ? '&hideChardon=1' : ''}" class="${days === 90 && !yesterday ? 'active' : ''}">3 Months</a>
    <span style="background:#059669;padding:4px 10px;border-radius:4px;color:#fff;font-size:13px;">📅 ${greenBadgeLabel}</span>
    <div style="margin-left:auto;display:flex;gap:10px;align-items:center;">
      <div class="ip-filter">
        ${excludeIp 
          ? `<span class="ip-badge">Excluding: ${excludeIp}</span><a href="${showAllUrl}">Show All IPs</a>`
          : `<a href="${excludeMeUrl}" class="exclude-active">Exclude My IP</a>`
        }
        ${hideBots
          ? `<a href="${showBotsUrl}" class="bot-filter active">🤖 Bots Hidden</a>`
          : `<a href="${hideBotsUrl}" class="bot-filter">🤖 Hide Bots</a>`
        }
        ${hideChardon
          ? `<a href="${showChardonUrl}" class="bot-filter active">🏠 Team Hidden</a>`
          : `<a href="${hideChardonUrl}" class="bot-filter">🏠 Hide Team</a>`
        }
      </div>
      <a href="/__k4stats/export?days=${days}${yesterday ? '&yesterday=1' : ''}${hideBots ? '&hideBots=1' : ''}" class="export-btn" style="background: #2d4a2d; padding: 5px 12px; border-radius: 4px; color: #4ade80;">📥 Export CSV</a>
    </div>
  </div>

  ${trend.length > 1 ? `
  <h3 style="color:#fff;font-size:14px;margin-bottom:6px;">
    <span id="chart-title">Engaged Sessions per Day</span>
    <span style="float: right; font-size: 12px; font-weight: normal;">
      <a href="#" id="toggle-visitors" style="color: #888; text-decoration: none;">Visitors</a> |
      <a href="#" id="toggle-sessions" style="color: #4a9eff; text-decoration: underline;">Sessions</a>
    </span>
  </h3>
  <div class="trend-chart">
    <div class="trend-bars" id="trend-chart-bars">
      ${(() => {
        const maxSessions = Math.max(...trend.map(t => t.sessions), 1);
        return trend.map(t => {
          const height = Math.max((t.sessions / maxSessions * 100), 2);
          const dateLabel = t.day.slice(5); // MM-DD format
          const isDataChangeDate = t.day === '2026-02-14';
          const isSelected = selectedDate === t.day;
          return `
            <div class="trend-bar${isSelected ? ' selected' : ''}" data-visitors="${t.visitors}" data-sessions="${t.sessions}" data-day="${t.day}" style="height: ${height}%" title="${t.day}: ${t.visitors} visitors, ${t.sessions} sessions">
              <span class="trend-bar-value">${t.sessions}</span>
              <span class="trend-bar-label">${dateLabel}${isDataChangeDate ? '<span class="data-change-marker" title="Referrer tracking &amp; data granularity improved on this date. Data before this date uses less precise source attribution.">*</span>' : ''}</span>
            </div>
          `;
        }).join('');
      })()}
    </div>
  </div>
  <script>
    (function() {
      const visitorsLink = document.getElementById('toggle-visitors');
      const sessionsLink = document.getElementById('toggle-sessions');
      const chartTitle = document.getElementById('chart-title');
      const bars = document.querySelectorAll('.trend-bar');
      
      // Click on bar to load that day's data (preserve days for chart context)
      bars.forEach(bar => {
        bar.style.cursor = 'pointer';
        bar.addEventListener('click', function() {
          const day = this.dataset.day;
          if (day) {
            const url = new URL(window.location.href);
            url.searchParams.set('date', day);
            url.searchParams.delete('yesterday');
            // Keep days param for chart context, default to 7 if not set
            if (!url.searchParams.get('days')) {
              url.searchParams.set('days', '7');
            }
            window.location.href = url.toString();
          }
        });
      });
      
      function showVisitors() {
        const maxVal = Math.max(...Array.from(bars).map(b => parseInt(b.dataset.visitors)), 1);
        bars.forEach(bar => {
          const val = parseInt(bar.dataset.visitors);
          bar.style.height = Math.max((val / maxVal * 100), 2) + '%';
          bar.querySelector('.trend-bar-value').textContent = val;
          bar.title = bar.dataset.day + ': ' + val + ' visitors';
        });
        chartTitle.textContent = 'Human Visitors per Day';
        visitorsLink.style.color = '#10b981';
        visitorsLink.style.textDecoration = 'underline';
        sessionsLink.style.color = '#888';
        sessionsLink.style.textDecoration = 'none';
      }
      
      function showSessions() {
        const maxVal = Math.max(...Array.from(bars).map(b => parseInt(b.dataset.sessions)), 1);
        bars.forEach(bar => {
          const val = parseInt(bar.dataset.sessions);
          bar.style.height = Math.max((val / maxVal * 100), 2) + '%';
          bar.querySelector('.trend-bar-value').textContent = val;
          bar.title = bar.dataset.day + ': ' + val + ' sessions';
        });
        chartTitle.textContent = 'Engaged Sessions per Day';
        sessionsLink.style.color = '#4a9eff';
        sessionsLink.style.textDecoration = 'underline';
        visitorsLink.style.color = '#888';
        visitorsLink.style.textDecoration = 'none';
      }
      
      visitorsLink.addEventListener('click', function(e) { e.preventDefault(); showVisitors(); });
      sessionsLink.addEventListener('click', function(e) { e.preventDefault(); showSessions(); });

      // Default view: sessions (matches "real humans" = distinct session_id).
      showSessions();
    })();
  </script>
  ` : trend.length === 1 ? `
  <div class="trend-chart">
    <h3>Engaged Sessions</h3>
    <div class="trend-bars" style="justify-content: center;">
      <div class="trend-bar" style="height: 100%; width: 80px;" title="${trend[0].day}: ${trend[0].visitors} visitors, ${trend[0].sessions} sessions">
        <span class="trend-bar-value">${trend[0].sessions}</span>
        <span class="trend-bar-label">${trend[0].day.slice(5)}${trend[0].day === '2026-02-14' ? '<span class="data-change-marker" title="Referrer tracking &amp; data granularity improved on this date. Data before this date uses less precise source attribution.">*</span>' : ''}</span>
      </div>
    </div>
  </div>
  ` : ''}

  <h2>Pulse</h2>
  <div class="pulse">
    <div class="pulse-stat">
      <span class="value">${s.unique_visitors > 0 ? (s.sessions / s.unique_visitors).toFixed(1) : '0'}</span>
      <span class="label">Sessions/Visitor <span class="info-icon">i</span></span>
      <div class="tooltip">Average number of sessions per human visitor. Higher = more return visits or deeper browsing patterns. ${s.sessions || 0} sessions from ${s.unique_visitors || 0} unique visitors.</div>
    </div>
    <div class="pulse-stat">
      <span class="value"><span style="color:#10b981">${newVisitors}</span>/<span style="color:#f59e0b">${returningVisitors}</span></span>
      <span class="label">New/Ret <span class="info-icon">i</span></span>
      <div class="tooltip">New: IPs never seen before this period. Returning: IPs that visited previously. Green = new, Orange = returning.</div>
    </div>
    <div class="pulse-stat">
      <span class="value">${s.sessions || 0}${minEngagement > 0 ? `<span style="opacity: 0.6; font-size: 0.7em;"> (${minEngagement}-${maxEngagement})</span>` : ''}</span>
      <span class="label">Engaged <span class="info-icon">i</span></span>
      <div class="tooltip">Engaged sessions: browser sessions where JS loaded and events fired. Range shows min-max engagement scores (zoom=4, notes=5, theme=3, nav=2).</div>
    </div>
    <div class="pulse-stat">
      <span class="value">${s.avg_events_per_session || 0}</span>
      <span class="label">Average Engagement <span class="info-icon">i</span></span>
      <div class="tooltip">Average number of tracked engagement events per session.</div>
    </div>
    <div class="pulse-stat">
      <span class="value" style="color:#22d3ee;">${avgDurationFormatted}</span>
      <span class="label">Avg Time <span class="info-icon">i</span></span>
      <div class="tooltip">Average session duration (first to last event). Only counts sessions with 2+ events. For art browsing, 2+ min is good engagement.</div>
    </div>
    ${peakHours.length > 0 ? `<div class="pulse-stat">
      <span class="value" style="color:#f472b6;">${peakHours.map(h => h.hour).join(', ')}</span>
      <span class="label">Peak <span class="info-icon">i</span></span>
      <div class="tooltip">Highest traffic hour in morning (AM) and evening (PM) periods. ${peakHours.map(h => `${h.period}: ${h.hour} (${h.sessions} sessions)`).join(', ')}. Great for social posting timing.</div>
    </div>` : ''}
    <div class="pulse-stat" style="background: ${bounceRate > 60 ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' : bounceRate > 40 ? 'linear-gradient(135deg, #c2410c 0%, #9a3412 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'};">
      <span class="value" style="color: #fff;">${bounceRate}%</span>
      <span class="label" style="color: ${bounceRate > 40 ? '#fed7aa' : '#a7f3d0'};">Bounce <span class="info-icon" style="background: rgba(255,255,255,0.2); color: ${bounceRate > 40 ? '#fed7aa' : '#a7f3d0'};">i</span></span>
      <div class="tooltip">Sessions with only 1 event (came and left immediately). Lower is better. Above 60% = concern, below 40% = great.</div>
    </div>
  </div>

  <div class="pulse-row">
    ${viewerDepth?.avgScore > 0 ? `<div class="pulse-stat collector">
      <span class="value" style="color: #fff;">⭐ ${viewerDepth.avgScore}</span>
      <span class="label" style="color: #c4b5fd;">Avg Depth <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #c4b5fd;">i</span></span>
      <div class="tooltip">Viewer Depth Score — your TRUE NORTH metric. Measures engagement quality: gallery=1, image=2, zoom=5. Higher = deeper art engagement. Distribution: ${viewerDepth.distribution?.map(d => `${d.label}: ${d.count}`).join(', ') || 'none'}. Max today: ${viewerDepth.maxScore || 0}.</div>
    </div>` : ''}
    ${viewerDepth?.highDepthCount > 0 ? `<div class="pulse-stat" style="background: linear-gradient(135deg, #059669 0%, #047857 100%);">
      <span class="value" style="color: #fff;">🎯 ${viewerDepth.highDepthCount}</span>
      <span class="label" style="color: #a7f3d0;">Collectors <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #a7f3d0;">i</span></span>
      <div class="tooltip">High-depth viewers (score 20+) exhibiting collector behavior: multiple images, zooms, intentional browsing. These are your potential buyers.</div>
    </div>` : ''}
    ${cowboyJumps > 0 ? `<div class="pulse-stat highlight">
      <span class="value">🤠 ${cowboyJumps}</span>
      <span class="label">Cowboy Jump <span class="info-icon">i</span></span>
      <div class="tooltip">Total cowboy jump clicks. Every click counts!</div>
    </div>` : ''}
    <div class="pulse-stat" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
      <span class="value" style="color: #fff;">👤 ${artViewsSummary?.unique_viewers || 0}</span>
      <span class="label" style="color: #a7f3d0;">Art Viewers <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #a7f3d0;">i</span></span>
      <div class="tooltip">Unique human visitors (cookie-based <strong>k4_vid</strong>) with JS proof-of-life. This is <em>not</em> a session count.</div>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);">
      <span class="value" style="color: #fff;">👤 ${artViewsSummary?.total || 0}</span>
      <span class="label" style="color: #ddd6fe;">Exposure Views <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #ddd6fe;">i</span></span>
      <div class="tooltip">Proxy-verified exposures: <strong>C</strong> (Chapters) + <strong>E</strong> (External image serves). It intentionally does <em>not</em> include <strong>Z</strong> (XL zoom intent) or gallery navigation.</div>
    </div>
    ${suppressionStats?.activeSuppressedIPs > 0 ? `<div class="pulse-stat" style="background: linear-gradient(135deg, #475569 0%, #334155 100%);">
      <span class="value" style="color: #94a3b8;">🛡 ${suppressionStats.activeSuppressedIPs}</span>
      <span class="label" style="color: #94a3b8;">Filtered <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #94a3b8;">i</span></span>
      <div class="tooltip">${hideBots
        ? `Visitors hidden by <strong>Hide Bots</strong> for this period. Hidden events: ${suppressionStats.suppressedToday || 0}.`
        : `Legacy bot-classified visitors (UA/ASN). Bot events this period: ${suppressionStats.suppressedToday || 0}.`
      }</div>
    </div>` : ''}
  </div>

  <!-- Art Views Section -->
  <div class="artviews-header">
    <div class="artviews-title">🎨 ART VIEWS <span class="subtle">Human art viewers (cleaned)</span></div>
    <span class="help-trigger">
      <span class="info-icon">i</span>
      <div class="tooltip">
        <strong>How Art Views are counted</strong><br><br>
        • <strong>Chapters</strong> → proxy L-size image fetches with internal referer<br>
        • <strong>XL Zooms</strong> → JS intent beacons (same-origin)<br>
        • <strong>External embeds</strong> → proxy L-size fetches with external/no referer<br>
        • <strong>Bot exclusion</strong> → datacenter IP + scraper UA filtering
      </div>
    </span>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 280px 280px; gap: 12px; max-width: 1780px; margin: 0 auto;">
    <!-- Image Access Overview (unified panel) -->
    <div class="section" style="max-height: none;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap;">
        <h3 style="margin: 0;">📊 Image Access Overview</h3>
        <div style="display: flex; gap: 3px;" id="accessFilterBtns">
          <button onclick="filterAccess('all')" data-f="all" style="padding: 2px 8px; border-radius: 4px; border: 1px solid #555; background: #444; color: #fff; font-size: 10px; cursor: pointer; font-weight: bold;">All</button>
          <button onclick="filterAccess('C')" data-f="C" style="padding: 2px 8px; border-radius: 4px; border: 1px solid #a78bfa55; background: #a78bfa22; color: #a78bfa; font-size: 10px; cursor: pointer;">C</button>
          <button onclick="filterAccess('U')" data-f="U" style="padding: 2px 8px; border-radius: 4px; border: 1px solid #f59e0b55; background: #f59e0b22; color: #f59e0b; font-size: 10px; cursor: pointer;">i</button>
          <button onclick="filterAccess('E')" data-f="E" style="padding: 2px 8px; border-radius: 4px; border: 1px solid #3b82f655; background: #3b82f622; color: #3b82f6; font-size: 10px; cursor: pointer;">E</button>
        </div>
        <span style="font-size: 10px; color: #555;">
          <span style="color: #a78bfa;">C</span>=Chapter
          <span style="color: #f59e0b;">i</span>=Image only
          <span style="color: #3b82f6;">E</span>=External
        </span>
        <div style="margin-left: auto; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; justify-content: flex-end;">
          <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:7px;border:1px solid #3a3a3a;background:#222;color:#cbd5e1;font-size:12px;letter-spacing:0.2px;" title="ALL = C + Z + i + E (total views). Unique images: ${imageAccessTotals.uniqueImages}">
            <span style="font-size:11px;opacity:0.75;">ALL</span>
            <span style="font-weight:800;color:#fff;">${imageAccessTotals.allViews}</span>
          </span>
          <span title="Chapter views" style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:7px;border:1px solid #a78bfa55;background:#a78bfa14;color:#a78bfa;font-size:12px;">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:3px;background:#a78bfa22;color:#a78bfa;font-size:10px;font-weight:bold;border:1px solid #a78bfa55;">C</span>
            <span style="font-weight:800;color:#e5e7eb;">${imageAccessTotals.chapterViews}</span>
          </span>
          <span title="Zoom views" style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:7px;border:1px solid #06b6d455;background:#06b6d414;color:#06b6d4;font-size:12px;">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:3px;background:#06b6d422;color:#06b6d4;font-size:10px;font-weight:bold;border:1px solid #06b6d455;">Z</span>
            <span style="font-weight:800;color:#e5e7eb;">${imageAccessTotals.zoomViews}</span>
          </span>
          <span title="Image-only views (no JS/cookie)" style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:7px;border:1px solid #f59e0b55;background:#f59e0b14;color:#f59e0b;font-size:12px;">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:3px;background:#f59e0b22;color:#f59e0b;font-size:10px;font-weight:bold;border:1px solid #f59e0b55;">i</span>
            <span style="font-weight:800;color:#e5e7eb;">${imageAccessTotals.imageOnlyViews}</span>
          </span>
          <span title="External embed views" style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:7px;border:1px solid #3b82f655;background:#3b82f614;color:#3b82f6;font-size:12px;">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:3px;background:#3b82f622;color:#3b82f6;font-size:10px;font-weight:bold;border:1px solid #3b82f655;">E</span>
            <span style="font-weight:800;color:#e5e7eb;">${imageAccessTotals.externalViews}</span>
          </span>
        </div>
      </div>
      <div style="max-height: var(--k4-panel-list-max); overflow-y: auto; padding-right: 4px; scrollbar-gutter: stable;" id="accessOverviewList">
        <!-- Column headers (inside scroller so scrollbar doesn't shift columns) -->
        <div style="position: sticky; top: 0; z-index: 2; display: grid; grid-template-columns: 90px 220px 180px 90px 90px 90px auto; gap: 10px; padding: 7px 8px; background: #252525; color: #777; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; border-bottom: 1px solid #444; align-items: center;">
          <span style="display:flex;justify-content:center;">Image</span>
          <span style="display:flex;justify-content:flex-start;padding-left:14px;">Type / ID</span>
          <span onclick="sortAccessLocation()" id="accessLocationHeader" style="cursor:pointer; user-select:none;">📍 Location ⇅</span>
          <span style="display:flex;justify-content:center;"><span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:3px;background:#a78bfa22;color:#a78bfa;font-size:9px;font-weight:bold;border:1px solid #a78bfa55;" title="Chapter views">C</span></span>
          <span style="display:flex;justify-content:center;"><span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:3px;background:#06b6d422;color:#06b6d4;font-size:9px;font-weight:bold;border:1px solid #06b6d455;" title="Zoom views">Z</span></span>
          <span style="display:flex;justify-content:center;"><span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:3px;background:#f59e0b22;color:#f59e0b;font-size:9px;font-weight:bold;border:1px solid #f59e0b55;" title="Image-only (no JS/cookie)">i</span></span>
          <span>Source</span>
        </div>
        ${(imageAccessOverview || []).map((row, i) => {
          const imageId = row.image_id?.startsWith('i-') ? row.image_id : null;
          const rowDevices = Array.isArray(row.devices) ? row.devices : [];
          const rawUrl = row.url ? String(row.url) : '';
          const linkUrl = rawUrl
            ? (rawUrl.startsWith('http') ? rawUrl : ('https://k4studios.com' + (rawUrl.startsWith('/') ? rawUrl : ('/' + rawUrl))))
            : ('https://k4studios.com/art/' + row.image_id);
          function deviceIconsHtml(devices) {
            if (!Array.isArray(devices) || devices.length === 0) return '';
            const iconMap = { ios: '📱', android: '🅰️', mac: '🍎', windows: '🪟', linux: '🐧', desktop: '🖥️', mobile: '📱', tablet: '📱', unknown: '❓' };
            const labelMap = { ios: 'iOS', android: 'Android', mac: 'Mac', windows: 'Windows', linux: 'Linux', desktop: 'Desktop', mobile: 'Mobile', tablet: 'Tablet', unknown: 'Unknown' };
            const uniq = Array.from(new Set(devices.map(d => String(d || '').toLowerCase()).filter(Boolean)));
            const icons = uniq.slice(0, 4).map(d => {
              const icon = iconMap[d] || '❓';
              const label = labelMap[d] || d;
              return '<span title="' + label + '" style="font-size:12px;">' + icon + '</span>';
            }).join('');
            return '<span title="Devices" style="display:inline-flex;align-items:center;gap:4px;opacity:0.85;">' + icons + '</span>';
          }
          const deviceIcons = deviceIconsHtml(rowDevices);

          const COUNTRY_COLORS = {
            US: '#5ab1ff',
            CA: '#9bd67a',
            GB: '#ffb86b',
            FR: '#e68cff',
            DE: '#ffd166',
            BR: '#7ae582',
            AU: '#ffa69e',
            default: '#9aa3ad'
          };
          function formatLocation(g) {
            if (!g) return '—';
            const country = (g.country || '').toString().trim();
            const region = (g.region || '').toString().trim();
            const city = (g.city || '').toString().trim();
            if (city && region) return city + ', ' + region + ', ' + country;
            if (city) return city + ', ' + country;
            return country || '—';
          }
          const geo = row.geo || null;
          const geoCountry = (geo?.country || (row.countries && row.countries[0]) || '').toString().trim().toUpperCase();
          const locationText = formatLocation({ country: geoCountry || (geo?.country || ''), region: geo?.region, city: geo?.city });
          const locColor = COUNTRY_COLORS[geoCountry] || COUNTRY_COLORS.default;

          const primaryBadge = row.badges.includes('C') ? 'C' : (row.badges.includes('E') ? 'E' : 'U');
          const primaryColors = {
            C: { text: '#a78bfa', bdr: '#a78bfa55' },
            E: { text: '#3b82f6', bdr: '#3b82f655' },
            U: { text: '#f59e0b', bdr: '#f59e0b55' }
          };
          const p = primaryColors[primaryBadge] || primaryColors.U;

          const badgeHtml = row.badges.map(b => {
            const colors = { C: { bg: '#a78bfa22', text: '#a78bfa', bdr: '#a78bfa55' }, U: { bg: '#f59e0b22', text: '#f59e0b', bdr: '#f59e0b55' }, E: { bg: '#3b82f622', text: '#3b82f6', bdr: '#3b82f655' } };
            const c = colors[b] || colors.U;
            const label = (b === 'U') ? 'i' : b;
            return '<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:3px;background:' + c.bg + ';color:' + c.text + ';font-size:10px;font-weight:bold;border:1px solid ' + c.bdr + ';">' + label + '</span>';
          }).join(' ');
          const srcIcons = { 'Google Search': '🔍', 'Google Images': '🖼️', 'Bing': '🔍', 'Twitter/X': '🐦', 'Facebook': '📘', 'Pinterest': '📌', 'DuckDuckGo': '🦆', 'ChatGPT': '🧠', 'Open Graph': '🕸️', 'Structured Data': '🧾', 'Direct': '🔗', 'Internal': '🏠', 'Unknown': '❓' };
          function normalizeSourceDomain(raw) {
            if (!raw) return '';
            const s = String(raw).trim();
            if (!s) return '';
            try {
              return new URL(s).hostname.toLowerCase();
            } catch (_) {
              // Might already be a hostname (or a friendly label like "Google Search")
              return s.toLowerCase().replace(/^www\./, '').split('/')[0];
            }
          }
          function sourceBadgeHtml(rawSource) {
            const domain = normalizeSourceDomain(rawSource);
            const pretty = String(rawSource || '').trim();

            let icon = srcIcons[pretty] || '🌐';
            let label = pretty || 'Unknown';

            // Recommended badges (domain + friendly label compatibility)
            if (domain === 'google.com' || domain.endsWith('.google.com') || pretty === 'Google Search') {
              icon = '🟢';
              label = (domain === 'images.google.com' || pretty === 'Google Images') ? 'Google Images' : 'Google';
            }
            if (domain === 'images.google.com' || pretty === 'Google Images') {
              icon = '🟢';
              label = 'Google Images';
            }
            if (domain === 'pinterest.com' || domain.endsWith('.pinterest.com') || pretty === 'Pinterest') {
              icon = '🔴';
              label = 'Pinterest';
            }
            if (domain === 'bing.com' || domain.endsWith('.bing.com') || pretty === 'Bing') {
              icon = '🔵';
              label = 'Bing';
            }
            if (domain === 't.co' || domain.endsWith('.twitter.com') || domain === 'x.com' || domain.endsWith('.x.com') || pretty === 'Twitter/X') {
              icon = '🐦';
              label = 'Twitter/X';
            }
            if (domain === 'facebook.com' || domain.endsWith('.facebook.com') || domain === 'fb.com' || domain.endsWith('.fb.com') || pretty === 'Facebook') {
              icon = '🔵';
              label = 'Facebook';
            }

            const title = pretty || domain || 'Unknown';
            const safeLabel = label || title;

            return '<span title="' + title + '" style="display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border-radius:999px;border:1px solid #333;background:#1f1f1f;color:#cbd5e1;font-size:11px;line-height:1;white-space:nowrap;">'
              + '<span style="font-size:12px;">' + icon + '</span>'
              + '<span style="opacity:0.95;">' + safeLabel + '</span>'
              + '</span>';
          }
          const sources = Array.isArray(row.sources) ? row.sources : [];
          const srcHtml = sources.length > 0
            ? sources.slice(0, 2).map(sourceBadgeHtml).join(' ')
            : '<span title="No external referrer observed for this image yet" style="display:inline-flex;align-items:center;gap:6px;color:#666;font-size:11px;white-space:nowrap;">'
              + '<span style="font-size:12px;">🌐</span>'
              + '<span>Awaiting external referrer</span>'
              + '</span>';
          const chColor = row.chapter_views > 0 ? '#a78bfa' : '#333';
          const zmColor = row.xl_zooms > 0 ? '#06b6d4' : '#333';
          const unvTotal = row.unverified_views + row.external_views;
          const unvColor = unvTotal > 0 ? '#f59e0b' : '#333';
          // Row border color based on primary badge
          const borderColor = row.badges.includes('C') ? '#a78bfa44' : row.badges.includes('E') ? '#3b82f644' : '#f59e0b44';
          return '<a href="' + linkUrl + '" target="_blank" class="access-row" data-badges="' + row.badges.join(',') + '" data-country="' + (geoCountry || '') + '" data-region="' + ((geo?.region || '') + '') + '" data-city="' + ((geo?.city || '') + '') + '" style="display:grid;grid-template-columns:90px 220px 180px 90px 90px 90px auto;gap:10px;align-items:center;padding:8px 8px;border-bottom:1px solid #2a2a2a;border-left:3px solid ' + borderColor + ';text-decoration:none;transition:background 0.15s;" onmouseover="this.style.background=\'rgba(255,255,255,0.04)\'" onmouseout="this.style.background=\'transparent\'">' +
            '<div style="display:flex;align-items:center;justify-content:center;width:90px;">' +
              (imageId ? '<img src="https://k4studios.com/img/' + imageId + '/s" alt="" loading="' + (i < 6 ? 'eager' : 'lazy') + '" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px solid ' + p.bdr + ';">' : '<span style="width:80px;height:80px;display:flex;align-items:center;justify-content:center;background:#333;border-radius:6px;font-size:18px;border:1px solid ' + p.bdr + ';">🖼</span>') +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:4px;min-width:0;padding-left:14px;">' +
              '<div style="display:flex;align-items:center;gap:6px;min-width:0;">' +
                '<div style="display:flex;gap:2px;flex:0 0 auto;">' + badgeHtml + '</div>' +
                '<span style="color:' + p.text + ';font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;" title="' + row.image_id + '">' + row.image_id + '</span>' +
                (deviceIcons ? '<span style="flex:0 0 auto;">' + deviceIcons + '</span>' : '') +
              '</div>' +
            '</div>' +
            '<span style="color:' + locColor + ';font-size:13px;opacity:0.82;letter-spacing:0.2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + locationText + '">' + locationText + '</span>' +
            '<span style="display:flex;justify-content:center;font-weight:bold;color:' + chColor + ';font-size:14px;">' + (row.chapter_views || '—') + '</span>' +
            '<span style="display:flex;justify-content:center;font-weight:bold;color:' + zmColor + ';font-size:14px;">' + (row.xl_zooms || '—') + '</span>' +
            '<span style="display:flex;justify-content:center;font-weight:bold;color:' + unvColor + ';font-size:14px;">' + (unvTotal || '—') + '</span>' +
            '<div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + srcHtml + '</div>' +
          '</a>';
        }).join('') || '<p style="color: #555; font-size: 11px;">No image access data yet</p>'}
      </div>
      <p style="font-size: 9px; color: #555; margin-top: 6px;">C=JS-verified chapter · i=Image-only (no JS/cookie) · E=External embed · Source from referrer</p>
    </div>
    <!-- Galleries sidebar (always visible) -->
    <div class="section" style="max-height: none;">
      <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #c4b5fd; display: flex; align-items: center; justify-content: space-between;">
        <span>📁 Galleries</span>
        <span style="background: linear-gradient(135deg, #c4b5fd 0%, #a78bfa 100%); color: #1f2937; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold;">${artViewsSummary?.galleries || 0}</span>
      </h4>
      <div id="art-galleries-list" style="display: flex; flex-direction: column; gap: 6px; max-height: var(--k4-panel-list-max); overflow-y: auto; padding-right: 4px; scrollbar-gutter: stable;">
        ${((topArtViews?.galleries || []).length === 0)
          ? '<div style="color:#666;font-size:11px;padding:6px 2px;">No data yet</div>'
          : (topArtViews.galleries || []).map((a, i) => {
              const linkUrl = a.gallery_url ? 'https://k4studios.com' + a.gallery_url : '#';
              const devices = Array.isArray(a.devices) ? a.devices : [];
              function galleryDeviceIconsHtml(devs) {
                if (!Array.isArray(devs) || devs.length === 0) return '';
                const iconMap = { ios: '📱', android: '🅰️', mac: '🍎', windows: '🪟', linux: '🐧', desktop: '🖥️', mobile: '📱', tablet: '📱', unknown: '❓' };
                const labelMap = { ios: 'iOS', android: 'Android', mac: 'Mac', windows: 'Windows', linux: 'Linux', desktop: 'Desktop', mobile: 'Mobile', tablet: 'Tablet', unknown: 'Unknown' };
                const uniq = Array.from(new Set(devs.map(d => String(d || '').toLowerCase()).filter(Boolean)));
                const icons = uniq.slice(0, 3).map(d => {
                  const icon = iconMap[d] || '❓';
                  const label = labelMap[d] || d;
                  return '<span title="' + label + '" style="font-size:12px;">' + icon + '</span>';
                }).join('');
                return '<span title="Devices" style="display:inline-flex;align-items:center;gap:4px;opacity:0.85;">' + icons + '</span>';
              }
              const deviceIcons = galleryDeviceIconsHtml(devices);
              return '<a href="' + linkUrl + '" target="_blank" style="display: flex; align-items: center; gap: 8px; background: rgba(196, 181, 253, 0.1); border-radius: 6px; padding: 4px; border-left: 3px solid #c4b5fd; text-decoration: none; transition: background 0.2s;" onmouseover="this.style.background=\'rgba(196,181,253,0.25)\'" onmouseout="this.style.background=\'rgba(196,181,253,0.1)\'">' +
                '<span style="width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; background: #333; border-radius: 4px; font-size: 20px;">📁</span>' +
                '<div style="flex: 1; min-width: 0;">' +
                  '<div style="display:flex; align-items:center; gap:6px;">'
                    + '<div style="color: #c4b5fd; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; flex: 1; min-width: 0;" title="' + a.target_id + '">' + a.target_id + '</div>'
                    + (deviceIcons ? deviceIcons : '')
                  + '</div>' +
                  '<div style="display: flex; gap: 8px; margin-top: 2px;">' +
                    '<span style="font-size: 12px; font-weight: bold; color: #c4b5fd;">' + a.views + '</span>' +
                    '<span style="font-size: 11px; color: #888;">' + a.unique_viewers + ' 👤</span>' +
                  '</div>' +
                '</div>' +
              '</a>';
            }).join('')
        }
      </div>
    </div>

    <!-- Devices (moved up next to Galleries) -->
    <div class="section" style="max-height: none;">
      <div class="section-header">
        <h3>Devices</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Sessions and engagement by device. Engage Lvl shows how deeply each platform's users interact.</div></span>
      </div>
      <table>
        <tr><th>Platform</th><th>Sessions</th><th>Engage Lvl</th></tr>
        ${safeDeviceEngagement.map(d => {
          const icons = { ios: '📱', android: '🅰️', mac: '🍎', windows: '🪟', linux: '🐧', desktop: '🖥️', mobile: '📱', tablet: '📱', unknown: '❓' };
          const labels = { ios: 'iOS', android: 'Android', mac: 'Mac', windows: 'Windows', linux: 'Linux', desktop: 'Desktop', mobile: 'Mobile', tablet: 'Tablet', unknown: 'Unknown' };
          const engageColor = d.avg_depth >= 15 ? '#10b981' : d.avg_depth >= 8 ? '#f59e0b' : '#888';
          return `<tr><td>${icons[d.device] || '❓'} ${labels[d.device] || d.device}</td><td>${d.sessions}</td><td style="color:${engageColor};font-weight:bold;">${d.avg_depth}</td></tr>`;
        }).join('')}
        ${safeDeviceEngagement.length === 0 ? '<tr><td colspan="3">No data yet</td></tr>' : ''}
      </table>
    </div>
  </div>
  <script>
    function filterAccess(type) {
      document.querySelectorAll('#accessFilterBtns button').forEach(function(b) {
        if (type === 'all') {
          b.style.opacity = b.dataset.f === 'all' ? '1' : '0.7';
          b.style.fontWeight = b.dataset.f === 'all' ? 'bold' : 'normal';
        } else {
          b.style.opacity = b.dataset.f === type ? '1' : '0.4';
          b.style.fontWeight = b.dataset.f === type ? 'bold' : 'normal';
        }
      });
      document.querySelectorAll('.access-row').forEach(function(row) {
        if (type === 'all') { row.style.display = 'grid'; return; }
        var badges = row.dataset.badges.split(',');
        row.style.display = badges.includes(type) ? 'grid' : 'none';
      });
    }

    var accessLocationSortAsc = true;
    function sortAccessLocation() {
      var list = document.getElementById('accessOverviewList');
      if (!list) return;

      // first child is the sticky header
      var children = Array.prototype.slice.call(list.children);
      if (children.length <= 1) return;
      var header = children[0];
      var rows = children.slice(1).filter(function(el) { return el.classList && el.classList.contains('access-row'); });

      rows.sort(function(a, b) {
        function key(el) {
          var c = (el.dataset.country || '').toUpperCase();
          var r = (el.dataset.region || '').toUpperCase();
          var ci = (el.dataset.city || '').toUpperCase();
          return [c, r, ci].join('||');
        }
        var ka = key(a);
        var kb = key(b);
        if (ka < kb) return accessLocationSortAsc ? -1 : 1;
        if (ka > kb) return accessLocationSortAsc ? 1 : -1;
        return 0;
      });

      // Re-append in new order
      list.innerHTML = '';
      list.appendChild(header);
      rows.forEach(function(r) { list.appendChild(r); });

      accessLocationSortAsc = !accessLocationSortAsc;
      var hdr = document.getElementById('accessLocationHeader');
      if (hdr) hdr.style.opacity = '1';
    }
  </script>




  <!-- All sections grid -->\n  <div class="grid" style="margin-top: 20px;">
    <div class="section">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:2px;">
        <h3 style="margin:0;">Event Breakdown</h3>
        <button id="eventSortToggle" onclick="toggleEventSort()" title="Toggle sort: Alphabetical / By Count" style="
          font-size:10px; padding:2px 8px; border:1px solid #ccc; border-radius:4px;
          background:#f5f0eb; color:#666; cursor:pointer; font-family:monospace; letter-spacing:0.5px;
        ">A?Z</button>
      </div>
      <div id="eventList" style="padding-right: 6px;">
      ${allEvents.map(e => `
          <div class="bar-row" data-label="${e.label}" data-count="${e.count}">
            <span class="bar-label" title="${e.label}">${e.label}</span>
            <div class="bar-container">
              <div class="bar" style="width: ${(e.count / maxEventCount * 100).toFixed(1)}%"></div>
            </div>
            <span class="bar-value">${e.count}</span>
          </div>
        `).join('')
      }
      </div>
      <script>
        var eventSortMode = 'count';
        function toggleEventSort() {
          var btn = document.getElementById('eventSortToggle');
          var list = document.getElementById('eventList');
          var rows = Array.from(list.querySelectorAll('.bar-row'));
          if (eventSortMode === 'count') {
            rows.sort(function(a, b) { return a.dataset.label.localeCompare(b.dataset.label); });
            eventSortMode = 'alpha';
            btn.textContent = '#';
            btn.title = 'Sort by count';
          } else {
            rows.sort(function(a, b) { return parseInt(b.dataset.count) - parseInt(a.dataset.count); });
            eventSortMode = 'count';
            btn.textContent = 'A?Z';
            btn.title = 'Sort alphabetically';
          }
          rows.forEach(function(r) { list.appendChild(r); });
        }
      </script>
    </div>

    <!-- Viewer Geography -->
    <div class="section">
      <div class="section-header">
        <h3>🗺️ Viewer Geography</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">On-site = JS-verified humans browsing galleries/images. External = where hotlinked images are served (CDN edge geo, approximate).</div></span>
      </div>
      ${(() => {
        const countryColors = {
          'US': '#3b82f6', 'FR': '#ef4444', 'DE': '#f97316', 'BR': '#22c55e', 'GB': '#6366f1',
          'CA': '#ec4899', 'AU': '#eab308', 'MX': '#14b8a6', 'IN': '#f59e0b', 'JP': '#e11d48',
          'IT': '#84cc16', 'ES': '#a855f7', 'NL': '#fb923c', 'AT': '#dc2626', 'HU': '#c026d3',
          'SG': '#0ea5e9', 'HK': '#d946ef', 'CN': '#b91c1c', 'KR': '#2563eb', 'CO': '#fbbf24',
          'PL': '#f43f5e', 'SE': '#06b6d4', 'NO': '#0284c7', 'FI': '#0369a1', 'CH': '#dc2626',
          'RU': '#1d4ed8', 'UA': '#fcd34d', 'AR': '#60a5fa', 'ZA': '#a78bfa', 'NZ': '#2dd4bf',
          'PT': '#e879f9', 'CG': '#f472b6', 'CL': '#38bdf8', 'PE': '#fbbf24', 'IE': '#4ade80',
          'BE': '#facc15', 'CZ': '#7dd3fc', 'DK': '#ef4444', 'GR': '#0ea5e9', 'IL': '#6366f1',
          'TW': '#d946ef', 'TH': '#f97316', 'PH': '#8b5cf6', 'TR': '#dc2626', 'RO': '#fde047',
        };
        function countryColor(code) {
          if (countryColors[code]) return countryColors[code];
          if (!code) return '#9ca3af';
          let h = 0; for (let i = 0; i < code.length; i++) h = code.charCodeAt(i) * 31 + h;
          const hue = Math.abs(h) % 360;
          return 'hsl(' + hue + ', 70%, 55%)';
        }
        function renderGeoRows(items, maxCount, colorFn) {
          return items.map(g => {
            const barColor = colorFn(g.country);
            return '<div class="bar-row"><span class="bar-label" title="' + g.label + '">' + g.label + '</span><div class="bar-container"><div class="bar" style="width: ' + (g.count / maxCount * 100).toFixed(1) + '%; background: ' + barColor + ';"></div></div><span class="bar-value">' + g.count + '</span></div>';
          }).join('');
        }

        // On-site: JS-verified art viewers (chapter_view + gallery_view)
        const onsiteGeo = (artViewsSummary?.geography || []).map(g => ({
          label: [g.city, g.region, g.country].filter(Boolean).join(', '),
          country: g.country, count: g.unique_viewers
        }));
        // Site visitors from events table
        const siteGeo = (geo || []).map(g => ({
          label: [g.city, g.region, g.country].filter(Boolean).join(', '),
          country: g.country, count: g.visitors
        }));
        // Merge on-site art viewers + site visitors, dedup by label, take max count
        const mergedOnsite = {};
        [...onsiteGeo, ...siteGeo].forEach(g => {
          if (!mergedOnsite[g.label]) mergedOnsite[g.label] = { ...g };
          else mergedOnsite[g.label].count = Math.max(mergedOnsite[g.label].count, g.count);
        });
        const onsiteRows = Object.values(mergedOnsite).sort((a, b) => b.count - a.count).slice(0, 12);
        const onsiteMax = Math.max(...onsiteRows.map(g => g.count), 1);

        // External reach (non-JS traffic: bots, bounces, blocked JS)
        const extGeo = (externalReachGeo || []).map(g => ({
          label: [g.city, g.region, g.country].filter(Boolean).join(', '),
          country: g.country, count: g.hits
        }));
        const extMax = Math.max(...extGeo.map(g => g.count), 1);

        let html = '';
        // On-site section
        html += '<div style="margin-bottom: 4px; font-size: 11px; font-weight: 600; color: #d1d5db;">👤 On-Site Visitors</div>';
        if (onsiteRows.length > 0) {
          html += '<div style="padding-right: 6px; margin-bottom: 12px;">' + renderGeoRows(onsiteRows, onsiteMax, countryColor) + '</div>';
        } else {
          html += '<p style="color:#666; margin-bottom: 12px;">No on-site data yet</p>';
        }
        // External section (non-JS traffic — separate population)
        html += '<div style="margin-bottom: 4px; font-size: 11px; font-weight: 600; color: #f59e0b;">🌐 External Reach <span style="font-weight: normal; font-size: 10px; opacity: 0.7;">(non-JS traffic)</span></div>';
        if (extGeo.length > 0) {
          html += '<div style="padding-right: 6px; margin-bottom: 12px;">' + renderGeoRows(extGeo, extMax, (c) => '#f59e0b') + '</div>';
        } else {
          html += '<p style="color:#666; margin-bottom: 12px;">No external data yet</p>';
        }
        // External sources
        if ((externalReachSources || []).length > 0) {
          html += '<div style="margin-bottom: 4px; font-size: 11px; font-weight: 600; color: #f59e0b;">📡 External Sources <span style="font-weight: normal; font-size: 10px; opacity: 0.7;">(non-JS traffic)</span></div>';
          const srcIcons = { 'Google Search': '🔍', 'Google Images': '🖼️', 'Bing': '🔍', 'Twitter/X': '🐦', 'Facebook': '📘', 'Pinterest': '📌', 'DuckDuckGo': '🦆', 'ChatGPT': '🧠', 'Yandex': '🔍', 'Baidu': '🔍', 'Direct': '🔗', 'Internal': '🏠', 'Other': '🌐' };
          html += '<div style="display: flex; flex-direction: column; gap: 3px;">';
          for (const s of externalReachSources) {
            const icon = srcIcons[s.source] || '🌐';
            html += '<div style="display: flex; align-items: center; gap: 6px; padding: 3px 6px; background: #1a1a1a; border-radius: 4px;">' +
              '<span style="font-size: 14px;">' + icon + '</span>' +
              '<span style="color: #ccc; font-size: 11px; flex: 1;">' + s.source + '</span>' +
              '<span style="color: #f59e0b; font-size: 11px; font-weight: bold;">' + s.hits + '</span>' +
            '</div>';
          }
          html += '</div>';
        }
        return html;
      })()}
    </div>

    <div class="section">
      <div class="section-header" style="margin-bottom: ${edgeEvents.length === 0 && edgeSummary.length === 0 ? '0' : '12px'};">
        <h3 style="display: inline;">🧭 Index Health</h3>
        ${edgeEvents.length === 0 && edgeSummary.length === 0 ? '<span style="color:#666; margin-left: 12px;">No edge events yet</span>' : ''}
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Edge events: 301 redirects (canonical fixes), 410 Gone (removed content), 404 fallbacks. Healthy sites show these tapering over time.</div></span>
      </div>
      ${edgeSummary.length > 0 ? `
      <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
        ${edgeSummary.map(s => {
          const typeColors = { 
            smart404_redirect: '#10b981', 
            smart404_gone: '#f59e0b', 
            smart404_fallback: '#ef4444',
            smart404_homepage: '#a855f7',
            '301': '#10b981',
            '302': '#10b981',
            '410': '#f59e0b',
            '404': '#ef4444'
          };
          const typeLabels = {
            smart404_redirect: '301',
            smart404_gone: '410',
            smart404_fallback: '404',
            smart404_homepage: 'Home',
            '301': '301',
            '302': '302',
            '410': '410',
            '404': '404'
          };
          const color = typeColors[s.event_type] || '#888';
          const label = typeLabels[s.event_type] || s.event_type;
          return `<span style="background: ${color}22; color: ${color}; padding: 4px 10px; border-radius: 12px; font-size: 11px;">${label}: ${s.total} <span style="opacity:0.7">(🤖${s.bot_hits} 👤${s.human_hits})</span></span>`;
        }).join('')}
      </div>
      ` : ''}
      ${edgeEvents.length > 0 ? `
      <div>
        ${edgeEvents.map(e => {
          const eventColors = { 
            smart404_redirect: '#10b981',
            smart404_gone: '#f59e0b',
            smart404_fallback: '#ef4444',
            smart404_homepage: '#a855f7',
            '301': '#10b981',
            '302': '#10b981',
            '410': '#f59e0b',
            '404': '#ef4444'
          };
          const eventLabels = {
            smart404_redirect: '301',
            smart404_gone: '410',
            smart404_fallback: '404',
            smart404_homepage: 'Home',
            '301': '301',
            '302': '302',
            '410': '410',
            '404': '404'
          };
          const color = eventColors[e.event_type] || '#888';
          const label = eventLabels[e.event_type] || e.event_type;
          const shortPath = e.path && e.path.length > 40 ? '...' + e.path.slice(-37) : (e.path || 'unknown');
          const botIcon = e.is_bot ? '🤖' : '👤';
          return `
          <div style="display: flex; align-items: center; padding: 6px 0; border-bottom: 1px solid #333; gap: 8px;">
            <span style="background: ${color}22; color: ${color}; padding: 2px 8px; border-radius: 8px; font-size: 10px; flex-shrink: 0;">${label}</span>
            <span style="flex: 1; color: #ccc; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${e.path || ''}">${shortPath}</span>
            <span style="font-size: 11px;">${botIcon}</span>
            <span style="color: #888; font-size: 12px; font-weight: bold;">${e.hits}</span>
          </div>
        `}).join('')}
      </div>
      ` : ''}
    </div>

    <div class="section">
      <h3>Top 10 Pages</h3>
      ${pages.length === 0 ? '<p style="color:#666">No data yet</p>' : 
        pages.map(p => {
          const shortPath = p.page_path.length > 28 ? '...' + p.page_path.slice(-25) : p.page_path;
          return `
          <div class="bar-row">
            <a class="bar-label" href="https://www.k4studios.com${p.page_path}" target="_blank" title="${p.page_path}" style="color: #4a9eff; text-decoration: none;">${shortPath}</a>
            <div class="bar-container">
              <div class="bar" style="width: ${(p.sessions / maxPageSessions * 100).toFixed(1)}%"></div>
            </div>
            <span class="bar-value">${p.sessions}</span>
          </div>
        `}).join('')
      }
    </div>

    <div class="section">
      <div class="section-header">
        <h3>? Top Entry Pages</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">First page visited in each session. 🔍=Google Search, 🖼️=Images, 🅱️=Bing, 📌=Pinterest, 🐦=Twitter, 📘=Facebook, 🔗=Direct, 🔄=Internal</div></span>
      </div>
      ${entryPages.length === 0 ? '<p style="color:#666">No data yet</p>' : `
      <table>
        <tr><th>Page</th><th>From</th><th>Sess</th></tr>
        ${entryPages.slice(0, 15).map(p => {
          const isImage = p.page_path.includes('/i-');
          const shortPath = p.page_path.length > 30 ? '...' + p.page_path.slice(-27) : p.page_path;
          const pageIcon = isImage ? '🖼️' : '📄';
          const refIcons = { 
            google_search: '🔍', google_images: '🖼️', 
            bing_search: '🅱️', bing_images: '🖼️', 
            pinterest: '📌', twitter: '🐦', facebook: '📘', instagram: '📷', 
            linkedin: '💼', duckduckgo: '🦆',
            direct: '🔗', internal: '🔄', unattributed: '🔒' 
          };
          const refIcon = refIcons[p.ref_source] || '🔒';
          return `<tr><td title="${p.page_path}">${pageIcon} ${shortPath}</td><td title="${p.ref_source}">${refIcon}</td><td>${p.sessions}</td></tr>`;
        }).join('')}
      </table>
      `}
    </div>

    <div class="section">
      <h3>Gallery-Chapter Entry Points</h3>
      <table>
        <tr><th>Source</th><th>Sessions</th></tr>
        ${entries.map(e => `<tr><td>${formatEventName(e.entry_source)}</td><td>${e.sessions}</td></tr>`).join('')}
        ${entries.length === 0 ? '<tr><td colspan="2">No data yet</td></tr>' : ''}
      </table>
    </div>

    <div class="section">
      <div class="section-header">
        <h3>Gallery Performance</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Image views grouped by gallery. Colors: 🟣 Painterly, 🔵 Traditional, 🟠 K4 Select</div></span>
      </div>
      <table>
        <tr><th>Gallery</th><th>Sess</th><th>Zoom%</th><th>Avg</th></tr>
        ${galleries.map(g => {
          const typeColors = { painterly: '#a855f7', traditional: '#4a9eff', select: '#f59e0b' };
          const color = typeColors[g.gallery_type] || '#888';
          return `<tr>
            <td style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; flex-shrink: 0;"></span>
              ${formatEventName(g.gallery_id || 'Unknown')}
            </td>
            <td>${g.sessions}</td>
            <td>${g.zoom_pct || 0}%</td>
            <td>${g.avg_events || 0}</td>
          </tr>`;
        }).join('')}
        ${galleries.length === 0 ? '<tr><td colspan="4">No data yet</td></tr>' : ''}
      </table>
    </div>

    <div class="section">
      <h3>🎨 Top 10 Themes Clicked</h3>
      ${themesClicked.length === 0 ? '<p style="color:#666">No theme clicks yet</p>' : `
      <table>
        <tr><th>Theme</th><th>Sessions</th><th>Clicks</th></tr>
        ${themesClicked.map(t => `
          <tr>
            <td>${formatEventName(t.theme || 'Unknown')}</td>
            <td>${t.sessions}</td>
            <td>${t.clicks}</td>
          </tr>
        `).join('')}
      </table>
      `}
    </div>

    <div class="section">
      <div class="section-header">
        <h3>🚪 Where People Leave</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Exit pages: where sessions ended. Shows which page types are natural endpoints vs potential problems.</div></span>
      </div>
      <div class="exit-grid">
        <div class="exit-block" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);">
          <span class="value">🏠 ${exitByCategory.home || 0}</span>
          <span class="label" style="color: #c7d2fe;">Home</span>
        </div>
        <div class="exit-block" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
          <span class="value">📁 ${exitByCategory.gallery || 0}</span>
          <span class="label" style="color: #a7f3d0;">Gallery</span>
        </div>
        <div class="exit-block" style="background: linear-gradient(135deg, #4a9eff 0%, #2563eb 100%);">
          <span class="value">📖 ${exitByCategory.images || 0}</span>
          <span class="label" style="color: #bfdbfe;">Images</span>
        </div>
        <div class="exit-block" style="background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);">
          <span class="value">📄 ${exitByCategory.landing || 0}</span>
          <span class="label" style="color: #ddd6fe;">Landing</span>
        </div>
        <div class="exit-block" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
          <span class="value">🏠 ${exitByCategory.blog || 0}</span>
          <span class="label" style="color: #fef3c7;">Blog</span>
        </div>
        <div class="exit-block" style="background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);">
          <span class="value">📸 ${exitByCategory.photoshoots || 0}</span>
          <span class="label" style="color: #fbcfe8;">Shoots</span>
        </div>
        <div class="exit-block" style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); grid-column: span 2;">
          <span class="value">📦 ${exitByCategory.other || 0}</span>
          <span class="label" style="color: #d1d5db;">Other</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Bot Intelligence Section -->
  <div style="max-width: 1780px; margin: 0 auto;">
  <h2 style="margin-top: 30px;">🛡️ Bot Intelligence <span style="font-size: 12px; color: #888; font-weight: normal;">(Threat Classification)</span></h2>
  <p style="color: #888; margin: -10px 0 15px 0; font-size: 12px;">
    Risk accumulates over time. Level 3 = high risk (review). Level 4 = block candidate (enough evidence to block).
    <button onclick="refreshBotIntelligence()" style="margin-left: 10px; background: #333; color: #888; border: 1px solid #555; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">🔄 Refresh</button>
  </p>
  
  <!-- Risk Summary Pills -->
  <div class="pulse" style="margin-bottom: 15px;">
    <div class="pulse-stat" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
      <span class="value" style="color: #fff;">🟢 ${botIntelligence?.verified?.length || 0}</span>
      <span class="label" style="color: #a7f3d0;">Verified Bots <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #a7f3d0;">i</span></span>
      <div class="tooltip">Confirmed search engine bots (Googlebot, Bingbot, etc). Good traffic - they index your art for image search!</div>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);">
      <span class="value" style="color: #1f2937;">🟡 ${Math.max(0, (botIntelligence?.stats?.total ?? 0) - (botIntelligence?.stats?.risk3 ?? 0) - (botIntelligence?.stats?.risk4 ?? 0))}</span>
      <span class="label" style="color: #422006;">Watching <span class="info-icon" style="background: rgba(0,0,0,0.15); color: #422006;">i</span></span>
      <div class="tooltip"><strong>Risk score 2-4.</strong> Slightly suspicious behavior but not aggressive. Could be a curious human or a polite bot. Monitoring only.</div>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);">
      <span class="value" style="color: #fff;">🟠 ${botIntelligence?.stats?.risk3 || 0}</span>
      <span class="label" style="color: #fed7aa;">High Risk <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #fed7aa;">i</span></span>
      <div class="tooltip"><strong>Risk score 5-7.</strong> High-confidence scraper. Monitoring only — no automatic enforcement. Review and manually block if needed. Triggers: no referrer + high volume, no branching, datacenter IP, multi-day presence.</div>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #d946ef 0%, #a855f7 100%);">
      <span class="value" style="color: #fff;">🟣 ${botIntelligence?.stats?.risk4 || 0}</span>
      <span class="label" style="color: #f5d0fe;">Block Candidates <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #f5d0fe;">i</span></span>
      <div class="tooltip"><strong>Level 4 (top tier).</strong> Strong evidence of automation/scraping at meaningful volume (not a one-off). This level is intended to mean: <em>you have enough info to block</em>. If something lands here and looks like a real human, that's a grading bug — leave it unblocked and we should tighten the rules.</div>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
      <span class="value" style="color: #fff;"><span style="text-shadow: 0 0 2px #000, 0 0 4px #000;">⊖</span> ${botIntelligence?.blocked?.filter(b => b.is_active)?.length || 0}</span>
      <span class="label" style="color: #fecaca;">Blocked <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #fecaca;">i</span></span>
      <div class="tooltip">Manually blocked IPs. Returns 403 Forbidden. Can unblock from Blocked IPs section below.</div>
    </div>
  </div>

  <div class="bot-intel-grid" style="display: grid; grid-template-columns: 580px 580px 580px; gap: 16px; width: fit-content; margin: 0 auto;">
    <!-- Verified Search Bots (Good!) -->
    <div class="section" style="border: 1px solid #10b98133;">
      <h3 style="color: #10b981;">🟢 Verified Search Bots</h3>
      <p style="color: #888; font-size: 10px; margin: -5px 0 10px 0;">Search engines indexing your art for Google/Bing Images!</p>
      ${(botIntelligence?.verified || []).length === 0 ? '<p style="color:#666">No verified bots detected yet</p>' : 
      '<div style="max-height: 300px; overflow-y: auto;">' +
        (botIntelligence?.verified || []).map(v => {
          const botIcons = {
            'googlebot': '🔍',
            'bingbot': '🅱️', 
            'applebot': '🍎',
            'duckduckbot': '🦆',
            'yandex': '🇷🇺',
            'baidu': '🇨🇳',
            'facebook': '📘',
            'twitter': '🐦',
            'pinterest': '📌',
            'linkedin': '💼',
            'openai': '🌀',
            'claude': '🧠',
          };
          const icon = botIcons[v.bot_name?.toLowerCase()] || '🤖';
          const displayName = v.bot_name ? v.bot_name.charAt(0).toUpperCase() + v.bot_name.slice(1) : 'Unknown';
          const imgCount = v.image_count || 0;
          const pgCount = v.page_count || 0;
          const breakdown = imgCount > 0 || pgCount > 0 
            ? '🖼️ ' + imgCount + ' images, 📄 ' + pgCount + ' pages'
            : v.total_requests + ' requests';
          return '<div style="display: flex; align-items: center; padding: 8px; margin-bottom: 6px; background: #10b98111; border-radius: 6px; gap: 10px;">' +
            '<span style="font-size: 18px;">' + icon + '</span>' +
            '<div style="flex: 1;">' +
              '<div style="color: #10b981; font-weight: bold; font-size: 12px;">' + displayName + '</div>' +
              '<div style="color: #888; font-size: 10px;">' + breakdown + '</div>' +
            '</div>' +
            '<span style="color: #666; font-size: 10px;">' + (v.country || '') + '</span>' +
          '</div>';
        }).join('') +
      '</div>'
      }
    </div>

    <!-- Suspected Bots (Risk 2+) -->
    <div class="section">
      <h3>🎯 High-Risk Watchlist</h3>
      ${(botIntelligence?.suspects || []).length === 0 ? '<p style="color:#666">No suspicious IPs detected yet</p>' : `
      <div style="max-height: 400px; overflow-y: auto;">
        <table style="width: 100%; font-size: 11px;">
          <tr style="position: sticky; top: 0; background: #252525;">
            <th style="text-align: left; padding: 4px;">Risk</th>
            <th style="text-align: left; padding: 4px;">IP Hash</th>
            <th style="text-align: right; padding: 4px;">Reqs</th>
            <th style="text-align: left; padding: 4px;">Rules</th>
            <th style="text-align: center; padding: 4px;">Days</th>
            <th style="text-align: center; padding: 4px;">Action</th>
          </tr>
          ${(botIntelligence?.suspects || []).filter(s => s.risk_level >= 2 && s.status !== 'blocked').map(s => {
            const riskColors = { 1: '#10b981', 2: '#fbbf24', 3: '#f97316', 4: '#a855f7' };
            const riskIcons = { 1: '🟢', 2: '🟡', 3: '🟠', 4: '🟣' };
            const rules = JSON.parse(s.rules_triggered || '[]');
            const rulesShort = rules.slice(0, 2).map(r => r.replace(/_/g, ' ').slice(0, 12)).join(', ');
            const isBlocked = s.status === 'blocked';
            const riskColor = riskColors[s.risk_level];
            const riskIcon = riskIcons[s.risk_level];
            const rowStyle = isBlocked ? 'opacity: 0.5;' : '';
            const reqColor = s.total_requests > 100 ? '#ef4444' : '#888';
            const daysColor = s.days_seen > 2 ? '#f97316' : '#888';
            const actionHtml = isBlocked 
              ? '<span style="color: #666;">Blocked</span>'
              : "<button onclick=\"blockIP('" + s.ip_hash + "')\" style=\"background: #dc2626; color: white; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;\">Block</button>";
            return '<tr style="border-bottom: 1px solid #333; '+rowStyle+'">' +
              '<td style="padding: 6px 4px;"><span style="background: '+riskColor+'22; color: '+riskColor+'; padding: 2px 6px; border-radius: 8px; font-weight: bold;">'+riskIcon+' '+s.risk_level+'</span></td>' +
              '<td style="padding: 6px 4px; font-family: monospace; font-size: 10px;">'+s.ip_hash+'<span style="color: #666; margin-left: 4px;">'+(s.country || '')+'</span></td>' +
              '<td style="padding: 6px 4px; text-align: right; font-weight: bold; color: '+reqColor+';">'+s.total_requests+'</td>' +
              '<td style="padding: 6px 4px; color: #888; font-size: 10px;" title="'+rules.join(', ')+'">'+rulesShort+(rules.length > 2 ? '...' : '')+'</td>' +
              '<td style="padding: 6px 4px; text-align: center;"><span style="color: '+daysColor+';">'+s.days_seen+'</span></td>' +
              '<td style="padding: 6px 4px; text-align: center;">'+actionHtml+'</td>' +
            '</tr>';
          }).join('')}
        </table>
      </div>
      `}
    </div>

    <!-- Blocked IPs Archive -->
    <div class="section">
      <h3>⊖ Blocked IPs <span style="font-size: 11px; color: #666; font-weight: normal;">(Archive)</span></h3>
      ${(botIntelligence?.blocked || []).length === 0 ? '<p style="color:#666">No blocked IPs yet</p>' : `
      <div style="max-height: 400px; overflow-y: auto;">
        <table style="width: 100%; font-size: 11px;">
          <tr style="position: sticky; top: 0; background: #252525;">
            <th style="text-align: left; padding: 4px;">Status</th>
            <th style="text-align: left; padding: 4px;">IP Hash</th>
            <th style="text-align: right; padding: 4px;">Reqs</th>
            <th style="text-align: left; padding: 4px;">Blocked</th>
            <th style="text-align: center; padding: 4px;">Action</th>
          </tr>
          ${(botIntelligence?.blocked || []).map(b => {
            const isActive = b.is_active === 1;
            const blockedDate = b.blocked_at ? new Date(b.blocked_at).toLocaleDateString() : '-';
            const rowStyle = !isActive ? 'opacity: 0.4;' : '';
            const statusBg = isActive ? '#dc262622' : '#37415122';
            const statusColor = isActive ? '#ef4444' : '#6b7280';
            const statusText = isActive ? '⛔ Active' : '✓ Unblocked';
            const actionHtml = isActive 
              ? "<button onclick=\"unblockIP('" + b.ip_hash + "')\" style=\"background: #374151; color: #9ca3af; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;\">Unblock</button>"
              : '<span style="color: #666;">—</span>';
            return '<tr style="border-bottom: 1px solid #333; '+rowStyle+'">' +
              '<td style="padding: 6px 4px;"><span style="background: '+statusBg+'; color: '+statusColor+'; padding: 2px 6px; border-radius: 8px; font-size: 10px;">'+statusText+'</span></td>' +
              '<td style="padding: 6px 4px; font-family: monospace; font-size: 10px;">'+b.ip_hash+'</td>' +
              '<td style="padding: 6px 4px; text-align: right; color: #888;">'+(b.total_requests || '-')+'</td>' +
              '<td style="padding: 6px 4px; color: #666; font-size: 10px;">'+blockedDate+'</td>' +
              '<td style="padding: 6px 4px; text-align: center;">'+actionHtml+'</td>' +
            '</tr>';
          }).join('')}
        </table>
      </div>
      `}
    </div>
  </div>
  </div>

  <p style="margin-top: 30px; color: #666; font-size: 12px; max-width: 1780px; margin-left: auto; margin-right: auto;">
    Generated ${new Date().toISOString()} — ${periodLabel}
  </p>

  <script>
    // Art Views filter state - all on by default
    const artFilters = { image_page: true, xl_zoom: true, gallery: true, external_image: true };
    
    function toggleArtFilter(type) {
      artFilters[type] = !artFilters[type];
      
      // Update button appearance
      const btn = document.querySelector('.pulse-stat[data-filter="' + type + '"]');
      if (btn) {
        btn.classList.toggle('off', !artFilters[type]);
      }
      
      // Filter the art items
      document.querySelectorAll('.art-item').forEach(item => {
        const itemType = item.dataset.type;
        // For legacy 'image' type, map to xl_zoom
        const filterKey = itemType === 'image' ? 'xl_zoom' : itemType;
        if (artFilters[filterKey] === false) {
          item.style.display = 'none';
        } else {
          item.style.display = 'flex';
        }
      });
    }

    // Bot Intelligence functions
    async function blockIP(ipHash) {
      if (!confirm('Block IP: ' + ipHash + '?\\n\\nThis will take effect immediately.')) return;
      
      try {
        const res = await fetch('/__k4stats/block', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip_hash: ipHash, reason: 'Manual block from dashboard' })
        });
        
        if (res.ok) {
          alert('IP blocked successfully');
          location.reload();
        } else {
          const data = await res.json();
          alert('Error: ' + (data.error || 'Unknown error'));
        }
      } catch (e) {
        alert('Error: ' + e.message);
      }
    }

    async function unblockIP(ipHash) {
      if (!confirm('Unblock IP: ' + ipHash + '?')) return;
      
      try {
        const res = await fetch('/__k4stats/unblock', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip_hash: ipHash })
        });
        
        if (res.ok) {
          alert('IP unblocked successfully');
          location.reload();
        } else {
          const data = await res.json();
          alert('Error: ' + (data.error || 'Unknown error'));
        }
      } catch (e) {
        alert('Error: ' + e.message);
      }
    }

    async function refreshBotIntelligence() {
      try {
        const res = await fetch('/__k4stats/refresh-bots', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (res.ok) {
          const data = await res.json();
          alert('Bot intelligence refreshed. Updated ' + (data.updated || 0) + ' IPs.');
          location.reload();
        } else {
          const data = await res.json();
          alert('Error: ' + (data.error || 'Unknown error'));
        }
      } catch (e) {
        alert('Error: ' + e.message);
      }
    }
  </script>
</div>
</body>
</html>`;
}
