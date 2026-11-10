

import { getSemanticImageUrl } from "@/utils/imageProxy.js";








import { getBreadcrumbList, getFAQPageStructuredData, getStructuredData } from "@/components/utils/getStructuredData.ts";


export const sectionPath = "/Blog/what-is-cinematic-western-art";
export const canonicalUrl = `https://www.k4studios.com${sectionPath}`;

export const getProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size);
export const getAbsoluteProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size, { absolute: true });

export const headerImage = {
  id: "i-LL2Gp5r",
  src: getProxySrc("i-LL2Gp5r", "l"),
  alt: "Cinematic Western narrative artwork with figures gathered before a halted night train"
};

export const image1 = {
  id: "i-DczpNpH",
  src: getProxySrc("i-DczpNpH", "l"),
  alt: "Western figure held in directional light with unresolved tension"
};

export const image2 = {
  id: "i-3SxncXS",
  src: getProxySrc("i-3SxncXS", "l"),
  alt: "Story-driven Western scene shaped by atmosphere, silence, and suspense"
};

export const image3 = {
  id: "i-gxMVNh3",
  src: getProxySrc("i-gxMVNh3", "l"),
  alt: "Painterly Western landscape carrying emotional pressure and cinematic atmosphere"
};

export const pageTitle = "What Is Cinematic Western Art? Story-Driven Western Fine Art";
export const pageDescription = "Cinematic Western art uses light, composition, atmosphere, and implied story to turn the American West into a charged visual moment. Learn how it differs from traditional Western art and why K4 Studios calls many works One-Image Movies.";
export const metaDescription = "Cinematic Western art is story-driven Western fine art built from light, silence, atmosphere, gesture, and the unresolved human moment.";
export const ogTitle = "What Is Cinematic Western Art?";
export const ogDescription = metaDescription;
export const keywordList = [
  "cinematic western art",
  "western fine art",
  "narrative western art",
  "story-driven western art",
  "painterly western photography",
  "western artwork",
  "cowboy art",
  "One-Image Movie",
  "frontier art",
  "American West art"
];

export const cinematicWesternArtFaq = [
  {
    q: "What does cinematic Western art mean?",
    a: "Cinematic Western art is Western art built with the visual language of film. It uses light, composition, atmosphere, character, and implied story to make the image feel like a charged moment from a larger narrative.",
  },
  {
    q: "How is cinematic Western art different from traditional Western art?",
    a: "Traditional Western art often focuses on recognizable subjects of the American West, such as cowboys, horses, frontier towns, ranch life, and open landscapes. Cinematic Western art may use those same subjects, but it emphasizes story, tension, silence, and the feeling of what happened before and what may happen next.",
  },
  {
    q: "Is cinematic Western art the same as Western movie art?",
    a: "No. Cinematic Western art is not simply art based on Western movies. It may draw from film language, but it can exist in painting, photography, illustration, or mixed media. The key is not the movie reference. The key is the sense of scene, atmosphere, and implied story.",
  },
  {
    q: "Can photography be cinematic Western art?",
    a: "Yes. A Western photograph can become cinematic Western art when it is shaped through composition, light, timing, atmosphere, and narrative restraint. The camera captures the scene, but the artist's choices determine whether the final work feels documentary, decorative, or cinematic.",
  },
  {
    q: "What is a One-Image Movie?",
    a: "A One-Image Movie is K4 Studios' term for a single artwork built to feel like part of a larger story. The image, title, written story, and viewer imagination work together, creating the feeling of a film contained in one frame.",
  },
];

export const faqStructuredData = getFAQPageStructuredData(cinematicWesternArtFaq, canonicalUrl);

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
    { name: "Narrative & Story", item: "https://www.k4studios.com/Blog#narrative-story" },
    { name: "What Is Cinematic Western Art?", item: canonicalUrl },
  ],
  `${canonicalUrl}#breadcrumb`
);

export const structuredData = getStructuredData({
  type: "Article",
  data: {
    headline: ogTitle,
    description: ogDescription,
    url: canonicalUrl,
    image: structuredImageUrls,
    copyrightNotice: "Copyright Wayne Heim",
    author: {
      "@type": "Person",
      name: "Wayne Heim"
    },
    datePublished: "2026-05-16",
    dateModified: "2026-05-16",
    articleSection: "Narrative & Story",
    keywords: keywordList,
    about: [
      { "@type": "Thing", name: "Cinematic Western art" }
    ],
    mentions: [
      { "@type": "Thing", name: "Western fine art" },
      { "@type": "Thing", name: "painterly photography" },
      { "@type": "Thing", name: "narrative art" },
      { "@type": "Thing", name: "One-Image Movie" },
      { "@type": "Thing", name: "American West" }
    ]
  },
  defaults: {
    copyrightNotice: "Copyright Wayne Heim",
    license: "https://www.k4studios.com/copyright",
    creditText: "Wayne Heim",
    creatorName: "Wayne Heim",
    creatorUrl: "https://www.k4studios.com/"
  }
});

export const meta = {
  seoDescription: metaDescription,
  description: metaDescription,
  story: ogDescription,
  keywords: keywordList.join(", "),
  ogTitle,
  ogDescription,
  ogType: "article",
  ogUrl: canonicalUrl,
  ogImage: getAbsoluteProxySrc(headerImage.id, "l"),
  twitterTitle: ogTitle,
  twitterDescription: ogDescription,
  twitterUrl: canonicalUrl,
  twitterImage: getAbsoluteProxySrc(headerImage.id, "l"),
  twitterCard: "summary_large_image",
  preserveDescriptionDashes: true,
};

export const blogBreadcrumb = `Other › <a href='/Blog' style='color: inherit; text-decoration: none;' onmouseover="this.style.color='darkred'" onmouseout="this.style.color='inherit'">Blog</a> › What Is Cinematic Western Art?`;

import visualData from './what-is-cinematic-western-art.json';
export const pageData = { layout: {title: pageTitle,
structuredDataJSON: structuredData,
extraStructuredDataJSON: faqStructuredData,
breadcrumbsJSON: breadcrumbStructuredData,
meta: meta}, visual: visualData, breadcrumb: blogBreadcrumb, index: 17, pagePath: sectionPath, focusKey: "western-narrative-color" };
