

import { getSemanticImageUrl } from "@/utils/imageProxy.js";





import { getBreadcrumbList, getStructuredData } from "@/components/utils/getStructuredData.ts";


export const sectionPath = "/Blog/narrative-western-art-vs-traditional";
export const canonicalUrl = `https://www.k4studios.com${sectionPath}`;

export const getProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size);
export const getAbsoluteProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size, { absolute: true });

export const headerImage = {
  id: "i-4zxZQQ2",
  src: getProxySrc("i-4zxZQQ2", "l"),
  alt: "Narrative Western portrait suspended between history and implication"
};

export const image1 = {
  id: "i-Wx5scCf",
  src: getProxySrc("i-Wx5scCf", "l"),
  alt: "Cowboy portrait built around implication rather than spectacle"
};
export const image2 = {
  id: "i-cV5gwWZ",
  src: getProxySrc("i-cV5gwWZ", "l"),
  alt: "Night frontier scene where story leads the frame"
};
export const image3 = {
  id: "i-5Md3dQ3",
  src: getProxySrc("i-5Md3dQ3", "l"),
  alt: "Quiet portrait carrying emotional consequence beyond the visible moment"
};

export const narrativeImage1 = {
  id: "i-5BtMrfM",
  src: getProxySrc("i-5BtMrfM", "l"),
  alt: "Cowboy standing beside a frontier wagon at sunset, carrying the weight of a larger story"
};
export const narrativeImage2 = {
  id: "i-trM4FpR",
  src: getProxySrc("i-trM4FpR", "l"),
  alt: "A cowboy by a window with a rifle, framed as a narrative moment rather than a posed portrait"
};
export const narrativeImage3 = {
  id: "i-z9Pfbc5",
  src: getProxySrc("i-z9Pfbc5", "l"),
  alt: "A bearded cowboy in a red shirt and wide-brimmed hat, held in quiet morning light"
};

export const pageTitle = "Narrative Western Art vs Traditional Western Art - Wayne Heim";
export const titleTag = "Narrative Western Art vs Traditional Western Art";
export const pageDescription = "Not all Western art carries a story. This guide clarifies the difference between narrative Western art and more traditional Western art shaped primarily by subject or convention.";
export const metaDescription = "Not all Western art carries a story. This guide clarifies the difference between narrative Western art and traditional Western art.";

export const structuredImageUrls = [
  getAbsoluteProxySrc(headerImage.id, "l"),
  
  getAbsoluteProxySrc(image1.id, "l"),
  getAbsoluteProxySrc(image2.id, "l"),
  getAbsoluteProxySrc(image3.id, "l"),
];

export const breadcrumbStructuredData = getBreadcrumbList(
  [
    { name: "Home", item: "https://www.k4studios.com" },
    { name: "Narrative Western Art", item: "https://www.k4studios.com/Narrative-Western-Art" },
    { name: "Narrative Western Art vs Traditional Western Art", item: canonicalUrl },
  ],
  `${canonicalUrl}#breadcrumb`
);

export const structuredData = getStructuredData({
  type: "Article",
  data: {
    headline: "Narrative Western Art vs Traditional Western Art",
    description: metaDescription,
    url: canonicalUrl,
    image: structuredImageUrls,
    copyrightNotice: "© Wayne Heim",
    author: {
      "@type": "Person",
      name: "Wayne Heim"
    },
    datePublished: "2026-03-30",
    articleSection: "Narrative Western Art",
    definedTerm: {
      name: "Narrative Western Art vs Traditional Western Art",
      description: pageDescription,
    },
    keywords: [
      "narrative western art vs traditional western art",
      "narrative western art",
      "traditional western art",
      "western art storytelling",
      "western art comparison"
    ]
  },
  defaults: {
    copyrightNotice: "© Wayne Heim",
    license: "https://www.k4studios.com/copyright",
    creditText: "Wayne Heim",
    creatorName: "Wayne Heim",
    creatorUrl: "https://www.k4studios.com/"
  }
});

export const meta = {
  seoDescription: metaDescription,
  description: metaDescription,
  story: metaDescription,
  keywords: "narrative western art vs traditional western art, narrative western art, traditional western art, western art storytelling",
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
  preserveDescriptionDashes: true,
};

export const blogBreadcrumb = `Other › <a href='/Blog' style='color: inherit; text-decoration: none;' onmouseover="this.style.color='darkred'" onmouseout="this.style.color='inherit'">Blog</a> › Narrative vs Traditional Western Art`;

import visualData from './narrative-western-art-vs-traditional.json';
export const pageData = { layout: {title: titleTag,
structuredDataJSON: structuredData,
breadcrumbsJSON: breadcrumbStructuredData,
meta: meta}, visual: visualData, breadcrumb: blogBreadcrumb, index: 11, pagePath: sectionPath, focusKey: "western-narrative-color" };
