import fs from "node:fs";
import path from "node:path";

const distRoot = path.resolve("dist");
const siteOrigin = "https://www.k4studios.com";

const sampleGroups = [
  {
    group: "Western Cowboy Portraits Color",
    baseRoute: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color",
  },
  {
    group: "Western Cowboy Portraits Black & White",
    baseRoute: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White",
  },
  {
    group: "Wild West / Western Narratives Color",
    baseRoute: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color",
  },
  {
    group: "Native Americans Color",
    baseRoute: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color",
  },
  {
    group: "Civil War Color",
    baseRoute: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color",
  },
  {
    group: "WWII Color - Portraits",
    baseRoute: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color",
  },
  {
    group: "WWII Color - War",
    baseRoute: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Color",
  },
  {
    group: "Engrained",
    baseRoute: "/Other/K4-Select-Series/Engrained/Engrained-Series",
  },
  {
    group: "Traditional Galleries - Landscapes",
    baseRoute: "/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Water",
  },
  {
    group: "Traditional Galleries - Portraits",
    baseRoute: "/Galleries/Fine-Art-Photography/Portraits/Color",
  },
  {
    group: "Traditional Galleries - Transportation",
    baseRoute: "/Galleries/Fine-Art-Photography/Transportation/Cars",
  },
];

function routeToDir(route) {
  return path.join(distRoot, ...route.split("/").filter(Boolean));
}

function firstImageRoute(baseRoute) {
  const dir = routeToDir(baseRoute);
  if (!fs.existsSync(dir)) return null;

  const entry = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((item) => item.isDirectory() && /^i-[A-Za-z0-9-]+$/.test(item.name))
    .map((item) => item.name)
    .sort()[0];

  return entry ? `${baseRoute}/${entry}` : null;
}

function htmlPathForRoute(route) {
  return path.join(routeToDir(route), "index.html");
}

function extractJsonLd(html) {
  const blocks = [];
  const pattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    const raw = match[1].trim();
    try {
      blocks.push(JSON.parse(raw));
    } catch (error) {
      blocks.push({ parseError: error.message, raw });
    }
  }
  return blocks;
}

function flattenNodes(value, nodes = []) {
  if (Array.isArray(value)) {
    for (const item of value) flattenNodes(item, nodes);
    return nodes;
  }

  if (!value || typeof value !== "object") return nodes;

  if (value["@graph"]) flattenNodes(value["@graph"], nodes);
  if (value["@type"]) nodes.push(value);

  for (const nested of Object.values(value)) {
    if (nested && typeof nested === "object") flattenNodes(nested, nodes);
  }

  return nodes;
}

function typeList(node) {
  const type = node?.["@type"];
  return Array.isArray(type) ? type.map(String) : type ? [String(type)] : [];
}

function hasType(node, wanted) {
  return typeList(node).includes(wanted);
}

function textValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join(" | ");
  if (typeof value === "object") return value.name || value.url || value["@id"] || "";
  return String(value);
}

function pathWithoutIndex(fileRoute) {
  return fileRoute.replace(/\/index\.html$/, "").replace(/\\/g, "/");
}

