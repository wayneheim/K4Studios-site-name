import { getStructuredData } from "../src/components/utils/getStructuredData";

function assert(condition: any, message: string) {
  if (!condition) throw new Error(message);
}

function parseJson(jsonStr: string) {
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    throw new Error("JSON parse failed: " + (e as Error).message);
  }
}

async function testBlogPosting() {
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

  const jsonStr = getStructuredData({ type: "BlogPosting", data, images: [], defaults });
  const obj = parseJson(jsonStr);

  assert(obj["@type"] === "BlogPosting", "@type should be BlogPosting");
  assert(typeof obj.headline === "string" && obj.headline.length > 0, "headline missing");
  assert(typeof obj.url === "string" && obj.url.startsWith("http"), "url missing/invalid");
  assert(obj.mainEntityOfPage && obj.mainEntityOfPage["@id"] === data.url, "mainEntityOfPage.@id mismatch");
  assert(obj["@id"] && obj["@id"].includes("#blogpost"), "@id missing or incorrect");
  assert(obj.image, "image missing");
  assert(obj.datePublished, "datePublished missing");
  assert(obj.dateModified, "dateModified missing");
  assert(obj.author && obj.author["@type"] === "Person", "author missing or wrong type");
  assert(obj.publisher && obj.publisher["@type"] === "Organization", "publisher missing or wrong type");
  assert(obj.publisher.logo && obj.publisher.logo.width && obj.publisher.logo.height, "publisher logo dims missing");
  assert(obj.isPartOf && obj.isPartOf["@type"] === "Blog", "isPartOf missing or wrong type");
  assert(obj.about && Array.isArray(obj.about) && obj.about.length > 0, "about missing");
  assert(typeof obj.wordCount === "number", "wordCount missing/not a number");
}

async function testImage() {
  const data = {
    title: "Test Image",
    description: "A test image description",
    alt: "Test Image Alt",
    src: "https://www.k4studios.com/images/test-image.jpg",
    datePublished: "2025-10-01T00:00:00Z",
  };
  const defaults = {
    creatorName: "Wayne Heim",
    creatorUrl: "https://www.k4studios.com/",
  };
  const jsonStr = getStructuredData({ type: "image", data, images: [], defaults });
  const obj = parseJson(jsonStr);
  assert(obj["@type"] === "ImageObject", "@type should be ImageObject");
  assert(obj["@id"].endsWith("#image"), "Image @id should end with #image");
  // Policy: url = canonical page URL; contentUrl = asset URL (src)
  assert(typeof obj.url === "string" && obj.url.startsWith("http"), "Image url (canonical) missing/invalid");
  assert(obj.contentUrl === data.src, "Image contentUrl should match src");
  assert(obj.creator && obj.creator["@type"] === "Person", "creator missing or wrong type");
}

async function testGallery() {
  const images = [
    { src: "https://www.k4studios.com/images/a.jpg", title: "A", alt: "A", description: "A" },
    { src: "https://www.k4studios.com/images/b.jpg", title: "B", alt: "B", description: "B" },
  ];
  const data = {
    title: "Sample Collection",
    description: "A sample collection",
    url: "https://www.k4studios.com/Galleries/Sample",
  };
  const defaults = {
    creatorName: "Wayne Heim",
    creatorUrl: "https://www.k4studios.com/",
  };
  const jsonStr = getStructuredData({ type: "gallery", data, images, defaults });
  const obj = parseJson(jsonStr);
  assert(obj["@type"] === "CollectionPage", "@type should be CollectionPage");
  assert(obj["@id"].endsWith("#collection"), "Collection @id should end with #collection");
  assert(obj.mainEntity && obj.mainEntity["@type"] === "ImageGallery", "mainEntity should be ImageGallery");
  assert(Array.isArray(obj.mainEntity.image) && obj.mainEntity.image.length === 2, "featured images count mismatch");
}

(async () => {
  try {
    await testBlogPosting();
    await testImage();
    await testGallery();
    console.log("Schema tests: PASS");
    process.exit(0);
  } catch (e) {
    console.error("Schema tests: FAIL\n", (e as Error).message);
    process.exit(1);
  }
})();
