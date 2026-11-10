








import { getBreadcrumbList, getStructuredData } from "@/components/utils/getStructuredData.ts";
import { getSemanticImageUrl } from "@/utils/imageProxy.js";

export const sectionPath = "/Blog/what-is-contemporary-western-art";
export const canonicalUrl = `https://www.k4studios.com${sectionPath}`;
export const pageTitle = "What Is Contemporary Western Art? Definition and Meaning";
export const pageDescription = "Contemporary Western art is present-day art that interprets the American West through current visual language, modern mediums, and contemporary authorship while remaining connected to Western subject matter, history, landscape, and myth.";
export const metaDescription = "Contemporary Western art is present-day art interpreting the American West through current visual language, rooted in Western history and myth.";
export const hero = {
  id: "i-cfW89QP",
  src: getSemanticImageUrl("i-cfW89QP", {}, "l"),
  absoluteSrc: getSemanticImageUrl("i-cfW89QP", {}, "l", { absolute: true }),
  alt: "Cowboy firing a rifle from a rocky ridge beside his saddled horse beneath a storm-filled Western sky",
};

export const structuredData = getStructuredData({
  type: "Article",
  data: {
    headline: "What Is Contemporary Western Art?",
    title: pageTitle,
    description: metaDescription,
    url: canonicalUrl,
    image: [hero.absoluteSrc],
    copyrightNotice: "Copyright Wayne Heim",
    author: { "@type": "Person", name: "Wayne Heim" },
    datePublished: "2026-11-03",
    dateModified: "2026-11-05",
    articleSection: "Western Art",
    definedTerm: { name: "Contemporary Western Art", description: pageDescription },
    keywords: ["contemporary Western art", "contemporary Western art definition", "modern Western art", "Western fine art", "Wayne Heim", "painterly photography"],
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
  { name: "What Is Contemporary Western Art?", item: canonicalUrl },
], `${canonicalUrl}#breadcrumb`);

export const meta = {
  seoDescription: metaDescription,
  description: metaDescription,
  story: metaDescription,
  keywords: "contemporary Western art, contemporary Western art definition, modern Western art, Western fine art, Wayne Heim, painterly photography",
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
  descriptionMaxLength: 500,
  preserveDescriptionDashes: true,
};

export const blogBreadcrumb = `Other › <a href='/Blog' style='color: inherit; text-decoration: none;' onmouseover="this.style.color='darkred'" onmouseout="this.style.color='inherit'">Blog</a> › What Is Contemporary Western Art?`;

import visualData from './what-is-contemporary-western-art.json';
export const pageData = { layout: {title: pageTitle,
structuredDataJSON: structuredData,
breadcrumbsJSON: breadcrumbStructuredData,
meta: meta}, visual: visualData, breadcrumb: blogBreadcrumb, index: 18, pagePath: sectionPath, focusKey: "cowboy-portraits-0" };
