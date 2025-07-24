export function getStructuredData({
  type,
  data,
  images = [],
  defaults = {}
}: {
  type: "gallery" | "image",
  data: any,          // single image object or gallery info
  images?: any[],     // for gallery: featured images (optional)
  defaults?: {        // fallback values for copyright, license, etc.
    copyrightNotice?: string,
    license?: string,
    acquireLicensePage?: string,
    creditText?: string,
    creatorName?: string,
    creatorUrl?: string
  }
}): string {
  // Set up global default fallbacks
  const {
    copyrightNotice = "© Wayne Heim, k4studios.com. All rights reserved.",
    license = "https://k4studios.com/",
    acquireLicensePage = "https://k4studios.com/",
    creditText = "Wayne Heim",
    creatorName = "Wayne Heim",
    creatorUrl = "https://k4studios.com/"
  } = defaults;

  if (type === "gallery") {
    // For a landing/collection page
    const featuredImages = images.length
      ? images.slice(0, 8).map(img => {
          const obj: any = {
            "@type": "ImageObject",
            "url": img.src,
            "name": img.title,
            "caption": img.description || img.alt || img.title,
            "inLanguage": "en",
            "creditText": img.creditText || creditText,
            "creator": {
              "@type": "Person",
              "name": creatorName,
              "url": creatorUrl
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
      "name": data.title,
      "description": data.description,
      "url": data.url,
      "image": featuredImages,
      "copyrightHolder": {
        "@type": "Person",
        "name": creatorName,
        "url": creatorUrl
      },
      "creator": { "@type": "Person", "name": creatorName, "url": creatorUrl },
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
        "name": creatorName,
        "url": creatorUrl
      },
      "copyrightHolder": {
        "@type": "Person",
        "name": creatorName,
        "url": creatorUrl
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

  return "";
}
