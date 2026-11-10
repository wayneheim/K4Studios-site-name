
/**
 * What Is Western Fine Art? — Cornerstone Definition Article
 * 
 * Purpose: Own the definition layer for "Western Fine Art" (mixed SERP: painting + photography)
 * Reconciles mediums under a single authorship standard.
 * Positions K4 as authority, not vendor. Semantic bridge between painting-dominated SERPs and photography.
 * 
 * Architecture:
 * - Prose-first, definitional
 * - Article schema (not gallery)
 * - Image block after photography subsection (SERP visibility)
 * - Internal hub that feeds galleries, doesn't compete
 */

import { getSemanticImageUrl } from "@/utils/imageProxy.js";








import { getBreadcrumbList, getFAQPageStructuredData, getStructuredData } from "@/components/utils/getStructuredData.ts";


export const sectionPath = "/Blog/what-is-western-fine-art";
export const canonicalUrl = "https://www.k4studios.com/Blog/what-is-western-fine-art";

// Proxy URL helper
export const getProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size);
export const getAbsoluteProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size, { absolute: true });

// Header image banner
export const headerImage = {
  id: "i-7Mzzbvp",
  src: getProxySrc("i-7Mzzbvp", "l"),
  alt: "Cowboy figure composed with authorial intent rather than documentation"
};

// Demo section images (4) - one from each category to demonstrate range unified by authorship
export const image1 = {
  id: "i-8JHmjF9",
  src: getProxySrc("i-8JHmjF9", "l"),
  alt: "Western landscape shaped by atmosphere, light, and tonal control in fine art photography"
};
export const image2 = {
  id: "i-44jcjTQ",
  src: getProxySrc("i-44jcjTQ", "l"),
  alt: "Cowboy portrait built around character, posture, and narrative intent rather than stereotype"
};
export const image3 = {
  id: "i-Txh4c8k",
  src: getProxySrc("i-Txh4c8k", "l"),
  alt: "Black-and-white Western study showing craft, tonal design, and authorship beyond medium"
};
export const image4 = {
  id: "i-7hD9CCh",
  src: getProxySrc("i-7hD9CCh", "l"),
  alt: "Native American figure at the water's edge rendered with restraint, presence, and cultural dignity"
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

export const pageTitle = "What Is Western Fine Art? Definition, Meaning, and Why It Matters";
export const titleTag = "What Is Western Fine Art? Definition and Meaning";
export const pageDescription = "What is Western fine art? Learn how authorship, intent, and compositional restraint distinguish it across painting, photography, sculpture, and other media.";

export const westernFineArtFaq = [
  {
    q: "What makes Western fine art different from Western art in general?",
    a: "Western art is the broader visual tradition of the American West, including illustration, decor, film imagery, documentary work, and fine art. Western fine art is the authored core within that larger tradition. It is work shaped by intent, composition, narrative depth, and restraint rather than by subject matter alone.",
  },
  {
    q: "Can Western photography qualify as Western fine art?",
    a: "Yes. Photography can qualify as Western fine art when it meets the same threshold long applied to painting: authorial vision, compositional rigor, narrative restraint, and a serious engagement with the subject. The medium does not decide the category. The standard of authorship does.",
  },
  {
    q: "Is Western fine art only about cowboys and frontier scenes?",
    a: "No. Cowboy subjects are part of the tradition, but Western fine art also includes landscapes, Native American portraiture, frontier architecture, ranch life, and contemporary Western themes. What unifies the category is not a fixed set of icons, but the artist's ability to shape meaning through the subject of the West.",
  },
  {
    q: "How is Western fine art different from Western decor?",
    a: "Western decor uses familiar frontier imagery to create a look. Western fine art uses composition, intent, and authorship to create enduring artistic meaning. Decor fills space with recognizable symbols. Fine art rewards sustained viewing and holds up as part of a larger cultural tradition.",
  },
  {
    q: "Why does the label Western fine art matter?",
    a: "The label matters because it separates authored work from mass-market imagery, tourist art, and documentary-only treatment. For collectors, curators, and artists, that distinction affects how the work is valued, exhibited, collected, and understood within the broader history of Western art.",
  },
];

export const faqStructuredData = getFAQPageStructuredData(westernFineArtFaq, canonicalUrl);

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
    {
      name: "Western Art",
      item: "https://www.k4studios.com/Blog/what-is-western-art",
    },
    { name: "Western Fine Art", item: canonicalUrl },
  ],
  `${canonicalUrl}#breadcrumb`
);

export const structuredData = getStructuredData({
  type: "Article",
  data: {
    headline: "What Is Western Fine Art? Definition, Meaning, and Why It Matters",
    description: pageDescription,
    url: canonicalUrl,
    image: getAbsoluteProxySrc(image1.id, "l"),
    copyrightNotice: "© Wayne Heim",
    author: {
      "@type": "Person",
      name: "Wayne Heim"
    },
    datePublished: "2026-02-02",
    dateModified: "2026-05-07",
    articleSection: "Fine Art",
    definedTerm: {
      name: "Western Fine Art",
      description: pageDescription,
    },
    keywords: [
      "western fine art",
      "western fine art photography",
      "western fine art paintings",
      "contemporary western fine art",
      "western art vs western photography",
      "fine art western photography"
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
  keywords: "western fine art, western fine art photography, western fine art paintings, contemporary western fine art, fine art western photography",
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogType: "article",
  ogUrl: canonicalUrl,
  ogImage: getAbsoluteProxySrc(image1.id, "l"),
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
  twitterUrl: canonicalUrl,
  twitterImage: getAbsoluteProxySrc(image1.id, "l"),
  twitterCard: "summary_large_image"
};

export const blogBreadcrumb = `Other › <a href='/Blog' style='color: inherit; text-decoration: none;' onmouseover="this.style.color='darkred'" onmouseout="this.style.color='inherit'">Blog</a> › Western Fine Art`;

import visualData from './what-is-western-fine-art.json';
export const pageData = { layout: {title: titleTag,
structuredDataJSON: structuredData,
extraStructuredDataJSON: faqStructuredData,
breadcrumbsJSON: breadcrumbStructuredData,
meta: meta}, visual: visualData, breadcrumb: blogBreadcrumb, index: 2, pagePath: sectionPath, focusKey: "cowboy-portraits-0" };
