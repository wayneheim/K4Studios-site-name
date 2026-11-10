

import { getSemanticImageUrl } from "@/utils/imageProxy.js";







import { getBreadcrumbList, getStructuredData } from "@/components/utils/getStructuredData.ts";


export const sectionPath = "/Blog/can-photography-be-narrative-western-art";
export const canonicalUrl = `https://www.k4studios.com${sectionPath}`;

export const getProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size);
export const getAbsoluteProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size, { absolute: true });

export const headerImage = {
  id: "i-kQfftQ2",
  src: getProxySrc("i-kQfftQ2", "l"),
  alt: "Narrative Western photograph carrying atmosphere and human consequence"
};

export const image1 = {
  id: "i-RsLmsLZ",
  src: getProxySrc("i-RsLmsLZ", "l"),
  alt: "Western portrait demonstrating authored narrative pressure in photography"
};
export const image2 = {
  id: "i-G7csptc",
  src: getProxySrc("i-G7csptc", "l"),
  alt: "Landscape as emotional environment within a narrative Western approach"
};
export const image3 = {
  id: "i-NDnxRkx",
  src: getProxySrc("i-NDnxRkx", "l"),
  alt: "Night scene showing that photography can carry unresolved Western narrative"
};

export const pageTitle = "Can Photography Be Narrative Western Art? - Wayne Heim";
export const pageDescription = "Yes. Narrative Western art is defined by how the image carries story, implication, and consequence—not by whether it was painted or photographed.";

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
    { name: "Can Photography Be Narrative Western Art?", item: canonicalUrl },
  ],
  `${canonicalUrl}#breadcrumb`
);

export const structuredData = getStructuredData({
  type: "Article",
  data: {
    headline: "Can Photography Be Narrative Western Art?",
    description: pageDescription,
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
      name: "Can Photography Be Narrative Western Art?",
      description: pageDescription,
    },
    keywords: [
      "can photography be narrative western art",
      "narrative western art photography",
      "narrative western art",
      "western fine art photography",
      "photography in western art"
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
  description: pageDescription,
  keywords: "can photography be narrative western art, narrative western art photography, narrative western art, western fine art photography, photography in western art",
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogType: "article",
  ogUrl: canonicalUrl,
  ogImage: getAbsoluteProxySrc(headerImage.id, "l"),
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
  twitterUrl: canonicalUrl,
  twitterImage: getAbsoluteProxySrc(headerImage.id, "l"),
  twitterCard: "summary_large_image",
  preserveDescriptionDashes: true
};

export const blogBreadcrumb = `Other › <a href='/Blog' style='color: inherit; text-decoration: none;' onmouseover="this.style.color='darkred'" onmouseout="this.style.color='inherit'">Blog</a> › Can Photography Be Narrative Western Art?`;

import visualData from './can-photography-be-narrative-western-art.json';
export const pageData = { layout: {title: pageTitle,
structuredDataJSON: structuredData,
breadcrumbsJSON: breadcrumbStructuredData,
meta: meta}, visual: visualData, breadcrumb: blogBreadcrumb, index: 14, pagePath: sectionPath, focusKey: "western-narrative-color" };
