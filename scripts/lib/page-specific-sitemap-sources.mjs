import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const extensions = ['.ts', '.tsx', '.js', '.mjs', '.astro', '.json', '.md', '.mdx'];

// Infrastructure may locate content, but can never supply a page's date.
export const SHARED_ALL_ROUTE = 'src/pages/[...gallery]/all.astro';
export function isExcludedSitemapSource(relativePath) {
  return relativePath === SHARED_ALL_ROUTE
    || /^src\/(?:components|layouts|utils|styles)\//i.test(relativePath)
    || /(?:generated|registry|assignments|lookup)/i.test(relativePath)
    || /^src\/data\/(?:.*\/)?index\.[^.]+$/i.test(relativePath)
    || /^src\/data\/(?:galleryMaps|pricing|commerce|semantic)\//i.test(relativePath)
    || /^src\/data\/(?:siteNav|sitemap|imageIdMap|imageFilenameSlugs|landingMeta|essayClusterLinks)/i.test(relativePath)
    || /^src\/data\/doorway\/(?:commercialIntentPages|familyDoorwayPages|doorwayPages|limitedFirstCopy)/i.test(relativePath)
    || /^src\/data\/Other\/Expeditions\/shoots\./i.test(relativePath)
    || /^src\/data\/Other\/Blog\/posts\./i.test(relativePath)
    || /^src\/data\/Other\/Seeing\/(?:story|essays)\./i.test(relativePath)
    || /^src\/data\/Other\/Narrative-Art\/essays\./i.test(relativePath);
}

// Shared modules can locate a page's selected galleries, but their timestamps
// never enter this dependency set. There is deliberately no general import walk.
export function createPageSpecificSourceResolver({ repoRoot, resolveGalleryDataset, loadModule }) {
  const root = path.resolve(repoRoot);
  const cache = new Map();
  const relative = file => path.relative(root, file).replaceAll('\\', '/');

  function localPath(specifier, importer) {
    for (const [prefix, target] of [['@/', 'src/'], ['@data/', 'src/data/']]) {
      if (specifier.startsWith(prefix)) return path.resolve(root, target, specifier.slice(prefix.length));
    }
    return specifier.startsWith('.') ? path.resolve(path.dirname(importer), specifier) : null;
  }

  async function resolveImport(specifier, importer) {
    const base = localPath(specifier.replace(/[?#].*$/, ''), importer);
    if (!base) return null;
    const candidates = path.extname(base) ? [base] : extensions.map(ext => base + ext);
    for (const file of candidates) {
      try { if ((await stat(file)).isFile()) return file; }
      catch (error) { if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error; }
    }
    return null;
  }

  const isGallery = file => /^src\/data\/(?:Galleries|Other\/(?:K4-Select-Series|Photo-Shoots|Expeditions|Shows|Archive))\/.+\.mjs$/i.test(relative(file))
    && !/(?:backup| copy| copy\.|carousel|landingstones|entrancedata)/i.test(relative(file));

  function isOwnContent(file, slug) {
    const rel = relative(file);
    if (isExcludedSitemapSource(rel)) return false;
    if (!/^src\/(?:data|content)\//i.test(rel)) return false;
    const name = path.basename(file, path.extname(file)).toLowerCase();
    const dedicatedDirectory = rel.toLowerCase().split('/').slice(2, -1).includes(slug);
    return (!['all', 'index'].includes(slug) && name === slug)
      || (dedicatedDirectory && !/(?:build|dock|helper|landingstones|entrancedata)/i.test(name));
  }

  async function inspect(file) {
    if (!cache.has(file)) cache.set(file, (async () => {
      const fullSource = await readFile(file, 'utf8');
      let source = fullSource;
      if (file.endsWith('.json')) return { source, imports: [] };
      if (file.endsWith('.astro')) source = source.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] || '';
      const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const imports = [];
      for (const node of ast.statements) {
        if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly) imports.push(node.moduleSpecifier.text);
        if (ts.isExportDeclaration(node) && node.moduleSpecifier && !node.isTypeOnly) imports.push(node.moduleSpecifier.text);
      }
      return { source: fullSource, imports };
    })());
    return cache.get(file);
  }

  async function selectedGalleryPaths(source, urlPath) {
    if (!loadModule) return [];
    const paths = new Set();
    const configs = [];
    const keys = [...source.matchAll(/commercialIntentPages(?:\.(\w+)|\[\s*['"]([^'"]+)['"]\s*\])/g)].map(m => m[1] || m[2]);
    if (keys.length) {
      const mod = await loadModule('/src/data/doorway/commercialIntentPages.ts');
      for (const key of keys) if (mod.commercialIntentPages[key]) configs.push(mod.commercialIntentPages[key]);
    }
    const families = [...source.matchAll(/familyDoorwayPages(?:\.(\w+)|\[\s*['"]([^'"]+)['"]\s*\])/g)].map(m => m[1] || m[2]);
    if (families.length) {
      const mod = await loadModule('/src/data/doorway/familyDoorwayPages.ts');
      for (const key of families) if (mod.familyDoorwayPages[key]) configs.push(mod.familyDoorwayPages[key]);
    }
    if (/\bwesternFineArtPage\b/.test(source)) {
      const mod = await loadModule('/src/data/doorway/western-fine-art.ts');
      configs.push(mod.westernFineArtPage);
    }
    for (const config of configs) {
      if (!config) continue;
      for (const section of config.gridSections || []) {
        if (section.galleryPath) paths.add(section.galleryPath);
        if (section.alternateCtaHref) paths.add(section.alternateCtaHref.split('#')[0].replace(/\/all$/, ''));
      }
      if (!config.gridSections?.length && config.basePath?.startsWith('/Galleries/')) paths.add(config.basePath);
    }
    return [...paths];
  }

  return async function pageSpecificSources(routeFile, urlPath) {
    const slug = urlPath.split('/').filter(Boolean).at(-1)?.toLowerCase() || 'index';
    const files = new Map();
    if (!isExcludedSitemapSource(relative(path.resolve(routeFile)))) files.set(path.resolve(routeFile), 'route');
    const seen = new Set();
    async function visit(file) {
      if (seen.has(file)) return;
      seen.add(file);
      const { source, imports } = await inspect(file);
      // Essay illustration pools are not gallery sections. A direct import
      // alone does not make the entire dataset part of an editorial page.
      const displaysGallery = urlPath.startsWith('/Galleries/')
        || /\b(?:gridSections|gridImages|galleryDatasOverride|collectionGroups|rawGalleryData)\b|<(?:ChapterGallery|GalleryShell)/.test(source);
      for (const specifier of imports) {
        const dependency = await resolveImport(specifier, file);
        if (!dependency) continue;
        if (isExcludedSitemapSource(relative(dependency))) continue;
        if (isGallery(dependency)) {
          if (displaysGallery) files.set(dependency, 'gallery-dataset');
        }
        else if (isOwnContent(dependency, slug)) {
          files.set(dependency, 'page-content');
          await visit(dependency);
        }
      }
      for (const href of await selectedGalleryPaths(source, urlPath)) {
        const dataset = await resolveGalleryDataset(href);
        if (!dataset || !isGallery(dataset)) throw new Error(`No specific gallery dataset for ${urlPath}: ${href}`);
        files.set(dataset, 'gallery-dataset');
      }
    }
    await visit(path.resolve(routeFile));
    return [...files].map(([file, kind]) => ({ file, kind }));
  };
}
