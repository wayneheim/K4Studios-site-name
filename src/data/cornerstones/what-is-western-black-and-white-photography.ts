
/**
 * What Is Western Black and White Photography? - Cornerstone Definition Article
 *
 * Purpose: Own the definition layer for "Western Black and White Photography".
 * Positions K4 as authority on monochrome Western photography as fine art discipline.
 */

import { getSemanticImageUrl } from "@/utils/imageProxy.js";






import { getBreadcrumbList, getStructuredData } from "@/components/utils/getStructuredData.ts";


export const sectionPath = "/Blog/what-is-western-black-and-white-photography";
export const canonicalUrl = "https://www.k4studios.com/Blog/what-is-western-black-and-white-photography";

export const COWBOY_BW_PATH = "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White";
export const NARRATIVE_BW_PATH = "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White";
export const NATIVE_BW_PATH = "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Black-White";

// Proxy URL helper
export const getProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size);
export const getAbsoluteProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size, { absolute: true });

export const headerImage = {
  id: "i-DJMTZ8z",
  src: getProxySrc("i-DJMTZ8z", "l"),
  alt: "Western black and white photography portrait with seated cowboy, tonal restraint, and frontier presence"
};

export const image1 = {
  id: "i-2GsTkqf",
  src: getProxySrc("i-2GsTkqf", "l"),
  alt: "Black and white cowboy portrait shaped by posture, shadow, and restrained Western atmosphere"
};
export const image2 = {
  id: "i-mqQxwNn",
  src: getProxySrc("i-mqQxwNn", "l"),
  alt: "Black and white Western narrative photograph with cowboy at window, rifle, shadow, and frontier tension"
};
export const image3 = {
  id: "i-Z54nXZm",
  src: getProxySrc("i-Z54nXZm", "l"),
  alt: "Black and white Native American portrait with smoke, profile, tonal quiet, and human presence"
};

export const narrativeImage1 = {
  id: "i-HfQ5NVR",
  src: getProxySrc("i-HfQ5NVR", "l"),
  alt: "Cowboy holding a tin cup beside a coffee pot at a frontier camp table in a black and white Western scene."
};
export const narrativeImage2 = {
  id: "i-mqQxwNn",
  src: getProxySrc("i-mqQxwNn", "l"),
  alt: "By a window, a cowboy holds a rifle and looks outward, partially lit in a black and white Western portrait."
};
export const narrativeImage3 = {
  id: "i-nZbDC9C",
  src: getProxySrc("i-nZbDC9C", "l"),
  alt: "Elder Native American man seated in profile, looking into the distance in a black and white portrait."
};

export const pageTitle = "What Is Western Black and White Photography? - Wayne Heim";
export const pageDescription = "Western black and white photography is not a filter choice. It is a structural decision that forces tone, contrast, and restraint to carry what color would otherwise handle - and what that means for fine art, collecting, and the Western portrait tradition.";
export const metaDescription = "Western black and white photography is not a filter choice. It is a structural decision — tone, contrast, and restraint carry what color would otherwise handle.";

export const structuredImageUrls = [
  getAbsoluteProxySrc(headerImage.id, "l"),
  getAbsoluteProxySrc(image1.id, "l"),
  getAbsoluteProxySrc(image2.id, "l"),
  getAbsoluteProxySrc(image3.id, "l"),
  getAbsoluteProxySrc(narrativeImage1.id, "l"),
  getAbsoluteProxySrc(narrativeImage2.id, "l"),
  getAbsoluteProxySrc(narrativeImage3.id, "l"),
];

export const breadcrumbStructuredData = getBreadcrumbList(
  [
    { name: "Home", item: "https://www.k4studios.com" },
    { name: "Western Art", item: "https://www.k4studios.com/Blog/what-is-western-art" },
    { name: "Western Fine Art Photography", item: "https://www.k4studios.com/Blog/what-is-western-fine-art-photography" },
    { name: "Western Black and White Photography", item: canonicalUrl },
  ],
  `${canonicalUrl}#breadcrumb`
);

export const structuredData = getStructuredData({
  type: "Article",
  data: {
    headline: "What Is Western Black and White Photography?",
    description: metaDescription,
    url: canonicalUrl,
    image: structuredImageUrls,
    copyrightNotice: "(c) Wayne Heim",
    author: {
      "@type": "Person",
      name: "Wayne Heim"
    },
    datePublished: "2026-05-15",
    articleSection: "Fine Art Photography",
    definedTerm: {
      name: "Western Black and White Photography",
      description: pageDescription,
    },
    keywords: [
      "western black and white photography",
      "black and white cowboy photography",
      "monochrome Western art",
      "black and white cowboy portraits",
      "black and white Native American portraits",
      "western fine art photography"
    ]
  },
  defaults: {
    copyrightNotice: "(c) Wayne Heim",
    license: "https://www.k4studios.com/copyright",
    creditText: "Wayne Heim",
    creatorName: "Wayne Heim",
    creatorUrl: "https://www.k4studios.com/"
  }
});

export const meta = {
  description: metaDescription,
  keywords: "western black and white photography, black and white cowboy photography, monochrome Western art, black and white cowboy portraits, black and white Native American portraits, western fine art photography",
  ogTitle: pageTitle,
  ogDescription: metaDescription,
  ogType: "article",
  ogUrl: canonicalUrl,
  ogImage: getAbsoluteProxySrc(headerImage.id, "l"),
  twitterTitle: pageTitle,
  twitterDescription: metaDescription,
  twitterUrl: canonicalUrl,
  twitterImage: getAbsoluteProxySrc(headerImage.id, "l"),
  twitterCard: "summary_large_image",
  preserveDescriptionDashes: true
};

export const blogBreadcrumb = `Other > <a href='/Blog' style='color: inherit; text-decoration: none;' onmouseover="this.style.color='darkred'" onmouseout="this.style.color='inherit'">Blog</a> > Western Black and White Photography`;

import visualData from './what-is-western-black-and-white-photography.json';
export const pageData = { layout: {title: pageTitle,
structuredDataJSON: structuredData,
breadcrumbsJSON: breadcrumbStructuredData,
meta: meta}, visual: visualData, breadcrumb: blogBreadcrumb, index: 9, pagePath: sectionPath, focusKey: "cowboy-portraits-1" };
