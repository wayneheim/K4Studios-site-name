// getFeatheredImagesSmart.ts

import { siteNav } from '../../data/siteNav';
import { getFeatheredImages } from './getFeatheredImages';
import { getCuratedFeatheredImages } from './getCuratedFeatheredImages';

interface SmartFeatherOptions {
  sectionPath: string;
  [key: string]: any; // passthrough for any other valid props
}

// Minimal tree search
function findEntry(nav: any[], url: string): any | null {
  for (const node of nav) {
    if (node.href === url) return node;
    if (node.children) {
      const found = findEntry(node.children, url);
      if (found) return found;
    }
  }
  return null;
}

export function getFeatheredImagesSmart(options: SmartFeatherOptions) {
  const entry = findEntry(siteNav, options.sectionPath);
  if (!entry || !entry.type) return [];

  if (entry.type === 'gallery-source') {
    return getFeatheredImages(options);
  }

  if (entry.type === 'collection') {
    return getCuratedFeatheredImages(options);
  }

  return [];
}
