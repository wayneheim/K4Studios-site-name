// Wayne's November 22 ruling: preserve these eight published dates while
// removing the global video registry from their eligible timestamp sources.
// This is fixed historical evidence, not a clock or a generated sitemap cache.
const publishedDate = '2026-11-04T21:26:36-05:00';
export const VIDEO_LASTMOD_FLOORS = Object.freeze(Object.fromEntries([
  'k4-studios-short-ailj8rowvxw',
  'k4-studios-short-hdkr34fur4a',
  'only-path-forward',
  'only-path-forward-short',
  'whos-playing-whom',
  'whos-playing-whom-short',
  'women-of-the-west-journey',
  'women-who-carried-the-west-short',
].map(slug => ['/Videos/' + slug, publishedDate])));

export function applyPublishedLastmodFloor(urlPath, attribution) {
  const floor = VIDEO_LASTMOD_FLOORS[urlPath];
  if (!floor) return attribution;
  const held = Date.parse(attribution.lastmod) < Date.parse(floor);
  return {
    ...attribution,
    eligibleLastmod: attribution.lastmod,
    eligibleContributingFile: attribution.contributingFile,
    lastmod: held ? floor : attribution.lastmod,
    contributingFile: held ? null : attribution.contributingFile,
    floorHeld: held,
    publishedFloor: { date: floor, deployId: '6b034f0492d58db9dfc1ec21' },
  };
}
