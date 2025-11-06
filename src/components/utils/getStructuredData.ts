// src/components/utils/getStructuredData.ts
export function getStructuredData({
  type,
  data,
  images = [],
  defaults = {},
}: {
  type: "gallery" | "image" | "BlogPosting",
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
  // Global defaults
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

  const todayIso = new Date().toISOString().split("T")[0];

  /* ============================================================
     TYPE: GALLERY / COLLECTION PAGE
  ============================================================ */
  if (type === "gallery") {
    const featuredImages = images.slice(0, 8).map((img) => ({
      "@type": "ImageObject",
      "@id": `${img.src}#image`,
      "url": img.src,
      "name": img.title,
      "caption": img.description || img.alt || img.title,
      "inLanguage": "en",
      "encodingFormat": img.mimeType || "image/jpeg",
      "license": img.license || license,
      "creditText": img.creditText || creditText,
      "copyrightNotice": img.copyrightNotice || copyrightNotice,
      "acquireLicensePage": img.buyLink || img.acquireLicensePage || acquireLicensePage,
      "creator": {
        "@type": "Person",
        "@id": `${creatorUrl.replace(/\/$/, "")}#person`,
        "name": creatorName,
        "url": creatorUrl,
        ...(creatorSameAs.length ? { sameAs: creatorSameAs } : {}),
      },
      "copyrightHolder": {
        "@type": "Person",
        "@id": `${creatorUrl.replace(/\/$/, "")}#person`,
        "name": creatorName,
        "url": creatorUrl,
      },
      "datePublished": img.datePublished || img.dateCreated || todayIso,
      "dateModified": img.dateModified || img.datePublished || todayIso,
      ...(img.keywords?.length
        ? { keywords: Array.isArray(img.keywords) ? img.keywords.join(", ") : img.keywords }
        : {}),
      ...(img.thumbnailUrl ? { thumbnailUrl: img.thumbnailUrl } : {}),
      ...(img.width ? { width: img.width } : {}),
      ...(img.height ? { height: img.height } : {}),
    }));

    const collectionObj: any = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${data.url}#collection`,
      "name": data.title,
      "description": data.description,
      "url": data.url,
      "genre": data.genre || "Fine Art Photography",
      "about": data.about || [
        { "@type": "Thing", "name": "Painterly Fine Art Photography" },
        { "@type": "Thing", "name": "Western Art" },
        { "@type": "Thing", "name": "Historical Portraiture" },
      ],
      "mainEntity": {
        "@type": "ImageGallery",
        "@id": `${data.url}#imagegallery`,
        "name": data.title,
        "description": data.description,
        "image": featuredImages,
      },
      "datePublished": data.datePublished || data.dateCreated || todayIso,
      "dateModified": data.dateModified || data.datePublished || todayIso,
      "creator": { "@type": "Person", "name": creatorName, "url": creatorUrl },
      "copyrightHolder": { "@type": "Person", "name": creatorName, "url": creatorUrl },
      "copyrightNotice": data.copyrightNotice || copyrightNotice,
      "inLanguage": "en",
    };

    if (data.keywords?.length)
      collectionObj.keywords = data.keywords.join(", ");

    return JSON.stringify(collectionObj, null, 2);
  }

  /* ============================================================
     TYPE: IMAGE / ARTWORK PAGE
  ============================================================ */
  if (type === "image") {
    const obj: any = {
      "@context": "https://schema.org",
      "@type": "ImageObject",
      "@id": `${data.src}#image`,
      "name": data.title,
      "description": data.description,
      "caption": data.alt || data.title,
      "contentUrl": data.src,
      "url": data.src,
      "encodingFormat": data.mimeType || "image/jpeg",
      "identifier": data.id || data.smugId || data.src?.split("/").pop() || "",
      "license": data.license || license,
      "creditText": data.creditText || creditText,
      "copyrightNotice": data.copyrightNotice || copyrightNotice,
      "acquireLicensePage": data.buyLink || data.acquireLicensePage || acquireLicensePage,
      "creator": {
        "@type": "Person",
        "@id": `${creatorUrl.replace(/\/$/, "")}#person`,
        "name": creatorName,
        "url": creatorUrl,
        ...(creatorSameAs.length ? { sameAs: creatorSameAs } : {}),
      },
      "copyrightHolder": {
        "@type": "Person",
        "@id": `${creatorUrl.replace(/\/$/, "")}#person`,
        "name": creatorName,
        "url": creatorUrl,
      },
      "genre": data.genre || "Fine Art Photography",
      "about": data.about || [
        { "@type": "Thing", "name": "Painterly Fine Art Photography" },
        { "@type": "Thing", "name": "Western Art" },
        { "@type": "Thing", "name": "Historical Portraiture" },
      ],
      "isAccessibleForFree": true,
      "datePublished": data.datePublished || data.dateCreated || todayIso,
      "dateModified": data.dateModified || data.datePublished || todayIso,
      "inLanguage": "en",
      "mainEntityOfPage": { "@type": "WebPage", "@id": data.pageUrl || data.url },
      "potentialAction": {
        "@type": "TradeAction",
        "target": data.buyLink || "https://www.k4studios.com/licensing",
        "result": {
          "@type": "Product",
          "name": data.title,
          "category": "Fine Art Print",
        },
      },
    };

    if (data.galleryUrl) {
      obj.isPartOf = {
        "@type": "ImageGallery",
        "@id": data.galleryUrl + "#imagegallery",
        "name": data.galleryTitle || "Gallery",
      };
    }

    if (data.thumbnailUrl) obj.thumbnailUrl = data.thumbnailUrl;
    if (data.width) obj.width = data.width;
    if (data.height) obj.height = data.height;
    if (data.keywords?.length)
      obj.keywords = Array.isArray(data.keywords)
        ? data.keywords.join(", ")
        : data.keywords;

    return JSON.stringify(obj, null, 2);
  }

  /* ============================================================
     TYPE: BLOG POST
  ============================================================ */
  if (type === "BlogPosting") {
    const today = new Date().toISOString().split("T")[0];
    const defaultDate = `${today}T00:00:00Z`;
    const authorId = `${creatorUrl.replace(/\/$/, "")}#person`;
    const orgUrl = "https://www.k4studios.com/";

    const publisherObj = {
      "@type": "Organization",
      "@id": `${orgUrl}#organization`,
      "name": "K4 Studios",
      "url": orgUrl,
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.k4studios.com/images/K4Logo-web-c.webp",
        "width": 512,
        "height": 512,
      },
      ...(organizationSameAs.length ? { sameAs: organizationSameAs } : {}),
    };

    const obj: any = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": `${data.url}#blogpost`,
      "headline": data.headline || data.title,
      "description": data.description,
      "articleBody": data.body || data.excerpt || "",
      "url": data.url,
      "mainEntityOfPage": { "@type": "WebPage", "@id": data.url },
      "image":
        data.image ||
        (images.length
          ? images.map((img) => img.src)
          : "https://www.k4studios.com/images/K4Logo-web-c.webp"),
      "datePublished": data.datePublished || defaultDate,
      "dateModified": data.dateModified || data.datePublished || defaultDate,
      "author": {
        "@type": "Person",
        "@id": authorId,
        "name": creatorName,
        "url": creatorUrl,
        ...(creatorSameAs.length ? { sameAs: creatorSameAs } : {}),
      },
      "publisher": publisherObj,
      "copyrightHolder": {
        "@type": "Person",
        "@id": authorId,
        "name": creatorName,
        "url": creatorUrl,
      },
      "copyrightNotice": data.copyrightNotice || copyrightNotice,
      "genre": data.genre || "Fine Art Photography Commentary",
      "wordCount":
        typeof data.wordCount === "number"
          ? data.wordCount
          : data.body?.trim().split(/\s+/).length || 950,
      "inLanguage": "en",
    };

    if (data.keywords?.length)
      obj.keywords = data.keywords.join(", ");
    if (data.articleSection)
      obj.articleSection = data.articleSection;

    return JSON.stringify(obj, null, 2);
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
  const blogPath = opts?.blogPath ?? "/Other/Blog";
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
