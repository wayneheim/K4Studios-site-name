export function getStructuredData({
  type,
  data,
  images = [],
  defaults = {}
}: {
  type: "gallery" | "image" | "BlogPosting",
  data: any,          // single image object or gallery info
  images?: any[],     // for gallery: featured images (optional)
  defaults?: {        // fallback values for copyright, license, etc.
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
  // Set up global default fallbacks
  const {
    copyrightNotice = "© Wayne Heim, k4studios.com. All rights reserved.",
    license = "https://k4studios.com/",
    acquireLicensePage = "https://k4studios.com/",
    creditText = "Wayne Heim",
    creatorName = "Wayne Heim",
    creatorUrl = "https://k4studios.com/",
    creatorSameAs = [],
    organizationSameAs = []
  } = defaults;

  if (type === "gallery") {
    // For a landing/collection page
    const featuredImages = images.length
      ? images.slice(0, 8).map(img => {
          const obj: any = {
            "@type": "ImageObject",
            "@id": `${img.src}#image`,
            "url": img.src,
            "name": img.title,
            "caption": img.description || img.alt || img.title,
            "inLanguage": "en",
            "creditText": img.creditText || creditText,
            "creator": {
              "@type": "Person",
              "@id": `${creatorUrl.replace(/\/$/, "")}#person`,
              "name": creatorName,
              "url": creatorUrl,
              ...(creatorSameAs.length ? { sameAs: creatorSameAs } : {})
            },
            "license": img.license || license,
            "copyrightNotice": img.copyrightNotice || copyrightNotice,
            "acquireLicensePage": img.buyLink || img.acquireLicensePage || acquireLicensePage
          };
          if (img.thumbnailUrl) obj.thumbnailUrl = img.thumbnailUrl;
          if (img.width) obj.width = img.width;
          if (img.height) obj.height = img.height;
          if (img.keywords && img.keywords.length)
            obj.keywords = img.keywords.join(", ");
          if (img.datePublished)
            obj.datePublished = img.datePublished;
          return obj;
        })
      : [];

    const collectionObj: any = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${data.url}#collection`,
      "name": data.title,
      "description": data.description,
      "url": data.url,
      "mainEntity": {
        "@type": "ImageGallery",
        "@id": `${data.url}#imagegallery`,
        "name": data.title,
        "description": data.description,
        "url": data.url,
        "image": featuredImages,
        "copyrightHolder": {
          "@type": "Person",
          "@id": `${creatorUrl.replace(/\/$/, "")}#person`,
          "name": creatorName,
          "url": creatorUrl,
          ...(creatorSameAs.length ? { sameAs: creatorSameAs } : {})
        },
        "creator": { "@type": "Person", "@id": `${creatorUrl.replace(/\/$/, "")}#person`, "name": creatorName, "url": creatorUrl, ...(creatorSameAs.length ? { sameAs: creatorSameAs } : {}) },
        "copyrightNotice": data.copyrightNotice || copyrightNotice,
        "inLanguage": "en"
      },
      "copyrightHolder": {
        "@type": "Person",
        "@id": `${creatorUrl.replace(/\/$/, "")}#person`,
        "name": creatorName,
        "url": creatorUrl,
        ...(creatorSameAs.length ? { sameAs: creatorSameAs } : {})
      },
      "creator": { "@type": "Person", "@id": `${creatorUrl.replace(/\/$/, "")}#person`, "name": creatorName, "url": creatorUrl, ...(creatorSameAs.length ? { sameAs: creatorSameAs } : {}) },
      "copyrightNotice": data.copyrightNotice || copyrightNotice,
      "inLanguage": "en"
    };

    if (data.keywords && data.keywords.length)
      collectionObj.keywords = data.keywords.join(", ");
    if (data.datePublished)
      collectionObj.datePublished = data.datePublished;

    return JSON.stringify(collectionObj, null, 2);
  }

  // For an individual image/artwork page
  if (type === "image") {
    const obj: any = {
      "@context": "https://schema.org",
      "@type": "ImageObject",
      "@id": `${data.src}#image`,
      "name": data.title,
      "description": data.description,
      "caption": data.alt || data.title,
      "contentUrl": data.src,
      "url": data.src, // Google's ImageObject expects this too
      "license": data.license || license,
      "copyrightNotice": data.copyrightNotice || copyrightNotice,
      "acquireLicensePage": data.buyLink || data.acquireLicensePage || acquireLicensePage,
      "creditText": data.creditText || creditText,
      "creator": {
        "@type": "Person",
        "@id": `${creatorUrl.replace(/\/$/, "")}#person`,
        "name": creatorName,
        "url": creatorUrl,
        ...(creatorSameAs.length ? { sameAs: creatorSameAs } : {})
      },
      "copyrightHolder": {
        "@type": "Person",
        "@id": `${creatorUrl.replace(/\/$/, "")}#person`,
        "name": creatorName,
        "url": creatorUrl,
        ...(creatorSameAs.length ? { sameAs: creatorSameAs } : {})
      },
      "inLanguage": "en"
    };
    if (data.thumbnailUrl) obj.thumbnailUrl = data.thumbnailUrl;
    if (data.width) obj.width = data.width;
    if (data.height) obj.height = data.height;
    if (data.keywords && data.keywords.length)
      obj.keywords = data.keywords.join(", ");
    if (data.datePublished)
      obj.datePublished = data.datePublished;

    return JSON.stringify(obj, null, 2);
  }

  // For a blog post page
  if (type === "BlogPosting") {
    const today = new Date().toISOString().split('T')[0];
    const defaultDate = `${today}T00:00:00Z`;
    const computedWordCount = typeof data.wordCount === 'number'
      ? data.wordCount
      : (typeof data.body === 'string'
          ? data.body.trim().split(/\s+/).length
          : (typeof data.excerpt === 'string'
              ? data.excerpt.trim().split(/\s+/).length
              : undefined));
    const authorId = `${creatorUrl.replace(/\/$/, "")}#person`;
    // Normalize/construct publisher object with @id and sameAs
    let publisherObj: any;
    if (typeof data.publisher === 'string') {
      const orgUrl = 'https://www.k4studios.com/';
      publisherObj = {
        "@type": "Organization",
        "@id": `${orgUrl.replace(/\/$/, "")}#organization`,
        "name": data.publisher,
        "url": orgUrl,
        "logo": {
          "@type": "ImageObject",
          "url": "https://www.k4studios.com/images/K4Logo-web-c.webp",
          "width": 512,
          "height": 512
        },
        ...(organizationSameAs.length ? { sameAs: organizationSameAs } : {})
      };
    } else if (data.publisher && typeof data.publisher === 'object') {
      const orgUrl = (data.publisher.url || 'https://www.k4studios.com/');
      publisherObj = {
        "@type": data.publisher['@type'] || "Organization",
        "@id": `${orgUrl.replace(/\/$/, "")}#organization`,
        ...data.publisher,
        ...(organizationSameAs.length && !data.publisher.sameAs ? { sameAs: organizationSameAs } : {})
      };
      if (!publisherObj.logo) {
        publisherObj.logo = {
          "@type": "ImageObject",
          "url": "https://www.k4studios.com/images/K4Logo-web-c.webp",
          "width": 512,
          "height": 512
        };
      } else {
        // ensure logo has dims
        if (!publisherObj.logo.width) publisherObj.logo.width = 512;
        if (!publisherObj.logo.height) publisherObj.logo.height = 512;
      }
    } else {
      publisherObj = {
        "@type": "Organization",
        "@id": `https://www.k4studios.com/#organization`,
        "name": "K4 Studios",
        "url": "https://www.k4studios.com/",
        "logo": {
          "@type": "ImageObject",
          "url": "https://www.k4studios.com/images/K4Logo-web-c.webp",
          "width": 512,
          "height": 512
        },
        ...(organizationSameAs.length ? { sameAs: organizationSameAs } : {})
      };
    }
    const obj: any = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": `${data.url}#blogpost`,
      "headline": data.headline || data.title,
      "description": data.description,
      "articleBody": data.body || data.excerpt || "",
      "url": data.url,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": data.url
      },
      "image": data.image || (images.length ? images.map(img => img.src) : "https://www.k4studios.com/images/K4Logo-web-c.webp"),
      "datePublished": data.datePublished || defaultDate,
      "dateModified": data.dateModified || data.datePublished || defaultDate,
      "author": {
        "@type": "Person",
        "@id": authorId,
        "name": creatorName,
        "url": creatorUrl,
        ...(creatorSameAs.length ? { sameAs: creatorSameAs } : {})
      },
      "isPartOf": {
        "@type": "Blog",
        "@id": "https://www.k4studios.com/Other/Blog#blog"
      },
      "about": data.about || [
        { "@type": "Thing", "name": "Western Fine Art Photography" },
        { "@type": "Thing", "name": "Painterly Storytelling" }
      ],
      "publisher": publisherObj,
      "copyrightHolder": {
        "@type": "Person",
        "@id": authorId,
        "name": creatorName,
        "url": creatorUrl,
        ...(creatorSameAs.length ? { sameAs: creatorSameAs } : {})
      },
      "copyrightNotice": data.copyrightNotice || copyrightNotice,
      "genre": data.genre || "Fine Art Photography Commentary",
      "wordCount": computedWordCount || 950,
      "inLanguage": "en"
    };

    if (data.keywords && data.keywords.length)
      obj.keywords = data.keywords.join(", ");
    if (data.articleSection)
      obj.articleSection = data.articleSection;

    return JSON.stringify(obj, null, 2);
  }
  return "";
}