function auditRoute(group, route) {
  const filePath = htmlPathForRoute(route);
  if (!fs.existsSync(filePath)) {
    return { group, route, error: "Rendered HTML not found" };
  }

  const html = fs.readFileSync(filePath, "utf8");
  const noindex = /<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
  const jsonLd = extractJsonLd(html);
  const nodes = jsonLd.flatMap((block) => flattenNodes(block));
  const canonical = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] || "";
  const routeUrl = `${siteOrigin}${route}`;

  const imageNodes = nodes.filter((node) => hasType(node, "ImageObject") || hasType(node, "VisualArtwork"));
  const richImageNodes = imageNodes.filter((node) =>
    hasType(node, "ImageObject") &&
    hasType(node, "VisualArtwork") &&
    Boolean(node.name) &&
    Boolean(node.description) &&
    Boolean(node.contentUrl || node.image || node.url) &&
    Boolean(node.creator || node.artist) &&
    Boolean(node.copyrightHolder) &&
    Boolean(node.creditText) &&
    Boolean(node.license) &&
    Boolean(node.isPartOf) &&
    Boolean(node.artform) &&
    Boolean(node.artMedium) &&
    Boolean(node.genre)
  );

  const fallbackImageNodes = imageNodes.filter((node) =>
    hasType(node, "ImageObject") &&
    hasType(node, "VisualArtwork") &&
    !node.isPartOf &&
    String(node["@id"] || "").endsWith("#image")
  );

  const webPageNodes = nodes.filter((node) => hasType(node, "WebPage"));
  const breadcrumbNodes = nodes.filter((node) => hasType(node, "BreadcrumbList"));
  const imageIds = imageNodes.map((node) => node["@id"]).filter(Boolean);
  const duplicateImageIds = imageIds.filter((id, index) => imageIds.indexOf(id) !== index);
  const conflictingCanonical = canonical && canonical !== routeUrl;

  let classification = "B) fallback-only schema";
  if (richImageNodes.length > 0) classification = "A) rich explicit schema";
  if (
    duplicateImageIds.length > 0 ||
    richImageNodes.length > 1 ||
    (richImageNodes.length > 0 && fallbackImageNodes.length > 0) ||
    conflictingCanonical
  ) {
    classification = "C) duplicated/conflicting schema";
  }

  const primaryImageNode = richImageNodes[0] || fallbackImageNodes[0] || imageNodes[0] || {};
  const imageUrl = textValue(primaryImageNode.contentUrl || primaryImageNode.image || primaryImageNode.url);
  const pageId = textValue(primaryImageNode.mainEntityOfPage);
  const isPartOf = textValue(primaryImageNode.isPartOf);

  return {
    group,
    route,
    file: pathWithoutIndex(path.relative(distRoot, filePath)),
    indexable: !noindex,
    classification,
    jsonLdBlocks: jsonLd.length,
    imageNodeCount: imageNodes.length,
    webPageNodeCount: webPageNodes.length,
    breadcrumbNodeCount: breadcrumbNodes.length,
    hasImageObject: imageNodes.some((node) => hasType(node, "ImageObject")),
    hasVisualArtwork: imageNodes.some((node) => hasType(node, "VisualArtwork")),
    name: primaryImageNode.name || "",
    descriptionPresent: Boolean(primaryImageNode.description),
    imageUrl,
    canonicalImgPath: /^https:\/\/www\.k4studios\.com\/img\/i-[A-Za-z0-9-]+\/.+/i.test(imageUrl),
    creator: textValue(primaryImageNode.creator || primaryImageNode.artist),
    copyrightHolder: textValue(primaryImageNode.copyrightHolder),
    creditText: primaryImageNode.creditText || "",
    license: primaryImageNode.license || "",
    acquireLicensePage: textValue(primaryImageNode.acquireLicensePage),
    isPartOf,
    hasIsPartOf: Boolean(primaryImageNode.isPartOf),
    artform: primaryImageNode.artform || "",
    artMedium: primaryImageNode.artMedium || "",
    artworkSurface: primaryImageNode.artworkSurface || "",
    genre: primaryImageNode.genre || "",
    additionalType: primaryImageNode.additionalType || "",
    aboutPresent: Boolean(primaryImageNode.about),
    keywordsPresent: Boolean(primaryImageNode.keywords),
    hasBreadcrumbList: breadcrumbNodes.length > 0,
    canonical,
    canonicalMatchesRoute: canonical === routeUrl,
    mainEntityOfPage: pageId,
    mainEntityOfPageMatchesCanonical: pageId === canonical || pageId === `${canonical}#webpage`,
    notes: [
      fallbackImageNodes.length > 0 ? "BaseLayout fallback ImageObject/VisualArtwork present" : "",
      webPageNodes.length > 1 ? "Multiple WebPage nodes present; not necessarily conflicting if IDs differ" : "",
      duplicateImageIds.length > 0 ? `Duplicate image @id: ${[...new Set(duplicateImageIds)].join(", ")}` : "",
      conflictingCanonical ? "Canonical does not match route URL" : "",
    ].filter(Boolean),
  };
}

function walkHtml(dir, pages = []) {
  if (!fs.existsSync(dir)) return pages;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkHtml(filePath, pages);
    } else if (entry.isFile() && entry.name === "index.html") {
      const route = `/${path
        .relative(distRoot, path.dirname(filePath))
        .replace(/\\/g, "/")}`;
      if (/\/i-[A-Za-z0-9-]+$/.test(route)) pages.push(route);
    }
  }

  return pages;
}

const results = sampleGroups.map(({ group, baseRoute }) => {
  const route = firstImageRoute(baseRoute);
  return route ? auditRoute(group, route) : { group, baseRoute, error: "No image route found" };
});

const summary = results.reduce(
  (acc, result) => {
    const key = result.classification || "error";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  },
  {}
);

const allImageResults = walkHtml(distRoot)
  .sort()
  .map((route) => auditRoute("all image pages", route))
  .filter((result) => result.indexable !== false);
const fullSummary = allImageResults.reduce(
  (acc, result) => {
    const key = result.classification || "error";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  },
  {}
);

const fallbackOnlyImagePages = allImageResults
  .filter((result) => result.classification === "B) fallback-only schema")
  .map((result) => result.route);

const duplicatedOrConflictingImagePages = allImageResults
  .filter((result) => result.classification === "C) duplicated/conflicting schema")
  .map((result) => ({
    route: result.route,
    notes: result.notes,
  }));

const rawOrSmugMugImageUrlPages = allImageResults
  .filter((result) => result.imageUrl && !result.canonicalImgPath)
  .map((result) => ({
    route: result.route,
    imageUrl: result.imageUrl,
  }));

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  sampleSummary: summary,
  fullImagePageSummary: fullSummary,
  sampledResults: results,
  fallbackOnlyImagePages,
  duplicatedOrConflictingImagePages,
  rawOrSmugMugImageUrlPages,
}, null, 2));
