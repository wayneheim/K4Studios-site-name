import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { siteNav } from '../src/data/siteNav.js';
import { resolveImageSeries } from '../src/data/seriesAvailability.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const dataRoot = path.join(projectRoot, 'src', 'data');
const outputPath = path.join(projectRoot, 'public', 'artwork-search-index.json');
const seriesRegistryPath = path.join(dataRoot, 'seriesRegistry.json');
const seriesRegistry = JSON.parse(await fs.readFile(seriesRegistryPath, 'utf8'));
const standardSeries = new Set(['sketch', 'foundation', 'chronicle', 'legend']);

const groups = [
  { id: 'wild-west', label: 'Wild West' },
  { id: 'wwii', label: 'World War II' },
  { id: 'civil-war', label: 'Civil War' },
  { id: 'roaring-twenties', label: 'Roaring Twenties' },
  { id: 'landscapes', label: 'Landscapes' },
  { id: 'transportation', label: 'Transportation' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'portraits-other', label: 'Portraits & Other Subjects' },
];

const groupById = new Map(groups.map((group) => [group.id, group]));
const excludedPathPrefixes = ['/Other/Photo-Shoots/', '/Other/Archive'];

const cleanText = (value = '') =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

const hasDanglingEnding = (text = '') =>
  /\b(?:a|an|and|as|at|between|by|for|from|in|into|of|on|or|the|through|to|under|with|without)\.?$/i.test(text.trim());

const trimAtCleanWordBoundary = (text = '', maxLen = 150) => {
  let trimmed = text.slice(0, maxLen).replace(/\s+\S*$/, '').trim();
  trimmed = trimmed.replace(/\s+\b(?:a|an|and|as|at|between|by|for|from|in|into|of|on|or|the|through|to|under|with|without)$/i, '').trim();
  return trimmed ? `${trimmed}…` : '';
};

