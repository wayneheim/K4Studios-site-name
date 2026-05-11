// src/components/utils/getStructuredData.ts
import { getSemanticImageUrl, USE_SEMANTIC_IMAGE_URLS } from "../../utils/imageProxy.js";

// Helper to convert image to proxy URL (never expose SmugMug URLs in structured data)
function getProxyUrl(img: any, size: string = 'l', sourcePrefix: string | null = null): string {
  const prefix = sourcePrefix ? String(sourcePrefix).toUpperCase() : null;

  const applyPrefix = (imageId: string) => {
    if (!prefix) return imageId;
    if (/^(OG|TW|PN|SD)-/i.test(imageId)) return imageId;
    return `${prefix}-${imageId}`;
  };

  // Strip any existing source prefix to get bare ID
  const stripPrefix = (imageId: string) => imageId.replace(/^(OG|TW|PN|SD)-/i, '');

  // If we have an id, use the proxy
  if (img.id && img.id.startsWith('i-')) {
    if (!sourcePrefix && USE_SEMANTIC_IMAGE_URLS) {
      return getSemanticImageUrl(img, { galleryPath: img.galleryUrl }, size, { absolute: true });
    }
    return `https://www.k4studios.com/img/${applyPrefix(stripPrefix(img.id))}/${size}.jpg`;
  }
  // Try to extract id from src URL
  const idMatch = img.src?.match(/\/(i-[a-zA-Z0-9]+)\//);
  if (idMatch) {
    if (!sourcePrefix && USE_SEMANTIC_IMAGE_URLS) {
      return getSemanticImageUrl(stripPrefix(idMatch[1]), { galleryPath: img.galleryUrl }, size, { absolute: true });
    }
    return `https://www.k4studios.com/img/${applyPrefix(stripPrefix(idMatch[1]))}/${size}.jpg`;
  }
  // Fallback: if it's already a k4studios URL, use it
  if (img.src?.includes('k4studios.com')) {
    try {
      const u = new URL(String(img.src));
      if (u.hostname.endsWith('k4studios.com')) {
        const m = u.pathname.match(/^\/img\/((?:OG|TW|PN|SD)-)?(i-[a-zA-Z0-9-]+)\/(s|m|l|xl|src)(?:\.jpe?g)?\/?$/i);
        if (m) {
          const canonicalId = m[2];
          const safeSize = m[3] || size;
          if (!sourcePrefix && USE_SEMANTIC_IMAGE_URLS) {
            return getSemanticImageUrl(canonicalId, { galleryPath: img.galleryUrl }, safeSize, { absolute: true });
          }
          return `https://www.k4studios.com/img/${applyPrefix(canonicalId)}/${safeSize}.jpg`;
        }
      }
    } catch {
      // ignore and return as-is
    }
    return String(img.src);
  }
  // Last resort: return empty (shouldn't happen with proper data)
  return '';
}

function getAcquireLicensePage(source: any, fallback: string): string {
  const candidate = source?.acquireLicensePage || fallback || 'https://www.k4studios.com/licensing';

  try {
    const absolute = new URL(String(candidate), 'https://www.k4studios.com');
    if (absolute.hostname === 'k4studios.com') {
      absolute.hostname = 'www.k4studios.com';
    }
    return absolute.toString();
  } catch {
    return 'https://www.k4studios.com/licensing';
  }
}

/**
 * Strip collector-notes prose that was accidentally concatenated into
 * the keywords array.  Everything from the <<COLLECTOR NOTES>> sentinel
 * onward (including sentence-fragment entries that follow it) is removed.
 */
function sanitizeKeywords(kw: string | string[] | undefined): string | undefined {
  if (!kw) return undefined;
  const arr = Array.isArray(kw) ? kw : [kw];
  const clean: string[] = [];
  for (const entry of arr) {
    const idx = entry.indexOf('<<COLLECTOR NOTES>>');
    if (idx !== -1) {
      // keep only the portion before the sentinel
      const before = entry.substring(0, idx).replace(/\s+$/, '');
      if (before) clean.push(before);
      break;           // everything after this entry is collector-notes text
    }
    clean.push(entry);
  }
  if (clean.length === 0) return undefined;
  return clean.join(', ');
}

function canonicalizeK4Host(value: string): string {
  if (!value || typeof value !== "string") return value;
  return value
    .replace(/Â©/g, "Copyright")
    .replace(/©/g, "Copyright")
    .replace(/https?:\/\/(?:www\.)?k4studios\.com/gi, "https://www.k4studios.com")
    .replace(/https%3A%2F%2F(?:www\.)?k4studios\.com/gi, "https%3A%2F%2Fwww.k4studios.com")
    .replace(/https?:\\\/\\\/(?:www\.)?k4studios\.com/gi, "https:\\/\\/www.k4studios.com");
}

function normalizeSchemaValue<T>(value: T): T {
  if (typeof value === "string") {
    return canonicalizeK4Host(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeSchemaValue(item)) as T;
  }

  if (value && typeof value === "object") {
    const normalized: Record<string, any> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, any>)) {
      normalized[key] = normalizeSchemaValue(nestedValue);
    }
    return normalized as T;
  }

  return value;
}

