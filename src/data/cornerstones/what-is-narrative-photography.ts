

import { getSemanticImageUrl } from "@/utils/imageProxy.js";







import { getBreadcrumbList, getFAQPageStructuredData, getStructuredData } from "@/components/utils/getStructuredData.ts";


export const sectionPath = "/Blog/what-is-narrative-photography";
export const canonicalUrl = `https://www.k4studios.com${sectionPath}`;

export const getProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size);
export const getAbsoluteProxySrc = (id: string, size: string = "l") => getSemanticImageUrl(id, {}, size, { absolute: true });

export const headerImage = {
  id: "i-bfKMXS9",
  src: getProxySrc("i-bfKMXS9", "l"),
  alt: "Narrative photograph carrying atmosphere and implied story"
};

export const image1 = {
  id: "i-5TtHV8g",
  src: getProxySrc("i-5TtHV8g", "l"),
  alt: "Portrait built as a threshold into story rather than a simple record"
};
export const image2 = {
  id: "i-5rq7gcD",
  src: getProxySrc("i-5rq7gcD", "l"),
  alt: "Narrative scene shaped by silence, suspense, and implication"
};
export const image3 = {
  id: "i-fCG2nm8",
  src: getProxySrc("i-fCG2nm8", "l"),
  alt: "Landscape functioning as emotional environment rather than scenery"
};

export const pageTitle = "What Is Narrative Photography? Definition and Meaning";
export const pageDescription = "Narrative photography is photography that implies a larger story rather than simply recording a scene. This guide defines how narrative enters the frame through atmosphere, implication, and structure.";
export const metaDescription = "Narrative photography implies a larger story rather than simply recording a scene — defined here through atmosphere, implication, and structure.";

export const narrativePhotographyFaq = [
  { q: "What is narrative photography?", a: "Narrative photography is photography shaped to imply a larger story. It does not merely show what was in front of the camera. It opens the frame outward until the viewer begins to sense what happened before the moment, what may happen after it, and what emotional pressure lives inside it." },
  { q: "How is narrative photography different from documentary photography?", a: "Documentary photography records what stood before the camera. Narrative photography is authored: the story is embedded in what is shown, what is withheld, and where the tension sits. Both may photograph real subjects and real places; only one asks the viewer to remain inside the frame and finish the story." },
  { q: "Can a single photograph really tell a story?", a: "Yes — not by summarizing a plot, but by holding a moment between before and after. Posture, atmosphere, gesture, and consequence imply the rest. The viewer supplies the motion; the frame supplies the pressure." },
  { q: "What makes a photograph narrative instead of just dramatic?", a: "Drama is volume; narrative is implication. A dramatic image shows intensity. A narrative image withholds resolution — restraint leaves the viewer room to enter, and the story keeps opening each time they return to it." },
  { q: "How does narrative photography work in Western art?", a: "In Western subjects, narrative photography works close to the conditions that formed the figure — the history, hardship, and myth that live near one another in the West. At K4 Studios that form is called Narrative Western Art: story as the governing principle of the frame." },
  { q: "What is a One-Image Movie?", a: "A One-Image Movie™ is Wayne Heim's approach to creating a cinematic narrative experience within a single work of visual art. The image offers an immediate, believable moment while deliberately leaving part of its story unresolved. The title and authored primer may then reveal another interpretation, rewarding the viewer with a changed understanding of what they first believed they saw." },
];

export const faqStructuredData = getFAQPageStructuredData(narrativePhotographyFaq, canonicalUrl);

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
    { name: "What Is Narrative Photography?", item: canonicalUrl },
  ],
  `${canonicalUrl}#breadcrumb`
);

export const structuredData = getStructuredData({
  type: "Article",
  data: {
    headline: "What Is Narrative Photography?",
    description: metaDescription,
    url: canonicalUrl,
    image: structuredImageUrls,
    copyrightNotice: "© Wayne Heim",
    author: {
      "@type": "Person",
      name: "Wayne Heim"
    },
    datePublished: "2026-03-30",
    articleSection: "Narrative Photography",
    definedTerm: {
      name: "Narrative Photography",
      description: pageDescription,
    },
    keywords: [
      "what is narrative photography",
      "narrative photography",
      "cinematic photography",
      "visual storytelling in photography",
      "fine art storytelling"
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
  keywords: "what is narrative photography, narrative photography, cinematic photography, visual storytelling in photography, fine art storytelling",
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

export const blogBreadcrumb = `Other › <a href='/Blog' style='color: inherit; text-decoration: none;' onmouseover="this.style.color='darkred'" onmouseout="this.style.color='inherit'">Blog</a> › What Is Narrative Photography?`;

import visualData from './what-is-narrative-photography.json';
export const pageData = { layout: {title: pageTitle,
structuredDataJSON: structuredData,
extraStructuredDataJSON: faqStructuredData,
breadcrumbsJSON: breadcrumbStructuredData,
meta: meta}, visual: visualData, breadcrumb: blogBreadcrumb, index: 12, pagePath: sectionPath, focusKey: "western-narrative-color" };
