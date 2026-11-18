// Small, cumulative entry-page facts. Unknown is deliberately different from
// a measured zero; this is an engagement grade, never a human/bot probability.
export const ENTRY_INTERACTIONS = Object.freeze([
  [1, 'Click / tap'], [2, 'Keyboard'], [4, 'Navigation'], [8, 'Zoom'],
  [16, 'Information'], [32, 'Pricing'], [64, 'Cart / checkout'],
  [128, 'Story'], [256, 'Gallery / grid']
]);

export function entryActionMask(type) {
  if (['xl_zoom'].includes(type)) return 8;
  if (['series_info', 'more_info_open', 'collector_notes_open'].includes(type)) return 16;
  if (['order_clicked', 'order_submitted', 'order_smugmug_clicked', 'order_email_clicked'].includes(type)) return 32;
  if (type.startsWith('native_')) return 64;
  if (['story_audio_toggle', 'story_slider_click', 'frontier_story_video_widget_click', 'slideshow_start'].includes(type)) return 128;
  if (/^(gallery_|grid_|browse_all|theme_click|all_list_click)/.test(type)) return 256;
  if (['nav_next', 'nav_prev', 'sister_image_click', 'cowboy_jump', 'picture_shows_jump', 'exit_to_gallery', 'presentation_last_image_back_to_start'].includes(type)) return 4;
  return 0;
}

export function gradeEntryEvidence(evidence) {
  if (!evidence) return null;
  const visibleMs = evidence.visibleMs;
  const reliableTime = evidence.timingSource === 'legacy-validated' ? null : visibleMs;
  const scroll = evidence.scrollDepth;
  const actions = Number(evidence.interactionMask || 0);
  if ((actions & (8 | 16 | 32 | 64)) || (reliableTime >= 30000 && (scroll >= 50 || actions))) return 3;
  if (actions || (reliableTime >= 10000 && scroll >= 25)) return 2;
  if (visibleMs !== null && visibleMs !== undefined || scroll > 0) return 1;
  return null;
}

export function parseEntryEvidence(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return null; }
}

export function mergeEntryEvidence(previous, rows, landingPage) {
  let evidence = parseEntryEvidence(previous);
  if (evidence?.path !== landingPage) evidence = null;
  const matching = rows.filter((row) => row.page === landingPage);
  if (!evidence && matching.length) {
    // Prefer a page load to a pre-navigation chapter signal. Keep only the
    // first page instance: a later return to this URL must not inflate dwell.
    const first = matching.find((row) => row.event_type === 'page_view') || matching[0];
    evidence = { path: landingPage, pageInstanceId: first.page_instance_id || null,
      startedAt: first.ts || null, visibleMs: null, scrollDepth: null, interactionMask: 0 };
  }
  if (!evidence) return null;
  evidence = { ...evidence };
  for (const row of matching) {
    if (evidence.pageInstanceId && row.page_instance_id && row.page_instance_id !== evidence.pageInstanceId) continue;
    // Old collectors did not reset their visible timer on SPA navigation.
    // Only the versioned summary is reliable enough to use for grading time.
    const meta = parseEntryEvidence(row.engagement_meta);
    if (meta?.version === 1) {
      if (Number.isFinite(row.engaged_ms) && row.engaged_ms >= 0) {
        evidence.visibleMs = Math.max(evidence.visibleMs ?? 0, row.engaged_ms);
        evidence.timingSource = 'visibility-v1';
      }
      if (Number.isFinite(meta.scrollDepth) && meta.scrollDepth >= 0 && meta.scrollDepth <= 100) {
        evidence.scrollDepth = Math.max(evidence.scrollDepth ?? 0, meta.scrollDepth);
      }
      evidence.interactionMask |= Number(meta.interactionMask || 0) & 3;
    }
    evidence.interactionMask |= entryActionMask(String(row.event_type || ''));
  }
  evidence.grade = gradeEntryEvidence(evidence);
  return evidence;
}

export function entryVisit(row) {
  const evidence = parseEntryEvidence(row.entry_evidence);
  return { day: row.day, startedAt: evidence?.startedAt || null,
    visibleMs: evidence?.visibleMs ?? null, scrollDepth: evidence?.scrollDepth ?? null,
    timingSource: evidence?.timingSource || null,
    grade: gradeEntryEvidence(evidence),
    interactions: ENTRY_INTERACTIONS.filter(([bit]) => Number(evidence?.interactionMask || 0) & bit).map(([, label]) => label),
    source: row.entry_source || 'Unknown', device: row.site_device || row.image_device || 'Unknown',
    continued: Number(row.page_view_count || 0) >= 2,
    chapter: Boolean(row.image_device || row.image_geo) };
}
