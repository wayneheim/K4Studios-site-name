

import { getSemanticImageUrl } from "@/utils/imageProxy.js";







import { getBreadcrumbList, getStructuredData } from "@/components/utils/getStructuredData.ts";


export const sectionPath = "/Blog/what-makes-an-image-feel-cinematic";
export const canonicalUrl = `https://www.k4studios.com${sectionPath}`;

export const getProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size);
export const getAbsoluteProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size, { absolute: true });

export const headerImage = {
  id: "i-LL2Gp5r",
  src: getProxySrc("i-LL2Gp5r", "l"),
  alt: "Special Delivery, a cinematic Western narrative artwork with figures gathered before a halted night train"
};

export const image1 = {
  id: "i-DczpNpH",
  src: getProxySrc("i-DczpNpH", "l"),
  alt: "Portrait where tension lingers beyond the visible moment"
};
export const image2 = {
  id: "i-3SxncXS",
  src: getProxySrc("i-3SxncXS", "l"),
  alt: "Frame carrying suspense through atmosphere and unresolved action"
};
export const image3 = {
  id: "i-gxMVNh3",
  src: getProxySrc("i-gxMVNh3", "l"),
  alt: "Landscape with cinematic atmosphere and emotional direction"
};

export const pageTitle = "What Makes an Image Feel Cinematic? It's Not Color Grading - Wayne Heim";
export const titleTag = "What Makes an Image Feel Cinematic? It's Not Color Grading";
export const practiceImages = [
  { id: 'i-5TtHV8g', alt: 'Western portrait carrying tension beyond the visible moment' },
  { id: 'i-5rq7gcD', alt: 'Western narrative scene shaped by silence and implication' },
  { id: 'i-SNtZNVm', alt: 'Western landscape shaped by atmosphere and light' },
];
export const pageDescription = "Cinematic feeling comes from tension, implication, and restrained framing — not color grading. Here's what actually creates it in a still image.";

export const structuredImageUrls = [
  getAbsoluteProxySrc(headerImage.id, "l"),
  getAbsoluteProxySrc(image1.id, "l"),
  getAbsoluteProxySrc(image2.id, "l"),
  getAbsoluteProxySrc(image3.id, "l"),
];

export const breadcrumbStructuredData = getBreadcrumbList(
  [
    { name: "Home", item: "https://www.k4studios.com" },
    { name: "One-Image Movie", item: "https://www.k4studios.com/Other/One-Image-Movie" },
    { name: "What Makes an Image Feel Cinematic?", item: canonicalUrl },
  ],
  `${canonicalUrl}#breadcrumb`
);

export const structuredData = getStructuredData({
  type: "Article",
  data: {
    headline: "What Makes an Image Feel Cinematic?",
    description: pageDescription,
    url: canonicalUrl,
    image: structuredImageUrls,
    copyrightNotice: "© Wayne Heim",
    author: {
      "@type": "Person",
      name: "Wayne Heim"
    },
    datePublished: "2026-03-30",
    articleSection: "Cinematic Photography",
    definedTerm: {
      name: "What Makes an Image Feel Cinematic?",
      description: pageDescription,
    },
    keywords: [
      "what makes an image feel cinematic",
      "cinematic photography",
      "what makes a photo cinematic",
      "narrative photography",
      "visual storytelling in photography"
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
  keywords: "what makes an image feel cinematic, cinematic photography, what makes a photo cinematic, narrative photography, visual storytelling in photography",
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

export const blogBreadcrumb = `Other › <a href='/Blog' style='color: inherit; text-decoration: none;' onmouseover="this.style.color='darkred'" onmouseout="this.style.color='inherit'">Blog</a> › What Makes an Image Feel Cinematic?`;

import visualData from './what-makes-an-image-feel-cinematic.json';
export const pageData = { layout: {title: titleTag,
structuredDataJSON: structuredData,
breadcrumbsJSON: breadcrumbStructuredData,
meta: meta}, visual: visualData, breadcrumb: blogBreadcrumb, index: 13, pagePath: sectionPath, focusKey: "western-narrative-color" };
