import { siteNav } from '@/data/siteNav.ts';

export type GalleryNavNode = {
  label: string;
  href: string;
  type?: string;
  children?: GalleryNavNode[];
};

type NodeMatch = {
  node: GalleryNavNode | null;
  ancestors: GalleryNavNode[];
};

function trimPath(value: string) {
  if (!value) return '';
  return value.replace(/\/$/, '');
}

function findNodeWithAncestors(tree: GalleryNavNode[], href: string, ancestors: GalleryNavNode[] = []): NodeMatch {
  for (const node of tree) {
    if (trimPath(node.href) === href) {
      return { node, ancestors };
    }
    if (node.children?.length) {
      const match = findNodeWithAncestors(node.children, href, [...ancestors, node]);
      if (match.node) return match;
    }
  }

  return { node: null, ancestors: [] };
}

export function getGalleryNavMatch(baseHref: string): NodeMatch {
  const href = trimPath(baseHref);
  if (!href) return { node: null, ancestors: [] };
  return findNodeWithAncestors(siteNav as GalleryNavNode[], href);
}

function findFirstGallerySource(node: GalleryNavNode | null): GalleryNavNode | null {
  if (!node) return null;
  if (node.type === 'gallery-source') return node;

  for (const child of node.children || []) {
    const match = findFirstGallerySource(child);
    if (match) return match;
  }

  return null;
}

export function resolveGallerySourceHref(baseHref: string): string {
  const href = trimPath(baseHref);
  if (!href) return href;

  const match = getGalleryNavMatch(href);
  if (!match.node) return href;
  if (match.node.type === 'gallery-source') return href;

  return findFirstGallerySource(match.node)?.href || href;
}

export function isGallerySourceHref(baseHref: string): boolean {
  return getGalleryNavMatch(baseHref).node?.type === 'gallery-source';
}

export function getGalleryCollectionContext(baseHref: string) {
  const resolvedHref = resolveGallerySourceHref(baseHref);
  const match = findNodeWithAncestors(siteNav as GalleryNavNode[], trimPath(resolvedHref));
  const node = match.node;
  const ancestors = match.ancestors;
  const parent = ancestors.at(-1) || null;
  const grandparent = ancestors.at(-2) || null;

  const siblingGallerySources = (parent?.children || []).filter(
    (child) => child.type === 'gallery-source' && child.href !== node?.href,
  );

  const siblingCollections = (grandparent?.children || []).filter(
    (child) => child.type === 'collection' && child.href !== parent?.href,
  );

  const breadcrumbLabels = [...ancestors.map((item) => item.label), node?.label].filter(Boolean) as string[];

  return {
    resolvedHref,
    node,
    ancestors,
    parent,
    grandparent,
    siblingGallerySources,
    siblingCollections,
    breadcrumbLabels,
  };
}

export function getGalleryCollectionLabel(baseHref: string): string {
  const context = getGalleryCollectionContext(baseHref);
  if (context.breadcrumbLabels.length >= 2) {
    return context.breadcrumbLabels.slice(-2).join(' – ');
  }
  return context.breadcrumbLabels[0] || 'Gallery';
}
