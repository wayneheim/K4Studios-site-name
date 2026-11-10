

import { getSemanticImageUrl } from "@/utils/imageProxy.js";







import { getBreadcrumbList, getStructuredData } from "@/components/utils/getStructuredData.ts";


export const sectionPath = "/Blog/narrative-vs-documentary-photography";
export const canonicalUrl = `https://www.k4studios.com${sectionPath}`;

export const getProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size);
export const getAbsoluteProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size, { absolute: true });

export const headerImage = {
  id: "i-4XLSsnC",
  src: getProxySrc("i-4XLSsnC", "l"),
  alt: "Photograph shaped by authorship rather than neutral record alone"
};

export const image1 = {
  id: "i-JkFT62C",
  src: getProxySrc("i-JkFT62C", "l"),
  alt: "Everyday figure who could be documented or narratively interpreted depending on construction"
};
export const image2 = {
  id: "i-9wQL5tH",
  src: getProxySrc("i-9wQL5tH", "l"),
  alt: "Monochrome image shaped by implication rather than straightforward report"
};
export const image3 = {
  id: "i-n5BfXBm",
  src: getProxySrc("i-n5BfXBm", "l"),
  alt: "Portrait whose emotional weight comes from story rather than report alone"
};

export const pageTitle = "Narrative vs Documentary Photography - Wayne Heim";
export const pageDescription = "Documentary photography records what happened. Narrative photography shapes what the moment means. This guide clarifies the difference without collapsing one into the other.";
export const metaDescription = "Documentary photography records what happened. Narrative photography shapes what the moment means — the difference, clarified.";

export const structuredImageUrls = [
  getAbsoluteProxySrc(headerImage.id, "l"),
  getAbsoluteProxySrc(image1.id, "l"),
  getAbsoluteProxySrc(image2.id, "l"),
  getAbsoluteProxySrc(image3.id, "l"),
];

export const breadcrumbStructuredData = getBreadcrumbList(
  [
    { name: "Home", item: "https://www.k4studios.com" },
    { name: "What Is Narrative Photography?", item: "https://www.k4studios.com/Blog/what-is-narrative-photography" },
    { name: "Narrative vs Documentary Photography", item: canonicalUrl },
  ],
  `${canonicalUrl}#breadcrumb`
);

export const structuredData = getStructuredData({
  type: "Article",
  data: {
    headline: "Narrative vs Documentary Photography",
    description: metaDescription,
    url: canonicalUrl,
    image: structuredImageUrls,
    copyrightNotice: "© Wayne Heim",
    author: {
      "@type": "Person",
      name: "Wayne Heim"
    },
    datePublished: "2026-03-30",
    articleSection: "Photography",
    definedTerm: {
      name: "Narrative vs Documentary Photography",
      description: pageDescription,
    },
    keywords: [
      "narrative vs documentary photography",
      "narrative photography",
      "documentary photography",
      "storytelling photography",
      "difference between narrative and documentary photography"
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
  keywords: "narrative vs documentary photography, narrative photography, documentary photography, storytelling photography",
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

export const blogBreadcrumb = `Other › <a href='/Blog' style='color: inherit; text-decoration: none;' onmouseover="this.style.color='darkred'" onmouseout="this.style.color='inherit'">Blog</a> › Narrative vs Documentary Photography`;

import visualData from './narrative-vs-documentary-photography.json';
export const pageData = { layout: {title: pageTitle,
structuredDataJSON: structuredData,
breadcrumbsJSON: breadcrumbStructuredData,
meta: meta}, visual: visualData, breadcrumb: blogBreadcrumb, index: 15, pagePath: sectionPath, focusKey: "western-narrative-color" };
