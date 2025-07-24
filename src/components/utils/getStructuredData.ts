export function getStructuredData({
  type,
  data,
  images = []
}: {
  type: "gallery" | "image",
  data: any,          // single image object or gallery info
  images?: any[]      // for gallery: featured images (optional)
}): string {
  if (type === "gallery") {
    // For a landing/collection page
    const featuredImages = images.length
      ? images.slice(0, 8).map(img => ({
          "@type": "ImageObject",
          "url": img.src,
          "name": img.title,
          "caption": img.description,
          "inLanguage": "en",
          "creditText": "Wayne Heim",
          "creator": { "@type": "Person", "name": "Wayne Heim" },
          "license": "https://k4studios.com/copyright"
        }))
      : [];

    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": data.title,
      "description": data.description,
      "url": data.url,
      "image": featuredImages,
      "copyrightHolder": {
        "@type": "Person",
        "name": "Wayne Heim",
        "url": "https://k4studios.com/"
      },
      "creator": { "@type": "Person", "name": "Wayne Heim" },
      "inLanguage": "en"
    }, null, 2);
  }

  // For an individual image/artwork page
  if (type === "image") {
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ImageObject",
      "name": data.title,
      "description": data.description,
      "caption": data.alt || data.title,
      "contentUrl": data.src,
      "license": "https://k4studios.com/copyright",
      "acquireLicensePage": data.buyLink || "https://k4studios.com/",
      "creditText": "Wayne Heim",
      "creator": {
        "@type": "Person",
        "name": "Wayne Heim",
        "url": "https://k4studios.com/"
      },
      "copyrightHolder": {
        "@type": "Person",
        "name": "Wayne Heim",
        "url": "https://k4studios.com/"
      },
      "inLanguage": "en"
    }, null, 2);
  }

  return "";
}
