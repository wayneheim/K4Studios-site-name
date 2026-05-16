import { galleryData as cowboyColorData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs";
import { galleryData as cowboyBlackWhiteData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs";
import { galleryData as narrativeColorData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color.mjs";
import { galleryData as narrativeBlackWhiteData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White.mjs";
import { galleryData as nativeColorData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color.mjs";
import { galleryData as nativeBlackWhiteData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Black-White.mjs";
import { galleryData as landscapeWestData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery.mjs";
import { galleryData as mountainData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains/Mountains.mjs";
import { galleryData as waterData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water/Water.mjs";
import { galleryData as warColorData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Color.mjs";
import { galleryData as warBlackWhiteData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Black-White.mjs";
import { galleryData as machineColorData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color.mjs";
import { galleryData as machineBlackWhiteData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White.mjs";
import { galleryData as portraitColorData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color.mjs";
import { galleryData as portraitBlackWhiteData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White.mjs";
import { galleryData as civilWarColorData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color.mjs";
import { galleryData as civilWarBlackWhiteData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Black-White.mjs";
import { galleryData as roaringColorData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color.mjs";
import { galleryData as roaringBlackWhiteData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White.mjs";
import { entranceData as cowboyEntranceData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/ColorEntranceData.ts";
import { entranceData as landscapeEntranceData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/ColorEntranceData.ts";
import { entranceData as wwiiEntranceData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/ColorEntranceData.ts";
import { getFormattedLowestStandardPrintPrice } from "@/data/pricing/printSeries.js";

type GallerySource = {
  key: string;
  title: string;
  description: string;
  galleryPath: string;
  allHref: string;
  ctaLabel: string;
  ctaThumb: string;
  alternateCtaLabel?: string;
  alternateCtaHref?: string;
  alternateCtaKicker?: string;
  alternateCtaCount?: string;
  data: any[];
  offset?: number;
  limit?: number;
};

type GridSectionOptions = {
  offsets?: Record<string, number>;
  limits?: Record<string, number>;
  timeZones?: Record<string, string>;
  alternates?: Record<string, { href: string; label: string; kicker?: string; count?: string }>;
};

const cleanItems = (items: any[] = []) =>
  items.filter((item: any) =>
    item?.id &&
    item.id !== "i-k4studios" &&
    item.visibility !== "ghost" &&
    item.visibility !== "hidden" &&
    item.visibility !== "hide"
  );

const rotateGallery = (items: any[] = [], offset = 0) => {
  const clean = cleanItems(items);
  if (clean.length === 0) return clean;
  const start = offset % clean.length;
  return [...clean.slice(start), ...clean.slice(0, start)];
};

const womenSubjectPattern =
  /\b(woman|women|girl|female|wife|mother|lady|ladies|bride|widow|daughter|cowgirl|pioneer woman|frontier woman|frontier women)\b/i;

const isWomenSubject = (item: any) => {
  const themes = item?.themes || {};
  const searchable = [
    item?.title,
    item?.description,
    item?.alt,
    item?.story,
    item?.notes,
    Array.isArray(item?.keywords) ? item.keywords.join(" ") : "",
    Object.keys(themes).join(" "),
  ].join(" ");

  return Boolean(
    themes["women-of-the-west"] ||
    themes["frontier-women"] ||
    womenSubjectPattern.test(searchable)
  );
};

const curateWomen = (items: any[] = []) => cleanItems(items).filter(isWomenSubject);
const curateWomenExcept = (items: any[] = [], excludedIds: string[] = []) =>
  curateWomen(items).filter((item: any) => !excludedIds.includes(item.id));
const curateIds = (items: any[] = [], ids: string[] = []) => {
  const byId = new Map(cleanItems(items).map((item: any) => [item.id, item]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
};

const womenNarrativeColorCuratedIds = [
  "i-QWcX7JT",
  "i-6Ffpw9t",
  "i-jcLJT4J",
  "i-X4SH26N",
  "i-G7csptc",
  "i-Vr8vzjt",
  "i-Nn7scqm",
  "i-rfFBRQM",
  "i-cV5gwWZ",
  "i-4zxZQQ2",
  "i-B7ZSdfs",
  "i-5Md3dQ3",
  "i-NDnxRkx",
  "i-NxjDRLV",
  "i-cFhZXJc",
  "i-5rq7gcD",
  "i-DczpNpH",
  "i-qB47jJT",
  "i-VDLVwqr",
  "i-NKdPDCg",
  "i-5HpSkgR",
  "i-7dCKHjg",
  "i-9wQL5tH",
  "i-8rsG6P9",
  "i-mpfG8XF",
  "i-v4vRSb8",
  "i-P8B2zJj",
  "i-LBSWzcj",
  "i-vGkvhmq",
  "i-v4TzPgF",
  "i-btSc5RS",
  "i-ZPmj5Wk",
  "i-8JSdTGz",
];

const countLiveItems = (sections: any[]) =>
  sections.reduce((total, section) => total + cleanItems(section.items).length, 0);

const sectionDock = (title: string, href: string, thumb: string) => ({
  title,
  href,
  thumb,
  cue: "Browse collection ->",
  dockRole: "core",
  dockPrefix: "",
});

const supportDock = (title: string, href: string, thumb: string) => ({
  title,
  href,
  thumb,
  cue: "Browse collection ->",
  dockRole: "support",
  dockPrefix: "",
});

const sources = {
  cowboyColor: {
    key: "cowboyColor",
    title: "Color Cowboy Portrait Prints",
    description: "Color cowboy portraits with painterly light, weathered character, and collector-ready Western presence.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/all#collection-browser",
    ctaLabel: "See the full color cowboy portrait collection",
    ctaThumb: "/img/i-5FX3W9r/s.jpg",
    data: cowboyColorData,
    limit: 19,
  },
  womenCowboyColor: {
    key: "womenCowboyColor",
    title: "Women of the American West - Color Portrait Prints",
    description: "Color frontier women portraits curated from descriptions, story, keywords, and Women of the West theme tags.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/all#collection-browser",
    ctaLabel: "See the full color Western portrait collection",
    ctaThumb: "/img/i-QWcX7JT/s.jpg",
    data: curateWomen(cowboyColorData),
    limit: 19,
  },
  cowboyBlackWhite: {
    key: "cowboyBlackWhite",
    title: "Black and White Cowboy Portrait Prints",
    description: "Black and white cowboy portraits where tonal restraint, character, and old-West gravity carry the frame.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White/all#collection-browser",
    ctaLabel: "See the full black and white cowboy portrait collection",
    ctaThumb: "/img/i-DJMTZ8z/s.jpg",
    data: cowboyBlackWhiteData,
    limit: 19,
  },
  womenCowboyBlackWhite: {
    key: "womenCowboyBlackWhite",
    title: "Women of the American West - Black and White Portrait Prints",
    description: "Black and white frontier women portraits where tone, posture, and restraint carry the subject.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White/all#collection-browser",
    ctaLabel: "See the full black and white Western portrait collection",
    ctaThumb: "/img/i-W73hxx4/s.jpg",
    data: curateWomenExcept(cowboyBlackWhiteData, ["i-45kXhng"]),
    limit: 19,
  },
  narrativeColor: {
    key: "narrativeColor",
    title: "Color Western Narrative Prints",
    description: "Color frontier scenes with story-led Western presence, painterly light, and cinematic atmosphere.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color/all#collection-browser",
    ctaLabel: "See the full color Western narrative collection",
    ctaThumb: "/img/i-B7ZSdfs/s.jpg",
    data: narrativeColorData,
    limit: 19,
  },
  womenNarrativeColor: {
    key: "womenNarrativeColor",
    title: "Women of the American West - Color Narrative Prints",
    description: "Color frontier scenes curated for women, cowgirls, wives, daughters, and women of the Western story.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color/all#collection-browser",
    ctaLabel: "See the full color Western narrative collection",
    ctaThumb: "/img/i-X4SH26N/s.jpg",
    data: curateIds(narrativeColorData, womenNarrativeColorCuratedIds),
    limit: 19,
  },
  narrativeBlackWhite: {
    key: "narrativeBlackWhite",
    title: "Black and White Western Narrative Prints",
    description: "Monochrome frontier narrative prints where shadow, silence, and implication carry the story.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White/all#collection-browser",
    ctaLabel: "See the full black and white Western narrative collection",
    ctaThumb: "/img/i-mqQxwNn/s.jpg",
    data: narrativeBlackWhiteData,
    limit: 19,
  },
  womenNarrativeBlackWhite: {
    key: "womenNarrativeBlackWhite",
    title: "Women of the American West - Black and White Narrative Prints",
    description: "Monochrome frontier scenes curated for women of the West, domestic tension, silence, and story.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White/all#collection-browser",
    ctaLabel: "See the full black and white Western narrative collection",
    ctaThumb: "/img/i-jcLJT4J/s.jpg",
    data: curateWomen(narrativeBlackWhiteData),
    limit: 19,
  },
  nativeColor: {
    key: "nativeColor",
    title: "Native American Western Portrait Prints",
    description: "Painterly Native American portrait work with heritage, presence, atmosphere, and Western historical gravity.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color/all#collection-browser",
    ctaLabel: "See the full Native American portrait collection",
    ctaThumb: "/img/i-qLzRgbS/s.jpg",
    data: nativeColorData,
    limit: 19,
  },
  nativeBlackWhite: {
    key: "nativeBlackWhite",
    title: "Black and White Native American Portrait Prints",
    description: "Monochrome Native American portrait work shaped by tone, cloth, facial structure, and quiet authority.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Black-White",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Black-White/all#collection-browser",
    ctaLabel: "See the full black and white Native American portrait collection",
    ctaThumb: "/img/i-Z54nXZm/s.jpg",
    data: nativeBlackWhiteData,
    limit: 19,
  },
  historicalFrontierColor: {
    key: "historicalFrontierColor",
    title: "Color Western Frontier Prints",
    description: "Painterly frontier scenes and cowboy portrait work built around character, consequence, and old-West atmosphere.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West",
    ctaLabel: "Explore the full Western frontier collection",
    ctaThumb: "/img/i-B7ZSdfs/s.jpg",
    data: [...narrativeColorData, ...cowboyColorData],
    limit: 19,
  },
  landscapeWest: {
    key: "landscapeWest",
    title: "American West Landscape Prints",
    description: "Painterly Western locations built around open country, weather, distance, and the quiet authority of land.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery/all#collection-browser",
    ctaLabel: "See the full Western landscape location collection",
    ctaThumb: "/img/i-G6gftd8/s.jpg",
    data: landscapeWestData,
    limit: 19,
  },
  mountains: {
    key: "mountains",
    title: "Mountain Landscape Prints",
    description: "Painterly mountain landscapes where peaks, weather, ridgelines, and distance give the room scale.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains/all#collection-browser",
    ctaLabel: "See the full mountain landscape collection",
    ctaThumb: "/img/i-b2hZptn/s.jpg",
    data: mountainData,
    limit: 11,
  },
  water: {
    key: "water",
    title: "Water and Waterfall Landscape Prints",
    description: "Western water and waterfall images where motion, reflection, and tonal contrast shape the room.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water/all#collection-browser",
    ctaLabel: "See the full water and waterfall landscape collection",
    ctaThumb: "/img/i-sm7MXM4/s.jpg",
    data: waterData,
    limit: 19,
  },
  wwiiWarColor: {
    key: "wwiiWarColor",
    title: "WWII War Fine Art Prints - Color",
    description: "World War II inspired war images shaped through living history, painterly light, and narrative restraint.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Color",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Color/all#collection-browser",
    ctaLabel: "See the full color WWII war collection",
    ctaThumb: "/img/i-4p3fBxJ/s.jpg",
    data: warColorData,
    limit: 19,
  },
  wwiiWarBlackWhite: {
    key: "wwiiWarBlackWhite",
    title: "WWII War Fine Art Prints - Black and White",
    description: "Black and white World War II inspired images where tone, pressure, and memory carry the scene.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Black-White",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Black-White/all#collection-browser",
    ctaLabel: "See the full black and white WWII war collection",
    ctaThumb: "/img/i-p8JdtJM/s.jpg",
    data: warBlackWhiteData,
    limit: 19,
  },
  wwiiMachines: {
    key: "wwiiMachines",
    title: "WWII Machines Fine Art Prints",
    description: "Military machines, equipment, and human consequence shaped as contemporary WWII themed fine art.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color/all#collection-browser",
    ctaLabel: "See the full color WWII machines collection",
    ctaThumb: "/img/i-rBtrrtx/s.jpg",
    data: machineColorData,
    limit: 19,
  },
  wwiiMachinesBlackWhite: {
    key: "wwiiMachinesBlackWhite",
    title: "WWII Machines Fine Art Prints - Black and White",
    description: "Black and white WWII machines and equipment where tonal restraint gives military history its weight.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White/all#collection-browser",
    ctaLabel: "See the full black and white WWII machines collection",
    ctaThumb: "/img/i-wdnJQwf/s.jpg",
    data: machineBlackWhiteData,
    limit: 19,
  },
  wwiiPortraits: {
    key: "wwiiPortraits",
    title: "WWII Portrait Fine Art Prints",
    description: "WWII inspired portraits where service, fatigue, memory, and human presence carry the frame.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color/all#collection-browser",
    ctaLabel: "See the full color WWII portrait collection",
    ctaThumb: "/img/i-8QXD4Cq/s.jpg",
    data: portraitColorData,
    limit: 19,
  },
  wwiiPortraitsBlackWhite: {
    key: "wwiiPortraitsBlackWhite",
    title: "WWII Portrait Fine Art Prints - Black and White",
    description: "Black and white WWII inspired portraits where service, fatigue, memory, and human presence carry the frame.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White/all#collection-browser",
    ctaLabel: "See the full black and white WWII portrait collection",
    ctaThumb: "/img/i-7FwpMPD/s.jpg",
    data: portraitBlackWhiteData,
    limit: 19,
  },
  historicalWwiiColor: {
    key: "historicalWwiiColor",
    title: "Color WWII Fine Art Prints",
    description: "Story-driven wartime portraits where mud, fatigue, brotherhood, and quiet courage replace action and documentation.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII",
    ctaLabel: "Explore the full WWII fine art collection",
    ctaThumb: "/img/i-dMQWS6q/s.jpg",
    data: [...warColorData, ...portraitColorData, ...machineColorData],
    limit: 19,
  },
  civilWarColor: {
    key: "civilWarColor",
    title: "Color Civil War Portrait Prints",
    description: "Portrait work where duty, sacrifice, and the weight of a nation at war carry more than battlefield spectacle.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color/all#collection-browser",
    ctaLabel: "See the full color Civil War portrait collection",
    ctaThumb: "/img/i-9q7BrTt/s.jpg",
    data: civilWarColorData,
    limit: 19,
  },
  civilWarBlackWhite: {
    key: "civilWarBlackWhite",
    title: "Civil War Fine Art Portrait Prints - Black and White",
    description: "Black and white Civil War portrait work where tonal restraint gives memory and sacrifice their weight.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Black-White",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Black-White/all#collection-browser",
    ctaLabel: "See the full black and white Civil War portrait collection",
    ctaThumb: "/img/i-834cDZ8/s.jpg",
    data: civilWarBlackWhiteData,
    limit: 19,
  },
  roaringColor: {
    key: "roaringColor",
    title: "Color Roaring 20s Portrait Prints",
    description: "Jazz-Age character studies where elegance, danger, and contradiction create noir-adjacent fine art portraiture.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color/all#collection-browser",
    ctaLabel: "See the full color Roaring 20s portrait collection",
    ctaThumb: "/img/i-8zkKqtg/s.jpg",
    data: roaringColorData,
    limit: 19,
  },
  roaringBlackWhite: {
    key: "roaringBlackWhite",
    title: "Roaring 20s Fine Art Portrait Prints - Black and White",
    description: "Black and white Roaring Twenties portraits where period character, elegance, and tonal atmosphere carry the story.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White/all#collection-browser",
    ctaLabel: "See the full black and white Roaring 20s portrait collection",
    ctaThumb: "/img/i-MhMbDtL/s.jpg",
    data: roaringBlackWhiteData,
    limit: 19,
  },
} satisfies Record<string, GallerySource>;

const blogThumbs = {
  westernArt: "/img/i-7Mzzbvp/s.jpg",
  finePrint: "/images/tombstones/print-options-ts.webp",
  woodPaper: "/images/tombstones/engrained-ts.webp",
  display: "/img/i-44jcjTQ/s.jpg",
  decor: "/img/i-2GsTkqf/s.jpg",
  painterly: "/img/i-qMQf7b6/s.jpg",
  cinematic: "/img/i-kp5NHNw/s.jpg",
  historical: "/img/i-FnZ68h3/s.jpg",
  cowboy: "/img/i-QWcX7JT/s.jpg",
  bw: "/img/i-DJMTZ8z/s.jpg",
  landscape: "/img/i-G6gftd8/s.jpg",
  women: "/img/i-Mm3jXFH/s.jpg",
  wwii: "/img/i-F33M327/s.jpg",
};

const blogDock = {
  standardLeft: [
    supportDock("Learn What Is Western Art", "/Blog/what-is-western-art", blogThumbs.westernArt),
    supportDock("Learn What Makes an Image Feel Cinematic", "/Blog/what-makes-an-image-feel-cinematic", blogThumbs.cinematic),
    supportDock("Learn What Is Painterly Photography", "/Blog/what-is-painterly-photography", blogThumbs.painterly),
    supportDock("Learn What Is Historical Western Photography", "/Blog/what-is-historical-western-photography", blogThumbs.historical),
  ],
  standardRight: [
    supportDock("Learn What Makes a Fine Art Print Worth Owning", "/Blog/what-makes-a-fine-art-print-worth-owning", blogThumbs.finePrint),
    supportDock("Compare Wood Prints and Paper Prints", "/Blog/wood-prints-vs-paper-prints", blogThumbs.woodPaper),
    supportDock("Learn How to Display Western Art at Home", "/Blog/how-to-display-western-art-in-a-modern-home", blogThumbs.display),
    supportDock("Compare Decor Art and Fine Art", "/Blog/decor-art-vs-fine-art", blogThumbs.decor),
  ],
  cowboyLeft: [
    supportDock("Learn What Is Cowboy Fine Art Photography", "/Blog/what-is-cowboy-fine-art-photography", blogThumbs.cowboy),
    supportDock("Learn What Is Painterly Photography", "/Blog/what-is-painterly-photography", blogThumbs.painterly),
    supportDock("Learn What Makes an Image Feel Cinematic", "/Blog/what-makes-an-image-feel-cinematic", blogThumbs.cinematic),
    supportDock("Learn What Is Historical Western Photography", "/Blog/what-is-historical-western-photography", blogThumbs.historical),
  ],
  interiorLeft: [
    supportDock("Learn How to Display Western Art at Home", "/Blog/how-to-display-western-art-in-a-modern-home", blogThumbs.display),
    supportDock("Compare Decor Art and Fine Art", "/Blog/decor-art-vs-fine-art", blogThumbs.decor),
    supportDock("Compare Wood Prints and Paper Prints", "/Blog/wood-prints-vs-paper-prints", blogThumbs.woodPaper),
    supportDock("Learn What Makes a Fine Art Print Worth Owning", "/Blog/what-makes-a-fine-art-print-worth-owning", blogThumbs.finePrint),
  ],
  interiorRight: [
    supportDock("Explore Western Wall Art", "/Western-Wall-Art", "/img/i-QWcX7JT/s.jpg"),
    supportDock("Explore Western Landscape Art", "/western-landscape-art", "/img/i-zk7zXP3/s.jpg"),
    supportDock("Explore Vintage Western Art", "/vintage-western-art", blogThumbs.historical),
    supportDock("Explore Western Art Prints", "/western-art-prints", blogThumbs.westernArt),
  ],
};

const buildSections = (keys: Array<keyof typeof sources>, options: GridSectionOptions = {}) =>
  keys.map((key) => {
    const source = sources[key];
    const offsets = options.offsets || {};
    const limits = options.limits || {};
    const timeZones = options.timeZones || {};
    const alternates = options.alternates || {};
    const alternate = alternates[source.key];
    return {
      title: source.title,
      description: source.description,
      timeZone: timeZones[source.key],
      galleryPath: source.galleryPath,
      allHref: source.allHref,
      ctaLabel: source.ctaLabel,
      ctaThumb: source.ctaThumb,
      alternateCtaLabel: alternate?.label || source.alternateCtaLabel,
      alternateCtaHref: alternate?.href || source.alternateCtaHref,
      alternateCtaKicker: alternate?.kicker || source.alternateCtaKicker,
      alternateCtaCount: alternate?.count || source.alternateCtaCount,
      items: rotateGallery(source.data, offsets[source.key] || source.offset || 0),
      limit: limits[source.key] || source.limit || 19,
    };
  });

const faqFor = (label: string, subject: string) => [
  {
    q: `What does ${label} mean on this page?`,
    a: [
      `${label} here means Wayne Heim's contemporary painterly fine art photography shaped around ${subject}, collector-grade print presentation, and authored Western atmosphere rather than generic decor.`,
    ],
  },
  {
    q: `Can I buy the work shown on this ${label} page as prints?`,
    a: [
      `Yes. Every image opens to its own page with story, sizing, edition, and collector details. The Sketch Series opens at ${getFormattedLowestStandardPrintPrice()}, with signed Chronicle editions and ultra-limited Legend works available on selected images.`,
    ],
  },
  {
    q: "What print formats are available?",
    a: [
      "Images are available as archival paper or select wood fine art prints, including Engrained Series Baltic Birch panels where offered. Material, size, and edition options are listed inside each image page.",
    ],
  },
  {
    q: `Where should I start when choosing ${label}?`,
    a: [
      "Start with the center collection links in the dock or the first grid section on the page. Choose by subject first, then open individual works to compare story, scale, and collector details.",
    ],
  },
];

function makePage({
  pagePath,
  label,
  title,
  subject,
  sections,
  hero,
  heroPath,
  heroSrc,
  heroObjectPosition,
  entranceData = cowboyEntranceData,
  leftDock = blogDock.standardLeft,
  rightDock = blogDock.standardRight,
  archiveUrl = "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West",
  archiveName = "Wild West",
  collectionIntro,
  deck,
  seoTitle,
  seoDescription,
  commercialH1,
  gridIntroTitle,
  gridIntroCopy,
  gatewayIntroCopy,
  gatewaySupportingCopy,
  currentDockTitle,
  categoryCrumb = { href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West", name: "Wild West" },
  offsets = {},
  limits = {},
  timeZones = {},
  alternates = {},
  dockCoreCount = 3,
  centerDock,
  faqItems,
}: {
  pagePath: string;
  label: string;
  title: string;
  subject: string;
  sections: Array<keyof typeof sources>;
  hero: string;
  heroPath: string;
  heroSrc?: string;
  heroObjectPosition?: string;
  entranceData?: any;
  leftDock?: any[];
  rightDock?: any[];
  archiveUrl?: string;
  archiveName?: string;
  collectionIntro?: string;
  deck?: string;
  seoTitle?: string;
  seoDescription?: string;
  commercialH1?: string;
  gridIntroTitle?: string;
  gridIntroCopy?: string;
  gatewayIntroCopy?: string;
  gatewaySupportingCopy?: string;
  currentDockTitle?: string;
  categoryCrumb?: { href: string; name: string };
  offsets?: Record<string, number>;
  limits?: Record<string, number>;
  timeZones?: Record<string, string>;
  alternates?: Record<string, { href: string; label: string; kicker?: string; count?: string }>;
  dockCoreCount?: number;
  centerDock?: any[];
  faqItems?: Array<{ q: string; a: string[] }>;
}) {
  const gridSections = buildSections(sections, { offsets, limits, timeZones, alternates });
  const liveCount = countLiveItems(gridSections);
  const coreDock = gridSections.slice(0, dockCoreCount).map((section) => sectionDock(section.title, section.allHref, section.ctaThumb));
  const centerDockItems = centerDock || coreDock;
  const sectionDockItems = [
    ...leftDock,
    { separator: true, label: `Core ${label} collections` },
    ...centerDockItems,
    { separator: true, label: "Collector notes and related routes" },
    ...rightDock,
  ];
  const dockCenterIndex = sectionDockItems.findIndex((item: any) => item.title === centerDockItems[0]?.title);
  const first = gridSections[0];
  const firstItem = cleanItems(first.items)[0] || {};

  return {
    pagePath,
    basePath: first.galleryPath,
    rawGalleryData: first.items,
    entranceData,
    breadcrumbHtml: [
      '<a href="/">Wayne Heim</a>',
      `<a href="${categoryCrumb.href}">${categoryCrumb.name}</a>`,
      label,
    ].join(" | "),
    breadcrumbStructuredItems: [categoryCrumb],
    sectionDockItems,
    dockCenterIndex,
    currentDockTitle: currentDockTitle || `Explore ${label} Collections`,
    archiveContext: { categoryUrl: archiveUrl, categoryName: archiveName },
    identity: {
      collectionName: label,
      variantName: "Fine Art Prints",
      variantDescriptor: label.toLowerCase(),
      gatewayBrandLabel: title,
    },
    copy: {
      seoTitle: seoTitle || title,
      seoDescription: seoDescription || `${label} by Wayne Heim - ${subject}. Archival fine art prints from ${getFormattedLowestStandardPrintPrice()} through signed limited editions.`,
      indexDefinition: `${label} at K4 Studios gathers ${subject} into a collector-grade fine art print route.`,
      indexLinkNote: `This is the K4 commercial route for ${label.toLowerCase()} and related collector print searches.`,
      printAvailabilityNote: `${label} prints are available from ${getFormattedLowestStandardPrintPrice()} across archival paper and select wood presentations. Edition status and format options are shown on individual image pages.`,
      commercialH1: commercialH1 || `The Collection - ${gridSections.length} Series, ${liveCount} Works`,
      commercialDeck: deck || `${liveCount} works organized for collectors, rooms, and subject-first browsing - ${subject}.`,
      gridIntroTitle,
      gridIntroCopy,
      catalogEntranceTitle: `${label} by Wayne Heim`,
      catalogEntranceCopy: `Browse ${label.toLowerCase()} created as collector-grade fine art prints with image stories, sizing, edition, and presentation details.`,
      collectionIntro: collectionIntro || [
        `${label} at K4 Studios is built around authored Western imagery: ${subject}.`,
        "Start with the first collection section when you want the strongest subject match. Move through the adjacent sections to compare color, black and white, portrait, narrative, and room-direction options.",
        "Size, substrate, and edition details are inside each image page.",
      ].join("\n\n"),
      breadcrumbCurrentName: label,
      aggregateOfferLowPrice: "25",
      aggregateOfferHighPrice: "5000",
      aggregateOfferCount: String(liveCount),
      gatewayCollectionName: label,
      gatewayIntroCopy: gatewayIntroCopy || `${label} by Wayne Heim - ${subject} for living rooms, offices, lodges, ranch interiors, hospitality spaces, and collector walls.`,
      gatewaySupportingCopy: gatewaySupportingCopy || `These works begin as photography, then are shaped through Heim's painterly process into fine art with atmosphere, human presence, and collector-grade wall presence. The collection opens with the Sketch Series, 5x7 prints from ${getFormattedLowestStandardPrintPrice()} - sized for shelves, desks, and introductory collecting. It scales through open-edition Foundation works, signed Chronicle editions with numbered certificates, and ultra-limited Legend pieces for collectors who want permanence on the wall.\n\nClick into any section to compare prints, read the image story, and view collector and sizing details.`,
      gatewayKicker: `K4 Studios - ${label} Catalog`,
      gatewayHeroTitle: `${label} by Wayne Heim`,
      gatewayHeroAlt: `${label} hero image by Wayne Heim.`,
      gatewayHeroHref: `${heroPath}/${hero}`,
      gatewayHeroSrc: heroSrc || `/img/${hero}/m.jpg`,
      gatewayHeroSrcSet: heroSrc ? `${heroSrc} 720w` : `/img/${hero}/s.jpg 400w, /img/${hero}/m.jpg 720w`,
      gatewayHeroObjectPosition: heroObjectPosition || "center 28%",
      archiveContextCopy: "Every work on this page is available as a fine art print - with the Sketch Series opening at $25. Click into any image to read the story, compare print options, sizes, and collector details. Questions about a specific piece? Reach Wayne directly at <a href='mailto:wayne@k4studios.com'>wayne@k4studios.com</a>.",
      faqKicker: "Print & Collector Questions",
      faqTitle: `${label} FAQ`,
    },
    faqItems: faqItems || faqFor(label, subject),
    gridSections,
  };
}

const westernCore = ["narrativeColor", "narrativeBlackWhite", "cowboyColor", "cowboyBlackWhite"] as Array<keyof typeof sources>;
const cowboyCore = ["cowboyColor", "cowboyBlackWhite", "narrativeColor", "narrativeBlackWhite"] as Array<keyof typeof sources>;
const oldCore = ["cowboyBlackWhite", "cowboyColor", "narrativeBlackWhite", "narrativeColor"] as Array<keyof typeof sources>;
const frontierCore = ["narrativeColor", "nativeColor", "cowboyColor", "narrativeBlackWhite"] as Array<keyof typeof sources>;
const interiorCore = ["cowboyColor", "landscapeWest", "mountains", "water"] as Array<keyof typeof sources>;

export const commercialIntentPages = {
  wildWestArt: makePage({
    pagePath: "/wild-west-art",
    label: "Wild West Art",
    title: "Wild West Art - Fine Art Prints by Wayne Heim",
    subject: "frontier narratives, cowboy portraits, Native American portrait work, and old-West atmosphere",
    sections: ["narrativeColor", "narrativeBlackWhite", "cowboyColor", "cowboyBlackWhite", "nativeColor", "nativeBlackWhite"],
    hero: "i-B7ZSdfs",
    heroPath: sources.narrativeColor.galleryPath,
    leftDock: [
      supportDock("Learn What Is Western Art", "/Blog/what-is-western-art", blogThumbs.westernArt),
      supportDock("Learn What Is Historical Western Photography", "/Blog/what-is-historical-western-photography", blogThumbs.historical),
      supportDock("Learn What Is Narrative Photography", "/Blog/what-is-narrative-photography", "/img/i-HfQ5NVR/s.jpg"),
      supportDock("Learn What Makes an Image Feel Cinematic", "/Blog/what-makes-an-image-feel-cinematic", blogThumbs.cinematic),
    ],
    rightDock: [
      supportDock("Explore Vintage Western Art", "/vintage-western-art", "/img/i-FnZ68h3/s.jpg"),
      supportDock("Explore Old Western Art", "/old-western-art", "/img/i-W73hxx4/s.jpg"),
      supportDock("Explore Western Frontier Art", "/Western-Frontier-Art", "/img/i-89qzJ6S/s.jpg"),
      supportDock("Explore Women of the American West", "/women-of-the-wild-west", "/img/i-QWcX7JT/s.jpg"),
    ],
    dockCoreCount: 6,
    collectionIntro: [
      "Wild West art at K4 Studios gathers frontier scenes, old-West character, cowboy portraits, and historically grounded portrait work into one commercial print route.",
      "Start with the narrative sections for confrontation, aftermath, and cinematic tension. Move into cowboy portraits for human presence, then into Native American portrait work when the frontier story needs wider historical ground.",
      "Size, substrate, and edition details are inside each image page.",
    ].join("\n\n"),
  }),
  cowboyPictures: makePage({
    pagePath: "/cowboy-pictures",
    label: "Cowboy Pictures",
    title: "Cowboy Pictures - Western Fine Art Prints by Wayne Heim",
    subject: "cowboy portraits, cowboy photos, frontier character studies, and Western images made for print buyers",
    sections: cowboyCore,
    hero: "i-k4b6c5b",
    heroPath: sources.cowboyColor.galleryPath,
    leftDock: blogDock.cowboyLeft,
    dockCoreCount: 4,
  }),
  oldWesternArt: makePage({
    pagePath: "/old-western-art",
    label: "Old Western Art",
    title: "Old Western Art - Fine Art Prints by Wayne Heim",
    subject: "old-West cowboy portraits, frontier scenes, vintage atmosphere, and narrative Western imagery",
    sections: oldCore,
    hero: "i-KL9t3Xg",
    heroPath: sources.cowboyBlackWhite.galleryPath,
    leftDock: [
      supportDock("Learn What Is Historical Western Photography", "/Blog/what-is-historical-western-photography", blogThumbs.historical),
      supportDock("Learn What Is Western Art", "/Blog/what-is-western-art", blogThumbs.westernArt),
      supportDock("Learn What Is Painterly Photography", "/Blog/what-is-painterly-photography", blogThumbs.painterly),
      supportDock("Learn What Makes an Image Feel Cinematic", "/Blog/what-makes-an-image-feel-cinematic", blogThumbs.cinematic),
    ],
    rightDock: [
      supportDock("Explore Vintage Western Art", "/vintage-western-art", "/img/i-6Ffpw9t/s.jpg"),
      supportDock("Explore Vintage Cowboy Art", "/vintage-cowboy-art", "/img/i-QWcX7JT/s.jpg"),
      supportDock("Explore Wild West Art", "/wild-west-art", "/img/i-B7ZSdfs/s.jpg"),
      supportDock("Learn What Makes a Fine Art Print Worth Owning", "/Blog/what-makes-a-fine-art-print-worth-owning", blogThumbs.finePrint),
    ],
    dockCoreCount: 4,
  }),
  vintageCowboyArt: makePage({
    pagePath: "/vintage-cowboy-art",
    label: "Vintage Cowboy Art",
    title: "Vintage Cowboy Art - Fine Art Prints by Wayne Heim",
    subject: "weathered cowboy portraits, old-West atmosphere, black and white studies, and vintage Western character",
    sections: ["cowboyBlackWhite", "cowboyColor", "narrativeBlackWhite", "narrativeColor"],
    hero: "i-FnZ68h3",
    heroPath: sources.cowboyBlackWhite.galleryPath,
    leftDock: [
      supportDock("Learn What Is Historical Western Photography", "/Blog/what-is-historical-western-photography", blogThumbs.historical),
      supportDock("Learn What Is Cowboy Fine Art Photography", "/Blog/what-is-cowboy-fine-art-photography", blogThumbs.cowboy),
      supportDock("Learn What Is Painterly Photography", "/Blog/what-is-painterly-photography", blogThumbs.painterly),
      supportDock("Learn What Makes an Image Feel Cinematic", "/Blog/what-makes-an-image-feel-cinematic", blogThumbs.cinematic),
    ],
    rightDock: [
      supportDock("Explore Vintage Western Art", "/vintage-western-art", "/img/i-6Ffpw9t/s.jpg"),
      supportDock("Explore Old Western Art", "/old-western-art", "/img/i-W73hxx4/s.jpg"),
      supportDock("Explore Cowboy Art Prints", "/cowboy-art-prints", "/img/i-5FX3W9r/s.jpg"),
      supportDock("Compare Wood Prints and Paper Prints", "/Blog/wood-prints-vs-paper-prints", blogThumbs.woodPaper),
    ],
    dockCoreCount: 4,
  }),
  rusticWesternInteriorDesignArt: makePage({
    pagePath: "/Rustic-Western-Interior-Design-Art",
    label: "Rustic Western Interior Design Art",
    title: "Rustic Western Interior Design Art - Fine Art Prints by Wayne Heim",
    subject: "Western portraits, frontier narrative scenes, open-country landscapes, mountain prints, and textured art choices for rustic rooms",
    sections: ["cowboyColor", "narrativeColor", "narrativeBlackWhite", "landscapeWest", "mountains", "water"],
    hero: "i-7Kwv8vc",
    heroPath: sources.cowboyColor.galleryPath,
    leftDock: blogDock.interiorLeft,
    rightDock: blogDock.interiorRight,
    dockCoreCount: 6,
    archiveUrl: "/Western-Interior-Design-Art",
    archiveName: "Western Interior Design Art",
  }),
  wwiiThemedFineArtPrints: makePage({
    pagePath: "/WWII-Themed-Fine-Art-Prints",
    label: "WWII Themed Fine Art Prints",
    title: "WWII Themed Fine Art Prints - Wayne Heim",
    subject: "World War II inspired war images, military machines, portraits, and historically themed fine art prints",
    sections: ["wwiiWarColor", "wwiiWarBlackWhite", "wwiiMachines", "wwiiMachinesBlackWhite", "wwiiPortraits", "wwiiPortraitsBlackWhite"],
    hero: "i-dMQWS6q",
    heroPath: sources.wwiiWarColor.galleryPath,
    entranceData: wwiiEntranceData,
    leftDock: [
      supportDock("Learn What Is Historically Themed Photography", "/Blog/what-is-historically-themed-photography", "/img/i-F33M327/s.jpg"),
      supportDock("Learn What Makes an Image Feel Cinematic", "/Blog/what-makes-an-image-feel-cinematic", "/img/i-MLbJfVV/s.jpg"),
      supportDock("Learn What Is Painterly Photography", "/Blog/what-is-painterly-photography", "/img/i-xdJQsQQ/s.jpg"),
      supportDock("Learn What Makes a Fine Art Print Worth Owning", "/Blog/what-makes-a-fine-art-print-worth-owning", "/img/i-JnmQDPd/s.jpg"),
    ],
    rightDock: [
      supportDock("Explore Facing History", "/Galleries/Painterly-Fine-Art-Photography/Facing-History", "/img/i-wp7KTps/s.jpg"),
      supportDock("Explore Civil War Portraits", "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits", "/img/i-834cDZ8/s.jpg"),
      supportDock("Compare Wood Prints and Paper Prints", "/Blog/wood-prints-vs-paper-prints", "/img/i-t6xx8Cq/s.jpg"),
      supportDock("Compare Decor Art and Fine Art", "/Blog/decor-art-vs-fine-art", "/img/i-KBvWrXf/s.jpg"),
    ],
    archiveUrl: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII",
    archiveName: "WWII",
    categoryCrumb: { href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII", name: "WWII" },
    dockCoreCount: 6,
  }),
  womenOfTheWildWest: makePage({
    pagePath: "/women-of-the-wild-west",
    label: "Women of the American West",
    title: "Women of the American West - Fine Art Prints by Wayne Heim",
    subject: "frontier women, Western portraiture, old-West stories, and character-driven fine art prints",
    sections: ["womenCowboyColor", "womenNarrativeColor", "womenCowboyBlackWhite", "womenNarrativeBlackWhite"],
    hero: "i-QWcX7JT",
    heroPath: sources.cowboyColor.galleryPath,
    leftDock: [
      supportDock("Learn What Is Historical Western Photography", "/Blog/what-is-historical-western-photography", blogThumbs.historical),
      supportDock("Learn What Is Narrative Photography", "/Blog/what-is-narrative-photography", "/img/i-HfQ5NVR/s.jpg"),
      supportDock("Learn What Is Painterly Photography", "/Blog/what-is-painterly-photography", blogThumbs.painterly),
      supportDock("Learn What Makes an Image Feel Cinematic", "/Blog/what-makes-an-image-feel-cinematic", blogThumbs.cinematic),
    ],
    rightDock: [
      supportDock("Explore Vintage Western Art", "/vintage-western-art", "/img/i-6Ffpw9t/s.jpg"),
      supportDock("Explore Wild West Art", "/wild-west-art", blogThumbs.westernArt),
      ...blogDock.standardRight.slice(0, 2),
    ],
    dockCoreCount: 4,
  }),
  westernFrontierArt: makePage({
    pagePath: "/Western-Frontier-Art",
    label: "Western Frontier Art",
    title: "Western Frontier Art - Fine Art Prints by Wayne Heim",
    subject: "frontier narratives, cowboy portraits, Native American portrait work, and American West atmosphere",
    sections: frontierCore,
    hero: "i-B7ZSdfs",
    heroPath: sources.narrativeColor.galleryPath,
    leftDock: [
      supportDock("Learn What Is Historical Western Photography", "/Blog/what-is-historical-western-photography", blogThumbs.historical),
      supportDock("Learn What Is Western Art", "/Blog/what-is-western-art", blogThumbs.westernArt),
      supportDock("Learn What Is Narrative Photography", "/Blog/what-is-narrative-photography", "/img/i-HfQ5NVR/s.jpg"),
      supportDock("Learn What Is Painterly Photography", "/Blog/what-is-painterly-photography", blogThumbs.painterly),
    ],
    rightDock: [
      supportDock("Explore Wild West Art", "/wild-west-art", "/img/i-B7ZSdfs/s.jpg"),
      supportDock("Explore Fine Art Photography of the American West", "/Fine-Art-Photography-of-the-American-West", "/img/i-G6gftd8/s.jpg"),
      supportDock("Explore Women of the American West", "/women-of-the-wild-west", "/img/i-QWcX7JT/s.jpg"),
      supportDock("Learn What Makes a Fine Art Print Worth Owning", "/Blog/what-makes-a-fine-art-print-worth-owning", blogThumbs.finePrint),
    ],
    dockCoreCount: 4,
  }),
  westernInteriorDesignArt: makePage({
    pagePath: "/Western-Interior-Design-Art",
    label: "Western Interior Design Art",
    title: "Western Interior Design Art - Fine Art Prints by Wayne Heim",
    subject: "Western wall art, cowboy portraits, landscape prints, and collector works selected for rooms",
    sections: interiorCore,
    hero: "i-44jcjTQ",
    heroPath: sources.cowboyColor.galleryPath,
    heroSrc: "/images/Untitled-1_0009_5 buffy.jpg.jpg",
    heroObjectPosition: "52% 28%",
    leftDock: blogDock.interiorLeft,
    rightDock: blogDock.interiorRight,
    dockCoreCount: 4,
    archiveUrl: "/Western-Wall-Art",
    archiveName: "Western Wall Art",
  }),
  modernWesternInteriorDesignArt: makePage({
    pagePath: "/Modern-Western-Interior-Design-Art",
    label: "Modern Western Interior Design Art",
    title: "Modern Western Interior Design Art - Fine Art Prints by Wayne Heim",
    subject: "restrained Western portraits, monochrome work, landscapes, and art choices for modern interiors",
    sections: ["cowboyBlackWhite", "landscapeWest", "mountains", "cowboyColor"],
    hero: "i-DJMTZ8z",
    heroPath: sources.cowboyBlackWhite.galleryPath,
    leftDock: blogDock.interiorLeft,
    rightDock: blogDock.interiorRight,
    dockCoreCount: 4,
  }),
  cowboyThemedArtwork: makePage({
    pagePath: "/cowboy-themed-artwork",
    label: "Cowboy Themed Artwork",
    title: "Cowboy Themed Artwork - Fine Art Prints by Wayne Heim",
    subject: "cowboy themed portraits, Western character studies, frontier scenes, and print-ready cowboy artwork",
    sections: cowboyCore,
    hero: "i-SBjhvGf",
    heroPath: sources.cowboyColor.galleryPath,
    leftDock: blogDock.cowboyLeft,
    rightDock: [
      supportDock("Explore Cowboy Art Prints", "/cowboy-art-prints", "/img/i-5FX3W9r/s.jpg"),
      supportDock("Explore Cowboy Artwork Prints", "/cowboy-artwork-prints", "/img/i-Dw6Z8ff/s.jpg"),
      supportDock("Explore Cowboy Wall Art", "/cowboy-wall-art", "/img/i-QWcX7JT/s.jpg"),
      supportDock("Compare Decor Art and Fine Art", "/Blog/decor-art-vs-fine-art", blogThumbs.decor),
    ],
    dockCoreCount: 4,
  }),
  cowboyArtworkPrints: makePage({
    pagePath: "/cowboy-artwork-prints",
    label: "Cowboy Artwork Prints",
    title: "Cowboy Artwork Prints - Fine Art Prints by Wayne Heim",
    subject: "cowboy artwork, Western portrait prints, black and white cowboy studies, and frontier narrative prints",
    sections: cowboyCore,
    hero: "i-Dw6Z8ff",
    heroPath: sources.cowboyColor.galleryPath,
    leftDock: blogDock.cowboyLeft,
    rightDock: [
      supportDock("Explore Cowboy Art Prints", "/cowboy-art-prints", "/img/i-5FX3W9r/s.jpg"),
      supportDock("Explore Cowboy Themed Artwork", "/cowboy-themed-artwork", "/img/i-SBjhvGf/s.jpg"),
      supportDock("Explore Western Cowboy Photography", "/Western-Cowboy-Photography", "/img/i-k4b6c5b/s.jpg"),
      supportDock("Compare Wood Prints and Paper Prints", "/Blog/wood-prints-vs-paper-prints", blogThumbs.woodPaper),
    ],
    dockCoreCount: 4,
  }),
  americanWestFineArtPhotography: makePage({
    pagePath: "/Fine-Art-Photography-of-the-American-West",
    label: "Fine Art Photography of the American West",
    title: "Fine Art Photography of the American West - Wayne Heim",
    subject: "American West portraits, frontier narratives, Native American portrait work, and Western landscapes",
    sections: ["narrativeColor", "cowboyColor", "nativeColor", "landscapeWest", "mountains"],
    hero: "i-G6gftd8",
    heroPath: sources.landscapeWest.galleryPath,
    entranceData: landscapeEntranceData,
    leftDock: [
      supportDock("Learn What Is Western Art", "/Blog/what-is-western-art", blogThumbs.westernArt),
      supportDock("Learn What Is Historical Western Photography", "/Blog/what-is-historical-western-photography", blogThumbs.historical),
      supportDock("Learn What Is Painterly Photography", "/Blog/what-is-painterly-photography", blogThumbs.painterly),
      supportDock("Learn What Makes an Image Feel Cinematic", "/Blog/what-makes-an-image-feel-cinematic", blogThumbs.cinematic),
    ],
    rightDock: [
      supportDock("Explore Western Landscape Art", "/western-landscape-art", "/img/i-zk7zXP3/s.jpg"),
      supportDock("Explore Wild West Art", "/wild-west-art", "/img/i-B7ZSdfs/s.jpg"),
      supportDock("Learn What Makes a Fine Art Print Worth Owning", "/Blog/what-makes-a-fine-art-print-worth-owning", blogThumbs.finePrint),
      supportDock("Compare Wood Prints and Paper Prints", "/Blog/wood-prints-vs-paper-prints", blogThumbs.woodPaper),
    ],
    dockCoreCount: 5,
    archiveUrl: "/Galleries/Painterly-Fine-Art-Photography",
    archiveName: "Painterly Fine Art Photography",
  }),
  westernCowboyPhotography: makePage({
    pagePath: "/Western-Cowboy-Photography",
    label: "Western Cowboy Photography",
    title: "Western Cowboy Photography - Fine Art Prints by Wayne Heim",
    subject: "cowboy photography, Western portraits, black and white cowboy work, and frontier character studies",
    sections: cowboyCore,
    hero: "i-5FX3W9r",
    heroPath: sources.cowboyColor.galleryPath,
    leftDock: blogDock.cowboyLeft,
    rightDock: [
      supportDock("Explore Cowboy Pictures", "/cowboy-pictures", "/img/i-k4b6c5b/s.jpg"),
      supportDock("Explore Western Cowboy Pictures", "/western-cowboy-pictures", "/img/i-QWcX7JT/s.jpg"),
      supportDock("Explore Cowboy Art Prints", "/cowboy-art-prints", "/img/i-5FX3W9r/s.jpg"),
      supportDock("Learn What Makes a Fine Art Print Worth Owning", "/Blog/what-makes-a-fine-art-print-worth-owning", blogThumbs.finePrint),
    ],
    dockCoreCount: 4,
  }),
  westernCowboyArt: makePage({
    pagePath: "/western-cowboy-art",
    label: "Western Cowboy Art",
    title: "Western Cowboy Art - Fine Art Prints by Wayne Heim",
    subject: "cowboy portraits, Western cowboy artwork, black and white cowboy studies, and frontier narrative scenes",
    sections: cowboyCore,
    hero: "i-LCspRF4",
    heroPath: sources.narrativeColor.galleryPath,
    leftDock: blogDock.cowboyLeft,
    centerDock: [
      sectionDock("Black and White Western Narrative Prints", "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White/all#collection-browser", "/img/i-mqQxwNn/s.jpg"),
      sectionDock("Western Narrative Art Collection", "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives", "/img/i-HfQ5NVR/s.jpg"),
      sectionDock("Color Western Narrative Prints", "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color/all#collection-browser", "/img/i-B7ZSdfs/s.jpg"),
    ],
    rightDock: [
      supportDock("Explore Cowboy Art Prints", "/cowboy-art-prints", "/img/i-5FX3W9r/s.jpg"),
      supportDock("Explore Cowboy Wall Art", "/cowboy-wall-art", "/img/i-Dw6Z8ff/s.jpg"),
      supportDock("Explore Western Cowboy Photography", "/Western-Cowboy-Photography", "/img/i-k4b6c5b/s.jpg"),
      supportDock("Compare Decor Art and Fine Art", "/Blog/decor-art-vs-fine-art", blogThumbs.decor),
    ],
  }),
  westernCowboyPictures: makePage({
    pagePath: "/western-cowboy-pictures",
    label: "Western Cowboy Pictures",
    title: "Western Cowboy Pictures - Fine Art Prints by Wayne Heim",
    subject: "Western cowboy pictures, cowboy portraits, frontier scenes, and print-ready cowboy photography",
    sections: cowboyCore,
    hero: "i-QWcX7JT",
    heroPath: sources.cowboyColor.galleryPath,
    leftDock: blogDock.cowboyLeft,
    rightDock: [
      supportDock("Explore Cowboy Pictures", "/cowboy-pictures", "/img/i-k4b6c5b/s.jpg"),
      supportDock("Explore Western Cowboy Photography", "/Western-Cowboy-Photography", "/img/i-5FX3W9r/s.jpg"),
      supportDock("Explore Cowboy Art Prints", "/cowboy-art-prints", "/img/i-Dw6Z8ff/s.jpg"),
      supportDock("Compare Wood Prints and Paper Prints", "/Blog/wood-prints-vs-paper-prints", blogThumbs.woodPaper),
    ],
    dockCoreCount: 4,
  }),
  cowboyFineArtPhotography: makePage({
    pagePath: "/Cowboy-Fine-Art-Photography",
    label: "Cowboy Fine Art Photography",
    title: "Cowboy Fine Art Photography - Fine Art Prints by Wayne Heim",
    subject: "authored cowboy portraits, black and white cowboy studies, and frontier character work shaped for fine art print collectors",
    sections: cowboyCore,
    hero: "i-5FX3W9r",
    heroPath: sources.cowboyColor.galleryPath,
    leftDock: blogDock.cowboyLeft,
    rightDock: [
      supportDock("Explore Cowboy Fine Art Prints", "/cowboy-fine-art-prints", "/img/i-Dw6Z8ff/s.jpg"),
      supportDock("Explore Cowboy Pictures", "/cowboy-pictures", "/img/i-k4b6c5b/s.jpg"),
      supportDock("Explore Western Cowboy Photography", "/Western-Cowboy-Photography", "/img/i-QWcX7JT/s.jpg"),
      supportDock("Learn What Makes a Fine Art Print Worth Owning", "/Blog/what-makes-a-fine-art-print-worth-owning", blogThumbs.finePrint),
    ],
    dockCoreCount: 4,
  }),
  cowboyFineArtPrints: makePage({
    pagePath: "/cowboy-fine-art-prints",
    label: "Cowboy Fine Art Prints",
    title: "Cowboy Fine Art Prints - Fine Art Prints by Wayne Heim",
    subject: "cowboy portrait prints, black and white cowboy work, and story-driven Western cowboy images for collector walls",
    sections: cowboyCore,
    hero: "i-Dw6Z8ff",
    heroPath: sources.cowboyColor.galleryPath,
    leftDock: blogDock.cowboyLeft,
    rightDock: [
      supportDock("Explore Cowboy Fine Art Photography", "/Cowboy-Fine-Art-Photography", "/img/i-5FX3W9r/s.jpg"),
      supportDock("Explore Cowboy Artwork Prints", "/cowboy-artwork-prints", "/img/i-SBjhvGf/s.jpg"),
      supportDock("Explore Western Cowboy Pictures", "/western-cowboy-pictures", "/img/i-k4b6c5b/s.jpg"),
      supportDock("Compare Wood Prints and Paper Prints", "/Blog/wood-prints-vs-paper-prints", blogThumbs.woodPaper),
    ],
    dockCoreCount: 4,
  }),
  cowboyPainterlyFineArtPhotography: makePage({
    pagePath: "/cowboy-painterly-fine-art-photography",
    label: "Cowboy Painterly Fine Art Photography",
    title: "Cowboy Painterly Fine Art Photography - Fine Art Prints by Wayne Heim",
    subject: "painterly cowboy photography, Western portrait character, tonal atmosphere, and authored print presentation",
    sections: cowboyCore,
    hero: "i-k4b6c5b",
    heroPath: sources.cowboyColor.galleryPath,
    leftDock: [
      supportDock("Learn What Is Painterly Photography", "/Blog/what-is-painterly-photography", blogThumbs.painterly),
      supportDock("Learn What Is Cowboy Fine Art Photography", "/Blog/what-is-cowboy-fine-art-photography", blogThumbs.cowboy),
      supportDock("Learn What Makes an Image Feel Cinematic", "/Blog/what-makes-an-image-feel-cinematic", blogThumbs.cinematic),
      supportDock("Learn What Is Historical Western Photography", "/Blog/what-is-historical-western-photography", blogThumbs.historical),
    ],
    rightDock: [
      supportDock("Explore Cowboy Fine Art Photography", "/Cowboy-Fine-Art-Photography", "/img/i-5FX3W9r/s.jpg"),
      supportDock("Explore Cowboy Fine Art Prints", "/cowboy-fine-art-prints", "/img/i-Dw6Z8ff/s.jpg"),
      supportDock("Explore Vintage Cowboy Art", "/vintage-cowboy-art", "/img/i-FnZ68h3/s.jpg"),
      supportDock("Learn What Makes a Fine Art Print Worth Owning", "/Blog/what-makes-a-fine-art-print-worth-owning", blogThumbs.finePrint),
    ],
    dockCoreCount: 4,
  }),
  oldWestPictures: makePage({
    pagePath: "/old-west-pictures",
    label: "Old West Pictures",
    title: "Old West Pictures - Fine Art Prints by Wayne Heim",
    subject: "old-West pictures, vintage frontier atmosphere, cowboy portraits, and Western narrative scenes",
    sections: oldCore,
    hero: "i-KL9t3Xg",
    heroPath: sources.cowboyBlackWhite.galleryPath,
    leftDock: [
      supportDock("Learn What Is Historical Western Photography", "/Blog/what-is-historical-western-photography", blogThumbs.historical),
      supportDock("Learn What Is Western Art", "/Blog/what-is-western-art", blogThumbs.westernArt),
      supportDock("Learn What Is Narrative Photography", "/Blog/what-is-narrative-photography", "/img/i-HfQ5NVR/s.jpg"),
      supportDock("Learn What Makes an Image Feel Cinematic", "/Blog/what-makes-an-image-feel-cinematic", blogThumbs.cinematic),
    ],
    rightDock: [
      supportDock("Explore Old Western Art", "/old-western-art", "/img/i-W73hxx4/s.jpg"),
      supportDock("Explore Vintage Western Art", "/vintage-western-art", "/img/i-6Ffpw9t/s.jpg"),
      supportDock("Explore Wild West Art", "/wild-west-art", "/img/i-B7ZSdfs/s.jpg"),
      supportDock("Compare Decor Art and Fine Art", "/Blog/decor-art-vs-fine-art", blogThumbs.decor),
    ],
    dockCoreCount: 4,
  }),
  painterlyWesternPhotography: makePage({
    pagePath: "/Painterly-Western-Photography",
    label: "Painterly Western Photography",
    title: "Painterly Western Photography - Fine Art Prints by Wayne Heim",
    subject: "painterly Western portraits, frontier storytelling, Native American portrait work, and American West landscape atmosphere",
    sections: ["cowboyColor", "narrativeColor", "nativeColor", "landscapeWest"],
    hero: "i-QWcX7JT",
    heroPath: sources.cowboyColor.galleryPath,
    leftDock: [
      supportDock("Learn What Is Painterly Photography", "/Blog/what-is-painterly-photography", blogThumbs.painterly),
      supportDock("Learn What Is Western Art", "/Blog/what-is-western-art", blogThumbs.westernArt),
      supportDock("Learn What Makes an Image Feel Cinematic", "/Blog/what-makes-an-image-feel-cinematic", blogThumbs.cinematic),
      supportDock("Learn What Is Historical Western Photography", "/Blog/what-is-historical-western-photography", blogThumbs.historical),
    ],
    rightDock: [
      supportDock("Explore Fine Art Photography of the American West", "/Fine-Art-Photography-of-the-American-West", "/img/i-G6gftd8/s.jpg"),
      supportDock("Explore Western Fine Art Photography", "/Western-Fine-Art-Photography", "/img/i-5FX3W9r/s.jpg"),
      supportDock("Explore Western Storytelling Photography", "/western-storytelling-photography", "/img/i-B7ZSdfs/s.jpg"),
      supportDock("Compare Wood Prints and Paper Prints", "/Blog/wood-prints-vs-paper-prints", blogThumbs.woodPaper),
    ],
    dockCoreCount: 4,
  }),
  westernArtPhotography: makePage({
    pagePath: "/western-art-photography",
    label: "Western Art Photography",
    title: "Western Art Photography - Fine Art Prints by Wayne Heim",
    subject: "Western art photography, cowboy portraits, frontier stories, Native American portrait work, and Western landscapes",
    sections: ["narrativeColor", "cowboyColor", "nativeColor", "landscapeWest"],
    hero: "i-B7ZSdfs",
    heroPath: sources.narrativeColor.galleryPath,
    leftDock: blogDock.standardLeft,
    rightDock: [
      supportDock("Explore Western Fine Art Photography", "/Western-Fine-Art-Photography", "/img/i-5FX3W9r/s.jpg"),
      supportDock("Explore Painterly Western Photography", "/Painterly-Western-Photography", "/img/i-QWcX7JT/s.jpg"),
      supportDock("Explore Western Landscape Art", "/western-landscape-art", "/img/i-zk7zXP3/s.jpg"),
      supportDock("Learn What Makes a Fine Art Print Worth Owning", "/Blog/what-makes-a-fine-art-print-worth-owning", blogThumbs.finePrint),
    ],
    dockCoreCount: 4,
  }),
  westernFineArtPhotography: makePage({
    pagePath: "/Western-Fine-Art-Photography",
    label: "Western Fine Art Photography",
    title: "Western Fine Art Photography - Fine Art Prints by Wayne Heim",
    subject: "Western fine art photography across cowboy portraits, frontier narratives, Native American portrait work, and American West landscapes",
    sections: ["cowboyColor", "narrativeColor", "nativeColor", "landscapeWest"],
    hero: "i-5FX3W9r",
    heroPath: sources.cowboyColor.galleryPath,
    leftDock: blogDock.standardLeft,
    rightDock: [
      supportDock("Explore Western Fine Art Photography Collection", "/western-fine-art-photography-collection", "/img/i-G6gftd8/s.jpg"),
      supportDock("Explore Fine Art Photography of the American West", "/Fine-Art-Photography-of-the-American-West", "/img/i-B7ZSdfs/s.jpg"),
      supportDock("Explore Painterly Western Photography", "/Painterly-Western-Photography", "/img/i-QWcX7JT/s.jpg"),
      supportDock("Compare Wood Prints and Paper Prints", "/Blog/wood-prints-vs-paper-prints", blogThumbs.woodPaper),
    ],
    dockCoreCount: 4,
  }),
  westernFineArtPhotographyCollection: makePage({
    pagePath: "/western-fine-art-photography-collection",
    label: "Western Fine Art Photography Collection",
    title: "Western Fine Art Photography Collection - Wayne Heim",
    subject: "a collected route through Western portraits, frontier narrative work, Native American portrait studies, landscapes, and monochrome Western photography",
    sections: ["cowboyColor", "narrativeColor", "nativeColor", "landscapeWest", "cowboyBlackWhite", "narrativeBlackWhite"],
    hero: "i-G6gftd8",
    heroPath: sources.landscapeWest.galleryPath,
    entranceData: landscapeEntranceData,
    leftDock: [
      supportDock("Learn What Is Western Art", "/Blog/what-is-western-art", blogThumbs.westernArt),
      supportDock("Learn What Is Painterly Photography", "/Blog/what-is-painterly-photography", blogThumbs.painterly),
      supportDock("Learn What Makes an Image Feel Cinematic", "/Blog/what-makes-an-image-feel-cinematic", blogThumbs.cinematic),
      supportDock("Learn What Makes a Fine Art Print Worth Owning", "/Blog/what-makes-a-fine-art-print-worth-owning", blogThumbs.finePrint),
    ],
    rightDock: [
      supportDock("Explore Western Fine Art Photography", "/Western-Fine-Art-Photography", "/img/i-5FX3W9r/s.jpg"),
      supportDock("Explore Western Black and White Photography", "/Western-Black-and-White-Photography", "/img/i-DJMTZ8z/s.jpg"),
      supportDock("Explore Western Landscape Art", "/western-landscape-art", "/img/i-zk7zXP3/s.jpg"),
      supportDock("Explore Wild West Art", "/wild-west-art", "/img/i-B7ZSdfs/s.jpg"),
    ],
    dockCoreCount: 6,
    archiveUrl: "/Galleries/Painterly-Fine-Art-Photography",
    archiveName: "Painterly Fine Art Photography",
  }),
  historicalFineArtPhotographyCollection: makePage({
    pagePath: "/historical-fine-art-photography-collection",
    label: "Historical Fine Art Photography Collection",
    title: "Historical Fine Art Photography Collection\nby Wayne Heim",
    subject: "painterly historical fine art photography across the American frontier, Civil War, World War II, and Roaring Twenties portrait work",
    sections: ["cowboyColor", "narrativeColor", "nativeColor", "civilWarColor", "wwiiWarColor", "wwiiMachines", "wwiiPortraits", "roaringColor"],
    hero: "i-9q7BrTt",
    heroPath: sources.civilWarColor.galleryPath,
    leftDock: [
      supportDock("Explore What Is Historically Themed Photography", "/Blog/what-is-historically-themed-photography", "/img/i-F33M327/s.jpg"),
      supportDock("Explore What Is the One-Image Movie", "/Other/One-Image-Movie", "/img/i-6Ffpw9t/s.jpg"),
      supportDock("Explore What Is Painterly Photography", "/Blog/what-is-painterly-photography", blogThumbs.painterly),
    ],
    centerDock: [
      sectionDock("Explore Civil War Fine Art Portraits", "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits", "/img/i-834cDZ8/s.jpg"),
      sectionDock("Explore Wild West Fine Art Prints", "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West", "/img/i-B7ZSdfs/s.jpg"),
      sectionDock("Explore Roaring 20s Fine Art Portraits", "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits", "/img/i-8zkKqtg/s.jpg"),
      sectionDock("Explore WWII Themed Fine Art Prints", "/WWII-Themed-Fine-Art-Prints", "/img/i-dMQWS6q/s.jpg"),
    ],
    rightDock: [
      supportDock("Explore What Makes a Fine Art Print Worth Owning", "/Blog/what-makes-a-fine-art-print-worth-owning", blogThumbs.finePrint),
      supportDock("Explore Decor Art vs Fine Art", "/Blog/decor-art-vs-fine-art", blogThumbs.decor),
      supportDock("Explore Facing History", "/Galleries/Painterly-Fine-Art-Photography/Facing-History", "/img/i-wp7KTps/s.jpg"),
    ],
    commercialH1: "The Collection — Four Time Zones, 1,810 Works",
    seoTitle: "Historical Fine Art Photography Collection — Wayne Heim | K4 Studios",
    seoDescription: `Four time zones of the American past — the frontier, Civil War, World War II, and the Roaring Twenties — as painterly fine art photography. 1,810 works from ${getFormattedLowestStandardPrintPrice()} through signed limited editions.`,
    deck: "1,810 works organized for collectors, rooms, and subject-first browsing — painterly historical fine art photography across the American frontier, Civil War, World War II, and Roaring Twenties portrait work.",
    currentDockTitle: "Explore the Facing History Time Zones",
    gridIntroTitle: "THE TIME ZONES",
    gridIntroCopy: "Four eras. Four distinct worlds. One body of historically researched, painterly fine art photography.",
    gatewayIntroCopy: "Historical fine art photography by Wayne Heim — four time zones of the American past, each approached as lived narrative rather than period costume. The American frontier, the Civil War, World War II, and the Roaring Twenties, for living rooms, offices, lodges, hospitality spaces, and collector walls.",
    gatewaySupportingCopy: `These works begin as photography then are shaped through Heim's painterly process into fine art with atmosphere, human presence, and the weight of lived history. The collection opens with the Sketch Series, 5×7 prints from ${getFormattedLowestStandardPrintPrice()} — sized for shelves, desks, and introductory collecting. It scales through open-edition Foundation works, signed Chronicle editions with numbered certificates, and ultra-limited Legend pieces for collectors who want provenance and permanence on the wall. Each time zone has its own emotional register — choose the era that carries the most weight for your room.\n\nClick into any section to compare prints, read the image story, and view collector and sizing details.`,
    limits: {
      cowboyColor: 7,
      narrativeColor: 7,
      nativeColor: 7,
      civilWarColor: 7,
      wwiiWarColor: 7,
      wwiiMachines: 7,
      wwiiPortraits: 7,
      roaringColor: 7,
    },
    timeZones: {
      cowboyColor: "THE WILD WEST",
      narrativeColor: "THE WILD WEST",
      nativeColor: "THE WILD WEST",
      civilWarColor: "THE CIVIL WAR",
      wwiiWarColor: "WORLD WAR II",
      wwiiMachines: "WORLD WAR II",
      wwiiPortraits: "WORLD WAR II",
      roaringColor: "THE ROARING TWENTIES",
    },
    alternates: {
      cowboyColor: {
        href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White/all#collection-browser",
        label: "See the black and white cowboy portrait collection",
        count: "101 works in this black and white gallery",
      },
      narrativeColor: {
        href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White/all#collection-browser",
        label: "See the black and white Western narrative collection",
        count: "142 works in this black and white gallery",
      },
      nativeColor: {
        href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Black-White/all#collection-browser",
        label: "See the black and white Native American portrait collection",
        count: "5 works in this black and white gallery",
      },
      civilWarColor: {
        href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Black-White/all#collection-browser",
        label: "See the black and white Civil War portrait collection",
        count: "30 works in this black and white gallery",
      },
      wwiiWarColor: {
        href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Black-White/all#collection-browser",
        label: "See the black and white WWII war collection",
        count: "115 works in this black and white gallery",
      },
      wwiiMachines: {
        href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White/all#collection-browser",
        label: "See the black and white WWII machines collection",
        count: "52 works in this black and white gallery",
      },
      wwiiPortraits: {
        href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White/all#collection-browser",
        label: "See the black and white WWII portrait collection",
        count: "206 works in this black and white gallery",
      },
      roaringColor: {
        href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White/all#collection-browser",
        label: "See the black and white Roaring 20s portrait collection",
        count: "27 works in this black and white gallery",
      },
    },
    faqItems: [
      {
        q: "What is historical fine art photography?",
        a: [
          "Historical fine art photography is authored photographic work built around specific historical periods — the American frontier, Civil War, World War II, Jazz Age — treated as lived narrative rather than documentation or reenactment record. At K4 Studios it means researched subjects, real light, painterly process, and story structure that gives each image the presence of fine art rather than the flatness of period illustration.",
        ],
      },
      {
        q: "How are these different from archival historical photographs?",
        a: [
          "Archival historical photographs record what existed. These works interpret what it felt like. Every image in the Facing History collection is constructed — sculpted light, researched period detail, living historian subjects, and painterly finishing that adds tonal depth and atmospheric weight no camera alone produces. The goal is not documentation. It is the felt presence of a historical moment that rewards sustained viewing rather than simple recognition.",
        ],
      },
      {
        q: "What time periods does this collection cover?",
        a: [
          "Four time zones — each with its own emotional register and visual language. The American frontier for frontier character, old-West psychology, and the lives behind the cowboy myth. The Civil War for duty, sacrifice, silence, and the weight of a nation under pressure. World War II for brotherhood, endurance, machinery, and quiet wartime consequence. The Roaring Twenties for Jazz-Age tension, elegance, danger, and the uneasy glamour of a decade that danced on the edge of collapse. Each time zone is organized as its own gallery route with color and black and white options.",
        ],
      },
      {
        q: "What makes Wayne Heim's historical work different from reenactment photography?",
        a: [
          "Reenactment photography documents people in period costume at historical events. Wayne Heim's Facing History work begins with living historians who carry deep knowledge of posture, material culture, and period behavior — then shapes each image through sculpted light, tonal control, and narrative structure into fine art with psychological presence rather than documentary record. The difference is authorship: every decision from light placement to moment of capture to painterly finishing serves the story, not the record.",
        ],
      },
      {
        q: "Are these prints available as limited editions?",
        a: [
          "Yes. The Chronicle Series offers signed limited editions with numbered certificates of authenticity across the full Facing History collection — frontier, Civil War, WWII, and Roaring Twenties. The Legend Series is ultra-limited, very small runs for collectors who want documented provenance and permanent wall placement. Open-edition Sketch and Foundation works are also available starting at $25 for collectors who want archival quality without edition constraints.",
        ],
      },
      {
        q: "What print formats are available?",
        a: [
          "Every image is available as archival paper or wood — including the Engrained Series on Baltic Birch panels where natural wood grain interacts with the image surface to deepen atmosphere and reinforce the sense of artifact and lived history. The Engrained Series is particularly well-suited to historical subject matter — the material presence of wood adds permanence that paper alone doesn't carry. Size and edition details are inside each image page.",
        ],
      },
      {
        q: "Can historical fine art prints work in modern interiors?",
        a: [
          "Yes — and often more powerfully than decorative art. A single strong historical portrait in a clean contemporary space creates the kind of human weight and tonal counterpoint that modern rooms often lack. The black and white series integrates particularly well in minimalist and transitional interiors without reading as themed or period-specific. The key is restraint — one image chosen with conviction carries more than a grouped historical arrangement.",
        ],
      },
      {
        q: "Where should I start if I'm choosing my first historical fine art print?",
        a: [
          "Start with the time zone that carries the most personal weight — the era you return to, the history that feels unfinished, the period whose people you want on your wall. Then choose by treatment: color for warmth, atmosphere, and period presence; black and white for tonal restraint, deep contrast, and the kind of gravity that doesn't depend on color to carry it. Click into any image to read the story before deciding. For help choosing for a specific room or collection, reach Wayne directly at wayne@k4studios.com.",
        ],
      },
    ],
    collectionIntro: [
      "Historical fine art photography at K4 Studios belongs to the larger Facing History series: painterly work built around frontier lives, Civil War burden, World War II endurance, and Roaring Twenties presence.",
      "Each time zone has its own emotional territory. The Wild West for frontier character, old-West atmosphere, and the psychology of lives built before the legend. The Civil War for duty, youth, silence, and sacrifice. World War II for service, machinery, memory, and wartime consequence. The Roaring Twenties for period character, social pressure, and the uneasy glamour of a decade that danced on the edge of collapse.",
      "Start with the era that carries the most weight for your room or collection. The grid below organizes each time zone by subject — with the full gallery and its alternative views one click away from every section.",
      "Size, substrate, and edition details are inside each image page.",
    ].join("\n\n"),
    archiveUrl: "/Galleries/Painterly-Fine-Art-Photography/Facing-History",
    archiveName: "Facing History",
    categoryCrumb: { href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History", name: "Facing History" },
    dockCoreCount: 4,
  }),
  westernPhotos: makePage({
    pagePath: "/western-photos",
    label: "Western Photos",
    title: "Western Photos - Fine Art Prints by Wayne Heim",
    subject: "Western photos shaped as fine art prints, including cowboy portraits, frontier scenes, Native American portrait work, and open-country landscapes",
    sections: ["cowboyColor", "narrativeColor", "nativeColor", "landscapeWest"],
    hero: "i-QWcX7JT",
    heroPath: sources.cowboyColor.galleryPath,
    leftDock: blogDock.standardLeft,
    rightDock: [
      supportDock("Explore Western Art Photography", "/western-art-photography", "/img/i-B7ZSdfs/s.jpg"),
      supportDock("Explore Western Portrait Photography", "/western-portrait-photography", "/img/i-5FX3W9r/s.jpg"),
      supportDock("Explore Western Storytelling Photography", "/western-storytelling-photography", "/img/i-HfQ5NVR/s.jpg"),
      supportDock("Compare Decor Art and Fine Art", "/Blog/decor-art-vs-fine-art", blogThumbs.decor),
    ],
    dockCoreCount: 4,
  }),
  westernPortraitPhotography: makePage({
    pagePath: "/western-portrait-photography",
    label: "Western Portrait Photography",
    title: "Western Portrait Photography - Fine Art Prints by Wayne Heim",
    subject: "Western portrait photography, cowboy portraits, Native American portrait work, and black and white character studies",
    sections: ["cowboyColor", "cowboyBlackWhite", "nativeColor", "nativeBlackWhite"],
    hero: "i-5FX3W9r",
    heroPath: sources.cowboyColor.galleryPath,
    leftDock: [
      supportDock("Learn What Is Cowboy Fine Art Photography", "/Blog/what-is-cowboy-fine-art-photography", blogThumbs.cowboy),
      supportDock("Learn What Is Painterly Photography", "/Blog/what-is-painterly-photography", blogThumbs.painterly),
      supportDock("Learn What Is Western Black and White Photography", "/Blog/what-is-western-black-and-white-photography", blogThumbs.bw),
      supportDock("Learn What Is Historical Western Photography", "/Blog/what-is-historical-western-photography", blogThumbs.historical),
    ],
    rightDock: [
      supportDock("Explore Western Cowboy Photography", "/Western-Cowboy-Photography", "/img/i-k4b6c5b/s.jpg"),
      supportDock("Explore Western Black and White Photography", "/Western-Black-and-White-Photography", "/img/i-DJMTZ8z/s.jpg"),
      supportDock("Explore Women of the American West", "/women-of-the-wild-west", "/img/i-QWcX7JT/s.jpg"),
      supportDock("Learn What Makes a Fine Art Print Worth Owning", "/Blog/what-makes-a-fine-art-print-worth-owning", blogThumbs.finePrint),
    ],
    dockCoreCount: 4,
  }),
  westernStorytellingPhotography: makePage({
    pagePath: "/western-storytelling-photography",
    label: "Western Storytelling Photography",
    title: "Western Storytelling Photography - Fine Art Prints by Wayne Heim",
    subject: "Western narrative scenes, frontier storytelling, cinematic cowboy images, and old-West moments shaped as fine art prints",
    sections: ["narrativeColor", "narrativeBlackWhite", "cowboyColor", "cowboyBlackWhite"],
    hero: "i-B7ZSdfs",
    heroPath: sources.narrativeColor.galleryPath,
    leftDock: [
      supportDock("Learn What Is Narrative Photography", "/Blog/what-is-narrative-photography", "/img/i-HfQ5NVR/s.jpg"),
      supportDock("Learn What Makes an Image Feel Cinematic", "/Blog/what-makes-an-image-feel-cinematic", blogThumbs.cinematic),
      supportDock("Learn What Is Historical Western Photography", "/Blog/what-is-historical-western-photography", blogThumbs.historical),
      supportDock("Learn What Is Painterly Photography", "/Blog/what-is-painterly-photography", blogThumbs.painterly),
    ],
    rightDock: [
      supportDock("Explore Wild West Art", "/wild-west-art", "/img/i-89qzJ6S/s.jpg"),
      supportDock("Explore Western Frontier Art", "/Western-Frontier-Art", "/img/i-B7ZSdfs/s.jpg"),
      supportDock("Explore Women of the American West", "/women-of-the-wild-west", "/img/i-QWcX7JT/s.jpg"),
      supportDock("Compare Decor Art and Fine Art", "/Blog/decor-art-vs-fine-art", blogThumbs.decor),
    ],
    dockCoreCount: 4,
  }),
  westernWallArtForInteriorDesigners: makePage({
    pagePath: "/Western-Wall-Art-for-Interior-Designers",
    label: "Western Wall Art for Interior Designers",
    title: "Western Wall Art for Interior Designers - Fine Art Prints by Wayne Heim",
    subject: "Western wall art selected for interior designers, including portraits, frontier narrative pieces, landscapes, mountain prints, and room-scaled collector works",
    sections: ["cowboyColor", "narrativeColor", "landscapeWest", "mountains", "water"],
    hero: "i-44jcjTQ",
    heroPath: sources.cowboyColor.galleryPath,
    heroSrc: "/images/Untitled-1_0009_5 buffy.jpg.jpg",
    heroObjectPosition: "52% 28%",
    leftDock: blogDock.interiorLeft,
    rightDock: [
      supportDock("Explore Western Interior Design Art", "/Western-Interior-Design-Art", "/img/i-44jcjTQ/s.jpg"),
      supportDock("Explore Rustic Western Interior Design Art", "/Rustic-Western-Interior-Design-Art", "/img/i-7Kwv8vc/s.jpg"),
      supportDock("Explore Modern Western Interior Design Art", "/Modern-Western-Interior-Design-Art", "/img/i-DJMTZ8z/s.jpg"),
      supportDock("Explore Western Landscape Art", "/western-landscape-art", "/img/i-zk7zXP3/s.jpg"),
    ],
    dockCoreCount: 5,
    archiveUrl: "/Western-Wall-Art",
    archiveName: "Western Wall Art",
  }),
};