function stringifySchema(value: any): string {
  return JSON.stringify(normalizeSchemaValue(value), null, 2);
}

const DEFAULT_GALLERY_ABOUT = [
  { "@type": "Thing", name: "Fine Art Photography" },
  { "@type": "Thing", name: "Photographic Art" },
];

const K4_PERSON_ID = "https://www.k4studios.com/#person";
const K4_ORGANIZATION_ID = "https://www.k4studios.com/#organization";
const K4_ORGANIZATION_URL = "https://www.k4studios.com/";
const K4_ORGANIZATION_LOGO = "https://www.k4studios.com/images/K4Logo-web-c.webp";
const K4_CREATOR_REF = { "@id": K4_PERSON_ID };
const K4_CREATOR_PERSON = {
  "@type": "Person",
  "@id": K4_PERSON_ID,
  name: "Wayne Heim",
  url: "https://www.k4studios.com/Other/Bio",
};

function buildArtworkOffer(data: any, fallbackAcquireLicensePage: string) {
  const offerUrl = data?.buyLink || data?.offerUrl || getAcquireLicensePage(data, fallbackAcquireLicensePage);
  if (!offerUrl) return undefined;

  return {
    "@type": "Offer",
    url: offerUrl,
    availability: "https://schema.org/InStock",
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@id": K4_ORGANIZATION_ID },
  };
}

function addAboutTerm(
  terms: Array<{ "@type": string; name: string }>,
  seen: Set<string>,
  type: "Thing" | "Place",
  name: string
) {
  const cleanName = name.trim();
  if (!cleanName) return;
  const key = `${type}:${cleanName.toLowerCase()}`;
  if (seen.has(key)) return;
  seen.add(key);
  terms.push({ "@type": type, name: cleanName });
}

