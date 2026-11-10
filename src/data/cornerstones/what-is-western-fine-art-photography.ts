
/**
 * What Is Western Fine Art Photography? — Definition Article
 * 
 * Purpose: Own the definition layer for "Western Fine Art Photography"
 * This is a vestibule, not a destination — orient, elevate, invite forward.
 * 
 * Architecture:
 * - Prose-first, uninterrupted
 * - Article schema (not gallery)
 * - Early funnel to hub (after opening)
 * - Late funnel after differentiation
 * - Confident, corrective tone — not tutorial
 */

import { getSemanticImageUrl } from "@/utils/imageProxy.js";








import { getBreadcrumbList, getFAQPageStructuredData, getStructuredData } from "@/components/utils/getStructuredData.ts";


export const sectionPath = "/Blog/what-is-western-fine-art-photography";
export const canonicalUrl = "https://www.k4studios.com/Blog/what-is-western-fine-art-photography";

// Proxy URL helper
export const getProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size);
export const getAbsoluteProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size, { absolute: true });

// Representative images - curated selection demonstrating range:
// Header bar: 5 unique images fading from edges to center (none reused in demo section)
export const headerImages = [
  { id: "i-6Ffpw9t", alt: "Frontier scene with atmospheric depth" },
  { id: "i-89qzJ6S", alt: "Character study in warm directional light" },
  { id: "i-c5K798H", alt: "Defiant moment — tension composed rather than captured" },
  { id: "i-LCspRF4", alt: "Cowboy at dusk in quiet reflection" },
  { id: "i-4Hz6D7k", alt: "Native American subject with compositional dignity" },
];

// Demo section images (3) - different from header
export const image1 = {
  id: "i-7Kwv8vc",
  src: getProxySrc("i-7Kwv8vc", "l"),
  alt: "Cowboy portrait in painterly light, treated as character rather than Western silhouette"
};
export const image2 = {
  id: "i-Txh4c8k",
  src: getProxySrc("i-Txh4c8k", "l"),
  alt: "Black-and-white rope work scene emphasizing practiced labor, restraint, and photographic authorship"
};
export const image3 = {
  id: "i-7hD9CCh",
  src: getProxySrc("i-7hD9CCh", "l"),
  alt: "Native American woman at the water's edge portrayed with quiet presence and narrative stillness"
};

export const closerImage1 = {
  id: "i-MHGPvcs",
  src: getProxySrc("i-MHGPvcs", "l"),
  alt: "Western landscape shaped by atmosphere, light, and tonal control in fine art photography"
};
export const closerImage2 = {
  id: "i-mLPgSpC",
  src: getProxySrc("i-mLPgSpC", "l"),
  alt: "Western portrait built around character, posture, and narrative intent rather than stereotype"
};
export const closerImage3 = {
  id: "i-Cg4ZB72",
  src: getProxySrc("i-Cg4ZB72", "l"),
  alt: "Lantern-lit Western narrative showing craft, tonal design, and authorship beyond medium"
};

export const pageTitle = "What Is Western Fine Art Photography? Definition and Distinction";
export const titleTag = "What Is Western Fine Art Photography? Definition";
export const pageDescription = "What is Western fine art photography? This article defines the medium and distinguishes it from decor, stock Western imagery, rodeo coverage, and documentary record.";
export const metaDescription = "What is Western fine art photography? This article defines the medium and distinguishes it from decor, stock imagery, rodeo coverage, and documentary record.";

export const westernFineArtPhotographyFaq = [
  {
    q: "What is Western fine art photography?",
    a: "Western fine art photography is the photographic expression of Western fine art—authored work engaging the American West with intentional composition, narrative depth, and artistic restraint.",
  },
  {
    q: "How does Western fine art photography fit within Western fine art?",
    a: "Western fine art photography is not a separate category from Western fine art. It is one of its mediums. It applies the same authorship standards historically associated with painting to the photographic medium.",
  },
  {
    q: "What distinguishes Western fine art photography from documentary photography?",
    a: "It is photography created as fine art, not as documentation, décor, or commercial stock imagery. It is defined by authorship: decisions about structure, light, atmosphere, and emotional meaning that elevate the work beyond record-keeping.",
  },
  {
    q: "What role does landscape play in Western fine art photography?",
    a: "The land shapes the human experience. Weather, sky, and distance function as narrative elements.",
  },
  {
    q: "Why does the distinction matter for collectors?",
    a: "For collectors, the distinction determines long-term value. Fine art is collected, written about, exhibited, and preserved. Commercial imagery is replaceable.",
  },
];
export const faqStructuredData = getFAQPageStructuredData(westernFineArtPhotographyFaq, canonicalUrl);

export const structuredImageUrls = [
  getAbsoluteProxySrc(headerImages[2].id, "l"),
  getAbsoluteProxySrc(image1.id, "l"),
  getAbsoluteProxySrc(image2.id, "l"),
  getAbsoluteProxySrc(image3.id, "l"),
];

export const breadcrumbStructuredData = getBreadcrumbList(
  [
    { name: "Home", item: "https://www.k4studios.com" },
    {
      name: "Western Art",
      item: "https://www.k4studios.com/Blog/what-is-western-art",
    },
    {
      name: "Western Fine Art",
      item: "https://www.k4studios.com/Blog/what-is-western-fine-art",
    },
    { name: "Western Fine Art Photography", item: canonicalUrl },
  ],
  `${canonicalUrl}#breadcrumb`
);

export const structuredData = getStructuredData({
  type: "Article",
  data: {
    headline: "What Is Western Fine Art Photography?",
    description: metaDescription,
    url: canonicalUrl,
    image: getAbsoluteProxySrc(image1.id, "l"),
    copyrightNotice: "© Wayne Heim",
    author: {
      "@type": "Person",
      name: "Wayne Heim"
    },
    datePublished: "2026-01-29",
    dateModified: "2026-05-07",
    articleSection: "Photography",
    definedTerm: {
      name: "Western Fine Art Photography",
      description: pageDescription,
    },
    keywords: [
      "western fine art photography",
      "western photography",
      "cowboy photography",
      "fine art western",
      "western wall art",
      "cowboy portraiture"
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
  description: metaDescription,
  keywords: "western fine art photography, western photography, cowboy photography, fine art western, western wall art, cowboy portraiture",
  ogTitle: pageTitle,
  ogDescription: metaDescription,
  ogType: "article",
  ogUrl: canonicalUrl,
  ogImage: getAbsoluteProxySrc(image1.id, "l"),
  twitterTitle: pageTitle,
  twitterDescription: metaDescription,
  twitterUrl: canonicalUrl,
  twitterImage: getAbsoluteProxySrc(image1.id, "l"),
  twitterCard: "summary_large_image",
  preserveDescriptionDashes: true
};

export const blogBreadcrumb = `Other › <a href='/Blog' style='color: inherit; text-decoration: none;' onmouseover="this.style.color='darkred'" onmouseout="this.style.color='inherit'">Blog</a> › What Is Western Fine Art Photography?`;

import visualData from './what-is-western-fine-art-photography.json';
export const pageData = { layout: {title: titleTag,
structuredDataJSON: structuredData,
extraStructuredDataJSON: faqStructuredData,
breadcrumbsJSON: breadcrumbStructuredData,
meta: meta}, visual: visualData, breadcrumb: blogBreadcrumb, index: 3, pagePath: sectionPath, focusKey: "cowboy-portraits-0" };
