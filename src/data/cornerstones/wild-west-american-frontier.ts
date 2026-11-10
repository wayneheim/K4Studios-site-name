








import { getBreadcrumbList, getFAQPageStructuredData, getStructuredData } from "@/components/utils/getStructuredData.ts";
import { getSemanticImageUrl } from "@/utils/imageProxy.js";

export const sectionPath = "/Blog/wild-west-american-frontier";
export const canonicalUrl = `https://www.k4studios.com${sectionPath}`;
export const pageTitle = "Wild West American Frontier: Definition and Meaning";
export const pageDescription = "The Wild West American frontier was the moving western edge of settlement in the United States — the shifting zone where platted land, towns, rail lines, and federal law thinned out into open country and distance. It was never one place: for nearly three centuries the frontier was a line that kept relocating west, from the Appalachian foothills to the Pacific. In 1890 the U.S. Census Bureau declared that a continuous frontier line could no longer be drawn, and in 1893 historian Frederick Jackson Turner argued that the frontier experience — self-reliance under pressure, reinvention at the edge of the map — had forged the American character. The Wild West is the name the national imagination gave to that frontier's last and fastest decades.";
export const metaDescription = "The Wild West American frontier was the moving western edge of settlement — where towns, rail lines, and federal law thinned into open country.";
export const hero = {
  id: "i-B7ZSdfs",
  src: getSemanticImageUrl("i-B7ZSdfs", {}, "l"),
  absoluteSrc: getSemanticImageUrl("i-B7ZSdfs", {}, "l", { absolute: true }),
  alt: "The American frontier interpreted as an interrupted narrative moment in Wayne Heim's Western art",
};

export const faqItems = [
  {
    question: "What was the American frontier?",
    answer: "The moving western edge of settlement in the United States — the shifting zone where towns, surveyed land, and federal law thinned out into open country. It relocated steadily westward for nearly three centuries, which is why \"frontier\" describes a condition of distance and self-reliance, not a single place.",
  },
  {
    question: "When did the American frontier close?",
    answer: "In 1890 the U.S. Census Bureau declared that settlement had so broken up the western country that a continuous frontier line could no longer be drawn. The announcement is the conventional closing date, and it set up Frederick Jackson Turner's famous 1893 address on the frontier's significance.",
  },
  {
    question: "What is the Turner thesis, in plain language?",
    answer: "Historian Frederick Jackson Turner argued in 1893 that the frontier experience — repeated new beginnings at the edge of settlement — had forged the defining American traits: self-reliance, inventiveness, restlessness, and democracy. Later historians corrected his omissions, especially Native dispossession, but the idea that the frontier shaped the national character remains the starting point of the argument.",
  },
  {
    question: "What does the frontier have to do with Wayne Heim's photography?",
    answer: "The legends of the frontier stand on an armature — the buried stories of the people who built the West — and when that foundation is forgotten, the legend thins into cliché. Wayne Heim's narrative work returns to that foundation: working with living historians, he builds interrupted frontier moments — One-Image Movies™ — that viewers step inside and complete, restoring the human pressure the legends rest on.",
  },
];
export const faqStructuredData = getFAQPageStructuredData(faqItems, canonicalUrl);

export const structuredData = getStructuredData({
  type: "Article",
  data: {
    headline: "Wild West American Frontier",
    title: pageTitle,
    description: metaDescription,
    url: canonicalUrl,
    image: [hero.absoluteSrc],
    copyrightNotice: "Copyright Wayne Heim",
    author: { "@type": "Person", name: "Wayne Heim" },
    datePublished: "2026-11-05",
    dateModified: "2026-11-05",
    articleSection: "Western History",
    definedTerm: { name: "Wild West American Frontier", description: pageDescription },
    keywords: ["Wild West American frontier", "American frontier", "frontier definition", "Turner thesis", "Wild West"],
  },
  defaults: {
    copyrightNotice: "Copyright Wayne Heim",
    license: "https://www.k4studios.com/copyright",
    creditText: "Wayne Heim",
    creatorName: "Wayne Heim",
    creatorUrl: "https://www.k4studios.com/",
  },
});

export const breadcrumbStructuredData = getBreadcrumbList([
  { name: "Home", item: "https://www.k4studios.com" },
  { name: "Blog", item: "https://www.k4studios.com/Blog" },
  { name: "Wild West American Frontier", item: canonicalUrl },
], `${canonicalUrl}#breadcrumb`);

export const meta = {
  seoDescription: metaDescription,
  description: metaDescription,
  story: metaDescription,
  keywords: "Wild West American frontier, American frontier, frontier definition, Turner thesis, Wild West",
  canonicalUrl,
  ogTitle: pageTitle,
  ogDescription: metaDescription,
  ogType: "article",
  ogUrl: canonicalUrl,
  ogImage: hero.absoluteSrc,
  ogImageAlt: hero.alt,
  twitterTitle: pageTitle,
  twitterDescription: metaDescription,
  twitterUrl: canonicalUrl,
  twitterImage: hero.absoluteSrc,
  twitterCard: "summary_large_image",
  descriptionMaxLength: 1000,
  preserveDescriptionDashes: true,
};

export const blogBreadcrumb = `Other › <a href='/Blog' style='color: inherit; text-decoration: none;' onmouseover="this.style.color='darkred'" onmouseout="this.style.color='inherit'">Blog</a> › Wild West American Frontier`;

import visualData from './wild-west-american-frontier.json';
export const pageData = { layout: {title: pageTitle,
structuredDataJSON: structuredData,
extraStructuredDataJSON: faqStructuredData,
breadcrumbsJSON: breadcrumbStructuredData,
meta: meta}, visual: visualData, breadcrumb: blogBreadcrumb, index: 20, pagePath: sectionPath, focusKey: "western-narrative-color" };