function buildContextualAbout(data: any, fallback = DEFAULT_GALLERY_ABOUT) {
  const explicitAbout = normalizeExplicitAbout(data?.schemaAbout || data?.semanticAbout || data?.about);
  if (explicitAbout.length > 0) return explicitAbout;

  const terms: Array<{ "@type": string; name: string }> = [];
  const seen = new Set<string>();
  const pathText = [
    data?.url,
    data?.pageUrl,
    data?.galleryUrl,
    data?.collectionContext?.collectionUrl,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const text = [
    pathText,
    data?.title,
    data?.description,
    data?.alt,
    data?.story,
    Array.isArray(data?.keywords) ? data.keywords.join(" ") : data?.keywords,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const isLandscape = /landscape|landscapes|lake|mountain|waterfall|national park|rockies|iceland|faroe|newfoundland/.test(text);
  const isWestern = /western art|western-cowboy|western-narratives|western portrait|western fine art|cowboy|wild west|frontier|american west|native american/.test(text);
  const isPortrait = /portrait|portraits|reenactor/.test(text);
  const isHistorical = /civil war|wwi|wwii|world war|reenact|facing history|historical/.test(text);
  const isBlackWhite = /black[ -]?white|black & white|monochrome|bw\b/.test(text);
  const isEngrained = /engrained|wood print|wood/.test(text);
  const isPainterly = /painterly/.test(text);

  if (isLandscape) {
    addAboutTerm(terms, seen, "Thing", "Fine Art Landscape Photography");
  } else if (isPortrait) {
    addAboutTerm(terms, seen, "Thing", "Fine Art Portrait Photography");
  } else {
    addAboutTerm(terms, seen, "Thing", "Fine Art Photography");
  }

  if (isBlackWhite) addAboutTerm(terms, seen, "Thing", "Black and White Photography");
  if (isPainterly) addAboutTerm(terms, seen, "Thing", "Painterly Fine Art Photography");
  if (isEngrained) addAboutTerm(terms, seen, "Thing", "Engrained Wood Art");
  if (isWestern) addAboutTerm(terms, seen, "Thing", "Western Art");
  if (isHistorical) addAboutTerm(terms, seen, "Thing", "Historically Themed Photography");
  if (isHistorical && isPortrait) addAboutTerm(terms, seen, "Thing", "Historical Portraiture");

  const placeChecks: Array<[RegExp, string]> = [
    [/emerald lake/, "Emerald Lake"],
    [/canadian rockies|rockies/, "Canadian Rockies"],
    [/\byoho\b/, "Yoho National Park"],
    [/\bbanff\b/, "Banff National Park"],
    [/\bjasper\b/, "Jasper National Park"],
    [/british columbia/, "British Columbia"],
    [/\balberta\b/, "Alberta"],
    [/\biceland\b/, "Iceland"],
    [/faroe/, "Faroe Islands"],
    [/newfoundland/, "Newfoundland"],
  ];

  for (const [pattern, name] of placeChecks) {
    if (pattern.test(text)) addAboutTerm(terms, seen, "Place", name);
  }

  return terms.length > 0 ? terms : fallback;
}

function imagePathText(data: any): string {
  return [
    data?.url,
    data?.pageUrl,
    data?.galleryUrl,
    data?.collectionContext?.collectionUrl,
    data?.galleryTitle,
    data?.title,
    data?.description,
    data?.alt,
    Array.isArray(data?.keywords) ? data.keywords.join(" ") : data?.keywords,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function inferArtworkSchemaFields(data: any) {
  const text = imagePathText(data);
  const isEngrained = /engrained|wood print|wood panel|baltic birch/.test(text);
  const isPainterly = /painterly-fine-art-photography|painterly/.test(text);
  const isBlackWhite = /black-white|black white|black & white|monochrome|\bbw\b/.test(text);
  const isWesternNarrative = /western-narratives|narrative western|narrative photography/.test(text);
  const isCowboy = /western-cowboy-portraits|cowboy/.test(text);
  const isNativeAmerican = /native-americans|native american/.test(text);
  const isCivilWar = /civil-war|civil war/.test(text);
  const isWwii = /wwii|world war ii|wartime/.test(text);
  const isLandscape = /landscape|landscapes|water|mountain|sunset|iceland|faroe|newfoundland|canada-western/.test(text);
  const isPortrait = /portrait|portraits|reenactor/.test(text);
  const isTransportation = /transportation|cars|trains|planes|boats|classic car|route 66/.test(text);

  let artMedium = "Fine art photography";
  if (isEngrained) {
    artMedium = "UV-printed painterly photography on Baltic birch wood panel";
  } else if (isBlackWhite) {
    artMedium = "Black and white fine art photography";
  } else if (isPainterly) {
    artMedium = "Painterly fine art photography";
  }

  const genre: string[] = [];
  const addGenre = (value: string) => {
    if (!genre.includes(value)) genre.push(value);
  };

  if (isLandscape) addGenre("Landscape fine art photography");
  if (isPortrait) addGenre("Fine art portrait photography");
  if (isWesternNarrative) addGenre("Narrative photography");
  if (isCowboy) addGenre("Cowboy art");
  if (isNativeAmerican) addGenre("Native American historical art");
  if (isCivilWar) addGenre("Civil War art");
  if (isWwii) addGenre("WWII art");
  if (isCowboy || isNativeAmerican || isWesternNarrative) addGenre("Western fine art photography");
  if (isCivilWar || isWwii || isNativeAmerican) addGenre("Historical fine art photography");
  if (isTransportation && genre.length === 0) addGenre("Fine art photography");
  if (genre.length === 0) addGenre("Fine art photography");

  const additionalType =
    data?.additionalType ||
    (isEngrained || isWesternNarrative || /facing-history|cinematic|story|one-image movie/.test(text)
      ? "One-Image Movie"
      : undefined);

  return {
    artform: data?.artform || "Photograph",
    artMedium: data?.artMedium || artMedium,
    artworkSurface: data?.artworkSurface || (isEngrained ? "Baltic birch wood panel" : undefined),
    genre: data?.genre || (genre.length === 1 ? genre[0] : genre),
    additionalType,
  };
}

function normalizeExplicitAbout(value: any): Array<{ "@type": string; name: string }> {
  if (!Array.isArray(value)) return [];

  const terms: Array<{ "@type": string; name: string }> = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (typeof item === "string") {
      addAboutTerm(terms, seen, "Thing", item);
      continue;
    }

    if (!item || typeof item !== "object") continue;
    const name = typeof item.name === "string" ? item.name : "";
    const type = item["@type"] === "Place" ? "Place" : "Thing";
    addAboutTerm(terms, seen, type, name);
  }

  return terms;
}

export function getStructuredData({
  type,
  data,
  images = [],
  defaults = {},
}: {
  type: "gallery" | "image" | "Blog" | "BlogPosting" | "Article",
  data: any,
  images?: any[],
  defaults?: {
    copyrightNotice?: string,
    license?: string,
    acquireLicensePage?: string,
    creditText?: string,
    creatorName?: string,
    creatorUrl?: string,
    creatorSameAs?: string[],
    organizationSameAs?: string[]
  }
}): string {
  const {
    copyrightNotice = "Copyright Wayne Heim, www.k4studios.com. All rights reserved.",
    license = "https://www.k4studios.com/licensing",
    acquireLicensePage = "https://www.k4studios.com/licensing",
    creditText = "Wayne Heim",
    organizationSameAs = [],
  } = defaults;

  /* ============================================================
     TYPE: GALLERY / COLLECTION PAGE
  ============================================================ */
  if (type === "gallery") {
    const featuredImages = images.slice(0, 8).map((img) => {
      const proxyUrl = getProxyUrl(img, 'l');
      const publishedDate = img.datePublished || img.dateCreated;
      const modifiedDate = img.dateModified;

      return {
        "@type": "ImageObject",
        "@id": proxyUrl ? `${proxyUrl}#image` : undefined,
        url: proxyUrl || undefined,
        name: img.title,
        caption: img.description || img.alt || img.title,
        inLanguage: "en",
        encodingFormat: img.mimeType || "image/jpeg",
        license: img.license || license,
        creditText: img.creditText || creditText,
        copyrightNotice: img.copyrightNotice || copyrightNotice,
        acquireLicensePage: getAcquireLicensePage(img, acquireLicensePage),
        creator: K4_CREATOR_REF,
        copyrightHolder: K4_CREATOR_REF,
        ...(publishedDate ? { datePublished: publishedDate } : {}),
        ...(modifiedDate ? { dateModified: modifiedDate } : {}),
        ...(img.thumbnailUrl ? { thumbnailUrl: getProxyUrl(img, 's') } : {}),
        ...(img.width ? { width: img.width } : {}),
        ...(img.height ? { height: img.height } : {}),
      };
    });

    const collectionPublishedDate = data.datePublished || data.dateCreated;
    const collectionModifiedDate = data.dateModified;

    const collectionObj: any = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${data.url}#collection`,
      name: data.title,
      description: data.description,
      url: data.url,
      genre: data.genre || "Fine Art Photography",
      about: buildContextualAbout(data),
      mainEntity: {
        "@type": "ImageGallery",
        "@id": `${data.url}#imagegallery`,
        name: data.title,
        description: data.description,
        creator: K4_CREATOR_REF,
        copyrightHolder: K4_CREATOR_REF,
        image: featuredImages,
      },
      ...(collectionPublishedDate ? { datePublished: collectionPublishedDate } : {}),
      ...(collectionModifiedDate ? { dateModified: collectionModifiedDate } : {}),
      creator: K4_CREATOR_REF,
      copyrightHolder: K4_CREATOR_REF,
      copyrightNotice: data.copyrightNotice || copyrightNotice,
      inLanguage: "en",
    };

    if (data.keywords) {
      const cleaned = sanitizeKeywords(data.keywords);
      if (cleaned) collectionObj.keywords = cleaned;
    }

    return stringifySchema(collectionObj);
  }

  /* ============================================================
     TYPE: IMAGE / ARTWORK PAGE
  ============================================================ */
  if (type === "image") {
    const proxyUrl = getProxyUrl(data, 'l');
    const artworkPageUrl = data.pageUrl || data.url;
    const imagePublishedDate = data.datePublished || data.dateCreated;
    const imageModifiedDate = data.dateModified;
    const artworkFields = inferArtworkSchemaFields(data);
    const obj: any = {
      "@context": "https://schema.org",
      "@type": ["ImageObject", "VisualArtwork"],
      "@id": artworkPageUrl ? `${artworkPageUrl}#image` : (proxyUrl ? `${proxyUrl}#image` : undefined),
      name: data.title,
      description: data.description,
      caption: data.caption || data.alt || data.title,
      contentUrl: proxyUrl || undefined,
      url: artworkPageUrl || undefined,
      encodingFormat: data.mimeType || "image/jpeg",
      identifier: data.id || data.smugId || data.src?.split("/").pop() || "",
      license: data.license || license,
      creditText: data.creditText || creditText,
      copyrightNotice: data.copyrightNotice || copyrightNotice,
      acquireLicensePage: getAcquireLicensePage(data, acquireLicensePage),
      creator: K4_CREATOR_REF,
      artist: K4_CREATOR_REF,
      copyrightHolder: K4_CREATOR_REF,
      // VisualArtwork properties (top-level for Google)
      artform: artworkFields.artform,
      artMedium: artworkFields.artMedium,
      ...(artworkFields.artworkSurface ? { artworkSurface: artworkFields.artworkSurface } : {}),
      genre: artworkFields.genre,
      ...(artworkFields.additionalType ? { additionalType: artworkFields.additionalType } : {}),
      about: buildContextualAbout(data),
      isAccessibleForFree: true,
      offers: buildArtworkOffer(data, acquireLicensePage),
      ...(imagePublishedDate ? { datePublished: imagePublishedDate } : {}),
      ...(imageModifiedDate ? { dateModified: imageModifiedDate } : {}),
      inLanguage: "en",
      mainEntityOfPage: { "@type": "WebPage", "@id": data.pageUrl || data.url },
    };

    if (data.galleryUrl) {
      const imageGallery = {
        "@type": "ImageGallery",
        "@id": data.galleryUrl + "#imagegallery",
        name: data.galleryTitle || "Gallery",
        url: data.galleryUrl,
      };

      const seriesContext = data.collectionContext;
      if (seriesContext?.seriesName && seriesContext?.collectionUrl) {
        obj.isPartOf = [
          imageGallery,
          {
            "@type": "CreativeWorkSeries",
            name: seriesContext.seriesName,
            url: seriesContext.collectionUrl,
          },
        ];
      } else {
        obj.isPartOf = imageGallery;
      }
    }

    if (data.thumbnailUrl) obj.thumbnailUrl = data.thumbnailUrl;
    if (data.width) obj.width = data.width;
    if (data.height) obj.height = data.height;

    return stringifySchema(obj);
  }

  /* ============================================================
     TYPE: BLOG INDEX / BLOG PAGE
  ============================================================ */
  if (type === "Blog") {
    const blogObj: any = {
      "@context": "https://schema.org",
      "@type": "Blog",
      "@id": `${data.url}#blog`,
      name: data.name || data.title,
      headline: data.name || data.title,
      description: data.description,
      url: data.url,
      mainEntityOfPage: { "@type": "WebPage", "@id": data.url },
      inLanguage: "en",
      author: data.author || K4_CREATOR_PERSON,
      publisher: {
        "@type": "Organization",
        "@id": K4_ORGANIZATION_ID,
        name: "K4 Studios",
        url: K4_ORGANIZATION_URL,
        logo: {
          "@type": "ImageObject",
          url: K4_ORGANIZATION_LOGO,
          width: 512,
          height: 512,
        },
        ...(organizationSameAs.length ? { sameAs: organizationSameAs } : {}),
      },
      copyrightHolder: K4_CREATOR_REF,
      copyrightNotice: data.copyrightNotice || copyrightNotice,
    };

    if (Array.isArray(data.blogPost) && data.blogPost.length) {
      blogObj.blogPost = data.blogPost;
    }

    return stringifySchema(blogObj);
  }

  /* ============================================================
     TYPE: BLOG POST
  ============================================================ */
  if (type === "BlogPosting") {
    const today = new Date().toISOString().split("T")[0];
    const defaultDate = `${today}T00:00:00Z`;

    function ensureIsoWithTimezone(dateStr: string | undefined): string {
      if (!dateStr) return defaultDate;
      if (/T.*Z$/.test(dateStr)) return dateStr;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return `${dateStr}T00:00:00Z`;
      return dateStr;
    }

    const publisherObj = {
      "@type": "Organization",
      "@id": K4_ORGANIZATION_ID,
      name: "K4 Studios",
      url: K4_ORGANIZATION_URL,
      logo: {
        "@type": "ImageObject",
        url: K4_ORGANIZATION_LOGO,
        width: 512,
        height: 512,
      },
      ...(organizationSameAs.length ? { sameAs: organizationSameAs } : {}),
    };

    const obj: any = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": `${data.url}#blogpost`,
      headline: data.headline || data.title,
      description: data.description,
      articleBody: data.body || data.excerpt || "",
      url: data.url,
      mainEntityOfPage: { "@type": "WebPage", "@id": data.url },
      image:
        data.image ||
        (images.length
          ? images.map((img) => getProxyUrl(img, 'l')).filter(Boolean)
          : "https://www.k4studios.com/images/K4Logo-web-c.webp"),
      datePublished: ensureIsoWithTimezone(data.datePublished),
      dateModified: ensureIsoWithTimezone(data.dateModified || data.datePublished),
      author: data.author || K4_CREATOR_PERSON,
      publisher: publisherObj,
      copyrightHolder: K4_CREATOR_REF,
      copyrightNotice: data.copyrightNotice || copyrightNotice,
      genre: data.genre || "Fine Art Photography Commentary",
      wordCount:
        typeof data.wordCount === "number"
          ? data.wordCount
          : data.body?.trim().split(/\s+/).length || 950,
      inLanguage: "en",
    };

    if (data.keywords?.length) {
      const cleaned = sanitizeKeywords(data.keywords);
      if (cleaned) obj.keywords = cleaned;
    }
    if (data.articleSection) obj.articleSection = data.articleSection;

    return stringifySchema(obj);
  }

  /* ============================================================
     TYPE: ARTICLE (Definition/About Pages)
  ============================================================ */
  if (type === "Article") {
    const todayIso = new Date().toISOString().split("T")[0];
    
    const publisherObj = {
      "@type": "Organization",
      "@id": K4_ORGANIZATION_ID,
      name: "K4 Studios",
      url: K4_ORGANIZATION_URL,
      logo: {
        "@type": "ImageObject",
        url: K4_ORGANIZATION_LOGO,
        width: 512,
        height: 512,
      },
      ...(organizationSameAs.length ? { sameAs: organizationSameAs } : {}),
    };

    const articleObj: any = {
      "@context": "https://schema.org",
      "@type": "Article",
      "@id": `${data.url}#article`,
      headline: data.headline || data.title,
      name: data.title || data.headline,
      description: data.description,
      url: data.url,
      mainEntityOfPage: { "@type": "WebPage", "@id": data.url },
      image: data.image || "https://www.k4studios.com/images/K4Logo-web-c.webp",
      datePublished: data.datePublished || todayIso,
      dateModified: data.dateModified || data.datePublished || todayIso,
      author: data.author || K4_CREATOR_PERSON,
      publisher: publisherObj,
      copyrightHolder: K4_CREATOR_REF,
      copyrightNotice: data.copyrightNotice || copyrightNotice,
      inLanguage: "en",
      ...(data.articleSection ? { articleSection: data.articleSection } : {}),
      ...(data.keywords?.length ? { keywords: sanitizeKeywords(data.keywords) } : {}),
    };

    // Add DefinedTerm schema if this is a definition page
    if (data.definedTerm) {
      articleObj.about = {
        "@type": "DefinedTerm",
        "@id": `${data.url}#definedterm`,
        name: data.definedTerm.name,
        description: data.definedTerm.description,
        inDefinedTermSet: data.definedTerm.termSet || "https://www.k4studios.com/Glossary",
      };
    }

    // Add FAQ schema if sections with Q&A structure
    if (data.faqItems?.length) {
      articleObj.hasPart = {
        "@type": "FAQPage",
        mainEntity: data.faqItems.map((item: { question: string; answer: string }) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      };
    }

    return stringifySchema(articleObj);
  }

  return "";
}

/* ============================================================
   BREADCRUMB HELPERS
============================================================ */
export function getBreadcrumbList(
  items: Array<{ name: string; item: string }>,
  id?: string
): string {
  const itemListElement = items.map((it, idx) => ({
    "@type": "ListItem",
    position: idx + 1,
    name: it.name,
    item: it.item,
  }));
  const last = items[items.length - 1];
  return stringifySchema({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": id || `${last.item}#breadcrumbs`,
    itemListElement,
  });
}

export function getBlogBreadcrumbList(
  data: { title: string; url: string },
  opts?: { blogName?: string; blogPath?: string; homeName?: string }
): string {
  const blogName = opts?.blogName ?? "Inside the Frame";
  const blogPath = opts?.blogPath ?? "/Blog";
  const homeName = opts?.homeName ?? "Home";
  const origin = new URL(data.url).origin;
  const items = [
    { name: homeName, item: `${origin}/` },
    { name: blogName, item: `${origin}${blogPath}` },
    { name: data.title, item: data.url },
  ];
  return getBreadcrumbList(items);
}

export function getGalleryBreadcrumbList(
  data: { title: string; url: string },
  opts?: { galleriesName?: string; galleriesPath?: string; homeName?: string }
): string {
  const galleriesName = opts?.galleriesName ?? "Galleries";
  const galleriesPath = opts?.galleriesPath ?? "/galleries";
  const homeName = opts?.homeName ?? "Home";
  const origin = new URL(data.url).origin;
  const items = [
    { name: homeName, item: `${origin}/` },
    { name: galleriesName, item: `${origin}${galleriesPath}` },
    { name: data.title, item: data.url },
  ];
  return getBreadcrumbList(items);
}
