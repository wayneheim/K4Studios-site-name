import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

import '@/styles/artwork-search.css';

const PAGE_SIZE = 24;
const EXAMPLE_SEARCHES = ['cowboy', 'wagon', 'Buffalo Soldier', 'locomotive', 'waterfall'];
const SERIES_META = {
  sketch: { label: 'Sketch', icon: '✽' },
  foundation: { label: 'Foundation', icon: '★' },
  chronicle: { label: 'Chronicle', icon: '⌘' },
  legend: { label: 'Legend', icon: '❖' },
};

const normalize = (value = '') =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const getDescriptionSnippet = (description, query) => {
  const cleanDescription = String(description || '').trim();
  if (!cleanDescription) return '';
  const normalizedDescription = normalize(cleanDescription);
  const normalizedQuery = normalize(query);
  const matchIndex = normalizedDescription.indexOf(normalizedQuery);
  if (matchIndex < 0 || cleanDescription.length <= 190) {
    return cleanDescription.length > 190 ? `${cleanDescription.slice(0, 187).trim()}...` : cleanDescription;
  }
  const start = Math.max(0, matchIndex - 70);
  const end = Math.min(cleanDescription.length, start + 190);
  return `${start > 0 ? '...' : ''}${cleanDescription.slice(start, end).trim()}${end < cleanDescription.length ? '...' : ''}`;
};

const scoreRecord = (record, rawQuery) => {
  const query = normalize(rawQuery);
  if (!query) return null;

  const tokens = query.split(' ').filter(Boolean);
  const id = normalize(record.id);
  const title = normalize(record.title);
  const keywords = (record.keywords || []).map(normalize);
  const keywordText = keywords.join(' ');
  const description = normalize(record.description);
  const combined = `${title} ${keywordText} ${description}`;
  const allTokensIn = (text) => tokens.every((token) => text.includes(token));

  if (id === query) return { score: 1200, matchedBy: 'Image ID', matchedText: record.id };
  if (title === query) return { score: 1100, matchedBy: 'Exact title', matchedText: record.title };
  if (title.startsWith(query)) return { score: 1000, matchedBy: 'Title', matchedText: record.title };
  if (title.includes(query)) return { score: 950, matchedBy: 'Title', matchedText: record.title };
  if (allTokensIn(title)) return { score: 900, matchedBy: 'Title', matchedText: record.title };

  const exactKeyword = keywords.find((keyword) => keyword === query);
  if (exactKeyword) return { score: 800, matchedBy: 'Keyword', matchedText: exactKeyword };
  const containingKeyword = keywords.find((keyword) => keyword.includes(query));
  if (containingKeyword) return { score: 750, matchedBy: 'Keyword', matchedText: containingKeyword };
  if (allTokensIn(keywordText)) return { score: 700, matchedBy: 'Keywords', matchedText: rawQuery };

  if (description.includes(query)) {
    return { score: 550, matchedBy: 'Description', matchedText: getDescriptionSnippet(record.description, rawQuery) };
  }
  if (allTokensIn(description)) {
    return { score: 500, matchedBy: 'Description', matchedText: getDescriptionSnippet(record.description, rawQuery) };
  }
  if (allTokensIn(combined)) return { score: 350, matchedBy: 'Artwork details', matchedText: rawQuery };
  return null;
};