// Build a generic BreadcrumbList JSON-LD from an array of { name, item } entries.
export function getBreadcrumbList(items: Array<{ name: string; item: string }>, id?: string): string {
  const itemListElement = items.map((it, idx) => ({
    '@type': 'ListItem',
    position: idx + 1,
    name: it.name,
    item: it.item,
  }));
  const last = items[items.length - 1];
  const obj: any = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': id || `${last.item}#breadcrumbs`,
    itemListElement,
  };
  return JSON.stringify(obj, null, 2);
}

// Convenience: Breadcrumbs for a blog post page.
// Defaults to: Home → Inside the Frame → Current Post
export function getBlogBreadcrumbList(data: { title: string; url: string }, opts?: { blogName?: string; blogPath?: string; homeName?: string }): string {
  const blogName = opts?.blogName ?? 'Inside the Frame';
  const blogPath = opts?.blogPath ?? '/Other/Blog';
  const homeName = opts?.homeName ?? 'Home';
  let origin = 'https://www.k4studios.com';
  try { origin = new URL(data.url).origin; } catch {}
  const items = [
    { name: homeName, item: `${origin}/` },
    { name: blogName, item: `${origin}${blogPath}` },
    { name: data.title, item: data.url },
  ];
  return getBreadcrumbList(items);
}

// Convenience: Breadcrumbs for a gallery page (landing/collection or detail).
// Defaults to: Home → Galleries → Current Page Title
export function getGalleryBreadcrumbList(data: { title: string; url: string }, opts?: { galleriesName?: string; galleriesPath?: string; homeName?: string }): string {
  const galleriesName = opts?.galleriesName ?? 'Galleries';
  const galleriesPath = opts?.galleriesPath ?? '/galleries';
  const homeName = opts?.homeName ?? 'Home';
  let origin = 'https://www.k4studios.com';
  try { origin = new URL(data.url).origin; } catch {}
  const items = [
    { name: homeName, item: `${origin}/` },
    { name: galleriesName, item: `${origin}${galleriesPath}` },
    { name: data.title, item: data.url },
  ];
  return getBreadcrumbList(items);
}
