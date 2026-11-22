// Resolve once, then partition stably without changing artwork identity or numbering.
export function buildEditionCatalog(images, getSeries) {
  const entries = images.map((item, idx) => {
    const cardSeries = getSeries(item);
    const openEditionOnly = cardSeries.length > 0 && cardSeries.every(series =>
      series.key === 'sketch' || series.key === 'foundation');
    return { item, idx, cardSeries, openEditionOnly };
  });
  const limited = entries.filter(entry => !entry.openEditionOnly);
  const open = entries.filter(entry => entry.openEditionOnly);
  const hasSplit = limited.length > 0 && open.length > 0;
  const lowestPrice = (group, keys) => group.flatMap(entry => entry.cardSeries)
    .filter(series => keys.includes(series.key))
    .flatMap(series => series.pricing || [])
    .reduce((lowest, option) => Number.isFinite(option.price) && option.price > 0
      ? Math.min(lowest, option.price) : lowest, Infinity);
  return {
    entries,
    orderedEntries: hasSplit ? [...limited, ...open] : entries,
    limitedCount: limited.length,
    hasSplit,
    limitedPrice: lowestPrice(limited, ['chronicle', 'legend']),
    openPrice: lowestPrice(open, ['sketch', 'foundation']),
  };
}
