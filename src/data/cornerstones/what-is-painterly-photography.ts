
/**
 * What Is Painterly Photography? — Blog Article
 * 
 * Purpose: Intercept "painterly photography" queries from collectors, curators, galleries.
 * This is an editorial credibility page, NOT a hub or definition page.
 * Funnels authority to existing Painterly Fine Art Photography pages.
 */

import { getSemanticImageUrl } from "@/utils/imageProxy.js";







import { getBreadcrumbList, getFAQPageStructuredData, getStructuredData } from "@/components/utils/getStructuredData.ts";



export const sectionPath = "/Blog/what-is-painterly-photography";
export const canonicalUrl = "https://www.k4studios.com/Blog/what-is-painterly-photography";

// Proxy URL helper
export const getProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size);
export const getAbsoluteProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size, { absolute: true });

// Representative images (static, no shuffle - curated selection)
// Header image - "Do you HEAR me now?!" - cropped horizontal banner
// Capped at L to keep XL out of bot-discoverable <img> tags
export const headerImage = {
  id: "i-Nn7scqm",
  src: getProxySrc("i-Nn7scqm", "l"),
  alt: "Frontier confrontation rendered with tonal depth and narrative tension"
};

export const image1 = {
  id: "i-ncFcHDM",
  src: getProxySrc("i-ncFcHDM", "l"),
  alt: "Cowboy portrait shaped by directional light, warm tone, and selective detail in painterly photography"
};
export const image2 = {
  id: "i-LCspRF4",
  src: getProxySrc("i-LCspRF4", "l"),
  alt: "Western figures in atmosphere and dusk light, where narrative emerges through tone and mood"
};
export const image3 = {
  id: "i-46kWCqc",
  src: getProxySrc("i-46kWCqc", "l"),
  alt: "Mounted Western figure held in tonal restraint and deep blue atmosphere"
};
export const sidePanelImage = {
  id: "i-NdQnj6P",
  src: getProxySrc("i-NdQnj6P", "l"),
  alt: "Painterly Western portrait with atmospheric light, tonal layering, and narrative tension"
};
export const historicalImage = {
  id: "i-zHvS5jz",
  src: getProxySrc("i-zHvS5jz", "l"),
  alt: "Painterly Western photograph shaped through atmosphere and tonal control"
};
export const practitionerImage = {
  id: "i-MHGPvcs",
  src: getProxySrc("i-MHGPvcs", "l"),
  alt: "Three dollar whiskey rendered as painterly narrative photography"
};

export const pageTitle = "What Is Painterly Photography? Definition and Meaning";
export const faqItems = [
  {
    question: "What is painterly photography?",
    answer: "Painterly photography is a photographic approach that uses light, tone, composition, atmosphere, and selective detail to create images with the emotional presence and visual structure associated with painting."
  },
  {
    question: "Is painterly photography the same as painterly editing?",
    answer: "No. Painterly editing can add softness, texture, or color effects after capture, while painterly photography makes those choices integral to the story, the eye path, and the final print."
  },
  {
    question: "What are the key characteristics of painterly photography?",
    answer: "Key characteristics include directional light, tonal hierarchy, atmosphere over detail, narrative restraint, and print presence."
  },
  {
    question: "How is painterly photography connected to pictorialist photography?",
    answer: "Painterly photography carries forward the pictorialist belief that a photograph can be interpreted and shaped as art rather than treated as documentation alone."
  },
  {
    question: "How is K4 Studios' painterly photography different?",
    answer: "K4 Studios applies the painterly tradition to Western and historically themed fine art photography, using authored scenes, atmospheric light, color, grain, texture, and narrative restraint to move the viewer from record into story."
  }
];
export const pageDescription = "Painterly photography means different things — presets, editing styles, fine art practice. Here's what separates a surface effect from disciplined practice.";
export const faqStructuredData = getFAQPageStructuredData(faqItems, canonicalUrl);

export const structuredImageUrls = [
  getAbsoluteProxySrc(headerImage.id, "l"),
  getAbsoluteProxySrc(image1.id, "l"),
  getAbsoluteProxySrc(image2.id, "l"),
  getAbsoluteProxySrc(image3.id, "l"),
  getAbsoluteProxySrc(historicalImage.id, "l"),
  getAbsoluteProxySrc(practitionerImage.id, "l"),
];

export const breadcrumbStructuredData = getBreadcrumbList(
  [
    { name: "Home", item: "https://www.k4studios.com" },
    { name: "Western Art", item: "https://www.k4studios.com/Blog/what-is-western-art" },
    { name: "Western Fine Art", item: "https://www.k4studios.com/Blog/what-is-western-fine-art" },
    { name: "Western Fine Art Photography", item: "https://www.k4studios.com/Blog/what-is-western-fine-art-photography" },
    { name: "Artistic Western Photography", item: "https://www.k4studios.com/Blog/what-is-artistic-western-photography" },
    { name: "Painterly Photography", item: canonicalUrl },
  ],
  `${canonicalUrl}#breadcrumb`
);

export const structuredData = getStructuredData({
  type: "Article",
  data: {
    headline: "What Is Painterly Photography?",
    description: pageDescription,
    url: canonicalUrl,
    image: getAbsoluteProxySrc(image1.id, "l"),
    copyrightNotice: "Copyright Wayne Heim",
    author: {
      "@type": "Person",
      name: "Wayne Heim"
    },
    datePublished: "2026-01-24",
    dateModified: "2026-05-07",
    articleSection: "Photography",
    definedTerm: {
      name: "Painterly Photography",
      description: pageDescription,
    },
    keywords: [
      "painterly photography",
      "painterly fine art photography",
      "fine art photography",
      "pictorialism",
      "pictorialist photography",
      "Western photography"
    ],
  },
  defaults: {
    copyrightNotice: "Copyright Wayne Heim",
    license: "https://www.k4studios.com/copyright",
    creditText: "Wayne Heim",
    creatorName: "Wayne Heim",
    creatorUrl: "https://www.k4studios.com/"
  }
});

// Cap OG/Twitter images at L to keep XL out of bot-discoverable surfaces
export const meta = {
  description: pageDescription,
  keywords: "painterly photography, painterly fine art photography, fine art photography, pictorialism, pictorialist photography, modern pictorialism, Western photography",
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogType: "article",
  ogUrl: canonicalUrl,
  ogImage: getAbsoluteProxySrc(image1.id, "l"),
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
  twitterUrl: canonicalUrl,
  twitterImage: getAbsoluteProxySrc(image1.id, "l"),
  twitterCard: "summary_large_image",
  preserveDescriptionDashes: true
};



export const blogBreadcrumb = `Other › <a href='/Blog' style='color: inherit; text-decoration: none;' onmouseover="this.style.color='darkred'" onmouseout="this.style.color='inherit'">Blog</a> › What Is Painterly Photography?`;

import visualData from './what-is-painterly-photography.json';
export const pageData = { layout: {title: pageTitle,
structuredDataJSON: structuredData,
extraStructuredDataJSON: faqStructuredData,
breadcrumbsJSON: breadcrumbStructuredData,
meta: meta}, visual: visualData, breadcrumb: blogBreadcrumb, index: 5, pagePath: sectionPath, focusKey: "western-narrative-color" };
