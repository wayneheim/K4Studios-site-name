

import { getSemanticImageUrl } from "@/utils/imageProxy.js";







import { getBreadcrumbList, getFAQPageStructuredData, getStructuredData } from "@/components/utils/getStructuredData.ts";


export const sectionPath = "/Blog/what-is-visual-storytelling-in-photography";
export const canonicalUrl = `https://www.k4studios.com${sectionPath}`;

export const getProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size);
export const getAbsoluteProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size, { absolute: true });

export const headerImage = {
  id: "i-Sc9hZGs",
  src: getProxySrc("i-Sc9hZGs", "l"),
  alt: "Photograph carrying visual storytelling through atmosphere and implication"
};

export const image1 = {
  id: "i-NxjDRLV",
  src: getProxySrc("i-NxjDRLV", "l"),
  alt: "Portrait built as a threshold into story rather than a simple record"
};
export const image2 = {
  id: "i-X4SH26N",
  src: getProxySrc("i-X4SH26N", "l"),
  alt: "Story-driven scene shaped by silence, suspense, and implication"
};
export const image3 = {
  id: "i-QWcX7JT",
  src: getProxySrc("i-QWcX7JT", "l"),
  alt: "Landscape functioning as emotional environment rather than scenery"
};

export const pageTitle = "What Is Visual Storytelling in Photography? Definition";
export const pageDescription = "Visual storytelling in photography is the shaping of a still image so it implies a larger story through atmosphere, tension, and restraint rather than simple description alone.";
export const metaDescription = "Visual storytelling in photography shapes a still image so it implies a larger story — through atmosphere, tension, and restraint, not simple description.";

export const visualStorytellingFaq = [
  { q: "What is visual storytelling in photography?", a: "Visual storytelling in photography is the communication of narrative, emotion, or meaning through visual relationships. Subject, composition, light, gesture, atmosphere, and context work together to suggest something beyond the literal objects in the frame." },
  { q: "How is visual storytelling different from narrative photography?", a: "The terms overlap and are often used interchangeably. Visual storytelling describes the broader process of communicating through imagery, whether in a single photograph or a sequence. Narrative photography emphasizes the story suggested or developed through photographic images. In Wayne Heim's fine art, that narrative is deliberately shaped to encourage interpretation beyond the visible moment." },
  { q: "Can one photograph tell a story without a sequence?", a: "Yes. A sequence reveals events through multiple images. A single photograph can imply a sequence by presenting a meaningful moment between what may have happened before and what might happen next. The viewer contributes the missing movement through imagination." },
  { q: "What makes a photograph story-driven?", a: "A story-driven photograph contains visual relationships that suggest something larger than the subject alone. Gesture, expression, setting, atmosphere, and composition may imply conflict, connection, anticipation, or consequence. Just as importantly, the artist may deliberately leave information unresolved, giving the viewer room to interpret the moment." },
  { q: "How is visual storytelling used in fine art photography?", a: "Fine art photographers may use visual storytelling to communicate emotional, historical, or conceptual ideas beyond simple description. In Wayne Heim's work, camera-captured moments are deliberately shaped through light, color, atmosphere, composition, and selective omission. The finished artwork becomes an invitation to discover a story rather than merely observe a scene." },
];

export const faqStructuredData = getFAQPageStructuredData(visualStorytellingFaq, canonicalUrl);

export const structuredImageUrls = [
  getAbsoluteProxySrc(headerImage.id, "l"),
  getAbsoluteProxySrc(image1.id, "l"),
  getAbsoluteProxySrc(image2.id, "l"),
  getAbsoluteProxySrc(image3.id, "l"),
];

export const breadcrumbStructuredData = getBreadcrumbList(
  [
    { name: "Home", item: "https://www.k4studios.com" },
    { name: "Blog", item: "https://www.k4studios.com/Blog" },
    { name: "Photography Guides", item: "https://www.k4studios.com/Blog#photography-guides" },
    { name: "What Is Visual Storytelling in Photography?", item: canonicalUrl },
  ],
  `${canonicalUrl}#breadcrumb`
);

export const structuredData = getStructuredData({
  type: "Article",
  data: {
    headline: "What Is Visual Storytelling in Photography?",
    description: metaDescription,
    url: canonicalUrl,
    image: structuredImageUrls,
    copyrightNotice: "© Wayne Heim",
    author: {
      "@type": "Person",
      name: "Wayne Heim"
    },
    datePublished: "2026-03-30",
    articleSection: "Photography Guides",
    definedTerm: {
      name: "Visual Storytelling in Photography",
      description: pageDescription,
    },
    keywords: [
      "what is visual storytelling in photography",
      "visual storytelling in photography",
      "storytelling photography",
      "narrative photography",
      "cinematic photography"
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
  keywords: "what is visual storytelling in photography, visual storytelling in photography, storytelling photography, narrative photography, cinematic photography",
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

export const blogBreadcrumb = `Other › <a href='/Blog' style='color: inherit; text-decoration: none;' onmouseover="this.style.color='darkred'" onmouseout="this.style.color='inherit'">Blog</a> › <a href='/Blog#photography-guides' style='color: inherit; text-decoration: none;' onmouseover="this.style.color='darkred'" onmouseout="this.style.color='inherit'">Photography Guides</a> › What Is Visual Storytelling in Photography?`;

import visualData from './what-is-visual-storytelling-in-photography.json';
export const pageData = { layout: {title: pageTitle,
structuredDataJSON: structuredData,
extraStructuredDataJSON: faqStructuredData,
breadcrumbsJSON: breadcrumbStructuredData,
meta: meta}, visual: visualData, breadcrumb: blogBreadcrumb, index: 16, pagePath: sectionPath, focusKey: "western-narrative-color" };
