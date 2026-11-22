export function initEditionCatalog(root = document) {
  const grid = root.querySelector('[data-edition-grid], #collection-grid');
  const sortButtons = Array.from(root.querySelectorAll('[data-series-sort]'));
  const countNode = root.querySelector('[data-catalog-count]');
  const searchForm = root.querySelector('[data-title-search-form]');
  const searchInput = searchForm?.querySelector('input[name="q"]');
  const clearSearchButton = searchForm?.querySelector('[data-title-search-clear]');
  if (!grid) return;

  const originalNodes = Array.from(grid.children);
  const cards = originalNodes.filter((node) => node.classList?.contains('ssr-card'))
    .sort((a, b) => Number(a.dataset.originalIndex) - Number(b.dataset.originalIndex));
  const totalCount = cards.length;
  const limitedHeading = originalNodes.find((node) => node.classList?.contains('edition-group-heading--limited'));
  const openHeading = originalNodes.find((node) => node.classList?.contains('edition-group-heading--open'));
  const withEditionGroups = (cardList, renderGroup) => {
    const limited = cardList.filter((card) => card.dataset.editionGroup !== 'open');
    const open = cardList.filter((card) => card.dataset.editionGroup === 'open');
    const showHeadings = limited.length > 0 && open.length > 0 && limitedHeading && openHeading;
    return [
      ...(showHeadings ? [limitedHeading] : []),
      ...renderGroup(limited),
      ...(showHeadings ? [openHeading] : []),
      ...renderGroup(open),
    ];
  };
  let activeSearchQuery = '';
  const seriesMeta = {
    foundation: { label: 'Foundation', symbol: '\u2605' },
    chronicle: { label: 'Chronicle', symbol: '\u2318' },
    legend: { label: 'Legend', symbol: '\u2756' },
  };
  const seriesCounts = Object.keys(seriesMeta).reduce((counts, key) => {
    counts[key] = cards.filter((card) =>
      String(card.dataset.series || '').split(/\s+/).includes(key)
    ).length;
    return counts;
  }, {});

  sortButtons.forEach((button) => {
    const seriesKey = button.getAttribute('data-series-sort') || 'catalog';
    if (seriesKey === 'catalog') return;
    const count = seriesCounts[seriesKey] || 0;
    if (count === 0) {
      const meta = seriesMeta[seriesKey] || { label: 'Series' };
      button.disabled = true;
      button.classList.add('is-disabled');
      button.setAttribute('aria-disabled', 'true');
      button.setAttribute('title', `No ${meta.label} works in this collection`);
    }
  });

  const clearSortState = () => {
    cards.forEach((card) => card.classList.remove('is-series-sort-match'));
  };

  const normalizeTitle = (value) =>
    String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  const updateSearchUrl = (query) => {
    const url = new URL(window.location.href);
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const resetSearchState = (updateUrl = true) => {
    activeSearchQuery = '';
    if (searchInput) searchInput.value = '';
    if (clearSearchButton) clearSearchButton.hidden = true;
    if (updateUrl) updateSearchUrl('');
  };

  const setActiveButton = (activeKey) => {
    sortButtons.forEach((button) => {
      const isActive = button.getAttribute('data-series-sort') === activeKey;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

  const makeDivider = (seriesKey, matchCount) => {
    const meta = seriesMeta[seriesKey] || { label: 'Selected', symbol: '' };
    const divider = document.createElement('div');
    divider.className = 'catalog-range-marker series-sort-divider';
    divider.style.gridColumn = '1 / -1';
    divider.setAttribute('data-series-sort-divider', 'true');
    divider.innerHTML = `<span class="series-sort-divider-copy"><strong>End of ${meta.symbol} ${meta.label} Series Works</strong><small>Additional Series Works continue below in catalog order.</small></span><a href="#top">Back to top \u2191</a>`;
    divider.dataset.matchCount = String(matchCount);
    return divider;
  };

  const makeRangeMarker = (start, end, total, label = 'Artworks') => {
    const marker = document.createElement('div');
    marker.className = 'catalog-range-marker';
    marker.style.gridColumn = '1 / -1';
    marker.innerHTML = `<span>${label} ${start}&ndash;${end} of ${total}</span><a href="#top">Back to top</a>`;
    return marker;
  };

  const withRangeMarkers = (cardList, total, label = 'Artworks') => {
    const nodes = [];
    cardList.forEach((card, idx) => {
      if (idx > 0 && idx % 50 === 0) {
        const rangeStart = idx + 1;
        const rangeEnd = Math.min(idx + 50, total);
        nodes.push(makeRangeMarker(rangeStart, rangeEnd, total, label));
      }
      nodes.push(card);
    });
    return nodes;
  };

  const withCatalogRangeMarkers = (cardList) => {
    const nodes = [];
    let activeGroup = 0;
    cardList.forEach((card) => {
      const artworkNumber = Number(card.dataset.artworkNumber || 0);
      const group = Math.floor(Math.max(artworkNumber - 1, 0) / 50);
      if (group > activeGroup) {
        const rangeStart = group * 50 + 1;
        const rangeEnd = Math.min(rangeStart + 49, totalCount);
        nodes.push(makeRangeMarker(rangeStart, rangeEnd, totalCount));
        activeGroup = group;
      }
      nodes.push(card);
    });
    return nodes;
  };

  const makeSearchEmptyState = (query) => {
    const emptyState = document.createElement('div');
    emptyState.className = 'catalog-search-empty';
    emptyState.setAttribute('role', 'status');

    const title = document.createElement('strong');
    title.textContent = `No title matches for "${query}"`;
    const guidance = document.createElement('span');
    guidance.textContent = 'Try fewer words or check the spelling.';
    emptyState.append(title, guidance);
    return emptyState;
  };

  const applySort = (seriesKey, { clearSearch = true } = {}) => {
    if (clearSearch) resetSearchState();
    clearSortState();
    setActiveButton(seriesKey);

    if (seriesKey === 'catalog') {
      grid.replaceChildren(...originalNodes);
      if (countNode) countNode.textContent = `${totalCount} works`;
      window.dispatchEvent(new Event('resize'));
      return;
    }

    const matchingCards = cards.filter((card) =>
      String(card.dataset.series || '').split(/\s+/).includes(seriesKey)
    );
    grid.replaceChildren(
      ...withEditionGroups(cards, (groupCards) => {
        const matches = groupCards.filter((card) => matchingCards.includes(card));
        const remaining = groupCards.filter((card) => !matchingCards.includes(card));
        return [
          ...withRangeMarkers(matches, matches.length, 'Series works'),
          ...(matches.length > 0 && remaining.length > 0 ? [makeDivider(seriesKey, matches.length)] : []),
          ...withCatalogRangeMarkers(remaining),
        ];
      })
    );

    const meta = seriesMeta[seriesKey] || { label: 'Selected' };
    if (countNode) countNode.textContent = `${matchingCards.length} ${meta.label} \u00b7 ${totalCount} works`;
    window.dispatchEvent(new Event('resize'));
  };

  const applyTitleSearch = (rawQuery, updateUrl = true) => {
    const query = String(rawQuery || '').trim();
    const normalizedQuery = normalizeTitle(query);

    if (!normalizedQuery) {
      resetSearchState(updateUrl);
      applySort('catalog', { clearSearch: false });
      return;
    }

    activeSearchQuery = query;
    if (searchInput) searchInput.value = query;
    if (clearSearchButton) clearSearchButton.hidden = false;
    if (updateUrl) updateSearchUrl(query);

    clearSortState();
    setActiveButton('catalog');

    const matchingCards = cards.filter((card) =>
      normalizeTitle(card.dataset.title).includes(normalizedQuery)
    );

    if (matchingCards.length === 0) {
      grid.replaceChildren(makeSearchEmptyState(query));
    } else {
      grid.replaceChildren(
        ...withEditionGroups(matchingCards, (groupCards) =>
          withRangeMarkers(groupCards, groupCards.length, 'Title matches'))
      );
    }

    if (countNode) {
      const matchLabel = matchingCards.length === 1 ? 'match' : 'matches';
      countNode.textContent = `${matchingCards.length} ${matchLabel}`;
    }
    window.dispatchEvent(new Event('resize'));
  };

  sortButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (button.disabled) return;
      const seriesKey = button.getAttribute('data-series-sort') || 'catalog';
      applySort(seriesKey);
      if (seriesKey === 'foundation') {
        requestAnimationFrame(() => {
          const target = grid.querySelector('.edition-group-heading--open')
            || grid.querySelector('[data-edition-group="open"]');
          target?.scrollIntoView({
            behavior: 'instant',
            block: 'start',
          });
        });
      }
    });
  });

  searchForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    applyTitleSearch(searchInput?.value || '');
  });

  searchInput?.addEventListener('input', () => {
    if (activeSearchQuery && !String(searchInput.value || '').trim()) {
      applyTitleSearch('');
    }
  });

  clearSearchButton?.addEventListener('click', () => {
    applyTitleSearch('');
    searchInput?.focus();
  });

  window.addEventListener('k4:catalog-reset', () => {
    resetSearchState();
    applySort('catalog', { clearSearch: false });
  });

  const initialQuery = new URL(window.location.href).searchParams.get('q') || '';
  if (initialQuery) applyTitleSearch(initialQuery, false);
    }

export function initEditionCatalogs() {
  const roots = document.querySelectorAll("[data-edition-catalog]");
  if (roots.length) roots.forEach(root => initEditionCatalog(root));
  else initEditionCatalog();
}
