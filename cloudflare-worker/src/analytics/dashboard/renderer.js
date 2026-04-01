// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD RENDERER (Phase 4 — pure HTML generation)
// Accepts assembled dashboardData object, returns HTML string.
// NO DB access, NO env usage, NO filter logic — rendering only.
// ═══════════════════════════════════════════════════════════════════════════

export function renderDashboard({ days, yesterday, selectedDate, galleryFilter, excludeIp, viewerIp, summary, newVisitors, returningVisitors, cowboyJumps, events, galleries, referrers, geo, trend, devices, pages, images, uniqueImagesViewed, totalImageSessions, totalImageViews, themesClicked, topDepthSessions, minEngagement, maxEngagement, avgDepthScore, deepSessionPct, deepSessions, totalSessions, exitPages, exitSummary, exitByCategory, botPct, botSessions, hideBots, hideChardon, edgeEvents, edgeSummary, edgeSuppression, entryPages, entryRefCounts, imagePageViewsFromEvents, imageEntrySessionsFromEvents, bounceRate, avgDurationFormatted, peakHours, deviceEngagement, artViewsSummary, artViewsByType, topArtViews, externalReachGeo, externalReachSources, botIntelligence, blockRecommendedCount }) {
  const s = summary || {};
  
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
    // zoom_open is intentionally omitted: redundant with the XL Zooms metric above

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
  const maxPageSessions = Math.max(...pages.map(p => Number(p.views || p.events || p.sessions || 0)), 1);
  const trendArr = Array.isArray(trend) ? trend : [];
  const selectedTrend = selectedDate ? trendArr.find((d) => d?.day === selectedDate) || null : null;
  const todayTrend = selectedTrend || (trendArr.length > 0 ? trendArr[trendArr.length - 1] : null);
  const siteVisitorsToday = todayTrend?.visitors || 0;
  const nonPersistentActorsToday = todayTrend?.non_persistent_actors || 0;
  const estimatedTrafficActorsToday = siteVisitorsToday + nonPersistentActorsToday;
  const nonPersistentShareToday = estimatedTrafficActorsToday > 0 ? Math.round(nonPersistentActorsToday / estimatedTrafficActorsToday * 100) : 0;
  
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
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>K4 Analytics</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a1a; color: #e0e0e0; padding: 20px; }
    .container { max-width: 1800px; margin: 0 auto; }
    h1 { color: #fff; margin-bottom: 20px; }
    h2 { color: #888; font-size: 14px; text-transform: uppercase; margin: 20px 0 10px; }
    .controls { margin-bottom: 15px; display: flex; flex-wrap: wrap; gap: 5px; }
    .controls a { color: #4a9eff; text-decoration: none; padding: 5px 10px; border-radius: 4px; }
    .controls a:hover, .controls a.active { background: #333; }
    .pulse { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
    .pulse .pulse-stat { flex: 1; justify-content: center; }
    .pulse-row { display: flex; gap: 8px; margin-bottom: 10px; align-items: center; }
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
    /* Custom scrollbar for art lists */
    #art-images-list::-webkit-scrollbar, #art-galleries-list::-webkit-scrollbar { width: 6px; }
    #art-images-list::-webkit-scrollbar-track, #art-galleries-list::-webkit-scrollbar-track { background: #1a1a1a; border-radius: 3px; }
    #art-images-list::-webkit-scrollbar-thumb, #art-galleries-list::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
    #art-images-list::-webkit-scrollbar-thumb:hover, #art-galleries-list::-webkit-scrollbar-thumb:hover { background: #555; }
    table { width: 100%; border-collapse: collapse; background: #252525; border-radius: 8px; overflow: hidden; margin-bottom: 15px; }
    th, td { padding: 5px 8px; text-align: left; border-bottom: 1px solid #333; font-size: 12px; }
    th { background: #1a1a1a; color: #888; font-size: 12px; text-transform: uppercase; }
    tr:last-child td { border-bottom: none; }
    /* Main grid - fixed 5-column layout, centered */
    .grid, .grid-tall { display: grid; grid-template-columns: repeat(5, 348px); gap: 10px; margin: 0 auto 10px auto; width: fit-content; }
    .section { background: #252525; border-radius: 8px; padding: 10px; overflow: visible; }
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
      .bar-label { width: 80px; font-size: 10px; }
      .controls { gap: 3px; }
      .controls a { font-size: 10px; padding: 4px 6px; }
      .exit-grid { grid-template-columns: 1fr; }
      .bot-intel-grid { grid-template-columns: 1fr !important; }
    }
    /* Trend chart styles */
    .trend-chart { background: #252525; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
    .trend-chart h3 { color: #fff; font-size: 14px; margin-bottom: 15px; }
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
    .ip-filter { margin-left: auto; display: flex; gap: 10px; align-items: center; }
    .ip-filter a { font-size: 12px; }
    .ip-filter .exclude-active { background: #7c3aed; color: #fff; }
    .ip-filter .bot-filter { background: #4b5563; color: #fff; }
    .ip-filter .bot-filter.active { background: #059669; }
    .ip-badge { font-size: 11px; color: #888; background: #333; padding: 3px 8px; border-radius: 4px; }
    .mini-btn { font-size: 10px; padding: 3px 8px; border: 1px solid #444; border-radius: 6px; background: #1a1a1a; color: #ccc; cursor: pointer; }
    .mini-btn:hover { background: #333; }
    .k4-lazy .k4-section-body { display: none; margin-top: 8px; }
    .k4-lazy.open .k4-section-body { display: block; }
    .k4-section-toggle { margin-left: auto; }
    .k4-section-placeholder { color: #666; font-size: 11px; padding: 6px 0; }
    .k4-pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; }
    .k4-pill-danger { background: #3f1010; color: #fecaca; border: 1px solid #7f1d1d; }
    .k4-overlay { display:none; position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,.75); justify-content:center; align-items:center; }
    .k4-overlay.open { display:flex; }
    .k4-overlay-box { background:#1a1a1a; border:1px solid #333; border-radius:10px; width:90vw; max-width:900px; max-height:85vh; display:flex; flex-direction:column; box-shadow:0 8px 32px rgba(0,0,0,.6); }
    .k4-overlay-hdr { display:flex; justify-content:space-between; align-items:center; padding:10px 16px; border-bottom:1px solid #333; }
    .k4-overlay-hdr h2 { margin:0; font-size:14px; color:#bbb; }
    .k4-overlay-close { background:none; border:none; color:#888; font-size:20px; cursor:pointer; padding:0 4px; }
    .k4-overlay-close:hover { color:#fff; }
    .k4-overlay-body { overflow-y:auto; padding:12px 16px; flex:1; }
    .k4-overlay-body pre { white-space:pre-wrap; word-break:break-word; margin:0; font-family:ui-monospace,Consolas,monospace; font-size:12px; line-height:1.6; color:#ddd; }
  </style>
</head>
<body>
<div class="container">
  <h1>K4 Analytics <a href="https://www.k4studios.com/__k4serp" target="_blank" style="font-size:14px;color:#4a9eff;text-decoration:none;margin-left:20px">📊 SERP</a> <a href="https://www.k4studios.com/__k4serp?op=launch" target="_blank" style="font-size:14px;color:#4a9eff;text-decoration:none">🚀 Launch Pad</a></h1>
  
  <div class="controls">
    <a href="?days=1${excludeIp ? '&excludeIp=' + excludeIp : ''}${hideBots ? '&hideBots=1' : ''}${hideChardon ? '&hideChardon=1' : ''}" class="${days === 1 && !yesterday ? 'active' : ''}">Today*</a>
    <a href="?yesterday=1${excludeIp ? '&excludeIp=' + excludeIp : ''}${hideBots ? '&hideBots=1' : ''}${hideChardon ? '&hideChardon=1' : ''}" class="${yesterday ? 'active' : ''}">Yesterday*</a>
    <a href="?days=7${excludeIp ? '&excludeIp=' + excludeIp : ''}${hideBots ? '&hideBots=1' : ''}${hideChardon ? '&hideChardon=1' : ''}" class="${days === 7 && !yesterday ? 'active' : ''}">7 Days</a>
    <a href="?days=30${excludeIp ? '&excludeIp=' + excludeIp : ''}${hideBots ? '&hideBots=1' : ''}${hideChardon ? '&hideChardon=1' : ''}" class="${days === 30 && !yesterday ? 'active' : ''}">30 Days</a>
    <a href="?days=90${excludeIp ? '&excludeIp=' + excludeIp : ''}${hideBots ? '&hideBots=1' : ''}${hideChardon ? '&hideChardon=1' : ''}" class="${days === 90 && !yesterday ? 'active' : ''}">3 Months</a>
    ${selectedDate ? `<span style="background:#059669;padding:4px 10px;border-radius:4px;color:#fff;font-size:13px;">📅 ${selectedDate}</span>` : ''}
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
    <a href="/__k4stats/export?days=${days}${yesterday ? '&yesterday=1' : ''}${hideBots ? '&hideBots=1' : ''}" class="export-btn" style="margin-left: auto; background: #2d4a2d; padding: 5px 12px; border-radius: 4px; color: #4ade80;">📥 Export CSV</a>
  </div>

  ${trend.length > 1 ? `
  <div class="trend-chart">
    <h3>
      <span id="chart-title">Engaged Sessions per Day</span>
      <span style="float: right; font-size: 12px; font-weight: normal;">
        <a href="#" id="toggle-sessions" style="color: #4a9eff; text-decoration: underline;">Sessions</a> |
        <a href="#" id="toggle-visitors" style="color: #888; text-decoration: none;">Unique IPs</a>
      </span>
    </h3>
    <div class="trend-bars" id="trend-chart-bars">
      ${(() => {
        const maxSessions = Math.max(...trend.map(t => t.sessions), 1);
        return trend.map(t => {
          const height = Math.max((t.sessions / maxSessions * 100), 2);
          const dateLabel = t.day.slice(5); // MM-DD format
          const isDataChangeDate = t.day === '2026-02-14';
          const isSelected = selectedDate === t.day;
          return `
            <div class="trend-bar${isSelected ? ' selected' : ''}" data-visitors="${t.visitors}" data-sessions="${t.sessions}" data-day="${t.day}" style="height: ${height}%" title="${t.day}: ${t.sessions} sessions, ${t.visitors} unique IPs">
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
          bar.title = bar.dataset.day + ': ' + val + ' unique IPs';
        });
        chartTitle.textContent = 'Unique IPs per Day';
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
          bar.title = bar.dataset.day + ': ' + val + ' engaged sessions';
        });
        chartTitle.textContent = 'Engaged Sessions per Day';
        sessionsLink.style.color = '#4a9eff';
        sessionsLink.style.textDecoration = 'underline';
        visitorsLink.style.color = '#888';
        visitorsLink.style.textDecoration = 'none';
      }
      
      visitorsLink.addEventListener('click', function(e) { e.preventDefault(); showVisitors(); });
      sessionsLink.addEventListener('click', function(e) { e.preventDefault(); showSessions(); });
    })();
  </script>
  ` : trend.length === 1 ? `
  <div class="trend-chart">
    <h3>Engaged Sessions</h3>
    <div class="trend-bars" style="justify-content: center;">
      <div class="trend-bar" style="height: 100%; width: 80px;" title="${trend[0].day}: ${trend[0].sessions} sessions, ${trend[0].visitors} unique IPs">
        <span class="trend-bar-value">${trend[0].sessions}</span>
        <span class="trend-bar-label">${trend[0].day.slice(5)}${trend[0].day === '2026-02-14' ? '<span class="data-change-marker" title="Referrer tracking &amp; data granularity improved on this date. Data before this date uses less precise source attribution.">*</span>' : ''}</span>
      </div>
    </div>
  </div>
  ` : ''}

  <h2>Pulse</h2>
  <div class="pulse">
    <div class="pulse-stat">
      <span class="value"><span style="color:#10b981">${newVisitors}</span>/<span style="color:#f59e0b">${returningVisitors}</span></span>
      <span class="label">New/Ret <span class="info-icon">i</span></span>
      <div class="tooltip">New: IPs never seen before this period. Returning: IPs that visited previously. Green = new, Orange = returning.</div>
    </div>
    <div class="pulse-stat">
      <span class="value" style="color:#f59e0b;">${nonPersistentShareToday}%</span>
      <span class="label">Non-Persistent <span class="info-icon">i</span></span>
      <div class="tooltip">Estimated share of ${selectedDate ? 'the selected day' : days > 1 && !yesterday ? 'the latest day in view' : 'today\'s'} traffic that lacked a stable visitor ID. Based on <strong>${nonPersistentActorsToday}</strong> non-persistent pixel actors versus <strong>${siteVisitorsToday}</strong> persistent page-view visitors. This is an estimate of weaker identity traffic, not a literal cookie-block rate.</div>
    </div>
    <div class="pulse-stat">
      <span class="value" style="color:#22d3ee;">⏱️ ${avgDurationFormatted}</span>
      <span class="label">Avg Time <span class="info-icon">i</span></span>
      <div class="tooltip">Average session duration (first to last event). Only counts sessions with 2+ events. For art browsing, 2+ min is good engagement.</div>
    </div>
    <div class="pulse-stat">
      <span class="value" style="color:#10b981">${s.pct_navigated || 0}%</span>
      <span class="label">Nav <span class="info-icon">i</span></span>
      <div class="tooltip">% of sessions that used navigation (next/prev arrows). Shows gallery exploration intent.</div>
    </div>
  </div>

  <div class="pulse-row">
    ${cowboyJumps > 0 ? `<div class="pulse-stat highlight">
      <span class="value">🤠 ${cowboyJumps}</span>
      <span class="label">Cowboy Jump <span class="info-icon">i</span></span>
      <div class="tooltip">Sessions that used the cowboy easter egg navigation. Fun engagement metric!</div>
    </div>` : ''}
    <div class="pulse-stat" style="background: ${bounceRate > 60 ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' : bounceRate > 40 ? 'linear-gradient(135deg, #c2410c 0%, #9a3412 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'};">
      <span class="value" style="color: #fff;">${bounceRate}%</span>
      <span class="label" style="color: ${bounceRate > 40 ? '#fed7aa' : '#a7f3d0'};">Bounce <span class="info-icon" style="background: rgba(255,255,255,0.2); color: ${bounceRate > 40 ? '#fed7aa' : '#a7f3d0'};">i</span></span>
      <div class="tooltip">Sessions with only 1 event (came and left immediately). Lower is better. Above 60% = concern, below 40% = great.</div>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);">
      <span class="value" style="color: #fff;">${avgDepthScore}</span>
      <span class="label" style="color: #a5f3fc;">Engage Lvl <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #a5f3fc;">i</span></span>
      <div class="tooltip">Average engagement level per session for this period. Each action earns points: Collector Notes=5, Zoom=4, Theme Click=3, Nav=2, Other=1. Higher = more engaged visitors.</div>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #059669 0%, #047857 100%);">
      <span class="value" style="color: #fff;">${deepSessionPct}%</span>
      <span class="label" style="color: #a7f3d0;">Deep <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #a7f3d0;">i</span></span>
      <div class="tooltip">% of sessions that are "deep" (${deepSessions}/${totalSessions}). Deep = zoomed OR 10+ events OR scrolled 75%+. This is your north-star: readers vs skimmers.</div>
    </div>
    ${botPct > 0 ? `<div class="pulse-stat" style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);">
      <span class="value" style="color: #fff;">🤖 ${botPct}%</span>
      <span class="label" style="color: #d1d5db;">Bots <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #d1d5db;">i</span></span>
      <div class="tooltip">Estimated bot traffic (${botSessions}/${totalSessions} sessions). Detected by: AWS/datacenter IPs, Ashburn city, unknown device. Not filtered from other stats.</div>
    </div>` : ''}
    <div class="pulse-stat" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
      <span class="value" style="color: #fff;">👤 ${artViewsSummary?.unique_viewers || 0}</span>
      <span class="label" style="color: #a7f3d0;">Art Viewers <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #a7f3d0;">i</span></span>
      <div class="tooltip">Unique IPs that viewed your art. Chapter viewers (JS-verified on-site): ${artViewsSummary?.onsite_viewers || 0}. External embeds: ${Math.max(0, (artViewsSummary?.unique_viewers || 0) - (artViewsSummary?.onsite_viewers || 0))}. Server-side page loads: ${artViewsSummary?.image_pages || 0} unique IPs.</div>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);">
      <span class="value" style="color: #fff;">👤 ${artViewsSummary?.total || 0}</span>
      <span class="label" style="color: #ddd6fe;">Image Views <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #ddd6fe;">i</span></span>
      <div class="tooltip">Chapters = L-size chapter exposures (proxy-verified + cache-recovery). External embeds = server-side proxy logs. Server-side page loads: ${artViewsSummary?.image_pages || 0}. XL zooms are separate JS intent beacons.</div>
    </div>
  </div>

  <!-- Art Views Section (Multi-Layer Art Attention Tracking) -->
  <h2 style="margin-top: 20px; margin-bottom: 8px;">🎨 Art Views <span style="font-size: 12px; color: #888; font-weight: normal;">(Chapters: JS-verified | External: Server-Side)</span></h2>
  <p style="color: #888; margin: 0 0 10px 0; font-size: 12px;">
    <strong style="color: #10b981;">Human art viewers (cleaned)</strong> — bots, scrapers, and datacenter traffic excluded. 
    <span class="section-tip" style="display: inline;"><span class="info-icon">i</span><div class="tooltip">Chapters: counted from chapter_exposure (L-size proxy exposures + cache-recovery). XL Zooms: counted from JS intent beacons. Galleries: derived from chapter exposure page context. External embeds: server-side /img/ proxy logs. Bot exclusion: via classified_events view.</div></span>
  </p>

  <div class="art-views-grid">
      <!-- Chapters Column -->
      <div>
        <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #a78bfa; display: flex; align-items: center; justify-content: space-between;">
          <span>📖 Chapters</span>
          <span style="background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%); color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold; cursor: help;" title="Chapters = chapter_exposure (proxy-verified L renders + cache-recovery). First-party sanity: image page views=${imagePageViewsFromEvents}, image entry sessions=${imageEntrySessionsFromEvents}.">${artViewsSummary?.chapter_views || 0}</span>
        </h4>
        <div style="display: flex; flex-direction: column; gap: 6px; max-height: 600px; overflow-y: auto; padding-right: 4px;">
          ${(topArtViews.chapters || []).map((a, i) => {
            const imageId = a.target_id.startsWith('i-') ? a.target_id : null;
            const linkUrl = a.page_url ? 'https://k4studios.com' + a.page_url : (imageId ? 'https://k4studios.com/art/' + imageId : '#');
            return '<a href="' + linkUrl + '" target="_blank" style="display: flex; align-items: center; gap: 8px; background: rgba(167, 139, 250, 0.1); border-radius: 6px; padding: 4px; border-left: 3px solid #a78bfa; text-decoration: none; transition: background 0.2s;" onmouseover="this.style.background=\'rgba(167,139,250,0.25)\'" onmouseout="this.style.background=\'rgba(167,139,250,0.1)\'">' +
              (imageId ? '<img src="https://k4studios.com/img/' + imageId + '/s" alt="" loading="' + (i < 4 ? 'eager' : 'lazy') + '" style="width: 52px; height: 52px; object-fit: cover; border-radius: 4px; flex-shrink: 0;">' : '<span style="width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; background: #333; border-radius: 4px; font-size: 20px;">🔍</span>') +
              '<div style="flex: 1; min-width: 0;">' +
                '<div style="color: #a78bfa; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="' + a.target_id + '">' + a.target_id + '</div>' +
                '<div style="display: flex; gap: 8px; margin-top: 2px;">' +
                  '<span style="font-size: 12px; font-weight: bold; color: #a78bfa;">' + a.views + ' views</span>' +
                  '<span style="font-size: 11px; color: #888;">' + a.unique_viewers + ' 👤</span>' +
                '</div>' +
              '</div>' +
            '</a>';
          }).join('') || '<p style="color: #555; font-size: 10px;">No chapters yet</p>'}
        </div>
      </div>
      <!-- XL Zooms Column -->
      <div>
        <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #06b6d4; display: flex; align-items: center; justify-content: space-between;">
          <span>🔍 XL Zooms</span>
          <span style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold; cursor: help;" title="Zoom button clicks">${artViewsSummary?.xl_zooms || 0}</span>
        </h4>
        <div style="display: flex; flex-direction: column; gap: 6px; max-height: 600px; overflow-y: auto; padding-right: 4px;">
          ${(topArtViews.xlZooms || []).map((a, i) => {
            const imageId = a.target_id.startsWith('i-') ? a.target_id : null;
            const linkUrl = a.page_url ? 'https://k4studios.com' + a.page_url : (imageId ? 'https://k4studios.com/art/' + imageId : '#');
            return '<a href="' + linkUrl + '" target="_blank" style="display: flex; align-items: center; gap: 8px; background: rgba(6, 182, 212, 0.1); border-radius: 6px; padding: 4px; border-left: 3px solid #06b6d4; text-decoration: none; transition: background 0.2s;" onmouseover="this.style.background=\'rgba(6,182,212,0.25)\'" onmouseout="this.style.background=\'rgba(6,182,212,0.1)\'">' +
              (imageId ? '<img src="https://k4studios.com/img/' + imageId + '/s" alt="" loading="' + (i < 4 ? 'eager' : 'lazy') + '" style="width: 52px; height: 52px; object-fit: cover; border-radius: 4px; flex-shrink: 0;">' : '<span style="width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; background: #333; border-radius: 4px; font-size: 20px;">📖</span>') +
              '<div style="flex: 1; min-width: 0;">' +
                '<div style="color: #06b6d4; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="' + a.target_id + '">' + a.target_id + '</div>' +
                '<div style="display: flex; gap: 8px; margin-top: 2px;">' +
                  '<span style="font-size: 12px; font-weight: bold; color: #06b6d4;">' + a.views + ' views</span>' +
                  '<span style="font-size: 11px; color: #888;">' + a.unique_viewers + ' 👤</span>' +
                '</div>' +
              '</div>' +
            '</a>';
          }).join('') || '<p style="color: #555; font-size: 10px;">No XL zooms yet</p>'}
        </div>
      </div>
      <!-- Galleries Column -->
      <div>
        <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #c4b5fd; display: flex; align-items: center; justify-content: space-between;">
          <span>📁 Galleries</span>
          <span style="background: linear-gradient(135deg, #c4b5fd 0%, #a78bfa 100%); color: #1f2937; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold; cursor: help;" title="Galleries browsed (derived from JS-verified chapter views)">${artViewsSummary?.galleries || 0}</span>
        </h4>
        <div style="display: flex; flex-direction: column; gap: 6px; max-height: 600px; overflow-y: auto; padding-right: 4px;">
          ${(topArtViews.galleries || []).map((a, i) => {
            const linkUrl = a.gallery_url ? 'https://k4studios.com' + a.gallery_url : '#';
            return '<a href="' + linkUrl + '" target="_blank" style="display: flex; align-items: center; gap: 8px; background: rgba(196, 181, 253, 0.1); border-radius: 6px; padding: 4px; border-left: 3px solid #c4b5fd; text-decoration: none; transition: background 0.2s;" onmouseover="this.style.background=\'rgba(196,181,253,0.25)\'" onmouseout="this.style.background=\'rgba(196,181,253,0.1)\'">' +
              '<span style="width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; background: #333; border-radius: 4px; font-size: 24px;">📁</span>' +
              '<div style="flex: 1; min-width: 0;">' +
                '<div style="color: #c4b5fd; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500;" title="' + a.target_id + '">' + a.target_id + '</div>' +
                '<div style="display: flex; gap: 8px; margin-top: 2px;">' +
                  '<span style="font-size: 12px; font-weight: bold; color: #c4b5fd;">' + a.views + ' views</span>' +
                  '<span style="font-size: 11px; color: #888;">' + a.unique_viewers + ' 👤</span>' +
                '</div>' +
              '</div>' +
            '</a>';
          }).join('') || '<p style="color: #555; font-size: 10px;">No galleries yet</p>'}
        </div>
      </div>
    </div>
    <p style="font-size: 10px; color: #555; margin-top: 8px;">Chapters &amp; Zooms: JS-verified | Galleries: derived from chapter views | External: server-side proxy</p>
  </div>

  
  <!-- External Traffic - 3-Column: Top Images | Displays | Visitors -->
  ${(artViewsSummary?.externalDisplays?.length > 0 || topArtViews?.external?.length > 0 || Object.keys(entryRefCounts).length > 0) ? `
  <div class="section" style="margin-top: 10px; max-width: 1780px; margin-left: auto; margin-right: auto; max-height: none;">
    <h3>🌐 External Traffic <span style="font-size: 11px; color: #888; font-weight: normal;">(off-site engagement)</span> <span style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold; margin-left: 8px;">${artViewsSummary?.external_images || 0} embeds</span></h3>
    <div class="external-grid">
      <!-- Left: Top External Images -->
      <div>
        <div style="font-size: 11px; color: #f97316; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 4px;">🏆 Top Images</div>
        <div style="display: flex; flex-direction: column; gap: 6px; max-height: 600px; overflow-y: auto; padding-right: 4px;">
          ${(topArtViews?.external || []).map((a, i) => {
            const imageId = a.target_id.startsWith('i-') ? a.target_id : null;
            const sourceIcons = { onsite: '🏠', google: '🔍', bing: '🅱️', pinterest: '📌', facebook: '📘', twitter: '🐦', duckduckgo: '🦆', unattributed: '🌐', other: '🌐', direct: '❓' };
            const sourceColors = { onsite: '#10b981', google: '#4285f4', bing: '#00809d', pinterest: '#e60023', facebook: '#1877f2', twitter: '#1da1f2', duckduckgo: '#de5833', unattributed: '#f97316', other: '#f97316', direct: '#6b7280' };
            const srcIcon = sourceIcons[a.top_source] || '🌐';
            const srcColor = sourceColors[a.top_source] || '#f97316';
            return '<a href="https://k4studios.com/art/' + a.target_id + '" target="_blank" style="display: flex; align-items: center; gap: 8px; background: ' + srcColor + '18; border-radius: 6px; padding: 4px; border-left: 3px solid ' + srcColor + '; text-decoration: none; transition: background 0.2s;" onmouseover="this.style.background=\'' + srcColor + '35\'" onmouseout="this.style.background=\'' + srcColor + '18\'">' +
              (imageId ? '<img src="https://k4studios.com/img/' + imageId + '/s" alt="" loading="' + (i < 4 ? 'eager' : 'lazy') + '" style="width: 52px; height: 52px; object-fit: cover; border-radius: 4px; flex-shrink: 0;">' : '<span style="width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; background: #333; border-radius: 4px; font-size: 20px;">' + srcIcon + '</span>') +
              '<div style="flex: 1; min-width: 0;">' +
                '<div style="color: ' + srcColor + '; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="' + a.target_id + '">' + a.target_id + '</div>' +
                '<div style="display: flex; gap: 8px; margin-top: 2px; align-items: center;">' +
                  '<span style="font-size: 14px;">' + srcIcon + '</span>' +
                  '<span style="font-size: 12px; font-weight: bold; color: ' + srcColor + ';">' + a.views + ' views</span>' +
                  '<span style="font-size: 11px; color: #888;">' + a.unique_viewers + ' 👤</span>' +
                '</div>' +
              '</div>' +
            '</a>';
          }).join('') || '<p style="color: #555; font-size: 10px;">No external embeds yet</p>'}
        </div>
      </div>
      <!-- Center: Image Displays -->
      <div>
        <div style="font-size: 11px; color: #f97316; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 4px;">📤 By Source</div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${(artViewsSummary.externalDisplays || []).map(r => {
            const icons = { 'Google Images': '🔍', 'Google Search': '🔍', 'Bing Images': '🅱️', 'Bing Search': '🅱️', 'Pinterest': '📌', 'Facebook': '📘', 'Twitter/X': '🐦', 'Instagram': '📷', 'LinkedIn': '💼', 'DuckDuckGo': '🦆', 'Direct / No Referrer': '🔗', 'Yandex': '🇷🇺', 'Baidu': '🇨🇳' };
            const icon = icons[r.source] || '🌐';
            // For unknown referrers (raw URLs that didn't match any pattern), shorten the display
            let displayName = r.source;
            if (!icons[r.source] && r.source.startsWith('http')) {
              try { displayName = new URL(r.source).hostname; } catch(e) {}
            }
            return '<div style="display: flex; align-items: center; gap: 6px; padding: 4px 6px; background: #1a1a1a; border-radius: 4px;">' +
              '<span style="font-size: 14px;">' + icon + '</span>' +
              '<span style="color: #ccc; font-size: 11px; flex: 1;" title="' + r.source + '">' + displayName + '</span>' +
              '<span style="color: #f97316; font-size: 11px; font-weight: bold;">' + r.views.toLocaleString() + '</span>' +
            '</div>';
          }).join('') || '<p style="color:#666; font-size: 10px;">No external displays</p>'}
          ${artViewsSummary.noRefExternalViews > 0 ? 
            '<div style="display: flex; align-items: center; gap: 6px; padding: 4px 6px; background: #1a1a1a; border-radius: 4px; border-left: 2px solid #ef4444; margin-top: 4px;" title="Image requests with no referrer header. Could be email clients, privacy browsers, or someone embedding your images with referrer stripped.">' +
              '<span style="font-size: 14px;">⚠️</span>' +
              '<span style="color: #ef4444; font-size: 11px; flex: 1;">Unknown Source</span>' +
              '<span style="color: #ef4444; font-size: 11px; font-weight: bold;">' + artViewsSummary.noRefExternalViews.toLocaleString() + '</span>' +
            '</div>' : ''}
        </div>
      </div>
      <!-- Right: Visitors to Site (from events table - JS tracking) -->
      <div>
        <div style="font-size: 11px; color: #22c55e; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 4px;">📥 Visitors to Site</div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${(() => {
            // Confirmed sources (clean referrer match)
            const confirmed = [
              { key: 'direct', label: 'Direct / Typed URL', icon: '🔗' },
              { key: 'google_search', label: 'Google Search', icon: '🔍' },
              { key: 'google_images', label: 'Google Images', icon: '🖼️' },
              { key: 'bing_search', label: 'Bing Search', icon: '🅱️' },
              { key: 'bing_images', label: 'Bing Images', icon: '🖼️' },
              { key: 'pinterest', label: 'Pinterest', icon: '📌' },
              { key: 'facebook', label: 'Facebook', icon: '📘' },
              { key: 'twitter', label: 'Twitter/X', icon: '🐦' },
              { key: 'chatgpt', label: 'ChatGPT', icon: '🤖' },
              { key: 'instagram', label: 'Instagram', icon: '📷' },
              { key: 'linkedin', label: 'LinkedIn', icon: '💼' },
              { key: 'duckduckgo', label: 'DuckDuckGo', icon: '🦆' }
            ];
            const confirmedItems = confirmed
              .filter(s => entryRefCounts[s.key])
              .sort((a, b) => (entryRefCounts[b.key] || 0) - (entryRefCounts[a.key] || 0))
              .map(s => '<div style="display: flex; align-items: center; gap: 6px; padding: 4px 6px; background: #1a1a1a; border-radius: 4px;">' +
                '<span style="font-size: 14px;">' + s.icon + '</span>' +
                '<span style="color: #ccc; font-size: 11px; flex: 1;">' + s.label + '</span>' +
                '<span style="color: #22c55e; font-size: 11px; font-weight: bold;">' + entryRefCounts[s.key] + '</span>' +
              '</div>');
            // Unattributed (privacy-suppressed referrers - this is normal!)
            const unattributed = entryRefCounts['unattributed'] || 0;
            const unattributedItem = unattributed ? 
              '<div style="display: flex; align-items: center; gap: 6px; padding: 4px 6px; background: #1a1a1a; border-radius: 4px; border-left: 2px solid #6b7280;" title="Privacy-suppressed referrers (mobile, in-app browsers, HTTPS). This is normal modern web behavior.">' +
                '<span style="font-size: 14px;">🔒</span>' +
                '<span style="color: #888; font-size: 11px; flex: 1;">Unattributed</span>' +
                '<span style="color: #6b7280; font-size: 11px; font-weight: bold;">' + unattributed + '</span>' +
              '</div>' : '';
            const all = confirmedItems.join('') + unattributedItem;
            return all || '<p style="color:#666; font-size: 10px;">No external visitors yet</p>';
          })()}
        </div>
        <p style="font-size: 9px; color: #555; margin-top: 6px;">🔒 = privacy-suppressed (mobile, in-app, HTTPS)</p>
      </div>
    </div>
  </div>
  ` : ''}

  <!-- All sections grid -->\n  <div class="grid" style="margin-top: 20px;">
    <div class="section">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:2px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <h3 style="margin:0;">Event Breakdown</h3>
          <span class="section-tip"><span class="info-icon" style="cursor:help;">i</span><div class="tooltip">Deduped engagement counts. JS events remain canonical, and matching pixel signals fill gaps when JS is blocked. When both arrive for the same session, page/target, and 5-second burst, this panel counts one action.</div></span>
        </div>
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

        let html = '';
        // On-site section
        html += '<div style="margin-bottom: 4px; font-size: 11px; font-weight: 600; color: #d1d5db;">👤 On-Site Visitors</div>';
        if (onsiteRows.length > 0) {
          html += '<div style="max-height: 450px; overflow-y: auto; padding-right: 6px; margin-bottom: 12px; scrollbar-gutter: stable;">' + renderGeoRows(onsiteRows, onsiteMax, countryColor) + '</div>';
        } else {
          html += '<p style="color:#666; margin-bottom: 12px;">No on-site data yet</p>';
        }
        return html;
      })()}
    </div>

    <div class="section k4-lazy" id="k4-section-external-reach" data-section="external-reach" data-loaded="0">
      <div class="section-header">
        <h3>🌐 External Reach</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Non-JS traffic: bots, bounces, blocked JS. Separate population from verified visitors.</div></span>
        <button class="mini-btn k4-section-toggle" type="button" onclick="k4ToggleLazySection('external-reach')">Show</button>
      </div>
      <div class="k4-section-body">
        <div class="k4-section-placeholder">Click show to load external reach.</div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <h3>Devices</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Sessions and engagement by device. Engage Lvl shows how deeply each platform's users interact.</div></span>
      </div>
      <table>
        <tr><th>Platform</th><th>Sessions</th><th>Engage Lvl</th></tr>
        ${deviceEngagement.map(d => {
          const icons = { ios: '📱', android: '🤖', mac: '🍎', windows: '🪟', linux: '🐧', unknown: '❓' };
          const labels = { ios: 'iOS', android: 'Android', mac: 'Mac', windows: 'Windows', linux: 'Linux', unknown: 'Unknown' };
          const engageColor = d.avg_depth >= 15 ? '#10b981' : d.avg_depth >= 8 ? '#f59e0b' : '#888';
          return `<tr><td>${icons[d.device] || '?'} ${labels[d.device] || d.device}</td><td>${d.sessions}</td><td style="color:${engageColor};font-weight:bold;">${d.avg_depth}</td></tr>`;
        }).join('')}
        ${deviceEngagement.length === 0 ? '<tr><td colspan="3">No data yet</td></tr>' : ''}
      </table>
    </div>

    <div class="section k4-lazy" id="k4-section-index-health" data-section="index-health" data-loaded="0">
      <div class="section-header">
        <h3 style="display: inline;">🧭 Index Health</h3>
        ${hideBots && Number(edgeSuppression?.hidden_total || 0) > 0 ? `<span style="margin-left:10px;padding:2px 8px;border-radius:999px;background:#3f3f46;color:#d4d4d8;font-size:11px;vertical-align:middle;">Hidden ${Number(edgeSuppression.hidden_total || 0)} (🤖${Number(edgeSuppression.hidden_bot || 0)} 🕸${Number(edgeSuppression.hidden_probe_noise || 0)})</span>` : ''}
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Edge events: 301 redirects (canonical fixes), 410 Gone (removed content), 404 fallbacks. Healthy sites show these tapering over time.</div></span>
        <button class="mini-btn k4-section-toggle" type="button" onclick="k4ToggleLazySection('index-health')">Show</button>
      </div>
      <div class="k4-section-body">
        <div class="k4-section-placeholder">Click show to load index health.</div>
      </div>
    </div>

    <div class="section">
      <h3>Top 25 Pages</h3>
      ${pages.length === 0 ? '<p style="color:#666">No data yet</p>' : 
        pages.slice(0, 25).map(p => {
          const shortPath = p.page_path.length > 28 ? '...' + p.page_path.slice(-25) : p.page_path;
          return `
          <div class="bar-row">
            <a class="bar-label" href="https://www.k4studios.com${p.page_path}" target="_blank" title="${p.page_path}" style="color: #4a9eff; text-decoration: none;">${shortPath}</a>
            <div class="bar-container">
              <div class="bar" style="width: ${(Number(p.views || p.events || p.sessions || 0) / maxPageSessions * 100).toFixed(1)}%"></div>
            </div>
            <span class="bar-value" title="Views: ${Number(p.views || p.events || 0)} | Sessions: ${Number(p.sessions || 0)}">${Number(p.views || p.events || p.sessions || 0)}</span>
          </div>
        `}).join('')
      }
    </div>

    <div class="section">
      <div class="section-header">
        <h3>🔎 Top Entry Pages</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">First page visited in each session. 🔍=Google Search, 🖼️=Images, 🅱️=Bing, 📌=Pinterest, 🐦=Twitter, 📘=Facebook, 🔗=Direct, 🔄=Internal</div></span>
      </div>
      ${entryPages.length === 0 ? '<p style="color:#666">No data yet</p>' : `
      <table>
        <tr><th>Page</th><th>S</th><th>From</th><th>Sess</th></tr>
        ${entryPages.slice(0, 25).map(p => {
          const isImage = p.page_path.includes('/i-');
          const shortPath = p.page_path.length > 30 ? '...' + p.page_path.slice(-27) : p.page_path;
          const pageIcon = isImage ? '🖼️' : '📄';
          const sourceKind = String(p.source_kind || 'J').toUpperCase() === 'P' ? 'P' : 'J';
          const refIcons = { 
            google_search: '🔍', google_images: '🖼️', 
            bing_search: '🅱️', bing_images: '🖼️', 
            pinterest: '📌', twitter: '🐦', facebook: '📘', instagram: '📷', 
            linkedin: '💼', duckduckgo: '🦆',
            direct: '🔗', internal: '🔄', unattributed: '🔒' 
          };
          const refIcon = refIcons[p.ref_source] || '🔒';
          return `<tr><td title="${p.page_path}">${pageIcon} ${shortPath}</td><td title="${sourceKind === 'P' ? 'Pixel' : 'JavaScript'}" style="text-align:center;color:${sourceKind === 'P' ? '#f59e0b' : '#60a5fa'};font-weight:700;">${sourceKind}</td><td title="${p.ref_source}">${refIcon}</td><td>${p.sessions}</td></tr>`;
        }).join('')}
      </table>
      `}
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

    <div class="section k4-lazy" id="k4-section-exit" data-section="exit" data-loaded="0">
      <div class="section-header">
        <h3>🚪 Where People Leave</h3>
        <span class="section-tip"><span class="info-icon">i</span><div class="tooltip">Exit pages: where sessions ended. Shows which page types are natural endpoints vs potential problems.</div></span>
        <button class="mini-btn k4-section-toggle" type="button" onclick="k4ToggleLazySection('exit')">Show</button>
      </div>
      <div class="k4-section-body">
        <div class="k4-section-placeholder">Click show to load exit analysis.</div>
      </div>
    </div>
  </div>

  <div class="section k4-lazy" id="k4-section-bot-intel" data-section="bot-intel" data-loaded="0" style="max-width: 1780px; margin: 30px auto 0 auto;">
    <div class="section-header">
      <h3 style="margin: 0;">🛡️ Bot Intelligence <span style="font-size: 12px; color: #888; font-weight: normal;">(Threat Classification)</span></h3>
      <span class="k4-pill k4-pill-danger">Block Recommended: ${blockRecommendedCount || 0}</span>
      <button class="mini-btn k4-section-toggle" type="button" onclick="k4ToggleLazySection('bot-intel')">Show</button>
    </div>
    <div class="k4-section-body">
      <div class="k4-section-placeholder">Click show to load bot intelligence.</div>
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

    function k4ToggleLazySection(sectionId) {
      var wrap = document.getElementById('k4-section-' + sectionId);
      if (!wrap) return;
      var body = wrap.querySelector('.k4-section-body');
      var btn = wrap.querySelector('.k4-section-toggle');
      var isOpen = wrap.classList.toggle('open');
      if (body) body.style.display = isOpen ? 'block' : 'none';
      if (btn) btn.textContent = isOpen ? 'Hide' : 'Show';
      if (isOpen && wrap.dataset.loaded !== '1') {
        k4LoadLazySection(sectionId);
      }
    }

    async function k4LoadLazySection(sectionId) {
      var wrap = document.getElementById('k4-section-' + sectionId);
      if (!wrap) return;
      var body = wrap.querySelector('.k4-section-body');
      var placeholder = wrap.querySelector('.k4-section-placeholder');
      if (placeholder) placeholder.textContent = 'Loading...';

      var url = new URL(window.location.href);
      url.searchParams.set('section', sectionId);

      try {
        var res = await fetch(url.toString(), { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load section');
        var html = await res.text();
        if (body) body.innerHTML = html;
        wrap.dataset.loaded = '1';
      } catch (e) {
        if (placeholder) placeholder.textContent = 'Failed to load. Click show to retry.';
      }
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

  <script>
  function k4OpenEdgeEventList() {
    var overlay = document.getElementById('k4-edge-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'k4-edge-overlay';
      overlay.className = 'k4-overlay';
      var box = document.createElement('div');
      box.className = 'k4-overlay-box';
      var hdr = document.createElement('div');
      hdr.className = 'k4-overlay-hdr';
      var h2 = document.createElement('h2');
      h2.textContent = 'Edge Events (full paths)';
      var closeBtn = document.createElement('button');
      closeBtn.className = 'k4-overlay-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.onclick = function() { overlay.classList.remove('open'); };
      hdr.appendChild(h2);
      hdr.appendChild(closeBtn);
      var body = document.createElement('div');
      body.className = 'k4-overlay-body';
      var pre = document.createElement('pre');
      pre.id = 'k4-edge-pre';
      body.appendChild(pre);
      box.appendChild(hdr);
      box.appendChild(body);
      overlay.appendChild(box);
      overlay.addEventListener('click', function(ev) { if (ev.target === overlay) overlay.classList.remove('open'); });
      document.body.appendChild(overlay);
    }
    var rows = document.querySelectorAll('.edge-row');
    var lines = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var hits = r.getAttribute('data-hits') || '0';
      var bot = r.getAttribute('data-bot') === '1' ? '\\uD83E\\uDD16' : '\\uD83D\\uDC64';
      var type = r.getAttribute('data-type') || '';
      var path = r.getAttribute('data-path') || '';
      lines.push(hits + '\\t' + bot + '\\t' + type + '\\t' + path);
    }
    document.getElementById('k4-edge-pre').textContent = lines.join('\\n');
    overlay.classList.add('open');
  }
  </script>
</div>
</body>
</html>`;
}

function renderExternalReachContent({ externalReachGeo = [], externalReachSources = [] }) {
  function renderGeoRows(items, maxCount) {
    return items.map(g => {
      return '<div class="bar-row"><span class="bar-label" title="' + g.label + '">' + g.label + '</span><div class="bar-container"><div class="bar" style="width: ' + (g.count / maxCount * 100).toFixed(1) + '%; background: #f59e0b;"></div></div><span class="bar-value">' + g.count + '</span></div>';
    }).join('');
  }

  const extGeo = (externalReachGeo || []).map(g => ({
    label: [g.city, g.region, g.country].filter(Boolean).join(', '),
    country: g.country,
    count: g.hits || g.count || 0
  }));
  const extMax = Math.max(...extGeo.map(g => g.count), 1);

  let html = '';
  if (extGeo.length > 0) {
    html += '<div style="max-height: 450px; overflow-y: auto; padding-right: 6px; margin-bottom: 12px; scrollbar-gutter: stable;">' + renderGeoRows(extGeo, extMax) + '</div>';
  } else {
    html += '<p style="color:#666; margin-bottom: 12px;">No external data yet</p>';
  }

  if ((externalReachSources || []).length > 0) {
    html += '<div style="margin-bottom: 4px; font-size: 11px; font-weight: 600; color: #f59e0b;">📡 Sources</div>';
    const srcIcons = {
      'Google Search': '🔍',
      'Google Images': '🖼️',
      'Bing': '🅱️',
      'Twitter/X': '🐦',
      'Facebook': '📘',
      'Pinterest': '📌',
      'DuckDuckGo': '🦆',
      'ChatGPT': '🧠',
      'Open Graph': '🕸️',
      'Structured Data': '🧩',
      'Yandex': '🔍',
      'Baidu': '🔍',
      'Direct': '🔗',
      'Internal': '🏠',
      'Other': '🌐',
      'Unknown': '❓'
    };
    html += '<div style="display: flex; flex-direction: column; gap: 3px;">';
    for (const s of externalReachSources.slice(0, 6)) {
      const label = String(s.source || 'Unknown');
      const base = label.replace(/\s*\([^)]*\)\s*$/, '').trim();
      const icon = srcIcons[label] || srcIcons[base] || '🌐';
      html += '<div style="display: flex; align-items: center; gap: 6px; padding: 3px 6px; background: #1a1a1a; border-radius: 4px;">' +
        '<span style="font-size: 14px;">' + icon + '</span>' +
        '<span style="color: #ccc; font-size: 11px; flex: 1;" title="' + label + '">' + label + '</span>' +
        '<span style="color: #f59e0b; font-size: 11px; font-weight: bold;">' + s.hits + '</span>' +
      '</div>';
    }
    html += '</div>';
  }

  return html;
}

function renderIndexHealthContent({ edgeEvents = [], edgeSummary = [], hideBots = false, edgeSuppression = { hidden_total: 0, hidden_bot: 0, hidden_probe_noise: 0 } }) {
  let html = '';

  if (edgeSummary.length > 0) {
    html += '<div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">' +
      edgeSummary.map(s => {
        const typeColors = {
          smart404_redirect: '#10b981',
          smart404_gone: '#f59e0b',
          smart404_fallback: '#ef4444',
          smart404_homepage: '#a855f7',
          '301': '#10b981',
          '410': '#f59e0b',
          '404': '#ef4444'
        };
        const typeLabels = {
          smart404_redirect: '301',
          smart404_gone: '410',
          smart404_fallback: '404',
          smart404_homepage: 'Home',
          '301': '301',
          '410': '410',
          '404': '404'
        };
        const color = typeColors[s.event_type] || '#888';
        const label = typeLabels[s.event_type] || s.event_type;
        const countsLabel = hideBots ? '(👤' + s.human_hits + ')' : '(🤖' + s.bot_hits + ' 👤' + s.human_hits + ')';
        return '<span style="background: ' + color + '22; color: ' + color + '; padding: 4px 10px; border-radius: 12px; font-size: 11px;">' + label + ': ' + s.total + ' <span style="opacity:0.7">' + countsLabel + '</span></span>';
      }).join('') +
      ((hideBots && Number(edgeSuppression?.hidden_total || 0) > 0)
        ? '<span style="background:#3f3f4622;color:#a1a1aa;padding:4px 10px;border-radius:12px;font-size:11px;">Hidden: ' + Number(edgeSuppression.hidden_total || 0) + ' <span style="opacity:0.7;">(🤖' + Number(edgeSuppression.hidden_bot || 0) + ' 🕸' + Number(edgeSuppression.hidden_probe_noise || 0) + ')</span></span>'
        : '') +
    '</div>';
  }

  if (edgeEvents.length > 0) {
    html += '<div style="display:flex; justify-content:flex-end; margin-bottom: 8px;">' +
      '<button class="mini-btn" type="button" onclick="k4OpenEdgeEventList()" title="Open full edge-event list in a new window (no truncation)">Full list</button>' +
    '</div>';

    html += '<div style="margin: 0 0 8px 0; color: #9ca3af; font-size: 11px;">* = likely human redirect</div>';

    html += '<div>' + edgeEvents.map(e => {
      const eventColors = {
        smart404_redirect: '#10b981',
        smart404_gone: '#f59e0b',
        smart404_fallback: '#ef4444',
        smart404_homepage: '#a855f7',
        '301': '#10b981',
        '410': '#f59e0b',
        '404': '#ef4444'
      };
      const eventLabels = {
        smart404_redirect: '301',
        smart404_gone: '410',
        smart404_fallback: '404',
        smart404_homepage: 'Home',
        '301': '301',
        '410': '410',
        '404': '404'
      };
      const color = eventColors[e.event_type] || '#888';
      const label = eventLabels[e.event_type] || e.event_type;
      const marker = Number(e.likely_human_301 || 0) === 1 ? '*' : '';
      const shortPath = e.path && e.path.length > 40 ? '...' + e.path.slice(-37) : (e.path || 'unknown');
      const botIcon = e.is_bot ? '🤖' : '👤';
      return '<div class="edge-row" data-hits="' + (e.hits || 0) + '" data-bot="' + (e.is_bot ? 1 : 0) + '" data-type="' + label + '" data-path="' + (e.path || '') + '" style="display: flex; align-items: center; padding: 6px 0; border-bottom: 1px solid #333; gap: 8px;">' +
        '<span style="background: ' + color + '22; color: ' + color + '; padding: 2px 8px; border-radius: 8px; font-size: 10px; flex-shrink: 0;">' + label + marker + '</span>' +
        '<span style="flex: 1; color: #ccc; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="' + (e.path || '') + '">' + shortPath + '</span>' +
        '<span style="font-size: 11px;">' + botIcon + '</span>' +
        '<span style="color: #888; font-size: 12px; font-weight: bold;">' + e.hits + '</span>' +
      '</div>';
    }).join('') + '</div>';
  }

  if (!html) {
    html = '<p style="color:#666;">No edge events yet</p>';
  }

  return html;
}

function renderExitContent({ exitByCategory = {} }) {
  return '<div class="exit-grid">' +
    '<div class="exit-block" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);">' +
      '<span class="value">🏠 ' + (exitByCategory.home || 0) + '</span>' +
      '<span class="label" style="color: #c7d2fe;">Home</span>' +
    '</div>' +
    '<div class="exit-block" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">' +
      '<span class="value">📁 ' + (exitByCategory.gallery || 0) + '</span>' +
      '<span class="label" style="color: #a7f3d0;">Gallery</span>' +
    '</div>' +
    '<div class="exit-block" style="background: linear-gradient(135deg, #4a9eff 0%, #2563eb 100%);">' +
      '<span class="value">📖 ' + (exitByCategory.images || 0) + '</span>' +
      '<span class="label" style="color: #bfdbfe;">Images</span>' +
    '</div>' +
    '<div class="exit-block" style="background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);">' +
      '<span class="value">📄 ' + (exitByCategory.landing || 0) + '</span>' +
      '<span class="label" style="color: #ddd6fe;">Landing</span>' +
    '</div>' +
    '<div class="exit-block" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">' +
      '<span class="value">🏠 ' + (exitByCategory.blog || 0) + '</span>' +
      '<span class="label" style="color: #fef3c7;">Blog</span>' +
    '</div>' +
    '<div class="exit-block" style="background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);">' +
      '<span class="value">📸 ' + (exitByCategory.photoshoots || 0) + '</span>' +
      '<span class="label" style="color: #fbcfe8;">Shoots</span>' +
    '</div>' +
    '<div class="exit-block" style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); grid-column: span 2;">' +
      '<span class="value">📦 ' + (exitByCategory.other || 0) + '</span>' +
      '<span class="label" style="color: #d1d5db;">Other</span>' +
    '</div>' +
  '</div>';
}

function renderBotIntelligenceContent({ botIntelligence }) {
  if (!botIntelligence) {
    return '<p style="color:#666;">No bot intelligence data yet</p>';
  }

  return `
  <p style="color: #888; margin: 0 0 15px 0; font-size: 12px;">
    Risk accumulates over time. Level 3 = high risk (review recommended). Level 4 = block candidate.
    <button onclick="refreshBotIntelligence()" style="margin-left: 10px; background: #333; color: #888; border: 1px solid #555; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">🔄 Refresh</button>
  </p>
  
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
      <div class="tooltip"><strong>Risk score 8+.</strong> Likely malicious/abusive behavior. Review in High Risk Watchlist and consider blocking. Escalates from High Risk when: persistent multi-day scraping, extreme velocity, or multiple red flags combine.</div>
    </div>
    <div class="pulse-stat" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
      <span class="value" style="color: #fff;"><span style="text-shadow: 0 0 2px #000, 0 0 4px #000;">⊖</span> ${botIntelligence?.blocked?.filter(b => b.is_active)?.length || 0}</span>
      <span class="label" style="color: #fecaca;">Blocked <span class="info-icon" style="background: rgba(255,255,255,0.2); color: #fecaca;">i</span></span>
      <div class="tooltip">Manually blocked IPs. Returns 403 Forbidden. Can unblock from Blocked IPs section below.</div>
    </div>
  </div>

  <div class="bot-intel-grid" style="display: grid; grid-template-columns: 580px 580px 580px; gap: 16px; width: fit-content; margin: 0 auto;">
    <div class="section" style="border: 1px solid #10b98133;">
      <h3 style="color: #10b981;">🟢 Verified Search Bots</h3>
      <p style="color: #888; font-size: 10px; margin: -5px 0 10px 0;">Search engines indexing your art for Google/Bing Images!</p>
      ${(botIntelligence?.verified || []).length === 0 ? '<p style="color:#666">No verified bots detected yet</p>' : 
      '<div style="max-height: 300px; overflow-y: auto;">' +
        (botIntelligence?.verified || []).map(v => {
          const botIcons = {
            'google-image': '🖼️',
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
            'openai': '🤖',
            'claude': '🧠'
          };
          const icon = botIcons[v.bot_name?.toLowerCase()] || '🤖';
          const displayNames = {
            'google-image': 'Google Image',
            'googlebot': 'Googlebot',
            'bingbot': 'Bingbot',
            'applebot': 'Applebot',
            'duckduckbot': 'DuckDuckBot',
            'yandex': 'Yandex',
            'baidu': 'Baidu',
            'facebook': 'Facebook',
            'twitter': 'Twitter',
            'pinterest': 'Pinterest',
            'linkedin': 'LinkedIn',
            'openai': 'OpenAI',
            'claude': 'Claude'
          };
          const normalizedBotName = v.bot_name?.toLowerCase();
          const displayName = displayNames[normalizedBotName] || (v.bot_name ? v.bot_name.charAt(0).toUpperCase() + v.bot_name.slice(1) : 'Unknown');
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
            const riskColors = { 1: '#10b981', 2: '#fbbf24', 3: '#f97316', 4: '#ef4444' };
            const riskIcons = { 1: '🟢', 2: '🟡', 3: '🟠', 4: '🔴' };
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
            return '<tr style="border-bottom: 1px solid #333; ' + rowStyle + '">' +
              '<td style="padding: 6px 4px;"><span style="background: ' + riskColor + '22; color: ' + riskColor + '; padding: 2px 6px; border-radius: 8px; font-weight: bold;">' + riskIcon + ' ' + s.risk_level + '</span></td>' +
              '<td style="padding: 6px 4px; font-family: monospace; font-size: 10px;">' + s.ip_hash + '<span style="color: #666; margin-left: 4px;">' + (s.country || '') + '</span></td>' +
              '<td style="padding: 6px 4px; text-align: right; font-weight: bold; color: ' + reqColor + ';">' + s.total_requests + '</td>' +
              '<td style="padding: 6px 4px; color: #888; font-size: 10px;" title="' + rules.join(', ') + '">' + rulesShort + (rules.length > 2 ? '...' : '') + '</td>' +
              '<td style="padding: 6px 4px; text-align: center;"><span style="color: ' + daysColor + ';">' + s.days_seen + '</span></td>' +
              '<td style="padding: 6px 4px; text-align: center;">' + actionHtml + '</td>' +
            '</tr>';
          }).join('')}
        </table>
      </div>
      `}
    </div>

    <div class="section">
      <h3>🧱 Blocked IPs <span style="font-size: 11px; color: #666; font-weight: normal;">(Archive)</span></h3>
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
            return '<tr style="border-bottom: 1px solid #333; ' + rowStyle + '">' +
              '<td style="padding: 6px 4px;"><span style="background: ' + statusBg + '; color: ' + statusColor + '; padding: 2px 6px; border-radius: 8px; font-size: 10px;">' + statusText + '</span></td>' +
              '<td style="padding: 6px 4px; font-family: monospace; font-size: 10px;">' + b.ip_hash + '</td>' +
              '<td style="padding: 6px 4px; text-align: right; color: #888;">' + (b.total_requests || '-') + '</td>' +
              '<td style="padding: 6px 4px; color: #666; font-size: 10px;">' + blockedDate + '</td>' +
              '<td style="padding: 6px 4px; text-align: center;">' + actionHtml + '</td>' +
            '</tr>';
          }).join('')}
        </table>
      </div>
      `}
    </div>
  </div>
  `;
}

export function renderDashboardSection(section, data) {
  if (section === 'external-reach') {
    return renderExternalReachContent(data);
  }
  if (section === 'index-health') {
    return renderIndexHealthContent(data);
  }
  if (section === 'exit') {
    return renderExitContent(data);
  }
  if (section === 'bot-intel') {
    return renderBotIntelligenceContent(data);
  }
  return '<div class="k4-section-placeholder">Unknown section.</div>';
}
