import fs from "node:fs";
import path from "node:path";

const root = path.resolve("dist");

function walk(dir, pages = []) {
  if (!fs.existsSync(dir)) return pages;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(filePath, pages);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      pages.push(filePath);
    }
  }

  return pages;
}

function routeFor(filePath) {
  let route = `/${path.relative(root, filePath).replace(/\\/g, "/")}`;
  route = route.replace(/(^|\/)index\.html$/, "$1").replace(/\.html$/, "");
  if (route.length > 1) route = route.replace(/\/$/, "");
  return route || "/";
}

function classify(route) {
  if (/\/i-[A-Za-z0-9-]+$/.test(route)) return "image detail pages";
  if (/\/(?:Color|Black-White|NA-Color|NA-Black-White|Gallery)$/.test(route)) return "gallery color/B&W pages";
  if (
    route.startsWith("/Galleries/") ||
    route.startsWith("/Other/Archive") ||
    route.startsWith("/Other/K4-Select-Series/")
  ) {
    return "gallery parent pages";
  }
  if (route.startsWith("/Blog/")) return "blog pages";
  if (/\/(?:western-art-prints|prints|wall-art|Interior-Design|Designers|commercial|licensing)/i.test(route)) return "commercial pages";
  if (route === "/" || route === "/Galleries" || route === "/Blog" || route.startsWith("/Other/Series")) return "home/major hubs";
  return "doorway/definition pages";
}

function extractJsonLdBlocks(html) {
  const blocks = [];
  const pattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    blocks.push(match[1].trim());
  }
  return blocks;
}

function extractTypesFromValue(value, types = []) {
  if (Array.isArray(value)) {
    for (const item of value) extractTypesFromValue(item, types);
    return types;
  }

  if (!value || typeof value !== "object") return types;

  const type = value["@type"];
  if (Array.isArray(type)) {
    for (const item of type) types.push(String(item));
  } else if (type) {
    types.push(String(type));
  }

  for (const nested of Object.values(value)) extractTypesFromValue(nested, types);
  return types;
}

function parseTypes(blocks) {
  const types = [];
  const invalid = [];

  for (const block of blocks) {
    try {
      types.push(...extractTypesFromValue(JSON.parse(block)));
    } catch (error) {
      invalid.push(error.message);
      for (const match of block.matchAll(/"@type"\s*:\s*"([^"]+)"/g)) {
        types.push(match[1]);
      }
    }
  }

  return { types: [...new Set(types)], invalid };
}

const pages = walk(root)
  .map((filePath) => {
    const html = fs.readFileSync(filePath, "utf8");
    const blocks = extractJsonLdBlocks(html);
    const { types, invalid } = parseTypes(blocks);
    const noindex = /<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
    const route = routeFor(filePath);

    return {
      route,
      filePath,
      typeGroup: classify(route),
      indexable: !noindex,
      jsonLdCount: blocks.length,
      hasJsonLd: blocks.length > 0,
      hasBreadcrumbList: types.includes("BreadcrumbList"),
      types,
      invalidJsonLdCount: invalid.length,
      invalidJsonLdErrors: invalid,
    };
  })
  .sort((a, b) => a.route.localeCompare(b.route));

const indexable = pages.filter((page) => page.indexable);
const missingJsonLd = indexable.filter((page) => !page.hasJsonLd);
const grouped = {};

for (const page of indexable) {
  grouped[page.typeGroup] ||= {
    total: 0,
    missingJsonLd: [],
    missingBreadcrumbList: [],
    missingExpectedType: [],
    invalidJsonLd: [],
  };

  const group = grouped[page.typeGroup];
  group.total += 1;

  if (!page.hasJsonLd) group.missingJsonLd.push(page.route);
  if (page.route !== "/" && !page.hasBreadcrumbList) group.missingBreadcrumbList.push(page.route);

  const expectedByGroup = {
    "image detail pages": ["ImageObject"],
    "gallery color/B&W pages": ["CollectionPage", "ImageGallery"],
    "gallery parent pages": ["CollectionPage", "ImageGallery", "WebPage"],
    "doorway/definition pages": ["WebPage", "Article", "CollectionPage", "FAQPage"],
    "blog pages": ["BlogPosting", "Blog", "Article"],
    "commercial pages": ["CollectionPage", "WebPage", "FAQPage", "Product"],
    "home/major hubs": ["WebPage", "CollectionPage", "ImageGallery"],
  };
  const expected = expectedByGroup[page.typeGroup] || [];
  if (expected.length && !expected.some((type) => page.types.includes(type))) {
    group.missingExpectedType.push({
      route: page.route,
      expected,
      found: page.types,
    });
  }
  if (page.invalidJsonLdCount) {
    group.invalidJsonLd.push({
      route: page.route,
      invalidJsonLdCount: page.invalidJsonLdCount,
      errors: page.invalidJsonLdErrors,
    });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  totals: {
    htmlPages: pages.length,
    indexablePages: indexable.length,
    missingJsonLdPages: missingJsonLd.length,
    invalidJsonLdPages: indexable.filter((page) => page.invalidJsonLdCount).length,
  },
  grouped,
};

console.log(JSON.stringify(report, null, 2));