export default function ArtworkSearch() {
  const [indexData, setIndexData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [draftQuery, setDraftQuery] = useState('');
  const [query, setQuery] = useState('');
  const [groupId, setGroupId] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [openNotesKey, setOpenNotesKey] = useState('');
  const inputRef = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get('q') || '';
    const initialGroup = params.get('group') || 'all';
    setDraftQuery(initialQuery);
    setQuery(initialQuery);
    setGroupId(initialGroup);

    fetch('/artwork-search-index.json?v=2', { cache: 'no-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`Search index request failed (${response.status})`);
        return response.json();
      })
      .then((payload) => {
        if (!cancelled) setIndexData(payload);
      })
      .catch(() => {
        if (!cancelled) setLoadError('The artwork index could not be loaded. Please try again.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const closeNotes = (event) => {
      if (event.target instanceof Element && event.target.closest('[data-notes-trigger], [data-notes-overlay]')) return;
      setOpenNotesKey('');
    };
    const closeNotesOnEscape = (event) => {
      if (event.key === 'Escape') setOpenNotesKey('');
    };
    document.addEventListener('click', closeNotes);
    document.addEventListener('keydown', closeNotesOnEscape);
    return () => {
      document.removeEventListener('click', closeNotes);
      document.removeEventListener('keydown', closeNotesOnEscape);
    };
  }, []);

  const groupMap = useMemo(
    () => new Map((indexData?.groups || []).map((group) => [group.id, group])),
    [indexData]
  );

  const results = useMemo(() => {
    const trimmedQuery = query.trim();
    if (!indexData || normalize(trimmedQuery).length < 2) return [];

    return indexData.records
      .filter((record) => groupId === 'all' || record.groupIds.includes(groupId))
      .map((record) => {
        const match = scoreRecord(record, trimmedQuery);
        return match ? { ...record, ...match } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  }, [groupId, indexData, query]);

  const updateUrl = (nextQuery, nextGroup) => {
    const url = new URL(window.location.href);
    if (nextQuery) url.searchParams.set('q', nextQuery);
    else url.searchParams.delete('q');
    if (nextGroup && nextGroup !== 'all') url.searchParams.set('group', nextGroup);
    else url.searchParams.delete('group');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
  };

  const commitSearch = (nextQuery = draftQuery, nextGroup = groupId) => {
    const trimmedQuery = String(nextQuery || '').trim();
    setDraftQuery(trimmedQuery);
    setQuery(trimmedQuery);
    setVisibleCount(PAGE_SIZE);
    setOpenNotesKey('');
    updateUrl(trimmedQuery, nextGroup);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    commitSearch();
  };

  const handleGroupChange = (event) => {
    const nextGroup = event.target.value;
    setGroupId(nextGroup);
    setVisibleCount(PAGE_SIZE);
    setOpenNotesKey('');
    if (query) updateUrl(query, nextGroup);
  };

  const clearSearch = () => {
    setDraftQuery('');
    setQuery('');
    setGroupId('all');
    setVisibleCount(PAGE_SIZE);
    setOpenNotesKey('');
    updateUrl('', 'all');
    inputRef.current?.focus();
  };

  const runExample = (example) => {
    setDraftQuery(example);
    commitSearch(example, groupId);
  };

  const hasSearch = normalize(query).length >= 2;
  const selectedGroupLabel = groupId === 'all' ? 'All artwork' : groupMap.get(groupId)?.label || 'Selected collection';
  const visibleResults = results.slice(0, visibleCount);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return undefined;

    const cards = Array.from(grid.querySelectorAll('.ssr-card'));
    const fixedPreviewQuery = window.matchMedia('(min-width: 769px) and (hover: hover) and (pointer: fine)');
    let frame = 0;

    const applyPreviewWindows = () => {
      const usesFixedPreview = fixedPreviewQuery.matches;
      cards.forEach((card) => {
        const media = card.querySelector('.ssr-card-media');
        const image = card.querySelector('.ssr-card-image');
        if (!media || !image) return;

        if (!usesFixedPreview) {
          card.style.removeProperty('--card-overlap');
          media.style.removeProperty('height');
          return;
        }

        const previewHeight = Math.round(media.getBoundingClientRect().width * 9 / 13);
        media.style.height = `${previewHeight}px`;
        const imageHeight = image.getBoundingClientRect().height;
        if (previewHeight <= 0 || imageHeight <= 0) return;
        card.style.setProperty('--card-overlap', `${Math.max(0, Math.round(imageHeight - previewHeight))}px`);
      });
    };

    const schedulePreview = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(applyPreviewWindows);
    };

    const pendingImages = cards
      .map((card) => card.querySelector('.ssr-card-image'))
      .filter((image) => image && !image.complete);
    pendingImages.forEach((image) => image.addEventListener('load', schedulePreview));
    window.addEventListener('resize', schedulePreview);
    fixedPreviewQuery.addEventListener?.('change', schedulePreview);
    schedulePreview();

    return () => {
      cancelAnimationFrame(frame);
      pendingImages.forEach((image) => image.removeEventListener('load', schedulePreview));
      window.removeEventListener('resize', schedulePreview);
      fixedPreviewQuery.removeEventListener?.('change', schedulePreview);
    };
  }, [groupId, results, visibleCount]);

  return (
    <section className="artwork-search" aria-labelledby="artwork-search-heading">
      <div className="artwork-search__panel">
        <div className="artwork-search__heading-row">
          <div>
            <p className="artwork-search__eyebrow">K4 Studios Artwork Finder</p>
            <h1 id="artwork-search-heading">Search the galleries</h1>
            <p className="artwork-search__deck">
              Search artwork titles, catalog keywords, and image descriptions across the public K4 Studios galleries.
            </p>
          </div>
          <div className="artwork-search__index-note" aria-live="polite">
            {indexData ? `${indexData.recordCount.toLocaleString()} works indexed` : loadError || 'Loading artwork index...'}
          </div>
        </div>

        <form className="artwork-search__form" onSubmit={handleSubmit} role="search">
          <label className="artwork-search__field artwork-search__field--query">
            <span>Title, keyword, description, or image ID</span>
            <span className="artwork-search__input-wrap">
              <Search aria-hidden="true" />
              <input
                ref={inputRef}
                type="search"
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder="Try cowboy, cavalry, train, waterfall..."
                autoComplete="off"
                enterKeyHint="search"
              />
            </span>
          </label>

          <label className="artwork-search__field artwork-search__field--group">
            <span>Search within</span>
            <select value={groupId} onChange={handleGroupChange}>
              <option value="all">All artwork</option>
              {(indexData?.groups || []).map((group) => (
                <option key={group.id} value={group.id}>
                  {group.label} ({group.count.toLocaleString()})
                </option>
              ))}
            </select>
          </label>

          <button className="artwork-search__submit" type="submit" disabled={!indexData || normalize(draftQuery).length < 2}>
            Search artwork
          </button>
          {(query || groupId !== 'all') && (
            <button className="artwork-search__clear" type="button" onClick={clearSearch}>
              <X aria-hidden="true" /> Clear
            </button>
          )}
        </form>

        {!hasSearch && (
          <div className="artwork-search__examples" aria-label="Example searches">
            <span>Try a search:</span>
            {EXAMPLE_SEARCHES.map((example) => (
              <button key={example} type="button" onClick={() => runExample(example)}>
                {example}
              </button>
            ))}
          </div>
        )}
      </div>

      {loadError && <p className="artwork-search__message artwork-search__message--error">{loadError}</p>}

      {hasSearch && indexData && (
        <div className="artwork-search__results">
          <div className="artwork-search__results-heading" aria-live="polite">
            <div>
              <p className="artwork-search__results-kicker">{selectedGroupLabel}</p>
              <h2>{results.length.toLocaleString()} {results.length === 1 ? 'match' : 'matches'} for “{query}”</h2>
            </div>
            {results.length > 0 && (
              <div className="artwork-search__results-meta">
                <span className="artwork-search__match-key" aria-label="Search match key">
                  <span><span className="artwork-match-badge artwork-match-badge--title" aria-hidden="true">T</span> Title match</span>
                  <span><span className="artwork-match-badge artwork-match-badge--keyword" aria-hidden="true">K</span> Keyword match</span>
                </span>
                <span>Showing {Math.min(visibleCount, results.length).toLocaleString()} results</span>
              </div>
            )}
          </div>

          {results.length === 0 ? (
            <div className="artwork-search__empty">
              <h2>No matching artwork found</h2>
              <p>Try fewer words, a broader collection, or another subject.</p>
              <button type="button" onClick={clearSearch}>Start another search</button>
            </div>
          ) : (
            <>
              <div className="artwork-search__grid" ref={gridRef}>
                {visibleResults.map((record) => {
                  const location = groupId === 'all'
                    ? record.locations[0]
                    : record.locations.find((entry) => entry.groupId === groupId) || record.locations[0];
                  const cardKey = `${record.id}:${location.path}`;
                  const notesOpen = openNotesKey === cardKey;
                  const collectorNotesHref = `${location.href}#collector-notes`;
                  const matchCategory = record.matchedBy.toLowerCase().includes('title')
                    ? 'title'
                    : record.matchedBy.toLowerCase().includes('keyword')
                      ? 'keyword'
                      : null;

                  const toggleNotes = (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const willOpen = !notesOpen;
                    setOpenNotesKey(willOpen ? cardKey : '');
                    if (!willOpen) return;
                    if (typeof window.k4track === 'function') {
                      window.k4track('collector_notes_open', {
                        galleryId: location.path,
                        imageId: record.id,
                        pageType: 'gallery',
                        trigger: 'commercial_collection_card_notes',
                        sourceLayer: 'commercial_collection_all_page',
                      });
                    }
                    if (typeof window.k4emitActionPixel === 'function') {
                      window.k4emitActionPixel('collector_notes_open', record.id, {
                        galleryId: location.path,
                        sourceLayer: 'collector_notes_open_pixel_v1',
                        pageType: 'gallery',
                        trigger: 'commercial_collection_card_notes',
                      });
                    }
                  };

                  return (
                    <article className={`ssr-card${notesOpen ? ' is-notes-open' : ''}`} key={cardKey}>
                      <a
                        href={location.href}
                        className="ssr-card-link"
                        data-collection-image-link
                        data-image-id={record.id}
                        data-gallery-id={location.path}
                        data-artwork-number={location.number}
                      >
                        <span className="ssr-card-media">
                          <img
                            src={`/img/${record.id}/s.jpg`}
                            srcSet={`/img/${record.id}/s.jpg 400w, /img/${record.id}/m.jpg 600w`}
                            sizes="(max-width: 520px) calc(100vw - 32px), (max-width: 768px) calc((100vw - 48px) / 2), 250px"
                            className="ssr-card-image"
                            alt={location.alt || record.title}
                            loading="lazy"
                            decoding="async"
                            fetchPriority="low"
                            onError={(event) => {
                              event.currentTarget.onerror = null;
                              event.currentTarget.src = '/images/fallback.jpg';
                              event.currentTarget.srcset = '';
                              event.currentTarget.classList.add('ssr-card-image--fallback');
                            }}
                          />
                          {matchCategory && (
                            <span
                              className={`artwork-match-badge artwork-match-badge--${matchCategory} artwork-match-badge--card`}
                              title={`${matchCategory === 'title' ? 'Title' : 'Keyword'} match`}
                              aria-label={`${matchCategory === 'title' ? 'Title' : 'Keyword'} match`}
                            >
                              {matchCategory === 'title' ? 'T' : 'K'}
                            </span>
                          )}
                        </span>
                        <span className="ssr-card-content">
                          <span className="card-meta-row">
                            <span className="card-number">Image {location.number} of {location.total}</span>
                          </span>
                          {location.series?.length > 0 && (
                            <span className="card-series-strip" aria-label="Available print series">
                              {location.series.map((seriesKey, seriesIndex) => {
                                const series = SERIES_META[seriesKey];
                                if (!series) return null;
                                return (
                                  <span className="card-series-entry" key={seriesKey}>
                                    <span
                                      className="card-series-icon"
                                      title={`${series.label} Series Member`}
                                      aria-label={`${series.label} Series Member`}
                                    >
                                      {series.icon}
                                    </span>
                                    {seriesIndex < location.series.length - 1 && (
                                      <span className="card-series-separator" aria-hidden="true">|</span>
                                    )}
                                  </span>
                                );
                              })}
                            </span>
                          )}
                          <h3>{record.title}</h3>
                          <span className="print-cue sr-only">Fine art print available</span>
                          {location.storyExcerpt && <span className="story-excerpt">{location.storyExcerpt}</span>}
                          <span className="card-cta">
                            <span className="card-cta-desktop">Explore Story | Order Fine Art Print →</span>
                            <span className="card-cta-mobile">Explore Story | Order</span>
                          </span>
                        </span>
                      </a>
                      <button
                        type="button"
                        className="collector-notes-trigger"
                        data-notes-trigger
                        aria-label="View collector note preview"
                        aria-expanded={notesOpen}
                        onClick={toggleNotes}
                      >
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 6h4" />
                          <path d="M2 10h4" />
                          <path d="M2 14h4" />
                          <path d="M2 18h4" />
                          <rect width="16" height="20" x="4" y="2" rx="2" />
                          <path d="M16 2v20" />
                        </svg>
                      </button>
                      <span className="collector-note-overlay" data-notes-overlay>
                        <span className="collector-note-kicker">Collector Note</span>
                        <span className="collector-note-teaser">
                          {location.collectorNoteTeaser || 'Collector note preview available for this artwork.'}
                        </span>
                        <a className="collector-note-link" href={collectorNotesHref}>View full collector notes →</a>
                      </span>
                    </article>
                  );
                })}
              </div>

              {visibleCount < results.length && (
                <div className="artwork-search__more">
                  <button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                    Show {Math.min(PAGE_SIZE, results.length - visibleCount)} more
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
