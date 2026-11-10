








import { getBreadcrumbList, getFAQPageStructuredData, getStructuredData } from "@/components/utils/getStructuredData.ts";
import { getSemanticImageUrl } from "@/utils/imageProxy.js";

export const sectionPath = "/Blog/what-is-the-wild-west";
export const canonicalUrl = `https://www.k4studios.com${sectionPath}`;
export const pageTitle = "What Is the Wild West? Definition, Era, and Meaning";
export const pageDescription = "The Wild West is the popular name for the American West in the decades after the Civil War — roughly 1865 to 1890 — when the country beyond the Mississippi was being settled, surveyed, fought over, and worked at speed: cattle drives and railroads, mining camps and homesteads, cavalry posts and Native nations resisting the loss of their land. The term names two things at once — a real place and period in American history, and the legend later built on top of it: the gunfighter, the outlaw, the lone rider against the sunset. That double meaning is why \"Wild West\" is used so loosely, and why defining it matters.";
export const metaDescription = "The Wild West is the popular name for the American West after the Civil War, roughly 1865 to 1890 — a real place and period, and the legend built on it.";
export const hero = {
  id: "i-7Mzzbvp",
  src: getSemanticImageUrl("i-7Mzzbvp", {}, "l"),
  absoluteSrc: getSemanticImageUrl("i-7Mzzbvp", {}, "l", { absolute: true }),
  alt: "The lived American West interpreted through Wayne Heim's painterly narrative photography",
};

export const faqItems = [
  {
    question: "What years does the Wild West cover?",
    answer: "Roughly 1865 to 1890 — from the end of the Civil War to the Census Bureau's declaration that the frontier line had closed. Some accounts stretch the tail to about 1900, but the classic period is that single generation.",
  },
  {
    question: "Where was the Wild West?",
    answer: "In the American West beyond the Mississippi River: the Great Plains, the Rocky Mountains, the desert Southwest, and the Pacific slope — land that was homeland to Native nations long before it became \"the frontier.\"",
  },
  {
    question: "Is the Wild West real, or a myth?",
    answer: "Both. It was a real period of settlement, labor, conflict, and displacement — and it was turned into a legend by dime novels, Wild West shows, and film, beginning while the era was still underway. Serious work on the subject keeps the two distinct: the legend is studied, but the lives underneath it come first.",
  },
  {
    question: "How is Wayne Heim's Wild West photography different from costume or reenactment photography?",
    answer: "It is built with living historians and researched detail, but the goal is not a record of an event or a posed costume portrait. Each image is an interrupted narrative moment — a One-Image Movie™ — made through painterly handling so the viewer steps inside the pressure of the scene and completes the story, instead of simply recognizing an icon.",
  },
];
export const faqStructuredData = getFAQPageStructuredData(faqItems, canonicalUrl);

export const structuredData = getStructuredData({
  type: "Article",
  data: {
    headline: "What Is the Wild West?",
    title: pageTitle,
    description: metaDescription,
    url: canonicalUrl,
    image: [hero.absoluteSrc],
    copyrightNotice: "Copyright Wayne Heim",
    author: { "@type": "Person", name: "Wayne Heim" },
    datePublished: "2026-11-05",
    dateModified: "2026-11-05",
    articleSection: "Western History",
    definedTerm: { name: "Wild West", description: pageDescription },
    keywords: ["Wild West", "what is the Wild West", "Wild West definition", "American West", "American frontier"],
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
  { name: "What Is the Wild West?", item: canonicalUrl },
], `${canonicalUrl}#breadcrumb`);

export const meta = {
  seoDescription: metaDescription,
  description: metaDescription,
  story: metaDescription,
  keywords: "Wild West, what is the Wild West, Wild West definition, American West, American frontier",
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

export const blogBreadcrumb = `Other › <a href='/Blog' style='color: inherit; text-decoration: none;' onmouseover="this.style.color='darkred'" onmouseout="this.style.color='inherit'">Blog</a> › What Is the Wild West?`;

import visualData from './what-is-the-wild-west.json';
export const pageData = { layout: {title: pageTitle,
structuredDataJSON: structuredData,
extraStructuredDataJSON: faqStructuredData,
breadcrumbsJSON: breadcrumbStructuredData,
meta: meta}, visual: visualData, breadcrumb: blogBreadcrumb, index: 19, pagePath: sectionPath, focusKey: "western-narrative-color" };
