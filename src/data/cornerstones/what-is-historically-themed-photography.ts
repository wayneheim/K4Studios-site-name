
/**
 * What Is Historically Themed Photography?
 *
 * Purpose: define the parent category behind Facing History.
 * This page clarifies that "historically themed" refers to subject, story,
 * and authorship - not the age of the photograph.
 */








import { getBreadcrumbList, getStructuredData } from "@/components/utils/getStructuredData.ts";
import { getSemanticImageUrl } from "@/utils/imageProxy.js";


export const sectionPath = "/Blog/what-is-historically-themed-photography";
export const canonicalUrl = "https://www.k4studios.com/Blog/what-is-historically-themed-photography";

export const headerImages = [
  {
    id: "i-8BbMZjs",
    title: "Minding the Herd",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color",
    alt: "Western frontier portrait used as historically themed fine art photography",
  },
  {
    id: "i-C5ZGjMH",
    title: "The Burden of Rank",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color",
    alt: "Civil War portrait interpreted through historically themed fine art photography",
  },
  {
    id: "i-pd3hvNk",
    title: "The Recoil",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color",
    alt: "World War II living history scene interpreted as history inspired photography",
  },
  {
    id: "i-tpvJWLm",
    title: "Havana Post Cigars",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White",
    alt: "Roaring 20s portrait interpreted as historically themed photography",
  },
];

export const examples = [
  {
    ...headerImages[0],
    src: getSemanticImageUrl(headerImages[0], { galleryPath: headerImages[0].galleryPath }),
    alt: "Painterly Western portrait grounded in research, living history, and frontier narrative",
    caption: "Western frontier - history as lived character and myth under pressure",
    href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/i-8BbMZjs",
  },
  {
    ...headerImages[1],
    src: getSemanticImageUrl(headerImages[1], { galleryPath: headerImages[1].galleryPath }),
    alt: "Civil War portrait using historically themed fine art photography to explore command and consequence",
    caption: "Civil War - restraint, responsibility, and the human cost of conflict",
    href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color/i-C5ZGjMH",
  },
  {
    ...headerImages[2],
    src: getSemanticImageUrl(headerImages[2], { galleryPath: headerImages[2].galleryPath }),
    alt: "World War II themed fine art photography built from real reenactors and period detail",
    caption: "World War II - machinery, service, fatigue, and memory",
    href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color/i-pd3hvNk",
  },
  {
    ...headerImages[3],
    src: getSemanticImageUrl(headerImages[3], { galleryPath: headerImages[3].galleryPath }),
    alt: "Roaring 20s portrait showing history themed photography beyond archival documentation",
    caption: "Roaring 20s - glamour, tension, and consequence in a changing age",
    href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White/i-tpvJWLm",
  },
];

export const pageTitle = "What Is Historically Themed Photography? Definition";
export const pageDescription = "Historically themed photography is contemporary fine art photography that interprets people, eras, and events from the past through research, real subjects, period detail, and visual storytelling.";
export const metaDescription = "Historically themed photography is contemporary fine art photography that interprets people, eras, and events from the past through research and period detail.";
export const faqItems = [
  {
    question: "What is historically themed photography?",
    answer: "Historically themed photography is contemporary fine art photography that interprets people, eras, and events from the past through research, real subjects, period detail, and visual storytelling. The historical element is the subject and story, not the age of the photograph.",
  },
  {
    question: "How is historically themed photography different from historical photography?",
    answer: "Historical photography often refers to antique, archival, documentary, or historically significant photographs. Historically themed photography is new work made today that uses history as subject matter for authored fine art.",
  },
];

export const structuredImageUrls = examples.map((image) =>
  getSemanticImageUrl(image, { galleryPath: image.galleryPath }, "l", { absolute: true })
);
export const socialImage = headerImages[1];
export const socialImageUrl = getSemanticImageUrl(
  socialImage,
  { galleryPath: socialImage.galleryPath },
  "l",
  { absolute: true }
);

export const breadcrumbStructuredData = getBreadcrumbList(
  [
    { name: "Home", item: "https://www.k4studios.com" },
    { name: "Blog", item: "https://www.k4studios.com/Blog" },
    { name: "Historically Themed Photography", item: canonicalUrl },
  ],
  `${canonicalUrl}#breadcrumb`
);

export const structuredData = getStructuredData({
  type: "Article",
  data: {
    headline: "What Is Historically Themed Photography?",
    description: metaDescription,
    url: canonicalUrl,
    image: socialImageUrl,
    copyrightNotice: "Copyright Wayne Heim",
    author: {
      "@type": "Person",
      name: "Wayne Heim",
    },
    datePublished: "2026-05-01",
    articleSection: "Photography",
    definedTerm: {
      name: "Historically Themed Photography",
      description: pageDescription,
    },
    keywords: [
      "historically themed photography",
      "historically themed fine art photography",
      "history themed photography",
      "history inspired photography",
      "historically inspired photography",
      "Facing History",
    ],
  },
  defaults: {
    copyrightNotice: "Copyright Wayne Heim",
    license: "https://www.k4studios.com/copyright",
    creditText: "Wayne Heim",
    creatorName: "Wayne Heim",
    creatorUrl: "https://www.k4studios.com/",
  },
});

export const meta = {
  seoDescription: metaDescription,
  description: metaDescription,
  story: metaDescription,
  keywords: "historically themed photography, historically themed fine art photography, history themed photography, history inspired photography, historically inspired photography, Facing History",
  ogTitle: pageTitle,
  ogDescription: metaDescription,
  ogType: "article",
  ogUrl: canonicalUrl,
  ogImage: socialImageUrl,
  twitterTitle: pageTitle,
  twitterDescription: metaDescription,
  twitterUrl: canonicalUrl,
  twitterImage: socialImageUrl,
  twitterCard: "summary_large_image",
  preserveDescriptionDashes: true,
};

export const faqStructuredData = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
});

export const blogBreadcrumb = `Other &rsaquo; <a href='/Blog' style='color: inherit; text-decoration: none;' onmouseover="this.style.color='darkred'" onmouseout="this.style.color='inherit'">Blog</a> &rsaquo; Historically Themed Photography`;

import visualData from './what-is-historically-themed-photography.json';
export const pageData = { layout: {title: pageTitle,
structuredDataJSON: structuredData,
breadcrumbsJSON: breadcrumbStructuredData,
extraStructuredDataJSON: faqStructuredData,
meta: meta}, visual: visualData, breadcrumb: blogBreadcrumb, index: 10, pagePath: sectionPath, focusKey: "civil-war-0" };
