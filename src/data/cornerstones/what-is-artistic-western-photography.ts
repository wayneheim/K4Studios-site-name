
/**
 * What Is Artistic Western Photography? — Cornerstone Definition Article
 * 
 * Purpose: Own the definition layer for "Artistic Western Photography"
 * Positions K4 as authority on the intersection of craft and Western subject matter.
 * 
 * Architecture:
 * - Prose-first, definitional
 * - Article schema (not gallery)
 * - Image block after key section (SERP visibility)
 * - Internal hub that feeds galleries
 */

import { getSemanticImageUrl } from "@/utils/imageProxy.js";






import { getBreadcrumbList, getStructuredData } from "@/components/utils/getStructuredData.ts";


export const sectionPath = "/Blog/what-is-artistic-western-photography";
export const canonicalUrl = "https://www.k4studios.com/Blog/what-is-artistic-western-photography";

// Proxy URL helper
export const getProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size);
export const getAbsoluteProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size, { absolute: true });

// Header image banner
export const headerImage = {
  id: "i-6PzCQW9",
  src: getProxySrc("i-6PzCQW9", "l"),
  alt: "Mormon Row barn beneath dramatic sky — landscape interpreted rather than recorded"
};

// Demo section images (4) - diverse subjects unified by artistic approach
export const image1 = {
  id: "i-jWDDpC4",
  src: getProxySrc("i-jWDDpC4", "l"),
  alt: "Western landscape shaped by atmosphere and light to guide emotion rather than description"
};
export const image2 = {
  id: "i-trZrk2w",
  src: getProxySrc("i-trZrk2w", "l"),
  alt: "Night-watch cowboy scene authored for tension, mood, and narrative implication"
};
export const image3 = {
  id: "i-6z4gpF7",
  src: getProxySrc("i-6z4gpF7", "l"),
  alt: "Black-and-white cowboy portrait reduced to form, tone, and emotional restraint"
};
export const image4 = {
  id: "i-4Hz6D7k",
  src: getProxySrc("i-4Hz6D7k", "l"),
  alt: "Native American portrait composed with dignity, attention, and reverent visual control"
};

export const landscapeDeepImage = {
  id: "i-SNtZNVm",
  src: getProxySrc("i-SNtZNVm", "l"),
  alt: "Painterly western landscape photograph of Horseshoe Bend, showing the Colorado River curving through layered sandstone cliffs under soft evening light"
};

export const cowboyDeepImage = {
  id: "i-k4b6c5b",
  src: getProxySrc("i-k4b6c5b", "l"),
  alt: "Elderly cowboy wearing a wide-brim hat, painterly Western fine art portrait with soft dust tones"
};

export const blackWhiteDeepImage = {
  id: "i-qMQf7b6",
  src: getProxySrc("i-qMQf7b6", "l"),
  alt: "Frontier gunman seated inside a log cabin loading cartridges into a revolver"
};

export const nativeAmericanDeepImage = {
  id: "i-WfRwfpM",
  src: getProxySrc("i-WfRwfpM", "l"),
  alt: "Native American woman standing in soft light, wearing traditional dress with braids and looking off into the distance"
};

export const pageTitle = "What Is Artistic Western Photography? Definition and Meaning";
export const pageDescription = "What is artistic Western photography? Learn how authorship, atmosphere, and interpretive control turn Western subject matter into fine art.";

export const structuredImageUrls = [
  getAbsoluteProxySrc(headerImage.id, "l"),
  getAbsoluteProxySrc(image1.id, "l"),
  getAbsoluteProxySrc(image2.id, "l"),
  getAbsoluteProxySrc(image3.id, "l"),
  getAbsoluteProxySrc(image4.id, "l"),
  getAbsoluteProxySrc(landscapeDeepImage.id, "l"),
  getAbsoluteProxySrc(cowboyDeepImage.id, "l"),
  getAbsoluteProxySrc(blackWhiteDeepImage.id, "l"),
  getAbsoluteProxySrc(nativeAmericanDeepImage.id, "l"),
];

export const breadcrumbStructuredData = getBreadcrumbList(
  [
    { name: "Home", item: "https://www.k4studios.com" },
    { name: "Western Art", item: "https://www.k4studios.com/Blog/what-is-western-art" },
    { name: "Western Fine Art", item: "https://www.k4studios.com/Blog/what-is-western-fine-art" },
    { name: "Western Fine Art Photography", item: "https://www.k4studios.com/Blog/what-is-western-fine-art-photography" },
    { name: "Artistic Western Photography", item: canonicalUrl },
  ],
  `${canonicalUrl}#breadcrumb`
);

export const structuredData = getStructuredData({
  type: "Article",
  data: {
    headline: "What Is Artistic Western Photography?",
    description: pageDescription,
    url: canonicalUrl,
    image: structuredImageUrls,
    copyrightNotice: "© Wayne Heim",
    author: {
      "@type": "Person",
      name: "Wayne Heim"
    },
    datePublished: "2026-02-02",
    dateModified: "2026-05-07",
    articleSection: "Fine Art Photography",
    definedTerm: {
      name: "Artistic Western Photography",
      description: "An expressive, interpretive approach within Western fine art photography where authorship shapes emotional meaning beyond documentary record.",
      termSet: "https://www.k4studios.com/Glossary",
    },
    keywords: [
      "artistic western photography",
      "western fine art photography",
      "fine art western photographs",
      "western photography prints",
      "artistic cowboy photography"
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

// OG/Twitter capped at L
export const meta = {
  description: pageDescription,
  keywords: "artistic western photography, western fine art photography, fine art western photographs, western photography prints, artistic cowboy photography",
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogType: "article",
  ogUrl: canonicalUrl,
  ogImage: getAbsoluteProxySrc(headerImage.id, "l"),
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
  twitterUrl: canonicalUrl,
  twitterImage: getAbsoluteProxySrc(headerImage.id, "l"),
  twitterCard: "summary_large_image"
};

export const blogBreadcrumb = `Other › <a href='/Blog' style='color: inherit; text-decoration: none;' onmouseover="this.style.color='darkred'" onmouseout="this.style.color='inherit'">Blog</a> › Artistic Western Photography`;

import visualData from './what-is-artistic-western-photography.json';
export const pageData = { layout: {title: pageTitle,
structuredDataJSON: structuredData,
breadcrumbsJSON: breadcrumbStructuredData,
meta: meta}, visual: visualData, breadcrumb: blogBreadcrumb, index: 4, pagePath: sectionPath, focusKey: "cowboy-portraits-0" };
