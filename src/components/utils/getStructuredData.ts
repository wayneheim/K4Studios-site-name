// src/components/utils/getStructuredData.ts

// Helper to convert image to proxy URL (never expose SmugMug URLs in structured data)
function getProxyUrl(img: any, size: string = 'l', sourcePrefix: string | null = 'SD'): string {
  const prefix = sourcePrefix ? String(sourcePrefix).toUpperCase() : null;

  const applyPrefix = (imageId: string) => {
    if (!prefix) return imageId;
    if (/^(OG|TW|PN|SD)-/i.test(imageId)) return imageId;
    return `${prefix}-${imageId}`;
  };

  // If we have an id, use the proxy
  if (img.id && img.id.startsWith('i-')) {
    return `https://k4studios.com/img/${applyPrefix(img.id)}/${size}`;
  }
  // Try to extract id from src URL
  const idMatch = img.src?.match(/\/(i-[a-zA-Z0-9]+)\//);
  if (idMatch) {
    return `https://k4studios.com/img/${applyPrefix(idMatch[1])}/${size}`;
  }
  // Fallback: if it's already a k4studios URL, use it
  if (img.src?.includes('k4studios.com')) {
    try {
      const u = new URL(String(img.src));
      if (u.hostname.endsWith('k4studios.com')) {
        const m = u.pathname.match(/^\/img\/((?:OG|TW|PN|SD)-)?(i-[a-zA-Z0-9-]+)\/(s|m|l|xl|src)\/?$/);
        if (m) {
          const canonicalId = m[2];
          const safeSize = m[3] || size;
          return `https://k4studios.com/img/${applyPrefix(canonicalId)}/${safeSize}`;
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

// Helper to generate licensing inquiry URL (never expose SmugMug buyLinks)
function getLicenseUrl(img: any): string {
  const id = img.id || img.src?.match(/\/(i-[a-zA-Z0-9]+)\//)?.[1] || '';
  const title = encodeURIComponent(img.title || 'Untitled');
  if (id) {
    return `https://k4studios.com/Contact?license=${id}&title=${title}`;
  }
  return 'https://k4studios.com/Contact';
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

export function getStructuredData({
  type,
  data,
  images = [],
  defaults = {},
}: {
  type: "gallery" | "image" | "BlogPosting" | "Article",
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
    copyrightNotice = "© Wayne Heim, k4studios.com. All rights reserved.",
    license = "https://k4studios.com/licensing",
    acquireLicensePage = "https://k4studios.com/licensing",
    creditText = "Wayne Heim",
    creatorName = "Wayne Heim",
    creatorUrl = "https://k4studios.com/",
    creatorSameAs = [],
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
        acquireLicensePage: getLicenseUrl(img),
        creator: {
          "@type": "Person",
          name: creatorName,
          url: creatorUrl,
          ...(creatorSameAs.length ? { sameAs: creatorSameAs } : {}),
        },
        copyrightHolder: {
          "@type": "Person",
          name: creatorName,
          url: creatorUrl,
        },
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
      about: data.about || [
        { "@type": "Thing", name: "Painterly Fine Art Photography" },
        { "@type": "Thing", name: "Western Art" },
        { "@type": "Thing", name: "Historical Portraiture" },
      ],
      mainEntity: {
        "@type": "ImageGallery",
        "@id": `${data.url}#imagegallery`,
        name: data.title,
        description: data.description,
        image: featuredImages,
      },
      ...(collectionPublishedDate ? { datePublished: collectionPublishedDate } : {}),
      ...(collectionModifiedDate ? { dateModified: collectionModifiedDate } : {}),
      creator: { "@type": "Person", name: creatorName, url: creatorUrl },
      copyrightHolder: { "@type": "Person", name: creatorName, url: creatorUrl },
      copyrightNotice: data.copyrightNotice || copyrightNotice,
      inLanguage: "en",
    };

    if (data.keywords) {
      const cleaned = sanitizeKeywords(data.keywords);
      if (cleaned) collectionObj.keywords = cleaned;
    }

    return JSON.stringify(collectionObj, null, 2);
  }

  /* ============================================================
     TYPE: IMAGE / ARTWORK PAGE
  ============================================================ */
  if (type === "image") {
    const proxyUrl = getProxyUrl(data, 'l');
    const imagePublishedDate = data.datePublished || data.dateCreated;
    const imageModifiedDate = data.dateModified;
    const obj: any = {
      "@context": "https://schema.org",
      "@type": "ImageObject",
      "@id": proxyUrl ? `${proxyUrl}#image` : `${data.url}#image`,
      name: data.title,
      description: data.description,
      caption: data.alt || data.title,
      contentUrl: proxyUrl || undefined,
      url: proxyUrl || undefined,
      encodingFormat: data.mimeType || "image/jpeg",
      identifier: data.id || data.smugId || data.src?.split("/").pop() || "",
      license: data.license || license,
      creditText: data.creditText || creditText,
      copyrightNotice: data.copyrightNotice || copyrightNotice,
      acquireLicensePage: getLicenseUrl(data),
      creator: {
        "@type": "Person",
        name: creatorName,
        url: creatorUrl,
        ...(creatorSameAs.length ? { sameAs: creatorSameAs } : {}),
      },
      copyrightHolder: {
        "@type": "Person",
        name: creatorName,
        url: creatorUrl,
      },
      genre: data.genre || "Fine Art Photography",
      about: data.about || [
        { "@type": "Thing", name: "Painterly Fine Art Photography" },
        { "@type": "Thing", name: "Western Art" },
        { "@type": "Thing", name: "Historical Portraiture" },
      ],
      isAccessibleForFree: true,
      ...(imagePublishedDate ? { datePublished: imagePublishedDate } : {}),
      ...(imageModifiedDate ? { dateModified: imageModifiedDate } : {}),
      inLanguage: "en",
      mainEntityOfPage: { "@type": "WebPage", "@id": data.pageUrl || data.url },
      potentialAction: {
        "@type": "TradeAction",
        target: getLicenseUrl(data),
        result: {
          "@type": "VisualArtwork",
          name: data.title,
          artMedium: "Photography",
          artform: "Fine Art Print",
          genre: data.genre || "Fine Art Photography",
          creator: {
            "@type": "Person",
            name: creatorName,
            url: creatorUrl
          },
          copyrightHolder: {
            "@type": "Person",
            name: creatorName,
            url: creatorUrl
          },
          license: data.license || license,
          acquireLicensePage: getLicenseUrl(data)
        }
      }
    };

    if (data.galleryUrl) {
      obj.isPartOf = {
        "@type": "ImageGallery",
        "@id": data.galleryUrl + "#imagegallery",
        name: data.galleryTitle || "Gallery",
      };
    }

    if (data.thumbnailUrl) obj.thumbnailUrl = data.thumbnailUrl;
    if (data.width) obj.width = data.width;
    if (data.height) obj.height = data.height;

    return JSON.stringify(obj, null, 2);
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

    const authorId = `${creatorUrl.replace(/\/$/, "")}#person`;
    const orgUrl = "https://www.k4studios.com/";

    const publisherObj = {
      "@type": "Organization",
      "@id": `${orgUrl}#organization`,
      name: "K4 Studios",
      url: orgUrl,
      logo: {
        "@type": "ImageObject",
        url: "https://www.k4studios.com/images/K4Logo-web-c.webp",
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
      author: {
        "@type": "Person",
        name: creatorName,
        url: creatorUrl,
        ...(creatorSameAs.length ? { sameAs: creatorSameAs } : {}),
      },
      publisher: publisherObj,
      copyrightHolder: {
        "@type": "Person",
        name: creatorName,
        url: creatorUrl,
      },
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

    return JSON.stringify(obj, null, 2);
  }

  /* ============================================================
     TYPE: ARTICLE (Definition/About Pages)
  ============================================================ */
  if (type === "Article") {
    const todayIso = new Date().toISOString().split("T")[0];
    
    const publisherObj = {
      "@type": "Organization",
      "@id": "https://k4studios.com/#organization",
      name: "K4 Studios",
      url: "https://k4studios.com/",
      logo: {
        "@type": "ImageObject",
        url: "https://k4studios.com/images/K4Logo-web-c.webp",
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
      author: {
        "@type": "Person",
        name: creatorName,
        url: creatorUrl,
        ...(creatorSameAs.length ? { sameAs: creatorSameAs } : {}),
      },
      publisher: publisherObj,
      copyrightHolder: {
        "@type": "Person",
        name: creatorName,
        url: creatorUrl,
      },
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
        inDefinedTermSet: data.definedTerm.termSet || "https://k4studios.com/Glossary",
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

    return JSON.stringify(articleObj, null, 2);
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
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "@id": id || `${last.item}#breadcrumbs`,
      itemListElement,
    },
    null,
    2
  );
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