const truncateExcerpt = (text = '', maxLen = 150) => {
  const cleaned = cleanText(text);
  if (!cleaned || cleaned.length <= maxLen) return cleaned;
  const limitSlice = cleaned.slice(0, maxLen + 1);
  const sentenceMatches = [...limitSlice.matchAll(/[.!?](?=(?:["')\]]*)\s|(?:["')\]]*)$)/g)];
  const sentenceEnd = sentenceMatches.at(-1)?.index;
  if (sentenceEnd !== undefined && sentenceEnd >= 40) {
    const sentenceExcerpt = limitSlice.slice(0, sentenceEnd + 1).trim();
    if (!hasDanglingEnding(sentenceExcerpt)) return sentenceExcerpt;
  }
  return trimAtCleanWordBoundary(cleaned, maxLen);
};

const truncateHardExcerpt = (text = '', maxLen = 100) => {
  const cleaned = cleanText(text);
  if (!cleaned || cleaned.length <= maxLen) return cleaned;
  const wordSafe = cleaned.slice(0, maxLen).replace(/\s+\S*$/, '').trimEnd();
  return `${wordSafe || cleaned.slice(0, maxLen).trimEnd()}...`;
};

const humanize = (segment = '') => {
  const normalized = String(segment || '').trim();
  const knownLabels = {
    'Black-White': 'Black & White',
    'NA-Black-White': 'Black & White',
    'NA-Color': 'Color',
    WWII: 'World War II',
  };
  if (knownLabels[normalized]) return knownLabels[normalized];
  return normalized.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getGroupId = (galleryPath) => {
  const lowerPath = galleryPath.toLowerCase();
  if (lowerPath.includes('/wild-west/') || lowerPath.includes('/western-cowboy-portraits/')) return 'wild-west';
  if (lowerPath.includes('/wwii/')) return 'wwii';
  if (lowerPath.includes('/civil-war')) return 'civil-war';
  if (lowerPath.includes('/roaring-20s')) return 'roaring-twenties';
  if (lowerPath.includes('/landscapes')) return 'landscapes';
  if (lowerPath.includes('/transportation')) return 'transportation';
  if (lowerPath.includes('/architecture')) return 'architecture';
  return 'portraits-other';
};

const getGalleryLabel = (galleryPath) => {
  const segments = galleryPath.split('/').filter(Boolean);
  const ignored = new Set([
    'Galleries',
    'Painterly-Fine-Art-Photography',
    'Fine-Art-Photography',
    'Facing-History',
    'Wild-West',
    'By-Theme',
    'By-Location',
    'Gallery',
  ]);
  const labels = segments.filter((segment) => !ignored.has(segment)).map(humanize);
  return labels.join(' · ') || 'K4 Studios Artwork';
};

const collectGalleryNodes = (nodes, ancestorHidden = false, output = []) => {
  for (const node of Array.isArray(nodes) ? nodes : [nodes]) {
    if (!node || typeof node !== 'object') continue;
    const hidden = ancestorHidden || node.hidden === true;
    if (!hidden && node.type === 'gallery-source' && typeof node.href === 'string') {
      if (!excludedPathPrefixes.some((prefix) => node.href.startsWith(prefix))) {
        output.push({ href: node.href, navLabel: cleanText(node.label) });
      }
    }
    if (Array.isArray(node.children)) collectGalleryNodes(node.children, hidden, output);
  }
  return output;
};

const resolveGalleryFile = async (href) => {
  let root;
  let relativePath;
  if (href.startsWith('/Galleries/')) {
    root = path.join(dataRoot, 'Galleries');
    relativePath = href.replace(/^\/Galleries\//, '');
  } else if (href.startsWith('/Other/')) {
    root = path.join(dataRoot, 'Other');
    relativePath = href.replace(/^\/Other\//, '');
  } else {
    return null;
  }

  const segments = relativePath.split('/').filter(Boolean);
  const flatFile = path.join(root, ...segments) + '.mjs';
  const nestedFile = path.join(root, ...segments, `${segments.at(-1)}.mjs`);
  for (const candidate of [flatFile, nestedFile]) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next supported source layout.
    }
  }
  return null;
};

const isPublicArtwork = (item) => {
  const id = String(item?.id || '').trim();
  const visibility = String(item?.visibility || '').trim().toLowerCase();
  return id.startsWith('i-') && id.toLowerCase() !== 'i-k4studios' && ['show', 'normal'].includes(visibility);
};

const mergeArtwork = (existing, candidate, location) => {
  if (!existing) {
    return {
      id: candidate.id,
      title: cleanText(candidate.title) || 'Untitled Artwork',
      description: cleanText(candidate.description),
      keywords: [...new Set((Array.isArray(candidate.keywords) ? candidate.keywords : []).map(cleanText).filter(Boolean))],
      groupIds: [location.groupId],
      locations: [location],
    };
  }

  const candidateTitle = cleanText(candidate.title);
  const candidateDescription = cleanText(candidate.description);
  if ((!existing.title || existing.title === 'Untitled Artwork') && candidateTitle) existing.title = candidateTitle;
  if (candidateDescription.length > existing.description.length) existing.description = candidateDescription;
  existing.keywords = [
    ...new Set([
      ...existing.keywords,
      ...(Array.isArray(candidate.keywords) ? candidate.keywords.map(cleanText).filter(Boolean) : []),
    ]),
  ];
  if (!existing.groupIds.includes(location.groupId)) existing.groupIds.push(location.groupId);
  if (!existing.locations.some((entry) => entry.path === location.path)) existing.locations.push(location);
  return existing;
};

const galleryNodes = collectGalleryNodes(siteNav);
const artworkById = new Map();
const gallerySummaries = [];
let skippedGalleries = 0;

for (const galleryNode of galleryNodes) {
  const galleryFile = await resolveGalleryFile(galleryNode.href);
  if (!galleryFile) {
    skippedGalleries += 1;
    continue;
  }

  const moduleUrl = `${pathToFileURL(galleryFile).href}?search-index=${Date.now()}`;
  const galleryModule = await import(moduleUrl);
  const galleryData = galleryModule.galleryData || galleryModule.default || [];
  const publicArtwork = Array.isArray(galleryData) ? galleryData.filter(isPublicArtwork) : [];
  const groupId = getGroupId(galleryNode.href);
  const galleryLabel = getGalleryLabel(galleryNode.href);

  gallerySummaries.push({
    path: galleryNode.href,
    label: galleryLabel,
    groupId,
    count: publicArtwork.length,
  });

  publicArtwork.forEach((item, index) => {
    const resolvedSeries = resolveImageSeries({
      image: item,
      galleryPath: galleryNode.href,
      registry: seriesRegistry,
    });
    const location = {
      path: galleryNode.href,
      label: galleryLabel,
      groupId,
      number: index + 1,
      total: publicArtwork.length,
      href: `${galleryNode.href}/${item.id}`,
      series: resolvedSeries.tiers.filter((tier) => standardSeries.has(tier)),
      storyExcerpt: truncateHardExcerpt(item.story || '', index < 50 ? 100 : 50),
      collectorNoteTeaser: truncateExcerpt(
        item.notes || item.collectorNotes || item.collector_notes || item.description || item.story || '',
        index < 50 ? 150 : 25,
      ),
      alt: cleanText(item.alt) || cleanText(item.description).split(/[.!?]/)[0].slice(0, 150) || cleanText(item.title),
    };
    artworkById.set(item.id, mergeArtwork(artworkById.get(item.id), item, location));
  });
}

const records = [...artworkById.values()]
  .map((record) => ({
    ...record,
    groupIds: record.groupIds.sort(),
    locations: record.locations.sort((a, b) => a.path.localeCompare(b.path)),
  }))
  .sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));

const groupMetadata = groups.map((group) => ({
  ...group,
  count: records.filter((record) => record.groupIds.includes(group.id)).length,
}));

const payload = {
  version: 2,
  generatedAt: new Date().toISOString(),
  recordCount: records.length,
  groups: groupMetadata,
  galleries: gallerySummaries.sort((a, b) => a.label.localeCompare(b.label) || a.path.localeCompare(b.path)),
  records,
};

const serialized = `${JSON.stringify(payload)}\n`;
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, serialized, 'utf8');

const outputSizeMb = (Buffer.byteLength(serialized) / 1024 / 1024).toFixed(2);
console.log(`Artwork search index written: ${records.length} unique works across ${gallerySummaries.length} galleries (${outputSizeMb} MB).`);
if (skippedGalleries > 0) console.log(`Skipped ${skippedGalleries} gallery entries with no matching data file.`);
