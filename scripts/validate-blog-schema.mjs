function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function getBlogPostingStructuredData({ data, images = [], defaults = {} }) {
  const {
    copyrightNotice = "© Wayne Heim, k4studios.com. All rights reserved.",
    creatorName = "Wayne Heim",
    creatorUrl = "https://k4studios.com/",
    creatorSameAs = [],
    organizationSameAs = [],
  } = defaults;

  const today = new Date().toISOString().split('T')[0];
  const defaultDate = `${today}T00:00:00Z`;
  const computedWordCount = typeof data.wordCount === 'number'
    ? data.wordCount
    : (typeof data.body === 'string'
        ? data.body.trim().split(/\s+/).length
        : (typeof data.excerpt === 'string'
            ? data.excerpt.trim().split(/\s+/).length
            : 950));
  const authorId = `${creatorUrl.replace(/\/$/, "")}#person`;

  let publisherObj;
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

  const obj = {
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

  return JSON.stringify(obj, null, 2);
}

function run() {
  const data = {
    title: "Inside the Frame: The Story of Red Dust",
    headline: "Inside the Frame: The Story of Red Dust",
    description: "A behind-the-scenes look at Western fine art photography.",
    url: "https://www.k4studios.com/Other/Blog/inside-the-frame-red-dust",
    image: "https://www.k4studios.com/images/K4Logo-web-c.webp",
    datePublished: "2025-10-01T00:00:00Z",
    keywords: ["Western Fine Art", "Painterly Photography", "Wayne Heim"],
    publisher: "K4 Studios",
  };

  const defaults = {
    creatorName: "Wayne Heim",
    creatorUrl: "https://www.k4studios.com/",
    creatorSameAs: [
      "https://www.instagram.com/wayneheim",
      "https://wayne-heim.smugmug.com/",
    ],
    organizationSameAs: [
      "https://www.instagram.com/wayneheim",
      "https://wayne-heim.smugmug.com/",
    ],
  };

  const jsonStr = getBlogPostingStructuredData({ data, defaults });
  const obj = JSON.parse(jsonStr);

  assert(obj["@type"] === "BlogPosting", "@type should be BlogPosting");
  assert(obj["@id"].includes("#blogpost"), "@id should include #blogpost");
  assert(obj.mainEntityOfPage && obj.mainEntityOfPage["@id"] === data.url, "mainEntityOfPage.@id mismatch");
  assert(obj.publisher && obj.publisher.logo && obj.publisher.logo.width && obj.publisher.logo.height, "publisher logo dims missing");
  assert(obj.author && obj.author["@id"].includes("#person"), "author @id missing");
  assert(obj.isPartOf && obj.isPartOf["@type"] === "Blog", "isPartOf missing");
  assert(Array.isArray(obj.about) && obj.about.length >= 1, "about missing");
  assert(typeof obj.wordCount === 'number', "wordCount missing");

  console.log("BlogPosting schema shape: PASS");
}

try {
  run();
  process.exit(0);
} catch (e) {
  console.error("BlogPosting schema shape: FAIL\n", e.message || e);
  process.exit(1);
}
