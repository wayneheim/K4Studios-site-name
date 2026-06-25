import { galleryData as cowboyColorData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs";
import { galleryData as cowboyBlackWhiteData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs";
import { galleryData as narrativeColorData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color.mjs";
import { galleryData as narrativeBlackWhiteData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White.mjs";
import { galleryData as nativeColorData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color.mjs";
import { galleryData as nativeBlackWhiteData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Black-White.mjs";
import { galleryData as landscapeWestData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery.mjs";
import { galleryData as mountainData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains/Mountains.mjs";
import { galleryData as waterData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water/Water.mjs";
import { galleryData as engrainedData } from "@/data/Other/K4-Select-Series/Engrained/Engrained-Series.mjs";
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
import {
  getFormattedLowestSeriesPrintPrice,
  getFormattedLowestStandardPrintPrice,
  getFormattedSeriesPrintPriceRange,
  getHighestStandardPrintPrice,
  getLowestStandardPrintPrice,
  getSeriesDisplaySizeList,
} from "@/data/pricing/printSeries.js";

const sketchPrintPrice = getFormattedLowestSeriesPrintPrice("sketch");
const sketchPrintSizes = getSeriesDisplaySizeList("sketch");
const foundationPrintSizes = getSeriesDisplaySizeList("foundation");
const foundationPrintPriceRange = getFormattedSeriesPrintPriceRange("foundation");
const chroniclePrintSizes = getSeriesDisplaySizeList("chronicle");
const legendPrintSizes = getSeriesDisplaySizeList("legend");

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
  titles?: Record<string, string>;
  descriptions?: Record<string, string>;
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
    description: "Color cowboy portraits with painterly light, weathered character, and the frontier presence that carries the American Western tradition.",
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
  cinematicNarrativeColor: {
    key: "cinematicNarrativeColor",
    title: "Cinematic Western Art — Color Frontier Narratives",
    description: "Color frontier scenes where painterly atmosphere, warm light, and the deliberate incompleteness of the One-Image Movie pull the viewer past the frame's edge into the unwritten chapter beyond it.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color/all#collection-browser",
    ctaLabel: "See the full color Western narrative collection",
    ctaThumb: "/img/i-B7ZSdfs/s.jpg",
    data: narrativeColorData,
    limit: 19,
  },
  cinematicNarrativeBlackWhite: {
    key: "cinematicNarrativeBlackWhite",
    title: "Cinematic Western Art — Black and White Frontier Narratives",
    description: "Monochrome frontier scenes where shadow, silence, and the Hemingway iceberg — seven-eighths withheld — carry the story further than color ever could.",
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
  blackWhiteCowboyArtPortraits: {
    key: "blackWhiteCowboyArtPortraits",
    title: "Black and White Cowboy Photography",
    description: "Monochrome cowboy portraits where expression, weathering, and tonal restraint carry the frontier presence.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White/all#collection-browser",
    ctaLabel: "See the full black and white cowboy portrait collection",
    ctaThumb: "/img/i-DJMTZ8z/s.jpg",
    data: cowboyBlackWhiteData,
    limit: 15,
  },
  blackWhiteCowboyArtNarratives: {
    key: "blackWhiteCowboyArtNarratives",
    title: "Black and White Western Narrative Photography",
    description: "Frontier narrative scenes where shadow, silence, and the withheld moment carry the story further than color ever could.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White/all#collection-browser",
    ctaLabel: "See the full black and white Western narrative collection",
    ctaThumb: "/img/i-mqQxwNn/s.jpg",
    data: narrativeBlackWhiteData,
    limit: 15,
  },
  blackWhiteCowboyArtNativePortraits: {
    key: "blackWhiteCowboyArtNativePortraits",
    title: "Black and White Native American Portraits",
    description: "Monochrome portrait studies where atmosphere, heritage, and quiet authority shape the frontier presence.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Black-White",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Black-White/all#collection-browser",
    ctaLabel: "See the full black and white Native American portrait collection",
    ctaThumb: "/img/i-Z54nXZm/s.jpg",
    data: nativeBlackWhiteData,
    limit: 15,
  },
  blackWhiteCowboyPhotographyPortraits: {
    key: "blackWhiteCowboyPhotographyPortraits",
    title: "Black and White Cowboy Photography",
    description: "Monochrome cowboy portraits where the painterly process removes the photographic surface and leaves character, restraint, and tonal presence.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White/all#collection-browser",
    ctaLabel: "See the full black and white cowboy portrait collection",
    ctaThumb: "/img/i-DJMTZ8z/s.jpg",
    data: cowboyBlackWhiteData,
    limit: 15,
  },
  blackWhiteCowboyPhotographyNarratives: {
    key: "blackWhiteCowboyPhotographyNarratives",
    title: "Black and White Western Narrative Photography",
    description: "Frontier narrative scenes where the monochrome discipline carries the story further than color ever could.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White/all#collection-browser",
    ctaLabel: "See the full black and white Western narrative collection",
    ctaThumb: "/img/i-mqQxwNn/s.jpg",
    data: narrativeBlackWhiteData,
    limit: 15,
  },
  blackWhiteCowboyPhotographyNativePortraits: {
    key: "blackWhiteCowboyPhotographyNativePortraits",
    title: "Black and White Native American Portraits",
    description: "Monochrome portrait studies where atmosphere, heritage, and quiet authority complete the western fine art photography collection.",
    galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Black-White",
    allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Black-White/all#collection-browser",
    ctaLabel: "See the full black and white Native American portrait collection",
    ctaThumb: "/img/i-Z54nXZm/s.jpg",
    data: nativeBlackWhiteData,
    limit: 15,
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
  engrained: {
    key: "engrained",
    title: "Engrained Baltic Birch Wood Panel Prints",
    description: "Engrained wood panel editions printed on Baltic Birch, where natural grain, painterly image, and rustic room materials become part of the same design decision.",
    galleryPath: "/Other/K4-Select-Series/Engrained/Engrained-Series",
    allHref: "/Other/K4-Select-Series/Engrained/Engrained-Series",
    ctaLabel: "See the full Engrained wood print collection",
    ctaThumb: "/images/tombstones/engrained-ts.webp",
    data: engrainedData,
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
    const titles = options.titles || {};
    const descriptions = options.descriptions || {};
    const alternates = options.alternates || {};
    const alternate = alternates[source.key];
    return {
      title: titles[source.key] || source.title,
      description: descriptions[source.key] || source.description,
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
    q: "Are limited editions signed and numbered?",
    a: [
      "Yes. Chronicle and Legend limited editions are individually signed and numbered. Each limited edition includes a certificate of authenticity so collectors have documented edition status and provenance for the work.",
    ],
  },
  {
    q: "How do I choose a size for a room?",
    a: [
      "Start with the wall, viewing distance, and whether the piece needs to anchor the room or work as part of a grouping. Smaller Sketch Series pieces suit shelves, studies, and intimate placements. Larger archival prints work better for fireplaces, entries, offices, lodge walls, and statement rooms.",
    ],
  },
  {
    q: `Where should I start when choosing ${label}?`,
    a: [
      "Start with the center collection links in the dock or the first grid section on the page. Choose by subject first, then open individual works to compare story, scale, and collector details.",
    ],
  },
  {
    q: "Can I ask about placement or mockups?",
    a: [
      "Yes. If you are choosing for a specific wall, room, lodge, office, ranch home, or hospitality project, contact Wayne at wayne@k4studios.com with the wall dimensions and a room photo for sizing guidance or a complimentary mockup.",
    ],
  },
];

const westernInteriorDesignFaq = [
  {
    q: "What kind of Western art works best in interior design?",
    a: [
      "Start with what the room needs: a human anchor, a horizon, vertical scale, or a softer visual pause. Cowboy portraits bring presence; Western landscapes create breathing room; mountain prints reinforce tall architecture; water studies calm heavier rooms.",
    ],
  },
  {
    q: "What does this art pair with in a room?",
    a: [
      "Western interior design art pairs especially well with warm wood, leather, stone, linen, black metal, iron, aged beams, neutral upholstery, and lodge or ranch-house architecture. In cleaner contemporary rooms, use fewer pieces and let one strong portrait or landscape carry the Western note.",
    ],
  },
  {
    q: "Are these archival fine art prints?",
    a: [
      `Yes. Works are produced as archival fine art prints, with Sketch Series studies beginning at ${getFormattedLowestStandardPrintPrice()} and larger formats available for framed wall placement. Select images may also be offered as Engrained natural Baltic Birch panels when the material surface supports the room.`,
    ],
  },
  {
    q: "Are limited editions signed and numbered?",
    a: [
      "Yes. Chronicle and Legend limited editions are individually signed and numbered. Each limited edition includes a certificate of authenticity for provenance and collector documentation.",
    ],
  },
  {
    q: "How do I choose size for a living room, lodge, or office?",
    a: [
      "For a main wall, choose a size large enough to read from the primary seating or entry point. Smaller Sketch Series works suit shelves, studies, and groupings. Fireplaces, lodge entries, conference rooms, and ranch-house great rooms usually need a larger print or a grouped set.",
    ],
  },
  {
    q: "Can I get help choosing art for a specific room?",
    a: [
      "Yes. Send a room photo, wall dimensions, and any finish constraints to wayne@k4studios.com. Wayne can help narrow the subject, size, and format, including a complimentary mockup when useful.",
    ],
  },
];

const rusticInteriorDesignFaq = [
  {
    q: "Why does the Engrained Series fit rustic Western interiors?",
    a: [
      "The Engrained Series uses natural Baltic Birch panels, so the material surface becomes part of the design decision. In rooms with wood beams, stone, leather, iron, and lodge textures, the panel feels closer to the material world of the room than a purely framed paper print.",
    ],
  },
  {
    q: "Does every image on this page come as Engrained wood art?",
    a: [
      "No. The full collection includes archival fine art prints, with Engrained natural Baltic Birch panels available on selected images. When offered, the wood grain is selectively woven into the image so each panel has a one-of-a-kind surface character.",
    ],
  },
  {
    q: "What rooms does rustic Western art work best in?",
    a: [
      "Rustic Western art works well in lodges, ranch homes, cabins, fireplaces, great rooms, dining rooms, hospitality spaces, and offices with warm material character. It pairs naturally with raw wood, stone, leather, wool, iron, warm neutrals, and heavier architectural surfaces.",
    ],
  },
  {
    q: "Are the limited editions signed and certified?",
    a: [
      "Yes. Signed Chronicle and Legend editions are individually numbered and include a certificate of authenticity. Edition availability is shown on each image page.",
    ],
  },
  {
    q: "Should I choose paper or wood for a rustic room?",
    a: [
      "Choose archival paper when the room needs a framed, refined presentation. Choose Engrained Baltic Birch when the artwork should feel more object-based, tactile, and materially connected to the room.",
    ],
  },
  {
    q: "Can you help with sizing for a lodge or ranch wall?",
    a: [
      "Yes. Send wall dimensions and a room photo to wayne@k4studios.com. Larger rustic rooms often need more scale than expected because stone, beams, and dark furnishings visually outweigh small artwork.",
    ],
  },
];

const modernInteriorDesignFaq = [
  {
    q: "What makes Western art work in a modern interior?",
    a: [
      "Restraint. A modern Western room usually works best when one strong image carries the subject instead of many small theme cues. Black and white portraits, open landscapes, and edited color pieces can add Western identity without clutter.",
    ],
  },
  {
    q: "What finishes and palettes pair well with modern Western art?",
    a: [
      "These works pair well with clean white or warm neutral walls, pale wood, black metal, stone, glass, linen, leather, and uncluttered furniture. Monochrome pieces are especially useful when the room already has enough warmth or texture.",
    ],
  },
  {
    q: "Are these prints archival?",
    a: [
      `Yes. Works are available as archival fine art prints, with Sketch Series studies beginning at ${getFormattedLowestStandardPrintPrice()} and larger paper editions available for framed modern wall placement.`,
    ],
  },
  {
    q: "Are signed limited editions available?",
    a: [
      "Selected works are available as signed Chronicle or Legend editions. These limited editions are individually numbered and include a certificate of authenticity.",
    ],
  },
  {
    q: "Should modern rooms use color or black and white Western art?",
    a: [
      "Use black and white when the room needs structure, restraint, and tonal authority. Use color when the space needs a controlled warm note or a single human figure to soften the room.",
    ],
  },
  {
    q: "Can I request help choosing a modern Western print?",
    a: [
      "Yes. Send a room photo, wall dimensions, and palette notes to wayne@k4studios.com. A complimentary room mockup can help confirm whether the piece should be monochrome, landscape, portrait, or a controlled color accent.",
    ],
  },
];

const designerWallArtFaq = [
  {
    q: "How should interior designers specify Western wall art?",
    a: [
      "Specify by project need first: human anchor, narrative statement, open-country spacing, mountain scale, or calming water. Then confirm size, substrate, color temperature, and whether the piece needs open edition flexibility or signed limited edition provenance.",
    ],
  },
  {
    q: "What materials and furnishings do these pieces pair with?",
    a: [
      "The work can pair with leather, wood, stone, linen, wool, iron, black metal, warm neutrals, and contemporary clean-wall spaces. The density depends on the room: rustic projects can carry more texture, while modern rooms usually need fewer, stronger pieces.",
    ],
  },
  {
    q: "What print formats are available for projects?",
    a: [
      "Most project selections begin with archival paper prints for framed installation. Selected works are available as Signature Engrained Series natural Baltic Birch panels when the project needs a more tactile, object-based Western surface.",
    ],
  },
  {
    q: "Are signed limited editions available for client projects?",
    a: [
      "Yes. Selected Chronicle and Legend editions are individually signed and numbered, with certificate of authenticity included. These are useful when a project requires provenance, collector value, or a more permanent statement piece.",
    ],
  },
  {
    q: "Can K4 help with sizing or room mockups?",
    a: [
      "Yes. Send wall dimensions, room photos, and project context to wayne@k4studios.com. Wayne can help narrow subject, scale, and format, and can provide a complimentary mockup when it will help the decision.",
    ],
  },
  {
    q: "How do I avoid making a room feel too themed?",
    a: [
      "Use fewer, stronger images. Pair a Western subject with restraint in the rest of the room, or choose landscape and black and white work when the space already contains leather, wood, stone, or other strong Western materials.",
    ],
  },
];

const frontierStoryVideoWidget = {
  videoSlug: "only-path-forward",
  kicker: "Frontier stories come alive.",
  label: "60 seconds: Beyond the frame.",
  compact: true,
  withRules: true,
  ctaWidth: "17rem",
  ruleWidth: "100%",
};

const frontierStoryWidgetPagePaths = new Set([
  "/American-Western-Art",
  "/Contemporary-Western-Art",
  "/cinematic-western-art",
  "/black-and-white-cowboy-art",
  "/black-and-white-cowboy-photography",
  "/Art-of-the-West",
  "/wild-west-art",
  "/cowboy-pictures",
  "/old-western-art",
  "/vintage-cowboy-art",
  "/women-of-the-wild-west",
  "/Western-Frontier-Art",
  "/cowboy-themed-artwork",
  "/cowboy-themed-photography",
  "/cowboy-artwork-prints",
  "/Fine-Art-Photography-of-the-American-West",
  "/Western-Cowboy-Photography",
  "/western-cowboy-art",
  "/1800s-cowboy-art",
  "/western-cowboy-pictures",
  "/Cowboy-Fine-Art-Photography",
  "/cowboy-fine-art-prints",
  "/cowboy-painterly-fine-art-photography",
  "/old-west-pictures",
  "/Painterly-Western-Photography",
  "/Western-Fine-Art-Photography",
  "/western-fine-art-photography-collection",
  "/western-photos",
  "/western-storytelling-photography",
]);

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
  gatewayKicker,
  conceptBlock1Title,
  conceptBlock1Copy,
  conceptBlock2Title,
  conceptBlock2Copy,
  conceptBlock3Title,
  conceptBlock3Copy,
  conceptBlock4Title,
  conceptBlock4Copy,
  conceptBlock5Title,
  conceptBlock5Copy,
  conceptBlock6Title,
  conceptBlock6Copy,
  collectingKicker,
  collectingTitle,
  collectingCopy,
  archiveContextKicker,
  archiveContextTitle,
  archiveContextCopy,
  catalogSectionKicker,
  cornerstoneVariant,
  faqTitle,
  currentDockTitle,
  categoryCrumb = { href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West", name: "Wild West" },
  offsets = {},
  limits = {},
  timeZones = {},
  titles = {},
  alternates = {},
  descriptions = {},
  layoutVariant,
  gatewayVideoWidget,
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
  gatewayKicker?: string;
  conceptBlock1Title?: string;
  conceptBlock1Copy?: string;
  conceptBlock2Title?: string;
  conceptBlock2Copy?: string;
  conceptBlock3Title?: string;
  conceptBlock3Copy?: string;
  conceptBlock4Title?: string;
  conceptBlock4Copy?: string;
  conceptBlock5Title?: string;
  conceptBlock5Copy?: string;
  conceptBlock6Title?: string;
  conceptBlock6Copy?: string;
  collectingKicker?: string;
  collectingTitle?: string;
  collectingCopy?: string;
  archiveContextKicker?: string;
  archiveContextTitle?: string;
  archiveContextCopy?: string;
  catalogSectionKicker?: string;
  cornerstoneVariant?: string;
  faqTitle?: string;
  currentDockTitle?: string;
  categoryCrumb?: { href: string; name: string };
  offsets?: Record<string, number>;
  limits?: Record<string, number>;
  timeZones?: Record<string, string>;
  titles?: Record<string, string>;
  alternates?: Record<string, { href: string; label: string; kicker?: string; count?: string }>;
  descriptions?: Record<string, string>;
  layoutVariant?: string;
  gatewayVideoWidget?: {
    videoSlug?: string;
    youtubeId?: string;
    kicker?: string;
    label?: string;
    title?: string;
    compact?: boolean;
    withRules?: boolean;
    ctaWidth?: string;
    ruleWidth?: string;
  };
  dockCoreCount?: number;
  centerDock?: any[];
  faqItems?: Array<{ q: string; a: string[] }>;
}) {
  const gridSections = buildSections(sections, { offsets, limits, timeZones, titles, descriptions, alternates });
  const liveCount = countLiveItems(gridSections);
  const coreDock = gridSections.slice(0, dockCoreCount).map((section) => sectionDock(section.title, section.allHref, section.ctaThumb));
  const centerDockItems = centerDock || coreDock;
  const sectionDockItems = centerDockItems.length > 0
    ? [
        ...leftDock,
        { separator: true, label: `Core ${label} collections` },
        ...centerDockItems,
        { separator: true, label: "Collector notes and related routes" },
        ...rightDock,
      ]
    : [...leftDock, ...rightDock];
  const dockCenterIndex = centerDockItems.length > 0
    ? sectionDockItems.findIndex((item: any) => item.title === centerDockItems[0]?.title)
    : Math.floor(sectionDockItems.length / 2);
  const first = gridSections[0];
  const firstItem = cleanItems(first.items)[0] || {};
  const resolvedGatewayVideoWidget = gatewayVideoWidget === undefined && frontierStoryWidgetPagePaths.has(pagePath)
    ? frontierStoryVideoWidget
    : gatewayVideoWidget;

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
      indexLinkNote: `${label} brings together related collector print searches with curated Western artwork, story context, and image-level print details.`,
      printAvailabilityNote: `${label} prints are available from ${getFormattedLowestStandardPrintPrice()} across archival paper and select wood presentations. Edition status and format options are shown on individual image pages.`,
      commercialH1: commercialH1 || `The Collection - ${gridSections.length} Series, ${liveCount} Works`,
      commercialDeck: deck || `${liveCount} works organized for collectors, rooms, and subject-first browsing - ${subject}.`,
      gridIntroTitle,
      gridIntroCopy,
      catalogEntranceTitle: `${label} by Wayne Heim`,
      catalogEntranceCopy: `Browse ${label.toLowerCase()} created as collector-grade fine art prints with image stories, sizing, edition, and presentation details.`,
      collectionIntro: collectionIntro !== undefined ? collectionIntro : [
        `${label} at K4 Studios is built around authored Western imagery: ${subject}.`,
        "Start with the first collection section when you want the strongest subject match. Move through the adjacent sections to compare color, black and white, portrait, narrative, and room-direction options.",
        "Size, substrate, and edition details are inside each image page.",
      ].join("\n\n"),
      breadcrumbCurrentName: label,
      aggregateOfferLowPrice: String(getLowestStandardPrintPrice()),
      aggregateOfferHighPrice: String(getHighestStandardPrintPrice()),
      aggregateOfferCount: String(liveCount),
      gatewayCollectionName: label,
      gatewayIntroCopy: gatewayIntroCopy || `${label} by Wayne Heim - ${subject} for living rooms, offices, lodges, ranch interiors, hospitality spaces, and collector walls.`,
      gatewaySupportingCopy: gatewaySupportingCopy || `These works begin as photography, then are shaped through Heim's painterly process into fine art with atmosphere, human presence, and collector-grade wall presence. The collection opens with the Sketch Series, ${sketchPrintSizes} prints from ${sketchPrintPrice} - sized for shelves, desks, and introductory collecting. It scales through open-edition Foundation works, signed Chronicle editions with numbered certificates, and ultra-limited Legend pieces for collectors who want permanence on the wall.\n\nClick into any section to compare prints, read the image story, and view collector and sizing details.`,
      trustBarCopy: "Archival fine art prints produced to order by K4 Studios. Chronicle and Legend limited editions are individually signed and numbered, with certificate of authenticity included.",
      gatewayKicker: gatewayKicker || `K4 Studios - ${label} Catalog`,
      conceptBlock1Title,
      conceptBlock1Copy,
      conceptBlock2Title,
      conceptBlock2Copy,
      conceptBlock3Title,
      conceptBlock3Copy,
      conceptBlock4Title,
      conceptBlock4Copy,
      conceptBlock5Title,
      conceptBlock5Copy,
      conceptBlock6Title,
      conceptBlock6Copy,
      collectingKicker,
      collectingTitle,
      collectingCopy,
      archiveContextKicker,
      archiveContextTitle,
      gatewayHeroTitle: `${label} by Wayne Heim`,
      gatewayHeroAlt: `${label} hero image by Wayne Heim.`,
      gatewayHeroHref: `${heroPath}/${hero}`,
      gatewayHeroSrc: heroSrc || `/img/${hero}/m.jpg`,
      gatewayHeroSrcSet: heroSrc ? `${heroSrc} 720w` : `/img/${hero}/s.jpg 400w, /img/${hero}/m.jpg 720w`,
      gatewayHeroObjectPosition: heroObjectPosition || "center 28%",
      archiveContextCopy: archiveContextCopy ?? `Every work on this page is available as a fine art print - with the Sketch Series opening at ${sketchPrintPrice}. Click into any image to read the story, compare print options, sizes, and collector details. Questions about a specific piece? Reach Wayne directly at <a href='mailto:wayne@k4studios.com'>wayne@k4studios.com</a>.`,
      catalogSectionKicker,
      cornerstoneVariant,
      faqKicker: "Print & Collector Questions",
      faqTitle: faqTitle || `${label} FAQ`,
    },
    faqItems: faqItems || faqFor(label, subject),
    gridSections,
    gatewayVideoWidget: resolvedGatewayVideoWidget,
    layoutVariant,
  };
}

const westernCore = ["narrativeColor", "narrativeBlackWhite", "cowboyColor", "cowboyBlackWhite"] as Array<keyof typeof sources>;
const cowboyCore = ["cowboyColor", "cowboyBlackWhite", "narrativeColor", "narrativeBlackWhite"] as Array<keyof typeof sources>;
const oldCore = ["cowboyBlackWhite", "cowboyColor", "narrativeBlackWhite", "narrativeColor"] as Array<keyof typeof sources>;
const frontierCore = ["narrativeColor", "nativeColor", "cowboyColor", "narrativeBlackWhite"] as Array<keyof typeof sources>;
const interiorCore = ["cowboyColor", "landscapeWest", "mountains", "water"] as Array<keyof typeof sources>;

export const commercialIntentPages = {
  americanWesternArt: makePage({
    pagePath: "/American-Western-Art",
    label: "American Western Art",
    title: "American Western Art Prints - Fine Art by Wayne Heim",
    subject: "cowboy portraits, Native American portrait work, frontier narratives, and painterly Western art prints shaped by the American frontier",
    sections: ["cowboyColor", "nativeColor", "narrativeColor", "cowboyBlackWhite", "nativeBlackWhite", "narrativeBlackWhite"],
    hero: "i-LCspRF4",
    heroPath: sources.narrativeColor.galleryPath,
    leftDock: [
      supportDock("Learn What Is Western Art", "/Blog/what-is-western-art", blogThumbs.westernArt),
      supportDock("Explore Art of the American West", "/Art-of-the-American-West", "/img/i-89qzJ6S/s.jpg"),
      supportDock("Learn What Is Cowboy Fine Art Photography", "/Blog/what-is-cowboy-fine-art-photography", blogThumbs.cowboy),
      supportDock("Learn What Is Narrative Photography", "/Blog/what-is-narrative-photography", "/img/i-HfQ5NVR/s.jpg"),
    ],
    rightDock: [
      supportDock("Learn Narrative Western Art vs Traditional Western Art", "/Blog/narrative-western-art-vs-traditional", "/img/i-LmpRvHw/s.jpg"),
      supportDock("Learn What Is Western Cowboy Art", "/Blog/what-is-western-cowboy-art", "/img/i-7Mzzbvp/s.jpg"),
      supportDock("Compare Decor Art and Fine Art", "/Blog/decor-art-vs-fine-art", blogThumbs.decor),
      supportDock("Learn What Makes a Fine Art Print Worth Owning", "/Blog/what-makes-a-fine-art-print-worth-owning", blogThumbs.finePrint),
    ],
    dockCoreCount: 6,
    currentDockTitle: "Explore American Western Art Print Collections",
    archiveUrl: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West",
    archiveName: "Wild West",
    categoryCrumb: { href: "/Art-of-the-American-West", name: "Art of the American West" },
    collectionIntro: [
      "American Western art at K4 Studios draws from the same visual lineage as Remington, Russell, and Wyeth — frontier character, human consequence, and the psychology of lives built before the legend — through a camera-based painterly process rather than paint and canvas. The subject is the same. The narrative intent is the same. The medium is different.",
      "Start with the cowboy portrait sections when the work needs direct human presence and frontier character. Move into Native American portrait work when the Western story needs older ground, heritage, and quiet authority. Continue into the narrative sections when the wall calls for confrontation, aftermath, and story-led tension.",
      "Size, substrate, and edition details are inside each image page.",
    ].join("\n\n"),
    layoutVariant: "cinematic-concept-series-top",
    seoTitle: "American Western Art Prints - Cowboy, Frontier & Native Portraits",
    seoDescription: `American Western art prints by Wayne Heim - cowboy portraits, frontier narratives, and Native American portrait work shaped through painterly photographic craft. Prints from ${getFormattedLowestStandardPrintPrice()} through signed limited editions.`,
    commercialH1: "American Western Art Prints for Collectors",
    deck: "Six print routes, {catalogImageCount} works: cowboy portraits, Native American portrait work, and frontier narratives in color and black and white, organized for collectors around the human and historical weight of the American West.",
    gatewayIntroCopy:
      "American Western art is not one image of the West. It is the argument over what the West means when the myth is stripped back to people, land, history, and consequence.",
    gatewaySupportingCopy:
      `The American West gave artists a subject larger than scenery: frontier labor, Indigenous presence, migration, loss, endurance, distance, and the hardening of real lives into national legend. The best American Western art does not simply repeat the cowboy, the horse, or the horizon. It asks what those figures cost, what histories stand behind them, and why the image still holds.\n\nWayne Heim's work enters that tradition through photography, but it does not stop at photographic record. This page is the collector route into that work: American Western art prints shaped through painterly control, tonal restraint, and narrative structure so the work can sit beside the older Western art conversation while remaining rooted in the specificity of a camera-made moment.\n\nSketch Series studies begin at ${getFormattedLowestStandardPrintPrice()}, with archival paper prints, selected signed limited editions, and some Engrained natural Baltic Birch panels available when the material surface strengthens the historical register of the piece.`,
    titles: {
      cowboyColor: "Color Cowboy Portrait Art",
      nativeColor: "Native American Western Portrait Art",
      narrativeColor: "Color American Western Narrative Art",
      cowboyBlackWhite: "Black and White Cowboy Portrait Art",
      nativeBlackWhite: "Black and White Native American Western Art",
      narrativeBlackWhite: "Black and White American Western Narrative Art",
    },
    descriptions: {
      cowboyColor:
        "Start with color cowboy portrait art when the page needs the immediate human figure: face, posture, clothing, and frontier character held in warm painterly light.",
      nativeColor:
        "Native American portrait work carries the deeper historical ground of American Western art, with presence and heritage that predate the cowboy-centered myth.",
      narrativeColor:
        "Color narrative scenes bring the American Western tradition into story: conflict, decision, distance, atmosphere, and consequence.",
      cowboyBlackWhite:
        "Black and white cowboy portraits remove color romance so the figure must hold through tone, face, fabric, and stillness.",
      nativeBlackWhite:
        "Black and white Native American portrait work is the quietest and most restrained route, built around dignity, atmosphere, and tonal authority.",
      narrativeBlackWhite:
        "Black and white Western narratives carry old-West pressure without decorative color, leaving shadow, gesture, and implication to hold the story.",
    },
    conceptBlock1Title: "THE COWBOY AS HUMAN EVIDENCE",
    conceptBlock1Copy:
      "The cowboy is the most legible figure in American Western art, which makes him dangerous. If the image stops at hat, horse, and posture, it becomes shorthand. The color portrait route below keeps the person specific so the icon still has human weight.",
    conceptBlock2Title: "THE OLDER PRESENCE",
    conceptBlock2Copy:
      "American Western art cannot be serious if Indigenous presence is treated as decoration or afterthought. Native American portrait work changes the register of the page, grounding the Western subject in a history older and deeper than frontier myth.",
    conceptBlock3Title: "THE STORY FIELD",
    conceptBlock3Copy:
      "Narrative work is where American Western art moves from subject to consequence. A frontier scene has to imply a before and after, making the viewer feel that history is happening just beyond the frame.",
    conceptBlock4Title: "THE TONAL WEST",
    conceptBlock4Copy:
      "Black and white cowboy portraiture strips the figure back to value, face, and restraint. It is useful when the room or collection needs Western presence without the heat of color.",
    conceptBlock5Title: "THE STILLER GROUND",
    conceptBlock5Copy:
      "Monochrome Native American portrait work slows the collection down. These images rely on quiet authority rather than spectacle, giving the page its most restrained historical register.",
    conceptBlock6Title: "THE UNRESOLVED FRONTIER",
    conceptBlock6Copy:
      "Black and white narrative scenes end the route in the withheld moment: shadow, distance, silence, and a story that continues after the viewer leaves the frame.",
    archiveContextTitle: "Browse American Western Art Prints",
    archiveContextCopy:
      "American Western art prints at K4 Studios are organized by six routes: color cowboy portrait art, Native American portrait work, color frontier narratives, black and white cowboy portraits, black and white Native American studies, and black and white narrative scenes. Open any image for story, print options, sizing, and edition details.",
    faqItems: [
      {
        q: "What are American Western art prints on this page?",
        a: [
          "American Western art prints here means authored fine art prints rooted in the American frontier — cowboy portraits, frontier narrative scenes, and Indigenous portrait work shaped through a painterly photographic process into collector-grade imagery. Not decorative Western theme. Not mass-market prints. Authored work where every image carries a title, a story, and a named point of view.",
        ],
      },
      {
        q: "What subjects are featured in this American Western art collection?",
        a: [
          "Five subject series — color cowboy portraits, Native American color portrait work, color frontier narrative scenes, black and white cowboy portraits, and black and white frontier narrative scenes. Each series is organized separately so collectors can move directly into the subject and treatment that fits the room or the collection without sorting through unrelated work.",
        ],
      },
      {
        q: "How is this different from decorative Western wall art?",
        a: [
          "Decorative Western wall art uses frontier symbols — hats, horses, desert horizons — as shorthand for a look. Wayne Heim's American Western art treats the frontier as human territory: characters under pressure, stories mid-consequence, lives that earned the mythology rather than wearing it as costume. Every image carries a title, a story, and an authored point of view. The difference is whether the work holds a wall or simply fills it.",
        ],
      },
      {
        q: "Are these works available as fine art prints?",
        a: [
          `Yes. Every image on this page is available as a fine art print — archival paper or wood — with the Sketch Series opening at ${getFormattedLowestStandardPrintPrice()}. Click into any image to read the story, compare sizes, and view edition and collector details. Questions about a specific piece? Reach Wayne directly at wayne@k4studios.com.`,
        ],
      },
      {
        q: "What print formats are available?",
        a: [
          `Every image is available as archival paper or wood — including the Engrained Series on Baltic Birch panels where natural wood grain interacts with the image surface to deepen atmosphere and add material presence. The Sketch Series opens at ${getFormattedLowestStandardPrintPrice()}. Size and finish options are inside each image page.`,
        ],
      },
      {
        q: "Are the works signed or limited?",
        a: [
          `Selected works are offered as signed limited editions through the Chronicle Series — numbered certificates of authenticity included. The Legend Series is ultra-limited, very small runs for collectors who want documented provenance and permanent wall placement. Open-edition Sketch and Foundation works are available without edition constraints starting at ${getFormattedLowestStandardPrintPrice()}.`,
        ],
      },
      {
        q: "Where should I start if I am choosing by subject?",
        a: [
          "Start with the color cowboy portrait section for direct human presence and frontier character. Move into the Native American portrait section when the Western story needs older ground, heritage, and quiet authority. Continue into the frontier narrative sections — color first, then black and white — when the wall calls for story-driven atmosphere, confrontation, and unresolved consequence. Click into any image to read the story before deciding.",
        ],
      },
      {
        q: "What makes Wayne Heim's American Western art different from other Western artists?",
        a: [
          "Three things separate this work from other Western artists.",
          "First, the painterly process — each image begins as photography then is shaped through tonal control, atmospheric finishing, and narrative structure into fine art with the presence of classic Western painting rather than straight documentation.",
          "Second, the lineage — the work draws from the same visual tradition as Remington and Russell in subject and narrative intent. Remington didn't paint what happened. He painted the breath before the draw, the moment after the choice, the consequence still arriving. Russell did the same. Wayne Heim's work operates in that same register — not recording the West but telling its stories through implication, atmosphere, and the pressure of what hasn't resolved yet.",
          "Third, the One-Image Movie architecture. Every work carries a title, an authored story, and a deliberate incompleteness — a moment held open so the viewer is pulled past the frame's edge into the unwritten chapter beyond it. The image doesn't explain itself. It asks the viewer to complete it. That is what Remington and Russell were doing in paint. That is what Wayne Heim is doing through the camera and the painterly process. No aggregator can build that. No stock library can either.",
        ],
      },
    ],
  }),
  contemporaryWesternArt: makePage({
    pagePath: "/Contemporary-Western-Art",
    label: "Contemporary Western Art",
    title: "Contemporary Western Art - Story-Driven Fine Art Prints by Wayne Heim",
    subject: "present-day Western fine art, camera-based painterly photography, historical frontier storytelling, contemporary cowboy portraiture, Native American portrait work, and Western narratives that reimagine the West through reflection on the past",
    sections: ["narrativeColor", "cowboyColor", "nativeColor", "narrativeBlackWhite", "cowboyBlackWhite", "landscapeWest"],
    hero: "i-LCspRF4",
    heroPath: sources.narrativeColor.galleryPath,
    leftDock: [
      supportDock("Explore 1800s Cowboy Art", "/1800s-cowboy-art", "/img/i-LCspRF4/s.jpg"),
      supportDock("Learn What Is Western Art", "/Blog/what-is-western-art", blogThumbs.westernArt),
      supportDock("Learn What Is Artistic Western Photography", "/Blog/what-is-artistic-western-photography", "/img/i-qMQf7b6/s.jpg"),
      supportDock("Learn What Is Narrative Photography", "/Blog/what-is-narrative-photography", "/img/i-HfQ5NVR/s.jpg"),
    ],
    centerDock: [
      sectionDock("Contemporary Western Narrative Art", "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color/all#collection-browser", "/img/i-B7ZSdfs/s.jpg"),
      sectionDock("Contemporary Cowboy Portrait Art", "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/all#collection-browser", "/img/i-5FX3W9r/s.jpg"),
      sectionDock("Native Presence in Contemporary Western Art", "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color/all#collection-browser", "/img/i-qLzRgbS/s.jpg"),
      sectionDock("Black and White Western Narratives", "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White/all#collection-browser", "/img/i-mqQxwNn/s.jpg"),
    ],
    rightDock: [
      supportDock("Explore Western Storytelling Photography", "/western-storytelling-photography", "/img/i-HfQ5NVR/s.jpg"),
      supportDock("Explore Western Photography Art", "/Western-Photography-Art", "/img/i-qMQf7b6/s.jpg"),
      supportDock("Explore Narrative Western Art", "/Narrative-Western-Art", "/img/i-B7ZSdfs/s.jpg"),
      supportDock("Compare Narrative and Traditional Western Art", "/Blog/narrative-western-art-vs-traditional", "/img/i-LmpRvHw/s.jpg"),
    ],
    dockCoreCount: 6,
    layoutVariant: "cinematic-concept-series-top",
    currentDockTitle: "Explore Contemporary Western Art Collections",
    categoryCrumb: { href: "/Art-of-the-West", name: "Art of the West" },
    archiveUrl: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West",
    archiveName: "Wild West",
    seoTitle: "Contemporary Western Art - Story-Driven Prints by Wayne Heim",
    seoDescription:
      `Contemporary Western art by Wayne Heim. Camera-based painterly Western fine art, cowboy portraits, frontier narratives, Native American portrait work, and historical storytelling prints from ${sketchPrintPrice}.`,
    commercialH1: "Contemporary Western Art With History Still Inside It",
    deck:
      "Six routes, {catalogImageCount} works: contemporary Western narratives, cowboy portraits, Native American portrait work, black and white story pieces, tonal cowboy studies, and Western landscapes shaped through painterly photography and historical storytelling.",
    gatewayKicker: "K4 Studios - Contemporary Western Art by Wayne Heim",
    gatewayIntroCopy:
      "Contemporary Western art should do more than rearrange old icons in a new palette.",
    gatewaySupportingCopy:
      `The contemporary Western art market is full of strong painting, bright abstraction, Pop Western imagery, modern cowboys, decorative wall products, and polished nostalgia. Some of it is beautiful. Much of it is instantly recognizable. But recognition is not the same as story.\n\nWayne Heim works in a rarer lane: contemporary Western fine art built from photography as the foundational element, then carried through a painterly process into images that behave like story-driven art rather than straight documentation. The camera keeps the work grounded in real bodies, real light, real period detail, and the authority of a specific moment. The painterly finish shapes that evidence into atmosphere, restraint, and narrative pressure.\n\nThis is contemporary Western art as a return to the roots of the tradition, not a retreat into nostalgia. Remington and Russell mattered because their strongest images had bones beneath the icon: consequence, character, withheld story, and the feeling that the viewer had arrived in the middle of something. K4 Studios brings that discipline forward through modern photographic craft, asking the West to carry human weight again.\n\nThese are not modern rodeo pictures and not cowboy symbols arranged as decor. They are reimaginings of the West through reflection on the past: old stories given present-tense form, historic atmosphere translated through contemporary tools, and collector-grade prints for viewers who want Western art with more than surface myth. Sketch Series studies begin at ${getFormattedLowestStandardPrintPrice()}, with larger archival prints and selected signed limited editions available for permanent collector walls.`,
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    titles: {
      narrativeColor: "Contemporary Western Narrative Art",
      cowboyColor: "Contemporary Cowboy Portrait Art",
      nativeColor: "Native Presence in Contemporary Western Art",
      narrativeBlackWhite: "Black and White Contemporary Western Narratives",
      cowboyBlackWhite: "Tonal Contemporary Cowboy Art",
      landscapeWest: "Contemporary Western Landscape Art",
    },
    descriptions: {
      narrativeColor:
        "Start with color narrative work when contemporary Western art needs story, atmosphere, implication, and the unresolved frontier moment rather than icon-only nostalgia.",
      cowboyColor:
        "Contemporary cowboy portraits bring the figure forward as a person first: face, posture, clothing, weather, and character shaped through camera-based painterly craft.",
      nativeColor:
        "Native American portrait work gives the contemporary Western page deeper historical ground and living presence, widening the field beyond cowboy shorthand.",
      narrativeBlackWhite:
        "Black and white Western narratives strip away color and ask shadow, gesture, silence, and structure to carry the story pressure.",
      cowboyBlackWhite:
        "Tonal cowboy portraits work against easy nostalgia by reducing the image to face, fabric, posture, and the psychological weight of the figure.",
      landscapeWest:
        "Contemporary Western landscape art keeps the land active: not background scenery, but distance, weather, scale, and emotional geography.",
    },
    conceptBlock1Title: "CONTEMPORARY DOES NOT MEAN ROOTLESS",
    conceptBlock1Copy:
      "Contemporary Western art is strongest when it knows what it is continuing. The point is not to abandon Remington, Russell, Catlin, Curtis, the Taos painters, ranch photography, frontier illustration, or the old storytelling structures that shaped the Western imagination. The point is to carry those concerns into a living medium.\n\nWayne Heim's route begins with photography, but photography is not used as mere documentation. It is the foundation: the real subject, the real light, the real physical evidence. From there, painterly finishing, title, story, and restraint turn the image into contemporary Western art with history still inside it.",
    conceptBlock2Title: "THE WEST REIMAGINED THROUGH THE PAST",
    conceptBlock2Copy:
      "A lot of contemporary Western art reimagines the West by changing the surface: brighter color, flatter shape, modern design language, abstract cowboys, Pop Western attitude. That can be valid, but it often leaves the story hollow.\n\nK4 Studios reimagines the West by going backward into the bones of the tradition: the unresolved moment, the working body, the old room, the guarded face, the land as pressure, the historical object that still carries consequence. The result is modern because the medium and authorship are contemporary. It is Western because the image still answers to memory, labor, myth, and cost.",
    conceptBlock3Title: "THE CONTEMPORARY COWBOY AS PERSON",
    conceptBlock3Copy:
      "The cowboy is one of the most overused icons in American visual culture. Hat, horse, horizon, dust, silhouette. The viewer recognizes the category before seeing the person.\n\nContemporary Western art has to push past that recognition. These portraits use photography to keep the subject specific, then painterly structure to slow the viewer down. The goal is not a modern cowboy symbol. It is a person carrying the pressure that made the symbol matter in the first place.",
    conceptBlock4Title: "THE WEST WAS NEVER ONLY COWBOY MYTH",
    conceptBlock4Copy:
      "Any contemporary Western artist working seriously with history has to widen the field. Native American presence is not an accessory to the Western story and not a historical prop. It is part of the ground beneath the entire genre.\n\nThe Native portrait work below keeps this page from becoming a cowboy-only route. It brings continuity, heritage, displacement, authority, and living presence into the contemporary Western conversation.",
    conceptBlock5Title: "BLACK AND WHITE AS DISCIPLINE",
    conceptBlock5Copy:
      "Black and white Western work is not simply a vintage effect. It is a discipline. Remove color and the image has to survive on structure: light, shadow, gesture, distance, face, and the tension of what the frame refuses to explain.\n\nThat is why monochrome belongs inside contemporary Western art. It strips away decorative warmth and leaves the bones visible. If the story still holds there, the image has earned its place.",
    conceptBlock6Title: "LAND, MEMORY, AND THE PRESENT TENSE",
    conceptBlock6Copy:
      "The West is not just a figure in a hat. It is land large enough to change the figure. Contemporary Western landscape art gives the page distance, weather, scale, and silence - the environmental pressure that shaped the stories in the first place.\n\nTogether, these routes position Wayne Heim as a contemporary Western artist using photography as foundational evidence and painterly storytelling as the finished language. The medium is present tense. The roots run backward. The work asks Western art to have meat on its bones again.",
    archiveContextTitle: "Browse Contemporary Western Art by Wayne Heim",
    archiveContextCopy:
      "Contemporary Western art at K4 Studios is organized by six routes: color frontier narratives, contemporary cowboy portraits, Native American portrait work, black and white Western narratives, tonal cowboy portraits, and Western landscape art.\n\nOpen any image to read its story, compare print sizes, review edition options, and choose whether the work belongs as a small Sketch Series study, a larger archival wall print, or a signed limited edition collector piece. Questions about a specific contemporary Western print? Contact Wayne at wayne@k4studios.com.",
    faqTitle: "Contemporary Western Art FAQ",
    faqItems: [
      {
        q: "What is contemporary Western art?",
        a: [
          "Contemporary Western art is present-day art that interprets the American West through current visual language, modern mediums, and contemporary authorship while remaining connected to Western subject matter, history, landscape, and myth.",
        ],
      },
      {
        q: "What makes Wayne Heim a contemporary Western artist?",
        a: [
          "Wayne Heim uses photography as the foundational element in story-driven Western fine art. The work begins with camera-based evidence, then moves through painterly finishing, title, narrative writing, and deliberate incompleteness so the image carries history, character, and story rather than simple documentation.",
        ],
      },
      {
        q: "How is this different from modern cowboy decor or rodeo photography?",
        a: [
          "The work is not built around modern rodeo action or decorative cowboy icons. It is rooted in historical storytelling, old-West atmosphere, portrait presence, Native American portrait work, and the unresolved narrative tradition of Western art.",
        ],
      },
      {
        q: "Can photography be contemporary Western art?",
        a: [
          "Yes. Photography becomes contemporary Western art when it is used with authorship, composition, narrative intent, and interpretive craft. At K4 Studios, the camera grounds the work in real presence, while the painterly process carries it into finished fine art.",
        ],
      },
      {
        q: "Why does this page connect contemporary art with the past?",
        a: [
          "Because Western art loses depth when it becomes only icons and nostalgia. This page treats the past as the root system: Remington and Russell's storytelling discipline, old photographic memory, frontier labor, Native presence, and the land as pressure. The work is contemporary because those roots are reinterpreted through present-day photographic craft.",
        ],
      },
      {
        q: "Are these contemporary Western artworks available as prints?",
        a: [
          `Yes. The works open to individual image pages with story, sizing, format, and edition details. Sketch Series prints begin at ${getFormattedLowestStandardPrintPrice()}, with larger archival paper prints and selected signed limited editions available for collector walls.`,
        ],
      },
      {
        q: "Where should I go next if I want the narrative side of the work?",
        a: [
          "Start with <a href='/western-storytelling-photography'>Western Storytelling Photography</a>, <a href='/Narrative-Western-Art'>Narrative Western Art</a>, or <a href='/Other/One-Image-Movie'>The One-Image Movie</a> for the clearest explanation of how image, title, story, and viewer participation work together.",
        ],
      },
    ],
  }),
  cinematicWesternArt: makePage({
    pagePath: "/cinematic-western-art",
    label: "Cinematic Western Art",
    title: "Cinematic Western Art",
    subject: "color and black and white frontier narrative scenes where withheld story, painterly light, and One-Image Movie structure carry cinematic Western pressure",
    sections: ["cinematicNarrativeColor", "cinematicNarrativeBlackWhite"],
    limits: {
      cinematicNarrativeColor: 15,
      cinematicNarrativeBlackWhite: 15,
    },
    hero: "i-LCspRF4",
    heroPath: sources.narrativeColor.galleryPath,
    layoutVariant: "cinematic-concept",
    leftDock: [
      supportDock("What Makes an Image Feel Cinematic?", "/Blog/what-makes-an-image-feel-cinematic", blogThumbs.cinematic),
      supportDock("What Is Narrative Photography?", "/Blog/what-is-narrative-photography", "/img/i-HfQ5NVR/s.jpg"),
      supportDock("Narrative Western Art vs Traditional Western Art", "/Blog/narrative-western-art-vs-traditional", "/img/i-LmpRvHw/s.jpg"),
    ],
    rightDock: [
      supportDock("Can Photography Be Narrative Western Art?", "/Blog/can-photography-be-narrative-western-art", "/img/i-7Mzzbvp/s.jpg"),
      supportDock("When the Medium Disappears", "/Blog/when-the-medium-disappears", "/img/i-qMQf7b6/s.jpg"),
      supportDock("What Is the One-Image Movie?", "/Other/One-Image-Movie", "/img/i-B7ZSdfs/s.jpg"),
    ],
    dockCoreCount: 0,
    centerDock: [],
    currentDockTitle: "Narrative Story Library",
    archiveUrl: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color",
    archiveName: "Western Narratives",
    categoryCrumb: { href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West", name: "Wild West" },
    seoTitle: "Cinematic Western Art — Fine Art Prints by Wayne Heim | K4 Studios",
    seoDescription: `Cinematic Western art in the tradition of Remington and Russell — not movie art, but the visual discipline that made the movies look the way they do. Frontier narrative prints where the viewer completes the story. The tradition continues. From ${getFormattedLowestStandardPrintPrice()}.`,
    commercialH1: "The Collection — Two Narrative Series, 596 Works",
    deck: "Color and black and white frontier narrative scenes where atmosphere, implication, and withheld story carry the cinematic pressure that Remington and Russell built into paint — and that Hollywood borrowed to build the Western film.",
    gatewayKicker: "K4 Studios — Cinematic Western Art",
    gatewayIntroCopy: "Not movie art. The tradition that made the movies look the way they do.",
    gatewaySupportingCopy: `Search for "cinematic western art" and Google returns movie posters, film lists, and museum exhibitions about how Remington and Russell influenced Hollywood.\n\nThat is the right neighborhood. But it is looking backward.\n\nCinematic Western art is not a film genre and it is not a historical category. It is a living visual discipline — one that Remington and Russell established before Hollywood existed, that Hollywood borrowed wholesale, and that has been largely abandoned by the contemporary Western art world in favor of heroic spectacle and decorative frontier imagery.\n\nWayne Heim's work is a direct response to that abandonment. These are not photographs of Western subjects. They are authored narrative works built in the same tradition as Remington's A Misdeal — the painting so charged with unresolved story pressure that John Ford used it as a visual reference for decades of Western films. The withheld moment. The breath before the draw. The consequence still arriving.\n\nThat tradition didn't end with Remington. It just stopped being made.`,
    archiveContextCopy: `Every work on this page is available as a fine art print — archival paper or wood — with the Sketch Series opening at ${sketchPrintPrice}. Click into any image to read the story, compare print options, sizes, and collector details. Questions about a specific piece? Reach Wayne directly at <a href='mailto:wayne@k4studios.com'>wayne@k4studios.com</a>.`,
    collectionIntro: "",
    conceptBlock1Title: "The Tradition",
    conceptBlock1Copy: `Remington and Russell were not painters of the West. They were narrative architects who used the West as their subject. Their most powerful images are not the ones that show you what the frontier looked like. They are the ones that make you feel what it was like to be inside a moment that hasn't finished yet.\n\nA Misdeal. A card game gone wrong. The gunman already in motion. The consequence still in the air. The viewer arrives after the trigger point and before the resolution — held in the pressure of what comes next, which the image refuses to show.\n\nJohn Ford studied Remington's paintings as storyboards. He wanted his films to have "the burned-out, brown look of a Remington painting." Spielberg collected Rockwell — fifty works — because, in his words, "He was always on my mind because I had a great deal of respect for how he could tell stories in a single frozen image. Entire stories."\n\nHollywood didn't invent the cinematic Western. It recognized something that painters had already built and borrowed it for the screen. The discipline of the withheld moment — the narrative pressure of a story held open rather than closed — was already fully developed in paint before a single frame of film was shot.\n\nThe color frontier narrative works below operate in that tradition. Each image holds a moment that refuses to close. Click into any image to read the authored story — and notice that the story deepens the uncertainty rather than resolving it.`,
    conceptBlock2Title: "The Narrative Vacuum",
    conceptBlock2Copy: `Walk through a major Western art auction today. Three hundred works. Paintings, bronzes, prints. Russell, Remington, the Taos painters — represented in the historical section, properly revered. Then the contemporary work. Landscapes of extraordinary technical skill. Portraits of dignity and presence. Cowboys rendered with photographic precision.\n\nBut the narrative is gone.\n\nContemporary Western art largely abandoned the discipline that made Russell and Remington matter — the unresolved moment, the story held in tension, the image that makes the viewer feel the weight of what isn't shown. What replaced it was heroic spectacle and decorative frontier imagery. Beautiful. Accomplished. And closed — images that deliver everything on first viewing and ask nothing in return.\n\nHemingway called his approach the iceberg theory. The dignity of movement comes from what is omitted. Seven-eighths of the story lives below the surface. What shows above the waterline is only what is needed to make the reader feel the full weight of what isn't shown. The key is that the writer knows the whole story — and chooses what single moment to show, trusting the submerged weight to press up through what is visible.\n\nRockwell understood the same principle in paint. His most powerful images are not the ones where everything is explained — they are the ones where a single interrupted gesture, a look caught mid-thought, or a pause before a decision reveals an entire interior world that the viewer constructs from their own experience.\n\nThe black and white narrative works below carry this principle in its most austere form. Without color warmth to lean on, the image must earn every response it produces through structure alone — shadow, silence, and the felt weight of what hasn't resolved.`,
    conceptBlock3Title: "The One-Image Movie — Continuation, Not Homage",
    conceptBlock3Copy: `Wayne Heim's One-Image Movie architecture is not an homage to Remington and Russell. It is a continuation of the same discipline through a different medium.\n\nEvery One-Image Movie is built to remain deliberately incomplete. The image opens the scene. The title turns the handle. The authored story lights the room — but does not close the door. The viewer steps through and completes the story with their own instinct, colored by their own life.\n\nThis is why no two people experience the same One-Image Movie in exactly the same way. The image reaches out. The viewer brings the rest. Memory, emotion, and lived history complete the circuit. The viewer is the final author of the story that lives beyond the frame's edge.\n\nCollectors who live with this work describe images as "scenes from a film I somehow remember" — moments that feel familiar before they can explain why. That is the signature of an image built to hold story pressure rather than deliver it.\n\nThese works are available as archival fine art prints — with the Sketch Series opening at ${getFormattedLowestStandardPrintPrice()}. The same narrative architecture lives in every edition, from the smallest shelf print to the ultra-limited Legend pieces built for permanent collector walls. The story doesn't scale with the size. It is fully present at every format.`,
    faqItems: [
      {
        q: "What is cinematic Western art?",
        a: [
          "Cinematic Western art is not movie art or film-inspired illustration. It is the visual tradition that Remington and Russell established before Hollywood existed — where a single image carries the pressure of an unresolved story. A moment weighted with what came before and what is still arriving. Hollywood borrowed this visual language from Western painters. Wayne Heim's work continues it through a camera-based painterly process and the One-Image Movie architecture.",
        ],
      },
      {
        q: "Why does Google show movie results for this term?",
        a: [
          "Because cinema borrowed the visual language of Western painting so completely that the connection has been reversed in popular understanding. Remington and Russell were making cinematic images before cinema existed. John Ford studied Remington's paintings as visual references for his Western films. The cinematic Western didn't originate in Hollywood. It originated in paint — and in the discipline of leaving the story deliberately unresolved.",
        ],
      },
      {
        q: "What is the One-Image Movie and how does it relate to cinematic Western art?",
        a: [
          "The One-Image Movie is Wayne Heim's term for a narrative architecture where image, title, authored story, and deliberate incompleteness work together to pull the viewer past the frame's edge. The photograph opens the scene. The story deepens the uncertainty rather than resolving it. The viewer's own lived experience provides the resolution — differently every time. It is the same principle Remington used in A Misdeal — an open-ended moment so charged with story pressure that Hollywood used it as a storyboard for decades of Western films.",
        ],
      },
      {
        q: "How does the viewer become part of the story?",
        a: [
          "The image is deliberately incomplete. The authored story deepens the incompleteness rather than closing it. The viewer's instinct, memory, and lived experience complete the circuit — finishing the story in a way no two people do in exactly the same way. Hemingway called this the iceberg theory. Rockwell built it into his most powerful images. Wayne Heim builds it into the One-Image Movie architecture. The viewer is the final author of the story that lives beyond the frame.",
        ],
      },
      {
        q: "Why show only narrative sections on this page?",
        a: [
          "Cinematic Western art lives specifically in the narrative work — scenes built around consequence, implication, and story pressure rather than pure portrait character. Cowboy portraits carry their own cinematic quality, but they operate differently — through presence and atmosphere rather than unresolved narrative tension. This page stays with the narrative sections to keep the cinematic argument coherent and give collectors a clean route into the specific body of work that operates most fully in that register.",
        ],
      },
      {
        q: "Are these prints available as limited editions?",
        a: [
          `Yes. The Chronicle Series offers signed limited editions with numbered certificates of authenticity. The Legend Series is ultra-limited — very small runs for collectors who want documented provenance and permanent wall placement. The One-Image Movie architecture is fully present at every edition level, from the ${getFormattedLowestStandardPrintPrice()} Sketch Series through the ultra-limited Legend pieces. The story doesn't scale with the size.`,
        ],
      },
      {
        q: "Can cinematic Western art work in modern interiors?",
        a: [
          "Yes — and often more powerfully than conventional art. Because the One-Image Movie keeps opening rather than exhausting itself, it functions differently in a room over time. The story you complete today is different from the one you complete in six months. The black and white series integrates especially well in minimalist and contemporary spaces where tonal restraint and deep contrast provide the counterweight color work cannot.",
        ],
      },
      {
        q: "Where should I start if I'm new to this work?",
        a: [
          "Start with the color narrative section and read the story under the first image that stops you. Notice whether the story answers your questions or deepens them. If it deepens them — if you find yourself wondering what happened before the frame or what happens next — that's the One-Image Movie working. Move into the black and white section if you want that pressure without color warmth. For help choosing for a specific room, reach Wayne at wayne@k4studios.com.",
        ],
      },
    ],
  }),
  blackAndWhiteCowboyArt: makePage({
    pagePath: "/black-and-white-cowboy-art",
    label: "Black and White Cowboy Art",
    title: "Black and White Cowboy Art",
    subject: "black and white cowboy portraits, frontier narrative scenes, and Native American portrait studies shaped through tonal restraint and painterly Western atmosphere",
    sections: ["blackWhiteCowboyPhotographyPortraits", "blackWhiteCowboyPhotographyNarratives", "blackWhiteCowboyPhotographyNativePortraits"],
    limits: {
      blackWhiteCowboyPhotographyPortraits: 15,
      blackWhiteCowboyPhotographyNarratives: 15,
      blackWhiteCowboyPhotographyNativePortraits: 15,
    },
    hero: "i-DJMTZ8z",
    heroPath: sources.cowboyBlackWhite.galleryPath,
    layoutVariant: "cinematic-concept",
    leftDock: [
      supportDock("What Makes an Image Feel Cinematic?", "/Blog/what-makes-an-image-feel-cinematic", blogThumbs.cinematic),
      supportDock("What Is Narrative Photography?", "/Blog/what-is-narrative-photography", "/img/i-HfQ5NVR/s.jpg"),
      supportDock("Narrative Western Art vs Traditional Western Art", "/Blog/narrative-western-art-vs-traditional", "/img/i-LmpRvHw/s.jpg"),
    ],
    rightDock: [
      supportDock("Can Photography Be Narrative Western Art?", "/Blog/can-photography-be-narrative-western-art", "/img/i-7Mzzbvp/s.jpg"),
      supportDock("When the Medium Disappears", "/Blog/when-the-medium-disappears", "/img/i-qMQf7b6/s.jpg"),
      supportDock("What Is the One-Image Movie?", "/Other/One-Image-Movie", "/img/i-B7ZSdfs/s.jpg"),
    ],
    dockCoreCount: 0,
    centerDock: [],
    currentDockTitle: "Narrative Story Library",
    archiveUrl: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West",
    archiveName: "Wild West",
    categoryCrumb: { href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West", name: "Wild West" },
    seoTitle: "Black and White Cowboy Art – Fine Art Prints by Wayne Heim | K4 Studios",
    seoDescription: `Black and white cowboy art by Wayne Heim — 246 monochrome western works. Cowboy portraits, frontier narrative scenes, and Native American studies. Archival fine art prints from ${sketchPrintPrice}. Four edition tiers.`,
    commercialH1: "The Collection — Three Monochrome Series, 246 Works",
    deck: "246 black and white western photographs — cowboy portraits, frontier narrative scenes, and Native American portrait studies organized for collectors, rooms, and tonal decisions.",
    gatewayKicker: "K4 STUDIOS — BLACK AND WHITE COWBOY ART",
    gatewayIntroCopy: "Not monochrome for atmosphere. Monochrome because color would lie.",
    gatewaySupportingCopy: `Search "black and white cowboy art" and Google returns stock photos, decorative prints, and western clip art. Plenty of cowboys rendered in black and white. Almost none of them built as art — images where the removal of color was a deliberate decision that changes what the work can hold.\n\nColor in western photography does specific work: it delivers warmth, distance, dust, and golden hour. It is seductive and immediate. It also closes the image. The viewer receives it and moves on.\n\nBlack and white stops that transaction. Without color warmth to lean on, every response the image produces has to come from structure — shadow, posture, restraint, and the felt weight of what hasn't resolved. The image has to earn what color would have given for free.\n\nThese works are available as museum-quality fine art prints — archival paper and Baltic Birch wood panels, open-edition studies through ultra-limited signed collector editions. Chronicle and Legend editions are numbered and accompanied by a certificate of authenticity. The Sketch Series opens at ${sketchPrintPrice}. Every print is ready to frame. Engrained wood panel prints arrive ready to hang.`,
    archiveContextCopy: `Every work on this page is available as a fine art print — archival paper or wood — with the Sketch Series opening at ${sketchPrintPrice}. Click into any image to read the story, compare print options, sizes, and collector details. Questions about a specific piece? Reach Wayne directly at <a href='mailto:wayne@k4studios.com'>wayne@k4studios.com</a>.`,
    collectionIntro: "",
    gridIntroTitle: "The Collection",
    gridIntroCopy: "Black and white cowboy art at K4 Studios is built around restraint: faces, posture, weathered clothing, window light, frontier interiors, and the tonal pressure that remains when color is removed.\n\nStart with the cowboy portrait section when the work needs human gravity and direct presence. Move into the narrative section for old-West tension and story-led scenes. Continue into the Native American portrait section for monochrome work shaped by atmosphere, heritage, and quiet authority.\n\nSize, substrate, and edition details are inside each image page.",
    conceptBlock1Title: "THE PORTRAIT",
    conceptBlock1Copy: `The cowboy portrait in black and white has a specific problem. There are thousands of them. Cowboys in hats. Cowboys with rifles. Cowboys squinting into the distance. The subject is so familiar that familiarity becomes the enemy — the viewer recognizes the archetype before they see the person.\n\nWayne Heim's black and white cowboy portraits work against that recognition. The painterly process strips away the photographic surface — the sharpness, the documentary clarity, the sense that you are looking at a captured moment — and replaces it with something slower. The image asks to be read rather than scanned.\n\nWhat remains when the photographic surface is gone is character. Not the cowboy as type. The person inside the type — the specific weight of a specific man or woman in a specific moment that hasn't finished yet.\n\nThe 99 works in the cowboy portrait series below are available as museum-quality archival fine art prints. The Sketch Series opens at ${sketchPrintPrice} — open-edition small-format prints sized for shelves and desks. The Foundation Series scales to wall presence at ${foundationPrintSizes}, currently ${foundationPrintPriceRange}. Chronicle and Legend editions are signed limited edition fine art prints with numbered certificates of authenticity — built for permanent collector walls. Every print is ready to frame. Engrained wood panel editions arrive ready to hang.\n\nBlack and white cowboy photography at this depth is not common. Most of what ranks for that term is stock. What's below is the opposite of stock — 99 authored works where every tonal decision was made in service of the specific person in the frame.`,
    conceptBlock2Title: "THE NARRATIVE",
    conceptBlock2Copy: `Walk through a major Western art auction. The paintings command the room — Russell, Remington, the Taos painters. Their power comes from a specific discipline: the unresolved moment. The story held in tension. The image that makes the viewer feel the weight of what isn't shown.\n\nHemingway called it the iceberg theory. Seven-eighths of the story lives below the surface. What shows above the waterline is only what is needed to make the reader feel the full weight of what isn't shown.\n\nRemington understood the same principle in paint. A Misdeal. A card game gone wrong. The gunman already in motion. The consequence still in the air. The viewer arrives after the trigger point and before the resolution — held in the pressure of what comes next, which the image refuses to show.\n\nBlack and white is where this discipline lives most completely. Without color warmth to soften the scene, the narrative pressure has nowhere to hide. Shadow does the work that golden hour would have done in color. Silence does the work that atmosphere would have done. The story either holds or it doesn't — and if it holds, it holds longer and harder than color could.\n\nThe 142 black and white western narrative works below operate in that tradition. Frontier scenes where implication carries more weight than statement. Pictures of cowboys and frontier life where what is withheld is the point.`,
    conceptBlock3Title: "THE WALL",
    conceptBlock3Copy: `Black and white cowboy art on a wall does something color western art doesn't.\n\nColor western prints are warm. They deliver the West as most people want to remember it — golden light, open country, the romance of the frontier. They are generous images. They give everything on first viewing and ask for nothing on return visits.\n\nMonochrome works differently. The first viewing establishes the image. The second viewing goes deeper. By the tenth viewing the image has become part of the room in a way that color rarely achieves — not because it is more beautiful, but because it is less complete. It continues to ask.\n\nCollectors who live with Wayne Heim's black and white western art describe the experience consistently. The image doesn't deliver itself all at once. It releases slowly. The story in the title connects to the posture in the figure connects to the shadow in the background connects to something the viewer brings from their own experience of weight and restraint and time.\n\nThat is what black and white cowboy art built for permanence does. Not decoration. Not atmosphere. A presence on the wall that continues to work.\n\nThe Native American portrait studies below complete the monochrome collection — five works where heritage, atmosphere, and quiet authority shape images that belong in the same tradition as the cowboy portraits and narrative scenes above.\n\nEvery work in this collection is available as a museum-quality archival fine art print. Open-edition studies start at ${sketchPrintPrice} in the Sketch Series. Signed limited edition fine art prints in the Chronicle and Legend tiers come numbered with a certificate of authenticity — collector pieces built for permanence. Fine art paper prints are ready to frame. Engrained Baltic Birch wood panel prints arrive ready to hang. The same image lives in every edition — the story doesn't scale with the size.`,
    faqTitle: "Black and White Cowboy Art — Print & Collector Questions",
    faqItems: [
      {
        q: "What makes this black and white cowboy art different from western photography prints?",
        a: [
          "These are not documentary photographs converted to black and white. Each work begins as photography and is then shaped through Wayne Heim's painterly process — a method that removes the photographic surface and replaces it with tonal depth, atmospheric restraint, and the visual weight that monochrome demands. The result reads closer to a painted work than a photograph, while retaining the specific human presence that only a camera captures.",
        ],
      },
      {
        q: "What is black and white cowboy photography built for collectors?",
        a: [
          `Most black and white cowboy photography is stock — images made to be licensed, not lived with. The works in this collection are the opposite. Each image is an authored work with a narrative, collector notes, and edition structure. The Sketch Series opens at ${sketchPrintPrice} for small-format prints. The Chronicle and Legend editions are signed, numbered, and built for permanent walls with certificate of authenticity.`,
        ],
      },
      {
        q: "How does black and white western art work in modern interiors?",
        a: [
          "Monochrome western art works in rooms where color prints would compete with existing palettes. The tonal restraint of black and white cowboy art makes it compatible with contemporary, transitional, and traditional interiors alike — lodge walls, office spaces, ranch interiors, and collector walls where the work needs to hold presence without dominating color decisions.",
        ],
      },
      {
        q: "Are these black and white cowboy art prints museum quality?",
        a: [
          "Yes. All prints in this collection are produced on museum-quality archival paper using archival inks for superior fade resistance and long-term color stability. Open-edition Sketch and Foundation Series prints are ready to frame. Signed limited edition Chronicle and Legend Series prints are numbered and accompanied by a certificate of authenticity — the standard for fine art collector pieces intended for permanent display. Engrained Baltic Birch wood panel editions arrive ready to hang.",
        ],
      },
      {
        q: "What sizes are available for black and white cowboy prints?",
        a: [
          `The Sketch Series opens at ${sketchPrintSizes} prints from ${sketchPrintPrice}. The Foundation Series covers ${foundationPrintSizes}. The Chronicle Series offers signed limited editions at ${chroniclePrintSizes}. The Legend Series offers ultra-limited statement works at ${legendPrintSizes}. Substrate options include fine art paper and Baltic Birch wood panels.`,
        ],
      },
      {
        q: "Where should I start if I'm new to this black and white western art collection?",
        a: [
          `Start with the cowboy portrait section for direct human presence and character studies. Move into the narrative section for frontier scenes with story tension and implied action. The Sketch Series at ${sketchPrintPrice} is the right entry point for first-time collectors — the same image quality and narrative depth as the larger editions, sized for shelves and desks.`,
        ],
      },
    ],
  }),
  blackAndWhiteCowboyPhotography: makePage({
    pagePath: "/black-and-white-cowboy-photography",
    label: "Black and White Cowboy Photography",
    title: "Black and White Cowboy Photography",
    subject: "black and white cowboy portraits, frontier narrative scenes, and Native American portrait studies shaped through tonal restraint and painterly Western atmosphere",
    sections: ["blackWhiteCowboyArtPortraits", "blackWhiteCowboyArtNarratives", "blackWhiteCowboyArtNativePortraits"],
    limits: {
      blackWhiteCowboyArtPortraits: 15,
      blackWhiteCowboyArtNarratives: 15,
      blackWhiteCowboyArtNativePortraits: 15,
    },
    hero: "i-DJMTZ8z",
    heroPath: sources.cowboyBlackWhite.galleryPath,
    layoutVariant: "cinematic-concept",
    leftDock: [
      supportDock("What Makes an Image Feel Cinematic?", "/Blog/what-makes-an-image-feel-cinematic", blogThumbs.cinematic),
      supportDock("What Is Narrative Photography?", "/Blog/what-is-narrative-photography", "/img/i-HfQ5NVR/s.jpg"),
      supportDock("Narrative Western Art vs Traditional Western Art", "/Blog/narrative-western-art-vs-traditional", "/img/i-LmpRvHw/s.jpg"),
    ],
    rightDock: [
      supportDock("Can Photography Be Narrative Western Art?", "/Blog/can-photography-be-narrative-western-art", "/img/i-7Mzzbvp/s.jpg"),
      supportDock("When the Medium Disappears", "/Blog/when-the-medium-disappears", "/img/i-qMQf7b6/s.jpg"),
      supportDock("What Is the One-Image Movie?", "/Other/One-Image-Movie", "/img/i-B7ZSdfs/s.jpg"),
    ],
    dockCoreCount: 0,
    centerDock: [],
    currentDockTitle: "Narrative Story Library",
    archiveUrl: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West",
    archiveName: "Wild West",
    categoryCrumb: { href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West", name: "Wild West" },
    seoTitle: "Black and White Cowboy Photography – Fine Art Prints by Wayne Heim | K4 Studios",
    seoDescription: `Black and white cowboy photography by Wayne Heim — 246 monochrome western works. Cowboy portraits, frontier narrative scenes, and Native American studies. Museum-quality archival fine art prints from ${sketchPrintPrice}. Signed limited editions with certificate of authenticity.`,
    commercialH1: "The Collection — Three Monochrome Series, 246 Works",
    deck: "246 black and white western photographs — cowboy portraits, frontier narrative scenes, and Native American portrait studies organized for collectors, rooms, and tonal decisions.",
    gatewayKicker: "K4 STUDIOS — BLACK AND WHITE COWBOY PHOTOGRAPHY",
    gatewayIntroCopy: "Not monochrome for atmosphere. Monochrome because color would lie.",
    gatewaySupportingCopy: `Search "black and white cowboy photography" and the results divide cleanly into two categories. Stock photography — cowboys in hats, riders at sunset, rope work and rodeo, images made to be licensed and placed. And fine art western photography — Jess Lee, Stoecklein, a handful of others — images made to be lived with. The gap between those two categories is not technical. It is intentional.\n\nWayne Heim's black and white cowboy photography begins as photography and is then shaped through a painterly process that removes the documentary surface — the sharpness, the photographic clarity, the sense of captured moment — and replaces it with tonal depth, atmospheric restraint, and the visual weight that monochrome demands. The result carries human presence in the way painted Western portraiture does, while retaining what only a camera can capture — the specific person, the specific moment, the specific weight of a real face in real light.\n\nThese are museum-quality archival fine art prints. Open-edition studies from ${sketchPrintPrice} through signed limited edition fine art prints with numbered certificates of authenticity. Fine art paper prints are ready to frame. Engrained Baltic Birch wood panel editions arrive ready to hang.`,
    archiveContextCopy: `Every work on this page is available as a fine art print — archival paper or wood — with the Sketch Series opening at ${sketchPrintPrice}. For the full crawlable browse set, open the <a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White/all#collection-browser">black and white cowboy photos</a> gallery. Click into any image to read the story, compare print options, sizes, and collector details. Questions about a specific piece? Reach Wayne directly at <a href='mailto:wayne@k4studios.com'>wayne@k4studios.com</a>.`,
    collectionIntro: "",
    gridIntroTitle: "The Collection",
    gridIntroCopy: "Black and white cowboy photography at K4 Studios is built around restraint: faces, posture, weathered clothing, window light, frontier interiors, and the tonal pressure that remains when color is removed.\n\nStart with the cowboy portrait section when the work needs human gravity and direct presence. Move into the narrative section for old-West tension and story-led scenes. Continue into the Native American portrait section for monochrome work shaped by atmosphere, heritage, and quiet authority.\n\nSize, substrate, and edition details are inside each image page.",
    conceptBlock1Title: "THE PROCESS",
    conceptBlock1Copy: `Most black and white cowboy photography is a color photograph with the saturation removed. The conversion is technical. The image loses color and gains nothing in return — it becomes a gray version of what it was, without the warmth that made the color version work and without the tonal architecture that makes genuine black and white photography hold.\n\nGenuine black and white western photography is conceived in monochrome. The lighting decisions, the compositional choices, the moment selected — all of them are made for what the absence of color demands rather than what color would have delivered.\n\nWayne Heim's process goes further than that. After the photograph is made, it enters a painterly shaping process that works the tonal range the way a painter works value — building shadow where shadow earns presence, lifting light where light needs to pull the eye, removing photographic detail where detail would compete with what the image is actually about. The result is black and white cowboy photography that reads the way the best western painted portraiture reads — with weight, restraint, and the sense that the image knows exactly what it is withholding.\n\nThe 99 cowboy portrait works below are the direct product of that process. Each is available as a museum-quality archival fine art print — open-edition Sketch and Foundation Series prints ready to frame, signed limited edition Chronicle and Legend Series prints numbered with a certificate of authenticity for permanent collector walls. Engrained wood panel editions arrive ready to hang.`,
    conceptBlock2Title: "THE TRADITION",
    conceptBlock2Copy: `Black and white western photography has a lineage that most practitioners don't acknowledge and most collectors don't know exists.\n\nEdward Curtis spent thirty years making monochrome portraits of the American West at the turn of the twentieth century. His images hold because he understood that black and white photography in the western landscape is not a documentary medium — it is an interpretive one. The removal of color forces every decision about light, shadow, and composition to carry more weight than it would in color. The photographer cannot rely on the seduction of the western palette. The image has to work on structure alone.\n\nAnsel Adams understood the same principle in landscape. His Zone System was not a technical exercise — it was a method for controlling exactly how much tonal information an image reveals and withholds, building images that hold the viewer in sustained engagement rather than delivering everything at once.\n\nThe fine art black and white photography tradition that Curtis and Adams represent is not widely practiced in contemporary western cowboy photography. Most of what occupies that space is decorative — technically accomplished, tonally flat, and closed on first viewing.\n\nThe 142 black and white western narrative works below operate in the Curtis and Adams tradition — images built for sustained engagement, where what is withheld carries as much weight as what is shown. Frontier scenes, cowboy life, and western character studies where the monochrome discipline is the point rather than the filter.`,
    conceptBlock3Title: "THE COLLECTOR",
    conceptBlock3Copy: `Fine art black and white photography collects differently than color photography.\n\nColor fine art prints are immediate. They deliver the western landscape or the cowboy subject with warmth, atmosphere, and visual seduction. They work on first viewing and continue to work the same way on every subsequent viewing. They are generous acquisitions — beautiful, consistent, and stable in what they offer.\n\nMonochrome fine art prints are slower. The first viewing establishes the image. The second goes deeper into the tonal structure. By the tenth viewing the image has entered the room in a way that color rarely achieves — not because it is more beautiful, but because it continues to ask questions that the viewer answers differently each time.\n\nCollectors of serious black and white western photography describe this consistently. The image releases slowly. The relationship between what is shown and what is withheld continues to shift with the viewer's own experience. This is what distinguishes a collected fine art print from a decorated wall — the work continues to work.\n\nWayne Heim's black and white cowboy photography is available in four edition tiers designed for different collecting intentions. The open-edition Sketch Series at ${sketchPrintPrice} is the right entry point — museum-quality prints sized for shelves, desks, and introductory collecting. The Foundation Series scales to wall presence. The signed limited edition Chronicle and Legend Series prints are numbered, accompanied by a certificate of authenticity, and built for permanent collector walls. Fine art paper prints are ready to frame. Engrained Baltic Birch wood panel editions arrive ready to hang.\n\nThe five Native American portrait studies below complete the monochrome collection — works where heritage, atmosphere, and quiet authority shape images that belong in the same fine art black and white photography tradition as the cowboy portraits and narrative scenes above.`,
    faqTitle: "Black and White Cowboy Photography — Print & Collector Questions",
    faqItems: [
      {
        q: "What makes this black and white cowboy photography different from western photography prints?",
        a: [
          "These are not documentary photographs converted to black and white. Each work begins as photography and is then shaped through Wayne Heim's painterly process — building tonal depth, atmospheric restraint, and the visual weight that genuine monochrome demands. The result reads closer to fine art western painted portraiture than stock photography, while retaining the specific human presence that only a camera captures.",
        ],
      },
      {
        q: "Are these limited edition fine art prints?",
        a: [
          `The collection offers both open and limited editions. The Sketch and Foundation Series are open-edition museum-quality archival fine art prints starting at ${sketchPrintPrice}. The Chronicle and Legend Series are signed limited edition fine art prints — numbered and accompanied by a certificate of authenticity — built for permanent collector walls.`,
        ],
      },
      {
        q: "How does black and white western photography work in modern interiors?",
        a: [
          "Monochrome western photography works in rooms where color prints would compete with existing palettes. The tonal restraint of black and white cowboy photography makes it compatible with contemporary, transitional, and traditional interiors alike — lodge walls, office spaces, ranch interiors, and collector walls where the work needs to hold presence without dominating color decisions.",
        ],
      },
      {
        q: "What print sizes and substrates are available?",
        a: [
          `The Sketch Series opens at ${sketchPrintSizes} fine art prints from ${sketchPrintPrice}. The Foundation Series covers ${foundationPrintSizes}. The Chronicle Series offers signed limited editions at ${chroniclePrintSizes}. The Legend Series offers ultra-limited statement works at ${legendPrintSizes}. All are available on museum-quality archival fine art paper, ready to frame. Engrained Baltic Birch wood panel editions arrive ready to hang.`,
        ],
      },
      {
        q: "How does Wayne Heim's process differ from other black and white western photographers?",
        a: [
          "Most black and white western photography is color photography with saturation removed. Heim's process goes further — after the photograph is made it enters a painterly shaping process that works the tonal range the way a painter works value, building shadow where shadow earns presence and removing photographic detail where detail competes with what the image is actually about. The result carries the weight of painted western portraiture while retaining the specific human presence that only photography captures.",
        ],
      },
      {
        q: "Are these black and white cowboy photography prints museum quality?",
        a: [
          "Yes. All prints are produced on museum-quality archival paper using archival inks for superior fade resistance and long-term stability. Open-edition prints are ready to frame. Signed limited edition Chronicle and Legend Series prints are numbered and accompanied by a certificate of authenticity — the standard for fine art collector pieces intended for permanent display. Engrained Baltic Birch wood panel editions arrive ready to hang.",
        ],
      },
    ],
  }),
  artOfTheWest: makePage({
    pagePath: "/Art-of-the-West",
    label: "Art of the West",
    title: "Art of the West",
    subject: "frontier narratives, cowboy portraits, Native American portrait work, and Western landscapes carried as a living artistic tradition rather than decorative frontier imagery",
    sections: ["narrativeColor", "cowboyColor", "nativeColor", "landscapeWest"],
    limits: {
      narrativeColor: 11,
      cowboyColor: 11,
      nativeColor: 11,
      landscapeWest: 11,
    },
    hero: "i-B7ZSdfs",
    heroPath: sources.narrativeColor.galleryPath,
    layoutVariant: "cinematic-concept",
    leftDock: [
      supportDock("What Is Western Art?", "/Blog/what-is-western-art", blogThumbs.westernArt),
      supportDock("Art of the American West", "/Art-of-the-American-West", "/img/i-89qzJ6S/s.jpg"),
      supportDock("Narrative Western Art vs Traditional Western Art", "/Blog/narrative-western-art-vs-traditional", "/img/i-LmpRvHw/s.jpg"),
    ],
    rightDock: [
      supportDock("What Is Painterly Photography?", "/Blog/what-is-painterly-photography", blogThumbs.painterly),
      supportDock("What Makes a Fine Art Print Worth Owning?", "/Blog/what-makes-a-fine-art-print-worth-owning", blogThumbs.finePrint),
      supportDock("What Is the One-Image Movie?", "/Other/One-Image-Movie", "/img/i-B7ZSdfs/s.jpg"),
    ],
    dockCoreCount: 0,
    centerDock: [],
    currentDockTitle: "Art of the West Reading Routes",
    archiveUrl: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West",
    archiveName: "Wild West",
    categoryCrumb: { href: "/Blog/what-is-western-art", name: "Western Art" },
    seoTitle: "Art of the West — Fine Art Prints by Wayne Heim | K4 Studios",
    seoDescription: `Art of the west as a living practice — frontier narratives, cowboy portraits, Native American portrait work, and Western landscapes by Wayne Heim. The tradition continues. Prints from ${getFormattedLowestStandardPrintPrice()}.`,
    commercialH1: "Four Working Routes Through the Tradition",
    deck: "Frontier narratives, cowboy portraits, Native American portrait work, and Western landscapes organized as the living field behind the phrase.",
    collectionIntro: "",
    catalogSectionKicker: "{sectionCount} works in series",
    gatewayKicker: "K4 STUDIOS — ART OF THE WEST",
    gatewayIntroCopy: "Magazines write about it, museums preserve it and collectors carry it forward.",
    gatewaySupportingCopy: `Search \"art of the west\" and you find magazines, museums, and galleries holding Remington, Russell, and Bierstadt in high regard. You find institutional definitions, curated collections, and the long historical record of Western fine art.

All of that is the record of a tradition.

But art of the west is also a literal phrase — and its literal meaning is larger than any magazine or museum can hold. It names the artistic field shaped by the American West itself: the land, the people who endured it, the histories that preceded and followed the frontier myth, and the long effort by serious artists to recover human weight from all of it.

  * Wayne Heim and his unique painterly photography work was featured in Art of the West Magazine's March/April 2026 issue. This page is that work.`,
    conceptBlock1Title: "WHAT THE PHRASE ORIGINALLY NAMED",
    conceptBlock1Copy: `Before art of the west became a market category, it named something with philosophical weight — the serious artistic effort to understand the American West on its own terms rather than through legend alone.

The West was not built by symbols. It created them. The rider on the horizon, the weathered face, the frontier town, the empty distance — all of these images came after real labor, risk, endurance, loss, and reinvention. Art of the West becomes serious when it remembers the human structure beneath the legend rather than trading in the legend itself.

Remington understood this. His most powerful images are not the spectacular ones — the cavalry charges, the buffalo hunts rendered with technical bravado. They are the quiet ones. A single figure at dusk. A card game paused at the moment of decision. A rider crossing open ground toward something not yet visible. The consequence not yet arrived.

Russell understood the same thing differently. His West was a place where people were trying to survive — Indigenous and settler, cowboy and laborer — under conditions that demanded more than spectacle could carry. The images that endure from both artists are the ones where the human structure beneath the legend is still visible.

The frontier narrative works below are built in that register. Not the spectacular West. The pressured West — where something has already happened and something else is still arriving.`,
    conceptBlock2Title: "THE TRADITION AND WHAT HAPPENED TO IT",
    conceptBlock2Copy: `Walk through a major Western art auction today. The historical section holds the tradition intact — Russell, Remington, the Taos painters, Wyeth. Work where human consequence and narrative restraint carried the image beyond its subject.

Then look at the contemporary section. Landscapes of extraordinary technical accomplishment. Portraits rendered with photographic precision. Cowboys and horses and open range captured at the peak of golden hour light.

Beautiful. Accomplished. And largely closed — images that deliver everything on first viewing and ask nothing in return.

The narrative discipline that made Russell and Remington matter — the withheld moment, the story held in tension, the image that presses the viewer to feel the weight of what isn't shown — largely disappeared from contemporary Western art. What replaced it was heroic spectacle and decorative frontier imagery dressed in the language of fine art.

Spielberg collected fifty Rockwell paintings because, in his words, Rockwell had \"a great deal of respect for how he could tell stories in a single frozen image. Entire stories.\" That discipline — the Hemingway iceberg applied to paint and then to photography — is what Wayne Heim's cowboy portrait work attempts to carry forward.

Not the icon. The person inside the icon. Not the hat and the horse and the horizon. The character who has lived long enough to carry the weather of a life in their face.`,
    conceptBlock3Title: "THE WEST THE LEGEND EXCLUDED",
    conceptBlock3Copy: `Art of the west is only a serious phrase when it acknowledges what the legend left out.

The frontier myth was built around specific figures — the Anglo cowboy, the settler, the lawman, the outlaw. These figures are real and their stories matter. But the American West was never only their story. Indigenous nations had already shaped this land for thousands of years before the frontier arrived. Their presence, continuity, and cultural depth are not a footnote to Western art. They are its foundation.

Russell knew this better than most of his contemporaries. He spent years among the Blackfoot people. His images of Indigenous life carry a witness quality that most frontier painters didn't attempt — not the noble savage of romantic imagination, but people living with the full complexity of their own cultural reality.

The Native American portrait work at K4 Studios follows that discipline. These are not images of types or symbols. They are portraits of specific human presence — held with painterly restraint, authored respect, and the understanding that this story is older, deeper, and more continuous than the frontier myth that briefly overlaid it.

Art of the west that excludes this ground is telling only part of the story. The part that was easier to mythologize.`,
    conceptBlock4Title: "THE LAND AS EMOTIONAL GEOGRAPHY",
    conceptBlock4Copy: `Bierstadt painted the Rockies as the equal of the European Alps — panoramic, sublime, overwhelming in scale. The West as spectacle. The land as argument for American grandeur.

That tradition produced extraordinary images. It also produced a way of seeing Western landscape as scenery rather than as emotional territory — as backdrop for human stories rather than as active participant in them.

The stronger Western landscape tradition treats the land differently. Not as scenery but as pressure — the geography that shaped every decision, tested every endurance, and outlasted every human attempt to master it. The Tetons don't announce themselves. They wait. Weather moves through mountain country without asking permission. Distance in the American West is not picturesque. It is a fact that changes how people think and what they can survive.

Wayne Heim's landscape work attempts to hold that quality. Open country where the sky is not decoration but atmosphere. Mountains that carry scale and endurance rather than grandeur alone. Water that moves with consequence rather than beauty alone.

Landscape as emotional geography. Not the West as backdrop. The West as the thing itself — shaping everything that happens in front of it.`,
    collectingKicker: "The Collection",
    collectingTitle: "The Collection — Four Print Series",
    collectingCopy: `Art of the west as a living practice is available as fine art prints across four series.

The Sketch Series opens at ${getFormattedLowestStandardPrintPrice()} — 5×7 archival prints sized for shelves, desks, and introductory collecting. The Foundation Series moves into larger open-edition archival works. The Chronicle Series offers signed limited editions with numbered certificates for collectors who want documented provenance. The Legend Series is ultra-limited — statement works for permanent collector walls.

The tradition that Russell and Remington established and that serious Western collectors have been building around for generations is available as fine art prints. Starting at ${getFormattedLowestStandardPrintPrice()}. Built to last.`,
    archiveContextCopy: "",
    cornerstoneVariant: "post",
    faqItems: [
      {
        q: "What is art of the west?",
        a: [
          "Art of the west names the serious artistic tradition rooted in the American West — its land, people, histories, and the long effort to recover human weight from the frontier legend. It includes painting, sculpture, and photography from the frontier period through today, covering cowboy portraits, Native American portrait work, frontier narratives, and Western landscapes. At K4 Studios it means authored fine art photography built in the tradition of Remington, Russell, and the Western narrative painters.",
        ],
      },
      {
        q: "What is the One-Image Movie and how does it relate to the Western art tradition?",
        a: [
          "The One-Image Movie is Wayne Heim's term for a narrative architecture where image, title, authored story, and deliberate incompleteness work together to pull the viewer past the frame's edge. It draws from the same discipline as Remington's most powerful paintings — the withheld moment, the story held in tension, the consequence not yet arrived. The medium is photography. The narrative intent is the same tradition.",
        ],
      },
      {
        q: "How does Wayne Heim's work relate to the Russell and Remington tradition?",
        a: [
          "Remington and Russell built the visual language of the American West around narrative restraint — the withheld moment, the story held in tension, the image that makes the viewer feel the weight of what isn't shown. Wayne Heim's work draws from that same discipline through a camera-based painterly process. The medium is different. The narrative intent and the authorship standard are the same.",
        ],
      },
      {
        q: "What subjects does this collection cover?",
        a: [
          "Four subject areas — frontier narrative scenes, cowboy portraits, Native American portrait work, and Western landscapes. Each carries a distinct emotional register while drawing from the same tradition of authored Western fine art. The full collection routes into deeper gallery pages for each subject.",
        ],
      },
      {
        q: "What makes this different from decorative Western art?",
        a: [
          "Decorative Western art uses frontier symbols as shorthand. Art of the west at K4 Studios treats the West as human territory — the land as emotional geography, the people as characters under pressure, the stories as unresolved narratives the viewer is asked to complete. Every image carries a title, an authored story, and a deliberate incompleteness that makes the work function differently on a wall over time.",
        ],
      },
      {
        q: "Are these prints available as limited editions?",
        a: [
          `Yes. The Chronicle Series offers signed limited editions with numbered certificates. The Legend Series is ultra-limited — very small runs for collectors who want documented provenance and permanent wall placement. Open-edition Sketch and Foundation works are available starting at ${getFormattedLowestStandardPrintPrice()}.`,
        ],
      },
      {
        q: "What print formats are available?",
        a: [
          "Every image is available as archival paper or wood — including the Engrained Series on Baltic Birch panels. The Engrained Series is particularly suited to Western subject matter — the natural wood grain adds material presence and a sense of permanence that complements the historical weight of the work. Size and edition details are inside each image page.",
        ],
      },
      {
        q: "Where should I start?",
        a: [
          `Start with the subject that carries the most personal weight. Frontier narrative for story-driven atmosphere where the One-Image Movie pulls you past the frame's edge. Cowboy portrait for direct human presence and frontier character. Native American portrait work for historically grounded restraint and deeper foundations. Western landscape for open country and emotional geography. The Sketch Series at ${getFormattedLowestStandardPrintPrice()} is the right entry point. For help choosing, reach Wayne at <a href='mailto:wayne@k4studios.com'>wayne@k4studios.com</a>.`,
        ],
      },
    ],
  }),
  wildWestArt: makePage({
    pagePath: "/wild-west-art",
    label: "Wild West Art",
    title: "Wild West Art - Fine Art Prints by Wayne Heim",
    subject: "frontier narrative scenes, cowboy portraits, Native American portrait work, and old-West imagery shaped beyond costume and cliche",
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
    layoutVariant: "cinematic-concept-series-top",
    commercialH1: "Six Routes Through Wild West Art",
    seoTitle: "Wild West Art - Frontier Fine Art Prints by Wayne Heim",
    seoDescription:
      `Wild West art prints by Wayne Heim. Frontier narratives, cowboy portraits, old-West scenes, and Native American portrait work shaped as collector-grade fine art prints from ${sketchPrintPrice}.`,
    deck:
      "Six series, {catalogImageCount} works: frontier narrative scenes, cowboy portraits, black and white old-West studies, and Native American portrait work organized for collectors looking for Wild West art with story, consequence, and human presence.",
    gatewayKicker: "K4 Studios - Wild West Art",
    gatewayIntroCopy:
      "Wild West art only matters when the phrase points past costume and cliche.",
    gatewaySupportingCopy:
      `The words Wild West carry atmosphere before they carry precision. They can mean frontier artwork, old western art, vintage cowboy art, Western pictures, or a room that needs the pressure of the old frontier without sliding into novelty decor. The stronger route is not to reject the phrase. It is to deepen it until the search lands on work with human stakes.\n\nWayne Heim's Wild West art is built from frontier narratives, cowboy portraits, black and white old-West studies, and historically grounded Native American portrait work. The images begin as photography, then move through a painterly process that slows the scene down: confrontation, aftermath, weathered posture, silence, restraint, and the unresolved moment that keeps the viewer inside the image.\n\nFor this Wild West route, the entry point stays accessible while the collector path remains intact: Sketch Series studies begin at ${getFormattedLowestStandardPrintPrice()}, with larger archival paper prints available through the standard K4 print structure. When a specific image needs provenance, selected Chronicle and Legend editions add signed numbering and a certificate. A smaller group of historically charged pieces can move onto natural Baltic Birch through the Signature Engrained Series, where the surface gives the old-West subject more physical age.`,
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    titles: {
      narrativeColor: "Color Wild West Narrative Art",
      narrativeBlackWhite: "Black and White Wild West Narrative Art",
      cowboyColor: "Color Wild West Cowboy Portraits",
      cowboyBlackWhite: "Black and White Old-West Cowboy Portraits",
      nativeColor: "Native American Western Portrait Art",
      nativeBlackWhite: "Black and White Native American Portrait Art",
    },
    descriptions: {
      narrativeColor:
        "Start with color Wild West narrative scenes when the wall needs confrontation, aftermath, warm atmosphere, and the sense that the story continues beyond the frame.",
      narrativeBlackWhite:
        "Black and white Wild West narratives remove the seduction of color and leave shadow, silence, and implication to carry the frontier pressure.",
      cowboyColor:
        "Color cowboy portraits bring human gravity into the collection: weathered faces, stance, clothing, light, and character strong enough to hold a wall.",
      cowboyBlackWhite:
        "Black and white cowboy portraits are the old-West register at its most restrained, built around face, posture, tone, and the pressure of what remains unsaid.",
      nativeColor:
        "Native American portrait work widens the Wild West beyond cowboy shorthand, bringing heritage, presence, and historical gravity into the collector route.",
      nativeBlackWhite:
        "Black and white Native American portraits are the stillest works here, where cloth, face, tone, and quiet authority carry the historical weight.",
    },
    conceptBlock1Title: "THE PHRASE AND THE PRESSURE",
    conceptBlock1Copy:
      "Wild West art is one of those phrases people use because they know the feeling before they know the category. It may mean old Western art, vintage cowboy art, frontier artwork, Western pictures, or a scene that feels older than the room around it.\n\nThe phrase becomes useful only when it points past the obvious signs: hats, horses, guns, dust, saloons, and weathered wood. Those details can establish the period, but they cannot carry the work by themselves. The image has to contain pressure: a decision, a silence, a conflict, a person, or a consequence still unresolved.",
    conceptBlock2Title: "THE FRONTIER WITHOUT COLOR",
    conceptBlock2Copy:
      "Color can make the Wild West generous. It gives warmth, dust, sky, firelight, clothing, and atmosphere. Black and white asks a harder question: does the scene still hold when those gifts are removed?\n\nMonochrome frontier narratives work when the structure is strong enough to survive without color. Shadow replaces golden light. Silence replaces warmth. The story has to come from posture, distance, smoke, doorway, gesture, and the part of the scene the image refuses to explain.",
    conceptBlock3Title: "THE COWBOY AS PERSON",
    conceptBlock3Copy:
      "Cowboy imagery is easy to recognize and hard to make serious. The hat can become the whole subject if the portrait does not push past type. Strong Wild West portrait work has to return the cowboy to personhood: age, fatigue, humor, suspicion, pride, regret, or the guarded stillness of someone who has lived with consequence.\n\nWayne Heim's color cowboy portraits use painterly light and period detail, but the point is not costume. The point is presence. These works belong where the wall needs a figure that can hold attention without explaining himself.",
    conceptBlock4Title: "THE OLD-WEST REGISTER",
    conceptBlock4Copy:
      "Black and white cowboy portraits lean into the older register of the frontier. Without color, the viewer reads face, brim shadow, clothing texture, hands, and posture with fewer distractions.\n\nThis is where Wild West art moves closest to memory rather than scene. The image does not need to announce the West loudly. It can hold the room through restraint, tonal weight, and a specific person caught in a moment that feels unfinished.",
    conceptBlock5Title: "THE WIDER FRONTIER",
    conceptBlock5Copy:
      "The Wild West cannot be reduced to cowboy mythology without losing its foundation. Native American portrait work changes the room immediately because it carries a different historical gravity: heritage, presence, displacement, endurance, and authority that predate the frontier legend.\n\nPlaced inside this collection, these works keep the page from becoming only a cowboy route. They widen the subject and remind the viewer that the West was never a single story told from one side of the saddle.",
    conceptBlock6Title: "THE STILLER AUTHORITY",
    conceptBlock6Copy:
      "Black and white Native American portraits are the quietest frontier works on this page. They do not rely on color atmosphere or narrative action. The pressure comes from face, cloth, tonal restraint, and the authority of stillness.\n\nThese prints belong where the collector wants the Wild West collection to end with gravity rather than spectacle. They hold the historical ground beneath the myth and give the page a final register of presence.",
    archiveContextTitle: "Browse the Wild West Art Collection",
    archiveContextCopy:
      "Wild West art at K4 Studios is organized by six collector routes: color frontier narratives, black and white frontier narratives, color cowboy portraits, black and white cowboy portraits, Native American portrait work, and black and white Native American portraits.\n\nClick into a piece when the subject starts to hold: each image page gives the story, available sizes, print path, and collector notes so the choice can move from broad Wild West mood to one specific work. Questions about a specific Wild West print? Contact wayne@k4studios.com.",
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
    layoutVariant: "cinematic-concept-series-top",
    commercialH1: "Cowboy Pictures with Character, Not Stock Western Signals",
    seoTitle: "Cowboy Pictures - Western Fine Art Prints by Wayne Heim",
    seoDescription:
      `Cowboy pictures by Wayne Heim. Cowboy portraits, black and white cowboy images, frontier scenes, and Western fine art prints from ${sketchPrintPrice}.`,
    deck:
      "Four cowboy picture routes, {catalogImageCount} works: color portraits, black and white cowboy images, color frontier scenes, and monochrome Western stories for visual browsing and print selection.",
    gatewayKicker: "K4 Studios - Cowboy Pictures",
    gatewayIntroCopy:
      "Cowboy pictures are easy to recognize. The hard part is making one worth returning to.",
    gatewaySupportingCopy:
      `The search is broad: cowboy pictures, cowboy photos, cowboy images, Western portraits, maybe something for a wall. Most pages answer that with volume. This page answers it with subject pressure: the face, the posture, the weathered clothing, the horse, the room, the silence, and the story implied by the frame.\n\nWayne Heim's cowboy pictures begin as photography and move through a painterly process so the finished work behaves like Western art rather than stock imagery. The page is organized for quick visual discovery, but each image opens into story, print options, scale, and collector details.\n\nSketch Series studies begin at ${getFormattedLowestStandardPrintPrice()}, with larger archival paper prints and selected signed editions available when the picture earns permanent wall space.`,
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    titles: {
      cowboyColor: "Color Cowboy Pictures",
      cowboyBlackWhite: "Black and White Cowboy Pictures",
      narrativeColor: "Color Western Cowboy Scene Pictures",
      narrativeBlackWhite: "Black and White Western Cowboy Scenes",
    },
    descriptions: {
      cowboyColor:
        "Start with color cowboy pictures when the image needs immediate human presence: face, clothing, horse, weather, and warm Western atmosphere.",
      cowboyBlackWhite:
        "Black and white cowboy pictures remove the easy pull of color so the subject has to hold through tone, posture, face, and restraint.",
      narrativeColor:
        "Color Western scenes move the cowboy picture toward story, with setting, motion, light, and consequence doing more than portrait work alone.",
      narrativeBlackWhite:
        "Black and white Western cowboy scenes are the quietest route, built around shadow, implication, and old-West pressure.",
    },
    conceptBlock1Title: "THE QUICK READ",
    conceptBlock1Copy:
      "A cowboy picture has to pass the quick visual test: the viewer should understand the subject immediately. But if the image stops there, it becomes interchangeable. Color portraits below provide the quick read while keeping the person specific.",
    conceptBlock2Title: "THE OLDER REGISTER",
    conceptBlock2Copy:
      "Black and white cowboy pictures lean closer to memory. Without color, the image depends on face, hat brim, fabric, and tonal structure. That restraint keeps the cowboy from becoming a bright decorative symbol.",
    conceptBlock3Title: "THE SCENE AROUND THE FIGURE",
    conceptBlock3Copy:
      "A cowboy picture becomes more durable when the world around the figure matters. The scene adds road, dust, room, horse, weapon, weather, and the unresolved situation that turns a picture into a story.",
    conceptBlock4Title: "THE QUIET FRAME",
    conceptBlock4Copy:
      "Monochrome Western scenes work when the wall needs less color and more gravity. These images slow the category down so the viewer has to read the pressure rather than consume the signal.",
    archiveContextTitle: "Browse Cowboy Pictures",
    archiveContextCopy:
      "Cowboy pictures at K4 Studios are organized by visual need: color portraits, black and white portraits, color Western scenes, and black and white story work. Open any image for story, print sizes, formats, and edition details.",
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
    layoutVariant: "cinematic-concept-series-top",
    commercialH1: "Old Western Art Before the West Became an Image",
    seoTitle: "Old Western Art - Frontier, Cowboy & Old West Fine Art Prints",
    seoDescription:
      `Old Western art by Wayne Heim. Frontier portraits, old-West cowboy figures, narrative scenes, and period-styled Western artwork as archival fine art prints from ${sketchPrintPrice}.`,
    deck:
      "Four old-West routes, {catalogImageCount} works: black and white cowboy portraits, color Western figures, monochrome frontier scenes, and color narratives built around the era before the modern Western image hardened into shorthand.",
    gatewayKicker: "K4 Studios - Old Western Art",
    gatewayIntroCopy:
      "Old Western art has to feel older than the costume.",
    gatewaySupportingCopy:
      `The old West was not born as nostalgia. It was labor, risk, weather, migration, violence, humor, silence, and daily decisions made before the legend had settled into posters and decor. The artwork has to carry that older pressure or it becomes only a familiar hat under familiar light.\n\nThis page leans into the visual foundation of the Western imagination: weathered cowboy figures, frontier rooms, period posture, old road stories, saloon light, monochrome restraint, and color scenes that feel closer to early Western illustration and dime-novel memory than to modern ranch lifestyle imagery. The goal is not to imitate antique prints. The goal is to recover the emotional charge of the era that made those images matter.\n\nWayne Heim's old Western art begins as photography and is shaped through painterly finishing so the final image reads as authored artwork rather than a straight period picture. Sketch Series studies begin at ${getFormattedLowestStandardPrintPrice()}, with archival paper prints, selected signed limited editions, and some Engrained natural Baltic Birch panels available when the material surface strengthens the historical feel.`,
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    titles: {
      cowboyBlackWhite: "Black and White Old Western Cowboy Art",
      cowboyColor: "Color Old Western Portrait Art",
      narrativeBlackWhite: "Black and White Old West Story Art",
      narrativeColor: "Color Old West Narrative Art",
    },
    descriptions: {
      cowboyBlackWhite:
        "Start here for the oldest register: face, brim shadow, worn clothing, posture, and black and white tone carrying the cowboy before color turns him decorative.",
      cowboyColor:
        "Color portrait art brings warmth back into the older Western figure, using period styling, painterly light, and human presence without sliding into modern ranch decor.",
      narrativeBlackWhite:
        "Black and white story scenes work when the old-West feeling needs silence, consequence, and a sense of history withheld just outside the frame.",
      narrativeColor:
        "Color old-West narratives carry the page into frontier atmosphere: dust, rooms, roads, warm light, and scenes that feel tied to the storytelling roots of Western art.",
    },
    conceptBlock1Title: "THE ERA BEFORE THE ICON",
    conceptBlock1Copy:
      "The cowboy figure became clean and repeatable once the West became a national image. Old Western art works best before that polish arrives. The figures need rougher edges: practical clothing, guarded faces, imperfect rooms, and the feeling that the person in the image has not yet become a symbol.",
    conceptBlock2Title: "THE COLOR OF MEMORY",
    conceptBlock2Copy:
      "Color can make old Western subjects feel theatrical, so it has to be controlled. The color portrait works below use warmth as atmosphere rather than decoration, keeping the figure grounded in period mood and character.",
    conceptBlock3Title: "THE BLACK AND WHITE STORY",
    conceptBlock3Copy:
      "Monochrome old-West scenes carry the closest relationship to early photographs, cabinet cards, newspaper memory, and frontier myth. The absence of color leaves posture, setting, and implication to do the work.",
    conceptBlock4Title: "THE LEGEND MADE VISIBLE",
    conceptBlock4Copy:
      "Color narrative work is where old Western art becomes openly imaginative. These pieces belong to the same emotional family as Western paintings, pulp covers, and frontier illustration, but they remain rooted in Wayne Heim's photographic source and painterly process.",
    archiveContextTitle: "Browse Old Western Art",
    archiveContextCopy:
      "Old Western art at K4 Studios is organized by how the era enters the room: monochrome cowboy presence, color character work, black and white story scenes, or color frontier narrative. Open any image for story, sizing, print format, and edition details.",
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
    layoutVariant: "cinematic-concept-series-top",
    commercialH1: "Vintage Cowboy Art and the Older Shape of the West",
    seoTitle: "Vintage Cowboy Art - Old-West Cowboy Prints by Wayne Heim",
    seoDescription:
      `Vintage cowboy art by Wayne Heim. Old-West cowboy portraits, period styling, black and white studies, frontier scenes, and collector fine art prints from ${sketchPrintPrice}.`,
    deck:
      "Four series, {catalogImageCount} works: vintage cowboy portraits, black and white old-West studies, color character prints, and frontier scenes built around the cowboy before the modern image took over.",
    gatewayKicker: "K4 Studios - Vintage Cowboy Art",
    gatewayIntroCopy:
      "Vintage cowboy art should not look like a modern cowboy wearing old clothes.",
    gatewaySupportingCopy:
      `The cowboy image has been polished so many times that the modern version can feel almost too familiar: high-crowned hats, clean silhouettes, fashion-ready boots, staged grit. But the older cowboy image was rougher, plainer, and stranger. Even the hat was still becoming itself. Stetson's Boss of the Plains, introduced in the late 1860s, was closer to a practical open-crown working hat than the shaped movie-West profile most people imagine today.\n\nThat distinction matters here. Wayne Heim's vintage cowboy art is built around the period feeling behind the icon: weathered faces, older hat shapes, worn clothing, guarded posture, saloon interiors, frontier silence, and the kind of character that feels closer to dime-store novel covers, early Western illustration, and old cabinet-card memory than to modern ranch branding.\n\nThe goal is not costume accuracy as trivia. The goal is to recover the first emotional charge of the cowboy figure, before he became logo, mascot, or decor shorthand. Sketch Series studies begin at ${getFormattedLowestStandardPrintPrice()}, with larger archival paper prints available through the K4 print structure and selected signed editions available for collector walls.`,
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    titles: {
      cowboyBlackWhite: "Black and White Vintage Cowboy Portraits",
      cowboyColor: "Color Vintage Cowboy Portraits",
      narrativeBlackWhite: "Black and White Old-West Cowboy Scenes",
      narrativeColor: "Color Vintage Western Cowboy Scenes",
    },
    descriptions: {
      cowboyBlackWhite:
        "Start with black and white cowboy portraits when the vintage effect needs to come from face, brim shadow, posture, and tonal restraint rather than color or surface aging.",
      cowboyColor:
        "Color cowboy portraits bring period styling into warmer room registers: worn clothing, older silhouettes, saloon light, character, and the human presence behind the icon.",
      narrativeBlackWhite:
        "Black and white frontier scenes extend the cowboy figure into old-West story. These works lean toward poster memory, dime-novel suspense, and the unresolved moment.",
      narrativeColor:
        "Color frontier narratives add atmosphere, dust, warm light, and story movement when the wall needs the broader vintage Western world around the cowboy.",
    },
    conceptBlock1Title: "THE HAT BEFORE THE COSTUME",
    conceptBlock1Copy:
      "The cowboy hat did not arrive fully formed as the modern Western silhouette. Early working hats were practical, shaped by weather and use, and the famous Boss of the Plains looked different from the later movie-West profile. Vintage cowboy art works best when it remembers that older visual awkwardness.",
    conceptBlock2Title: "THE HUMAN ICON",
    conceptBlock2Copy:
      "Color can make the cowboy figure warm, but it can also make him decorative. These portraits use light, clothing, expression, and stance to keep the figure human before he becomes symbol.",
    conceptBlock3Title: "THE STORY AROUND THE FIGURE",
    conceptBlock3Copy:
      "The vintage cowboy belongs to a story world: doorways, roads, dust, saloons, horses, weapons, choices, and consequences. Black and white frontier scenes let that world feel older and more imagined.",
    conceptBlock4Title: "THE LEGEND IN COLOR",
    conceptBlock4Copy:
      "Color frontier narratives are the most theatrical works in this route. They carry the energy of old Western paintings and pulp covers, but with K4's painterly finishing and collector print path.",
    archiveContextTitle: "Browse Vintage Cowboy Art Prints",
    archiveContextCopy:
      "Vintage cowboy art at K4 Studios is organized around the figure first: black and white cowboy portraits, color cowboy portraits, monochrome frontier scenes, and color old-West narratives. Open any image for story, sizing, print path, and collector details. Questions about a specific piece? Contact wayne@k4studios.com.",
  }),
  rusticWesternInteriorDesignArt: makePage({
    pagePath: "/Rustic-Western-Interior-Design-Art",
    label: "Rustic Western Interior Design Art",
    title: "Rustic Western Interior Design Art - Fine Art Prints by Wayne Heim",
    subject: "Engrained natural Baltic Birch panel editions, Western portraits, frontier narrative scenes, landscapes, and mountain prints selected for rustic rooms",
    sections: ["engrained", "cowboyColor", "narrativeColor", "narrativeBlackWhite", "landscapeWest", "mountains"],
    hero: "i-7Kwv8vc",
    heroPath: sources.cowboyColor.galleryPath,
    leftDock: blogDock.interiorLeft,
    rightDock: blogDock.interiorRight,
    dockCoreCount: 6,
    archiveUrl: "/Western-Interior-Design-Art",
    archiveName: "Western Interior Design Art",
    categoryCrumb: { href: "/Western-Interior-Design-Art", name: "Western Interior Design Art" },
    layoutVariant: "cinematic-concept-series-top",
    commercialH1: "Rustic Rooms, Fine Art Prints, and Engrained Options",
    seoTitle: "Rustic Western Interior Design Art - Fine Art Prints & Engrained Panels",
    seoDescription:
      `Rustic Western interior design art by Wayne Heim for lodge interiors, ranch homes, stone, leather, and raw wood rooms. Fine art prints from ${sketchPrintPrice} plus select Engrained Baltic Birch panels.`,
    deck:
      "Six series, {catalogImageCount} works: fine art prints and select Signature Engrained Series natural Baltic Birch panels - Western portraits, narratives, landscapes, and mountain studies chosen for rustic rooms, lodge interiors, ranch homes, stone, leather, raw wood, and timber.",
    gatewayKicker: "K4 Studios - Rustic Western Interior Design Art",
    gatewayIntroCopy:
      "Rustic Western interior design art should not feel applied to the room. It should feel made from the same material world.",
    gatewaySupportingCopy:
      `A rustic room already has a language: stone, leather, raw wood, timber, iron, firelight, worn surfaces, and architectural weight. The wrong Western print can sit on top of that room like decoration. The right work feels as if it belongs to the same material register.\n\nMost works on this page are available as traditional fine art prints, with the Sketch Series opening at ${getFormattedLowestStandardPrintPrice()} and signed Chronicle and Legend editions available on selected works with numbered certificates of authenticity. For collectors and designers who want something more object-based, select images are also offered in the Signature Engrained Series on natural Baltic Birch panels.\n\nEngrained is the unique rustic option. The wood grain is not hidden under the photograph. It is selectively woven into the image so the lines of the wood become visible history - an anchoring canvas for historically themed Western work. No two panels carry the same grain, which means each Engrained print becomes a one-of-a-kind object rather than a standard image on a decorative surface. For lodge interiors, ranch homes, cabins, restaurants, hospitality spaces, and rooms built around raw material texture, that presence can be the difference between a print that decorates the wall and an artwork that belongs to the room.`,
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    titles: {
      engrained: "Signature Engrained Baltic Birch Panel Art",
      cowboyColor: "Rustic Western Portrait Art",
      narrativeColor: "Color Western Narrative Art for Rustic Rooms",
      narrativeBlackWhite: "Black and White Western Art for Rustic Rooms",
      landscapeWest: "Western Landscape Art for Rustic Interiors",
      mountains: "Mountain Landscape Art for Lodge Walls",
    },
    descriptions: {
      engrained:
        "Start here for the unique rustic option. Select images are available as Signature Engrained Series natural Baltic Birch panels, where visible wood grain becomes part of the storytelling surface.",
      cowboyColor:
        "Start here when a rustic room needs a human anchor. Color cowboy portraits bring posture, character, worn fabric, and painterly light into lodge entries, ranch living rooms, dining rooms, and hospitality spaces.",
      narrativeColor:
        "Color Western narrative prints suit rooms that can carry story. Use this section when the wall needs frontier tension, warm atmosphere, and a scene that feels at home beside timber, stone, leather, and firelight.",
      narrativeBlackWhite:
        "Black and white Western narrative prints work when a rustic room already has enough color and needs restraint. Shadow, silence, and monochrome structure let the image hold presence without competing with wood tones.",
      landscapeWest:
        "Western landscape prints bring distance into heavy rustic spaces. These works open up rooms built from strong materials by giving the eye weather, horizon, and open country beyond the furniture.",
      mountains:
        "Mountain landscape prints belong on tall rustic walls, great rooms, stairwells, and fireplace elevations where the architecture already has vertical force. They add scale without adding clutter.",
    },
    conceptBlock1Title: "THE MATERIAL REGISTER",
    conceptBlock1Copy:
      "Rustic design is not just a style category. It is a material register. The room is built from surfaces that already carry weight: stone around a fireplace, leather that darkens with use, raw wood, exposed beams, iron hardware, linen, wool, and warm low light.\n\nThat is why the Engrained Series belongs first as an option to consider, not as the only format on the page. A paper print asks how the image will be framed. A natural Baltic Birch panel asks how the image will live with the room's existing materials. In Engrained pieces, the natural grain is selectively allowed to enter the image, becoming texture, age, atmosphere, and visible history. For historically themed Western work, that grain acts like an anchoring canvas - a physical reminder that the story is carried by material, not just depicted on it.",
    conceptBlock2Title: "THE HUMAN ANCHOR",
    conceptBlock2Copy:
      "Once the material decision is clear, the next question is presence. Rustic rooms often carry strong architecture, heavy furnishings, and visual weight before the artwork arrives. A color cowboy portrait can hold that room because the figure brings human gravity into the space.\n\nWayne Heim's cowboy portraits are not generic Western accents. They are character studies shaped through painterly light, posture, weathered clothing, and story pressure. In a lodge entry, ranch living room, restaurant, or hospitality wall, that human presence gives the room a center rather than another decorative surface.",
    conceptBlock3Title: "THE FRONTIER STORY",
    conceptBlock3Copy:
      "Rustic interiors can carry narrative art especially well because the room already suggests history. Wood, stone, iron, and leather all imply use, age, and memory. A Western narrative print gives that material atmosphere a human story to hold.\n\nColor frontier scenes work when the wall needs warmth, motion, and consequence. They are strongest in spaces where the viewer has time to enter the scene: dining rooms, lodge corridors, bar areas, offices, and ranch-house gathering rooms.",
    conceptBlock4Title: "THE RESTRAINT",
    conceptBlock4Copy:
      "The best rustic Western interior does not turn every wall into a theme. It balances texture with restraint. A room with heavy wood and leather may need the quiet of a black and white narrative rather than another warm color statement.\n\nMonochrome Western work gives rustic rooms pressure without visual noise. Shadow, silence, and tonal structure can sit beside strong materials without competing with them. Use this section when the room already has warmth and needs gravity.",
    archiveContextTitle: "Browse the Rustic Western Interior Design Art Collection",
    archiveContextCopy:
      "Rustic Western interior design art at K4 Studios is organized by what a material-heavy room needs first: a unique Engrained wood-panel option, human presence, frontier story, tonal restraint, open country, or mountain scale.\n\nFor rustic rooms, the image page is where material choice matters most: paper for framed placement, or selected Signature Engrained Series natural Baltic Birch panels when visible grain belongs beside stone, leather, raw wood, lodge architecture, and ranch interiors. The grain lines become part of the storytelling surface, making every Engrained print physically unique. Not sure what size or format works for your space? Contact wayne@k4studios.com for a complimentary room mockup.",
    faqItems: rusticInteriorDesignFaq,
  }),
  wwiiThemedFineArtPrints: makePage({
    pagePath: "/WWII-Themed-Fine-Art-Prints",
    label: "WWII Themed Fine Art Prints",
    title: "WWII Themed Fine Art Prints - Wayne Heim",
    subject: "World War II inspired war scenes, military machines, portraits, and historically themed fine art prints shaped around memory rather than spectacle",
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
    layoutVariant: "cinematic-concept-series-top",
    commercialH1: "War Memory, Machines, and Portraits",
    seoTitle: "WWII Themed Fine Art Prints - War, Machines & Portraits",
    seoDescription:
      `WWII themed fine art prints by Wayne Heim. War scenes, military machines, and wartime portraits shaped as historical fine art. Archival prints from ${sketchPrintPrice} plus signed limited editions.`,
    deck:
      "Six series, {catalogImageCount} works: World War II inspired fine art prints organized around wartime memory, military machines, service portraits, and historically themed scenes for collectors, history rooms, offices, and memorial walls.",
    gatewayKicker: "K4 Studios - WWII Themed Fine Art Prints",
    gatewayIntroCopy:
      "WWII themed fine art prints carry a problem ordinary war decor cannot solve: how to show history without turning it into spectacle.",
    gatewaySupportingCopy:
      `A plane, a uniform, a tank, or a battlefield pose can become decoration very quickly. The subject is recognizable, the era is familiar, and the image asks for attention before it has earned memory. Strong WWII themed fine art has to do something slower. It has to let the machinery, the clothing, the fatigue, and the human stillness point toward consequence rather than nostalgia.\n\nWayne Heim's WWII work begins with staged historical subject matter and then moves through a painterly process that changes the image from reenactment into authored fine art. Smoke, metal, cloth, posture, and facial expression are shaped for atmosphere and restraint. The goal is not to recreate a battlefield document. The goal is to make a print that can hold remembrance on a wall without becoming military poster art.\n\nThe WWII pieces are built to be chosen by level of remembrance: small Sketch Series prints from ${getFormattedLowestStandardPrintPrice()} for intimate display, archival paper editions for offices and history rooms, and selected signed Chronicle or Legend editions when the work needs collector permanence and a numbered certificate. Some images also suit the Signature Engrained Series, where natural Baltic Birch gives machinery, uniforms, and wartime atmosphere a more physical historical surface.`,
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    descriptions: {
      wwiiWarColor:
        "Start with color WWII war scenes when the wall needs atmosphere, smoke, weather, and historical pressure without losing the human scale inside the image.",
      wwiiWarBlackWhite:
        "Black and white WWII war prints remove the pull of color and leave tone, shadow, and memory to carry the scene. Use this section when restraint matters more than spectacle.",
      wwiiMachines:
        "WWII machine prints focus on aircraft, armor, vehicles, and equipment as objects with human consequence, not just mechanical subjects. These work well in offices, studies, history rooms, and collector walls.",
      wwiiMachinesBlackWhite:
        "Black and white WWII machine studies turn metal, rivets, smoke, and form into a more austere historical register. They are the quietest machine works in the collection.",
      wwiiPortraits:
        "Color WWII portrait prints bring the collection back to the individual: service, fatigue, concentration, care, and the human presence behind the uniform.",
      wwiiPortraitsBlackWhite:
        "Black and white WWII portraits are built for memory and restraint. These works rely on face, posture, fabric, and tone rather than period color.",
    },
    conceptBlock1Title: "THE MEMORY PROBLEM",
    conceptBlock1Copy:
      "War imagery can become too easy. If the aircraft is dramatic enough or the uniform is recognizable enough, the image can seem important before it has done any emotional work. That is the danger with WWII themed art: the subject can outrun the image.\n\nThe work on this page is organized around memory rather than spectacle. The scenes are historical in subject, but the print has to earn its place as fine art through atmosphere, restraint, and human consequence. A collector wall or memorial space needs more than a familiar machine. It needs an image that can continue to hold attention after recognition fades.",
    conceptBlock2Title: "THE TONAL RECORD",
    conceptBlock2Copy:
      "Black and white changes wartime imagery immediately. Color can make a scene feel cinematic, but monochrome asks whether the structure of the image can stand on its own: smoke, silhouette, weather, cloth, metal, face, and shadow.\n\nFor WWII themed fine art, monochrome works when the piece needs to feel closer to memory than action. It removes some of the visual seduction and leaves the viewer with pressure. That makes black and white war prints especially useful for rooms where the work should feel serious, reflective, and permanent.",
    conceptBlock3Title: "THE MACHINE AS ARTIFACT",
    conceptBlock3Copy:
      "Military machines are never only machines in historical art. Aircraft, vehicles, weapons, and equipment carry the pressure of the people who built them, maintained them, rode in them, feared them, and depended on them.\n\nWayne Heim's WWII machine prints treat metal as artifact rather than hardware. The painterly process slows the image down so that rivets, smoke, form, and worn surfaces point back to human consequence. For collectors of military history, this is the difference between a vehicle picture and a piece that belongs on a serious wall.",
    conceptBlock4Title: "THE HUMAN SCALE",
    conceptBlock4Copy:
      "The machine can define the era, but the portrait gives the era a face. WWII portrait prints return the collection to service, fatigue, concentration, care, and the private weight carried by individuals inside history.\n\nThese works are useful when a wall needs remembrance without machinery dominating the room. A portrait can hold a study, office, hallway, or memorial wall because it gives history an eye line. The viewer is no longer looking only at the period. The viewer is looking at a person inside it.",
    conceptBlock5Title: "THE FACE OF SERVICE",
    conceptBlock5Copy:
      "Color WWII portraits work differently from battlefield scenes and machine studies. They do not ask the viewer to admire scale. They ask the viewer to stay with a person: a nurse under pressure, a soldier carrying fatigue, a figure paused inside duty, care, or uncertainty.\n\nColor can be useful here because it restores flesh, cloth, insignia, and lived atmosphere. The image still has to avoid becoming costume. The portrait holds when period detail supports the person rather than replacing them.",
    conceptBlock6Title: "THE PORTRAIT AS REMEMBRANCE",
    conceptBlock6Copy:
      "Black and white WWII portraits move closer to remembrance. Without period color, the viewer reads face, posture, fabric, and light with fewer distractions. The result is less illustrative and more interior.\n\nThese are the quietest WWII works on the page. They belong where the wall should hold respect rather than drama: a study, hallway, office, veteran space, memorial room, or collector wall where restraint matters more than impact.",
    archiveContextTitle: "Browse the WWII Themed Fine Art Print Collection",
    archiveContextCopy:
      "WWII themed fine art prints at K4 Studios are organized by the kind of historical presence the wall needs: color war scenes, black and white war scenes, military machines, black and white machine studies, color portraits, or black and white portraits.\n\nOpen the individual artwork pages for the remembrance details: image story, available formats, scale, edition status, and whether the piece suits a private collection, history room, office, or memorial wall. Questions about a specific WWII piece or memorial wall? Contact wayne@k4studios.com.",
  }),
  womenOfTheWildWest: makePage({
    pagePath: "/women-of-the-wild-west",
    label: "Women of the American West",
    title: "Women of the American West - Fine Art Prints by Wayne Heim",
    subject: "frontier women, Western portraiture, old-West stories, and character-driven fine art prints where women carry the emotional center of the West",
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
    layoutVariant: "cinematic-concept-series-top",
    commercialH1: "Women at the Center of the Western Story",
    seoTitle: "Women of the Wild West - Western Fine Art Prints",
    seoDescription:
      "Women of the Wild West fine art prints by Wayne Heim. Frontier women portraits and narrative Western scenes shaped around strength, endurance, domestic tension, and character.",
    deck:
      "Four series, {catalogImageCount} works: frontier women portraits and narrative Western prints where women are not background figures, but the emotional center, moral pressure, and lived strength of the old West.",
    gatewayKicker: "K4 Studios - Women of the Wild West",
    gatewayIntroCopy:
      "The West is usually pictured as a man's stage. That is the first thing this collection refuses.",
    gatewaySupportingCopy:
      `Women of the Wild West were not supporting characters in the Western story. They were the overlooked half of the Western portrait tradition: workers, mothers, daughters, riders, travelers, widows, keepers of households, defenders of boundaries, and witnesses to private histories that rarely became the official myth.\n\nWayne Heim's frontier women portraits and narrative scenes are built around that missing center. The image may show a cowgirl, a wife, a daughter, a traveler, a widow, or a woman standing at the edge of an unfinished decision, but the point is not costume. The point is subjecthood. These works ask what happens when the Western portrait turns away from the familiar male icon and gives women the same visual authority, silence, pressure, and unresolved story weight.\n\nThis collection is for viewers and collectors who want frontier women treated as subjects in their own right, not as atmosphere beside the cowboy. Sketch Series studies begin at ${getFormattedLowestStandardPrintPrice()}, then scale into archival paper prints for rooms that need the figure to hold the wall. Selected works move into signed Chronicle and Legend editions with numbered certificates when the subject calls for collector treatment.`,
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    descriptions: {
      womenCowboyColor:
        "Start with color portraits when the work needs warmth, direct presence, clothing, gesture, and the human immediacy of women standing inside the Western story.",
      womenNarrativeColor:
        "Color narrative scenes place women inside moments of decision, tension, work, affection, defense, departure, and endurance. These are story-led Western prints rather than simple portraits.",
      womenCowboyBlackWhite:
        "Black and white frontier women portraits remove period color and leave posture, expression, cloth, and tone to carry the subject. Use this section when restraint matters.",
      womenNarrativeBlackWhite:
        "Black and white narrative scenes are the quietest works in the collection, built around implication, silence, and the story pressure held in a single unfinished moment.",
    },
    conceptBlock1Title: "THE MISSING CENTER",
    conceptBlock1Copy:
      "Western art has often treated women as atmosphere: a figure in a doorway, a face at the edge of the story, someone waiting for the rider to return. That is a small way to picture a large truth.\n\nFrontier women were not outside the Western story. They were often the pressure point inside it. They carried domestic labor, grief, danger, economy, faith, defense, and endurance while the public myth kept its attention on men, horses, guns, and open country. This collection begins by moving the center of gravity back toward them.",
    conceptBlock2Title: "THE STORY SHE HOLDS",
    conceptBlock2Copy:
      "A narrative image does not need to explain everything. It needs to choose the right moment: the pause before leaving, the hand on the door, the look across a fence, the figure holding herself still because the room is not safe yet.\n\nWayne Heim's women of the West scenes use that kind of withheld moment. The viewer is asked to complete what the image refuses to spell out. That is where the emotional pressure lives: not in a caption, but in posture, distance, light, and the part of the story still just outside the frame.",
    conceptBlock3Title: "THE PORTRAIT WITHOUT COSTUME",
    conceptBlock3Copy:
      "A frontier woman's portrait can fail when it becomes only period costume. Dress, hat, shawl, rifle, horse, or cabin may establish the era, but they do not create presence on their own.\n\nThe stronger portrait asks a harder question: who is this person in this moment? The answer has to come from face, stance, hand, light, and restraint. That is why these portraits are shaped less as character types and more as specific women carrying specific weight.",
    conceptBlock4Title: "THE QUIET PRESSURE",
    conceptBlock4Copy:
      "Black and white changes the women of the West collection by removing the period warmth that color can provide. What remains is quieter and often more severe: cloth, face, hand, shadow, and the emotional weight of an unresolved scene.\n\nThese monochrome works belong where the collector wants the image to keep working over time. They do not deliver the West as romance. They hold the part of the story that is harder to decorate with.",
    archiveContextTitle: "Browse the Women of the Wild West Collection",
    archiveContextCopy:
      "Women of the Wild West at K4 Studios is organized around four ways of reading frontier women in fine art prints: color portraits, color narrative scenes, black and white portraits, and black and white narrative scenes.\n\nEach image page gives the specific story and buying path for that figure or scene, including size options, print presentation, and collector notes where limited editions are available. Questions about a specific piece? Contact wayne@k4studios.com.",
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
    layoutVariant: "cinematic-concept-series-top",
    commercialH1: "Western Frontier Art: Land, People, Expansion, Consequence",
    seoTitle: "Western Frontier Art - Frontier Narrative & Portrait Prints",
    seoDescription:
      "Western frontier art by Wayne Heim. Contemporary fine art prints rooted in frontier narratives, Native American portrait work, cowboy character, landscape pressure, and old-West consequence.",
    deck:
      "Four series, {catalogImageCount} works: contemporary frontier narrative scenes, Native American portrait work, cowboy portraits, and monochrome old-West studies organized around the same questions that shaped classic Western frontier art - expansion, land, daily life, Native presence, and consequence.",
    gatewayKicker: "K4 Studios - Western Frontier Art",
    gatewayIntroCopy:
      "Western frontier art began as a record of expansion. It matters now when it becomes a reckoning with what expansion cost.",
    gatewaySupportingCopy:
      `The historical frame for Western frontier art is broad: paintings, prints, illustrations, museum collections, wagon trains, cavalry scenes, mountain spectacle, Manifest Destiny, Native American life, and the artists who shaped the visual language of the American West - Remington, Russell, Bierstadt, Moran, Catlin, and others.\n\nThat is the right starting point. But the strongest contemporary frontier work cannot simply repeat the old imagery. The frontier was a pressure line between settlement and uncertainty, myth and cost, motion and consequence, belonging and displacement. If the image only shows a dusty street, a horse, a hat, or a distant ridge, it identifies the West without earning the subject.\n\nWayne Heim's Western frontier art is a contemporary photographic continuation of that art-history conversation. The images begin as photography, then move through a painterly finishing process that shapes light, posture, atmosphere, and withheld story into fine art prints. For collectors, ranch homes, offices, lodges, and hospitality spaces, this page is the historical-pressure route: frontier art built around land, people, expansion, Native presence, daily life, and consequence rather than decorative nostalgia.`,
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    titles: {
      narrativeColor: "Color Western Frontier Art",
      nativeColor: "Native American Frontier Portrait Art",
      cowboyColor: "Cowboy Portraits of Frontier Life",
      narrativeBlackWhite: "Black and White Frontier Art",
    },
    descriptions: {
      narrativeColor:
        "Start with color frontier narrative scenes when the page needs the classic frontier-art ingredients - dramatic light, expansion, daily life, tension, and the sense that consequence is entering the scene.",
      nativeColor:
        "Move into Native American portrait work for the part of frontier art the old myth often pushed to the edge: Indigenous presence, heritage, displacement, continuity, and human authority.",
      cowboyColor:
        "Continue into cowboy portraits when the subject turns toward daily frontier life: working figures, weathered faces, posture, clothing, and the person beneath the familiar Western type.",
      narrativeBlackWhite:
        "End with black and white frontier scenes when color would soften the pressure. Monochrome leaves shadow, silence, distance, and implication to carry the historical weight.",
    },
    conceptBlock1Title: "THE 19TH-CENTURY RECORD",
    conceptBlock1Copy:
      "Classic Western frontier art was never only about cowboys. It documented and mythologized the 19th-century American West: settlement, movement, cavalry, wagon trains, hunting scenes, mountain spectacle, and the belief systems that turned expansion into national identity.\n\nThe color frontier narrative works below enter that same visual territory from a contemporary angle. Warm light and painterly atmosphere make the scene approachable, but the image has to carry more than mood. It has to imply a before, an after, and a cost that has not fully arrived.",
    conceptBlock2Title: "THE NATIVE PRESENCE",
    conceptBlock2Copy:
      "Native American culture is central to any serious account of frontier art. Early artists often documented Indigenous dress, ceremony, and daily life at the same time expansion was altering those worlds by force.\n\nNative American portrait work changes this page because it brings older ground into view: heritage, continuity, authority, displacement, and presence. These portraits keep the frontier from becoming only a settler or cowboy story. They widen the moral field of the page and give the collection a necessary historical gravity.",
    conceptBlock3Title: "DAILY FRONTIER LIFE",
    conceptBlock3Copy:
      "Daily frontier life is one of the reasons Western art still holds attention: work, weather, risk, travel, isolation, endurance, and the practical lives beneath the myth. The cowboy belongs here, but not as shorthand.\n\nHat, horse, coat, and dust can identify the type quickly. They cannot carry the person. Wayne Heim's cowboy portraits use painterly light, posture, weathered clothing, and direct human presence to recover the working figure beneath the icon. These pieces belong where the collector wants the frontier to feel lived rather than staged.",
    conceptBlock4Title: "MYTH AFTER COLOR",
    conceptBlock4Copy:
      "Manifest Destiny and the majestic Western landscape both shaped frontier art, but they also romanticized it. Color can make the West feel generous: sunset, dust, golden distance, dramatic sky. Black and white asks what remains after some of that romance is removed.\n\nThe monochrome frontier scenes below are useful when the wall needs restraint instead of spectacle. They hold the old-West story in a quieter register, where shadow, gesture, distance, smoke, doorway, weather, and silence carry what color might have softened.",
    archiveContextTitle: "Browse the Western Frontier Art Collection",
    archiveContextCopy:
      "Western frontier art at K4 Studios is organized around the themes museum collections and art history associate with the genre: dramatic expansion, land, daily frontier life, Native American presence, working figures, and the mythology of the American West.\n\nOpen any image to read the story, compare available print formats and sizes, and check edition details. Questions about a specific frontier piece or room placement? Contact wayne@k4studios.com.",
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
    layoutVariant: "cinematic-concept-series-top",
    seoTitle: "Western Interior Design Art - Fine Art Prints for Rooms | Wayne Heim",
    seoDescription: "Western interior design art by Wayne Heim for homes, lodges, ranch interiors, offices, and hospitality spaces. Cowboy portraits, Western landscapes, mountain prints, and water studies for rooms that need presence.",
    commercialH1: "Four Room Decisions for Western Interior Design Art",
    deck: "Four series, {catalogImageCount} works: Western portraits, open-country landscapes, mountain prints, and water studies organized around presence, breathing room, vertical scale, and visual calm.",
    gatewayKicker: "K4 Studios - Western Interior Design Art",
    gatewayIntroCopy:
      "Western interior design art has to do more than match a room. It has to hold the room.",
    gatewaySupportingCopy:
      `A generic Western print can echo a palette: brown leather, warm wood, stone, iron, linen, lodge light. But strong Western interior design art does something harder. It gives the room a center of gravity. It introduces a human presence, a horizon, a silence, or a sense of scale that furniture alone cannot provide.\n\nWayne Heim's work is built for that kind of room presence. The images begin as photography, then are shaped through a painterly process into fine art with atmosphere, authorship, and narrative restraint. For collectors, interior designers, ranch homeowners, lodge owners, offices, and hospitality spaces, the question is not simply what looks Western. The question is what can live on the wall without becoming decorative noise.\n\nChoose the kind of pressure the space needs first, then choose the print. Sketch Series studies begin at ${getFormattedLowestStandardPrintPrice()} for shelves, studies, and small groupings; archival paper editions handle the main framed wall-art role; selected Chronicle and Legend editions add signature, numbering, and certificate when the artwork needs collector permanence. Engrained Baltic Birch panels remain an option for selected images, but the primary decision here is the room: human anchor, open space, vertical scale, or calming movement.`,
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    titles: {
      cowboyColor: "Western Portrait Art for Interiors",
      landscapeWest: "Western Landscape Art for Interiors",
      mountains: "Mountain Landscape Art for Interiors",
      water: "Water and Waterfall Art for Interiors",
    },
    descriptions: {
      cowboyColor:
        "Start here when a room needs human presence. Color cowboy portraits bring character, posture, weathered clothing, and painterly light into living rooms, offices, lodge entries, ranch interiors, and hospitality spaces.",
      landscapeWest:
        "Move into Western landscape prints when the room needs air, distance, and open country. These works pair especially well with leather, wood, stone, warm neutrals, and spaces that need a horizon rather than another object.",
      mountains:
        "Mountain landscape prints work best when a wall needs vertical scale and quiet authority. They can anchor stairwells, fireplaces, offices, long corridors, and rooms where the architecture already points upward.",
      water:
        "Water and waterfall prints soften the Western register. Use this section when the room needs movement, reflection, tonal contrast, or a calmer counterweight to heavier cowboy and mountain imagery.",
    },
    conceptBlock1Title: "THE HUMAN ANCHOR",
    conceptBlock1Copy:
      "Western interior design art begins with the room, not the keyword. A room may need warmth, but warmth alone is not enough. It may need rustic texture, but texture without focus becomes theme decor. The right Western artwork gives the space a visual anchor: a face, a posture, a horizon, a line of movement, or a silence that changes how the room feels.\n\nCowboy portrait work is the most direct version of that anchor. A figure gives a room someone to meet. In entries, offices, hospitality spaces, and ranch interiors, human presence can resolve a wall faster than another object, pattern, or material surface.",
    conceptBlock2Title: "THE HORIZON",
    conceptBlock2Copy:
      "Western landscapes solve a different interior problem than portrait work. Portraits bring presence. Landscapes create space. In rooms with heavy furniture, darker woods, stone fireplaces, or layered textures, an open Western landscape can give the eye somewhere to travel.\n\nThe best landscape print for an interior is not always the most dramatic one. Often it is the image with enough restraint to let the room breathe: weather, distance, muted color, a horizon line, or mountain form that extends the architecture rather than fighting it.",
    conceptBlock3Title: "THE SCALE",
    conceptBlock3Copy:
      "Interior art fails when the scale is timid. A small print can be intimate on a shelf, in a study, or as part of a three-piece grouping. But a fireplace wall, lodge entry, conference room, or ranch-house great room usually needs a work that can hold its own at distance.\n\nFor Western interior design, scale is not only size. It is the weight of the subject. A single portrait can anchor a room because the person in the frame has gravity. A mountain print can anchor a room because the form carries height. A water image can calm a room because movement and reflection change the tempo of the wall.",
    conceptBlock4Title: "THE FINISH",
    conceptBlock4Copy:
      "The final interior decision is presentation. Archival paper prints are flexible and frame well for refined rooms, offices, and gallery-style walls. Baltic Birch Engrained wood panel editions bring the image closer to the materials of the West itself, especially in rustic, lodge, ranch, and hospitality spaces.\n\nNot every room needs the same finish. Clean contemporary spaces often benefit from restraint and negative space. Rustic interiors can carry more texture. Designer-led projects may need consistency across a series. The goal is to choose the print, scale, and substrate that make the room feel resolved rather than merely decorated.",
    archiveContextTitle: "Browse the Western Interior Design Art Collection",
    archiveContextCopy:
      "Western interior design art at K4 Studios is organized by what the room needs first: human presence, open country, mountain scale, or water and reflection.\n\nUse the individual image pages as the specification step: read the story, compare sizes and print formats, check edition availability, and decide whether the piece should anchor a wall, open the room, reinforce the architecture, or soften the space. Not sure what size works for your space? Contact wayne@k4studios.com for a complimentary room mockup.",
    faqItems: westernInteriorDesignFaq,
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
    layoutVariant: "cinematic-concept-series-top",
    commercialH1: "Modern Western Art for Clean Interior Spaces",
    seoTitle: "Modern Western Interior Design Art - Fine Art Prints by Wayne Heim",
    seoDescription:
      "Modern Western interior design art by Wayne Heim. Restrained cowboy portraits, Western landscapes, mountain studies, and fine art prints for contemporary rooms.",
    deck:
      "Four modern interior routes, {catalogImageCount} works: monochrome Western portraits, open landscapes, mountain studies, and controlled color portraits chosen for contemporary rooms, clean walls, and restrained Western interiors.",
    gatewayKicker: "K4 Studios - Modern Western Interior Design Art",
    gatewayIntroCopy:
      "Modern Western interior design art works best when the room can breathe around it.",
    gatewaySupportingCopy:
      `A modern Western room does not need every surface to announce the theme. Clean walls, neutral upholstery, black metal, glass, pale wood, stone, and open negative space can carry Western subject matter more powerfully when the artwork is restrained.\n\nModern Western interiors often need clarity rather than raw material texture or lodge weight: black and white portraits that hold a wall without adding color noise, landscapes that open the room, mountain forms that give architecture scale, and selective color portraits when the space needs warmth without clutter.\n\nMost works are available as archival fine art prints, with Sketch Series studies beginning at ${getFormattedLowestStandardPrintPrice()}. Signed Chronicle and Legend editions are available on selected works for collectors and designer-led projects where edition status, scale, and permanence matter.`,
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    titles: {
      cowboyBlackWhite: "Black and White Western Art for Modern Interiors",
      landscapeWest: "Western Landscape Art for Contemporary Rooms",
      mountains: "Mountain Landscape Art for Modern Walls",
      cowboyColor: "Restrained Color Western Portrait Art",
    },
    descriptions: {
      cowboyBlackWhite:
        "Start with black and white Western portraits when a modern room needs human presence without extra warmth, pattern, or decorative color.",
      landscapeWest:
        "Western landscapes suit contemporary interiors when the wall needs distance, horizon, and open air rather than a themed figure.",
      mountains:
        "Mountain studies work on tall walls, stairwells, entries, and rooms where architecture needs vertical scale without visual clutter.",
      cowboyColor:
        "Use color portraits selectively when the room needs warmth and character but still has to remain edited, clean, and design-forward.",
    },
    conceptBlock1Title: "THE RESTRAINED FIGURE",
    conceptBlock1Copy:
      "Modern interiors often need one strong human note rather than a decorated wall. Black and white Western portraits give a room presence while keeping the palette quiet. The face, posture, and tonal structure carry the work instead of color.",
    conceptBlock2Title: "THE OPEN WALL",
    conceptBlock2Copy:
      "A contemporary room can feel tight if every piece asks for attention. Western landscapes create visual distance. They give the eye a horizon, a pause, and a way for Western subject matter to feel spacious rather than themed.",
    conceptBlock3Title: "THE ARCHITECTURAL SCALE",
    conceptBlock3Copy:
      "Mountain work belongs in modern rooms when the architecture needs height and gravity. The subject adds scale without adding clutter, especially in entries, stairwells, offices, and rooms with strong vertical lines.",
    conceptBlock4Title: "THE CONTROLLED COLOR NOTE",
    conceptBlock4Copy:
      "Color Western portrait work can still function in a modern interior when it is used as a deliberate accent. The key is restraint: one figure, one wall, enough warmth to humanize the room without turning the room into a Western set.",
    archiveContextTitle: "Browse Modern Western Interior Design Art",
    archiveContextCopy:
      "Modern Western interior design art at K4 Studios is organized around restraint: monochrome human presence, open landscapes, mountain scale, and selective color. Open any image for story, sizes, print options, and edition details. For room mockups, contact wayne@k4studios.com.",
    faqItems: modernInteriorDesignFaq,
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
    layoutVariant: "cinematic-concept-series-top",
    commercialH1: "Cowboy Themed Artwork Without the Costume Problem",
    seoTitle: "Cowboy Themed Artwork - Western Fine Art Prints",
    seoDescription:
      `Cowboy themed artwork by Wayne Heim. Cowboy portraits, Western character studies, black and white works, and frontier scene prints from ${sketchPrintPrice}.`,
    deck:
      "Four themed artwork routes, {catalogImageCount} works: cowboy portraits, monochrome character studies, frontier scenes, and black and white Western stories for rooms that need cowboy presence without novelty decor.",
    gatewayKicker: "K4 Studios - Cowboy Themed Artwork",
    gatewayIntroCopy:
      "Cowboy themed artwork can go wrong fast when the theme arrives before the person.",
    gatewaySupportingCopy:
      `The theme is obvious: hat, horse, dust, leather, stance. But a room does not need cowboy signs stacked on top of each other. It needs one image with enough authority to carry the idea without turning the space into a set.\n\nThis route is for buyers who want cowboy subject matter but still want fine art presence. Wayne Heim's work uses the familiar vocabulary of cowboy imagery, then slows it down through portrait gravity, painterly light, tonal restraint, and story pressure.\n\nSketch Series studies begin at ${getFormattedLowestStandardPrintPrice()}, with larger archival paper prints and selected signed editions available when the piece needs to hold a wall permanently.`,
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    titles: {
      cowboyColor: "Color Cowboy Themed Artwork",
      cowboyBlackWhite: "Black and White Cowboy Themed Artwork",
      narrativeColor: "Western Cowboy Scene Artwork",
      narrativeBlackWhite: "Black and White Cowboy Story Artwork",
    },
    descriptions: {
      cowboyColor:
        "Start with color cowboy artwork when the room needs warmth, character, and the immediate human signal of the Western figure.",
      cowboyBlackWhite:
        "Black and white cowboy artwork keeps the theme restrained through tone, face, fabric, and posture rather than color or prop value.",
      narrativeColor:
        "Western cowboy scene artwork brings the theme into story through action, setting, light, and the moment around the figure.",
      narrativeBlackWhite:
        "Black and white cowboy story artwork works when the room needs old-West gravity without more warm color.",
    },
    conceptBlock1Title: "THE THEME TEST",
    conceptBlock1Copy:
      "The question is not whether the artwork reads cowboy. It will. The question is whether the image still has a reason to exist after the theme is recognized. Color portraits below answer through character rather than costume.",
    conceptBlock2Title: "THE RESTRAINED SIGNAL",
    conceptBlock2Copy:
      "Black and white cowboy work is useful when the room needs the subject but not the color load. It gives the theme authority without letting the surface dominate.",
    conceptBlock3Title: "THE STORY ROUTE",
    conceptBlock3Copy:
      "Scene-based cowboy artwork keeps the subject from becoming a static emblem. Setting, movement, distance, and consequence let the viewer read beyond the figure.",
    conceptBlock4Title: "THE QUIET THEME",
    conceptBlock4Copy:
      "Monochrome story work is the least decorative cowboy-themed route. It belongs where the wall needs Western identity, but the room would suffer from another bright or obvious signal.",
    archiveContextTitle: "Browse Cowboy Themed Artwork",
    archiveContextCopy:
      "Cowboy themed artwork at K4 Studios is organized by how much signal the room needs: color portraits, black and white portraits, story scenes, or monochrome Western scenes. Open any image for story, print options, sizing, and edition details.",
  }),
  cowboyThemedPhotography: makePage({
    pagePath: "/cowboy-themed-photography",
    label: "Cowboy Themed Photography",
    title: "Cowboy Themed Photography - Fine Art Prints by Wayne Heim",
    subject: "cowboy themed photography, Western cowboy photos, cowboy portrait photography, black and white cowboy studies, and story-driven cowboy images shaped as fine art prints",
    sections: cowboyCore,
    hero: "i-5FX3W9r",
    heroPath: sources.cowboyColor.galleryPath,
    leftDock: [
      supportDock("Explore Western Cowboy Photography", "/Western-Cowboy-Photography", "/img/i-5FX3W9r/s.jpg"),
      supportDock("Explore Cowboy Pictures", "/cowboy-pictures", "/img/i-k4b6c5b/s.jpg"),
      supportDock("Explore Black and White Cowboy Photos", "/black-and-white-cowboy-photos", "/img/i-mqQxwNn/s.jpg"),
      supportDock("Learn What Is Cowboy Fine Art Photography", "/Blog/what-is-cowboy-fine-art-photography", blogThumbs.cowboy),
    ],
    rightDock: [
      supportDock("Explore Cowboy Themed Artwork", "/cowboy-themed-artwork", "/img/i-SBjhvGf/s.jpg"),
      supportDock("Explore Cowboy Art Prints", "/cowboy-art-prints", "/img/i-5FX3W9r/s.jpg"),
      supportDock("Explore Western Cowboy Pictures", "/western-cowboy-pictures", "/img/i-QWcX7JT/s.jpg"),
      supportDock("Learn What Is Painterly Photography", "/Blog/what-is-painterly-photography", blogThumbs.painterly),
    ],
    dockCoreCount: 4,
    layoutVariant: "cinematic-concept-series-top",
    commercialH1: "Cowboy Themed Photography That Starts With the Photograph",
    seoTitle: "Cowboy Themed Photography - Western Cowboy Photo Prints",
    seoDescription:
      `Cowboy themed photography by Wayne Heim. Western cowboy photos, cowboy portrait photography, black and white cowboy studies, and story-driven fine art prints from ${sketchPrintPrice}.`,
    deck:
      "Four photography routes, {catalogImageCount} works: color cowboy portraits, black and white cowboy studies, color frontier scenes, and monochrome Western stories for collectors who want the cowboy subject grounded in photographic presence.",
    gatewayKicker: "K4 Studios - Cowboy Themed Photography",
    gatewayIntroCopy:
      "Cowboy themed photography should begin with a real photographed presence, not only a familiar hat.",
    gatewaySupportingCopy:
      `There is a useful split here. Cowboy themed artwork is the broader wall-art category: paintings, prints, illustrations, framed pieces, and decor searches. Cowboy themed photography is narrower. It asks for a camera-origin image first, then judges whether that photograph has enough character, atmosphere, and finish to live as fine art.\n\nWayne Heim's work belongs in that second conversation because the photographic foundation is not hidden. Faces, horses, clothing, light, weather, gesture, and location give the image its evidence. Painterly finishing gives the finished print its Western art presence without turning the subject into a generic icon.\n\nThis page is for buyers using photo language: cowboy photos, cowboy photography, Western cowboy photography, black and white cowboy photos, and story-driven photographic prints. Sketch Series studies begin at ${getFormattedLowestStandardPrintPrice()}, with larger archival paper prints and selected signed editions available when the image needs to hold a permanent wall.`,
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    titles: {
      cowboyColor: "Color Cowboy Themed Photography",
      cowboyBlackWhite: "Black and White Cowboy Themed Photography",
      narrativeColor: "Western Cowboy Photo Stories",
      narrativeBlackWhite: "Monochrome Cowboy Photo Stories",
    },
    descriptions: {
      cowboyColor:
        "Start with color cowboy themed photography when the room needs a real human subject, warm Western light, and the photographic detail behind the finished print.",
      cowboyBlackWhite:
        "Black and white cowboy themed photography keeps the subject close to the older photographic record through tone, face, fabric, shadow, and restraint.",
      narrativeColor:
        "Western cowboy photo stories move beyond portrait signal into scene, action, weather, and the feeling that a larger frontier story is underway.",
      narrativeBlackWhite:
        "Monochrome cowboy photo stories use shadow, dust, gesture, and quiet space when the image needs old-West memory rather than decorative color.",
    },
    conceptBlock1Title: "THE PHOTO SIGNAL",
    conceptBlock1Copy:
      "Searchers who type photography or photos are usually asking for a different proof than buyers who type artwork. They want the subject to feel camera-based: a real face, real clothing, real light, real posture, and enough physical detail to keep the image from becoming pure illustration.",
    conceptBlock2Title: "THE OLD RECORD",
    conceptBlock2Copy:
      "Black and white cowboy photography carries a direct line back to historic Western photographs. These works are not archive reproductions, but they use tone, shadow, and photographic restraint to keep the cowboy subject rooted in visual memory.",
    conceptBlock3Title: "THE STORY PHOTOGRAPH",
    conceptBlock3Copy:
      "The strongest cowboy photographs are rarely only portraits. They suggest a before and after: a rider entering the frame, a room going quiet, a trail opening, a decision hanging in the light. That narrative pressure is what moves a photograph toward art.",
    conceptBlock4Title: "THE BRIDGE TO ART",
    conceptBlock4Copy:
      "Photography and artwork do meet, but the order matters. On this page, the image begins as photography and becomes collectible Western art through authorship, finish, print presentation, and story. That keeps the page honest to photo intent while still supporting fine art buyers.",
    archiveContextTitle: "Browse Cowboy Themed Photography",
    archiveContextCopy:
      "Cowboy themed photography at K4 Studios is organized by photographic use: color cowboy portraits, black and white studies, color Western photo stories, and monochrome frontier narratives. Open any image for story, print options, sizing, and edition details.",
    faqItems: [
      {
        q: "Is cowboy themed photography different from cowboy themed artwork?",
        a: [
          "Yes. Cowboy themed photography starts with a photographed subject and a camera-origin image. Cowboy themed artwork is the broader category that can include paintings, illustrations, decor prints, canvas wall art, and photographic art.",
        ],
      },
      {
        q: "Are these cowboy photos or digital paintings?",
        a: [
          "Wayne Heim's finished works begin with photographic source material and are shaped through painterly finishing, tonal control, color, atmosphere, and print presentation. The result is photography-based Western fine art.",
        ],
      },
      {
        q: "Where should I start if I want cowboy photos for a wall?",
        a: [
          "Start with color cowboy themed photography for warmth and character, black and white cowboy photography for restraint, or Western cowboy photo stories when the room needs narrative rather than a simple cowboy portrait.",
        ],
      },
    ],
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
    layoutVariant: "cinematic-concept-series-top",
    commercialH1: "Cowboy Artwork Prints for Walls That Need a Figure",
    seoTitle: "Cowboy Artwork Prints - Western Portrait & Scene Prints",
    seoDescription:
      `Cowboy artwork prints by Wayne Heim. Cowboy portrait prints, black and white studies, frontier scenes, and Western fine art prints from ${sketchPrintPrice}.`,
    deck:
      "Four print routes, {catalogImageCount} works: cowboy portrait artwork, black and white cowboy studies, color frontier scenes, and monochrome story prints for collector and room use.",
    gatewayKicker: "K4 Studios - Cowboy Artwork Prints",
    gatewayIntroCopy:
      "A cowboy artwork print has to do two jobs: read clearly at distance and keep working up close.",
    gatewaySupportingCopy:
      `The wall sees the silhouette first. The viewer sees the person second. That is the challenge with cowboy artwork prints: the subject is instantly recognizable, so the print has to earn attention through character, atmosphere, and finish.\n\nThis page is print-focused. It is for buyers comparing cowboy artwork, framed Western prints, black and white cowboy studies, and frontier scenes that can hold a room. Each image opens into its own story, sizing, format, and edition details.\n\nSketch Series studies begin at ${getFormattedLowestStandardPrintPrice()}, with archival paper prints and selected signed Chronicle and Legend editions available for more permanent collector walls.`,
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    titles: {
      cowboyColor: "Color Cowboy Artwork Prints",
      cowboyBlackWhite: "Black and White Cowboy Artwork Prints",
      narrativeColor: "Western Cowboy Scene Prints",
      narrativeBlackWhite: "Black and White Cowboy Story Prints",
    },
    descriptions: {
      cowboyColor:
        "Start with color cowboy artwork prints when the wall needs a clear human anchor with warmth, character, and Western presence.",
      cowboyBlackWhite:
        "Black and white cowboy artwork prints work when tone, face, fabric, and posture should carry more weight than color.",
      narrativeColor:
        "Western cowboy scene prints move the subject into story, adding setting, action, atmosphere, and visual consequence.",
      narrativeBlackWhite:
        "Black and white cowboy story prints are slower and more restrained, useful for rooms that need Western identity without extra color.",
    },
    conceptBlock1Title: "THE WALL READ",
    conceptBlock1Copy:
      "A print has to read from across the room. Cowboy portrait artwork does that naturally, but the good pieces also reward the second look: face, fabric, light, and posture carrying the subject past silhouette.",
    conceptBlock2Title: "THE TONAL PRINT",
    conceptBlock2Copy:
      "Black and white cowboy prints can feel more permanent because they rely on tonal structure rather than color atmosphere. They sit especially well in rooms with leather, wood, stone, or already-warm palettes.",
    conceptBlock3Title: "THE SCENE PRINT",
    conceptBlock3Copy:
      "Scene prints bring a different wall presence. They let the room hold story instead of only figure, which matters for offices, lodge corridors, dining rooms, and spaces where viewers have time to read the image.",
    conceptBlock4Title: "THE QUIET COLLECTOR PIECE",
    conceptBlock4Copy:
      "The black and white story route is for buyers who want the Western subject to stay active over time. These prints withhold more, so the room does not exhaust them on first glance.",
    archiveContextTitle: "Browse Cowboy Artwork Prints",
    archiveContextCopy:
      "Cowboy artwork prints at K4 Studios are organized by wall use: color portrait prints, black and white portrait prints, color scene prints, and monochrome story prints. Open any image for story, sizing, print format, and edition details.",
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
    layoutVariant: "cinematic-concept-series-top",
    commercialH1: "The American West as a Full Fine Art Subject",
    seoTitle: "Fine Art Photography of the American West - Wayne Heim Prints",
    seoDescription:
      "Fine art photography of the American West by Wayne Heim. Frontier narratives, cowboy portraits, Native American portrait work, Western landscapes, and mountain studies as archival fine art prints.",
    deck:
      "Five American West routes, {catalogImageCount} works: frontier narratives, cowboy portraits, Native American studies, Western landscapes, and mountain subjects treated as one larger historical environment.",
    gatewayKicker: "K4 Studios - Fine Art Photography of the American West",
    gatewayIntroCopy:
      "Fine art photography of the American West is bigger than cowboy photography.",
    gatewaySupportingCopy:
      `The American West is not one subject. It is a historical environment: people, weather, distance, migration, Indigenous presence, labor, conflict, myth, settlement, silence, and land large enough to change how every figure inside it is read. Fine art photography of the American West has to hold that whole field, not just a cowboy portrait with better lighting.\n\nThe collection begins with frontier narrative because story gives the West its pressure. It moves through cowboy portraiture because the human figure still carries the most recognizable signal. It includes Native American portrait work because the Western story is incomplete without deeper historical presence. It opens into landscape and mountains because the land is not background; it is the force that shaped the people.\n\nWayne Heim's work begins with photographic source material and moves through painterly finishing into collector-grade fine art prints. Sketch Series studies begin at ${getFormattedLowestStandardPrintPrice()}, with larger archival paper prints and selected signed Chronicle and Legend editions available for permanent walls.`,
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    titles: {
      narrativeColor: "American West Narrative Photography",
      cowboyColor: "Cowboy Portrait Photography of the American West",
      nativeColor: "Native American Portrait Photography",
      landscapeWest: "American West Landscape Photography",
      mountains: "Mountain Photography of the American West",
    },
    descriptions: {
      narrativeColor:
        "Start with frontier narratives when the American West needs to appear as story: unresolved scenes, atmosphere, consequence, and the feeling that history is still unfolding.",
      cowboyColor:
        "Cowboy portrait photography gives the broad American West route its human anchor through faces, posture, clothing, work, and the lived reality behind the icon.",
      nativeColor:
        "Native American portrait work carries historical presence and a quieter authority, keeping the American West from narrowing into cowboy myth alone.",
      landscapeWest:
        "Western landscapes widen the page into land, weather, distance, and open country, where the West reads as place before it reads as subject.",
      mountains:
        "Mountain studies add height, scale, and permanence to the American West route, useful for rooms that need grandeur without a figure-led image.",
    },
    conceptBlock1Title: "THE WEST AS STORY",
    conceptBlock1Copy:
      "The American West becomes fine art when the image does more than identify a place or period. Frontier narrative scenes give the page its first argument: the West is a story field, full of decisions, pauses, pressure, and aftermath.",
    conceptBlock2Title: "THE HUMAN WEST",
    conceptBlock2Copy:
      "Cowboy portraits are still central, but they cannot be the whole category. Here they function as one human register inside a larger American West body of work: labor, character, posture, weather, and the visible life of the figure.",
    conceptBlock3Title: "THE OLDER GROUND",
    conceptBlock3Copy:
      "Native American portrait photography changes the scale of the page. It brings the American West into a deeper historical register where presence, heritage, and stillness matter as much as action.",
    conceptBlock4Title: "THE LAND ITSELF",
    conceptBlock4Copy:
      "Landscape is not an accessory to fine art photography of the American West. The land carries distance, exposure, weather, and the emotional geography behind the human subjects.",
    conceptBlock5Title: "THE MOUNTAIN REGISTER",
    conceptBlock5Copy:
      "Mountain work gives the American West its vertical force. These pieces belong where scale, permanence, and atmospheric distance matter more than a figure or a scene.",
    archiveContextTitle: "Browse Fine Art Photography of the American West",
    archiveContextCopy:
      "The American West collection brings together story, cowboy portraiture, Native American portrait work, landscape, and mountain studies. Open any image for story, print options, sizing, and edition details.",
  }),
  westernCowboyPhotography: makePage({
    pagePath: "/Western-Cowboy-Photography",
    label: "Western Cowboy Photography",
    title: "Western Cowboy Photography by Wayne Heim",
    subject: "Western cowboy photography shaped from historical documentation, ranch-life portraiture, cinematic light, black and white studies, and modern fine art printmaking",
    sections: cowboyCore,
    hero: "i-5FX3W9r",
    heroPath: sources.cowboyColor.galleryPath,
    leftDock: blogDock.cowboyLeft,
    rightDock: [
      supportDock("Explore Western Cowboy Art", "/western-cowboy-art", "/img/i-LCspRF4/s.jpg"),
      supportDock("Explore Cowboy Pictures", "/cowboy-pictures", "/img/i-k4b6c5b/s.jpg"),
      supportDock("Explore Western Cowboy Pictures", "/western-cowboy-pictures", "/img/i-QWcX7JT/s.jpg"),
      supportDock("Learn What Makes a Fine Art Print Worth Owning", "/Blog/what-makes-a-fine-art-print-worth-owning", blogThumbs.finePrint),
    ],
    dockCoreCount: 4,
    layoutVariant: "cinematic-concept-series-top",
    seoTitle: "Western Cowboy Photography - Fine Art Prints by Wayne Heim",
    seoDescription: "Western cowboy photography by Wayne Heim. Cowboy portraits, ranch-life character, black and white studies, cinematic frontier scenes, and fine art Western prints.",
    commercialH1: "Western Cowboy Photography Between Record and Fine Art",
    deck: "Four photographic routes, {catalogImageCount} works: color cowboy portraits, black and white cowboy studies, color frontier scenes, and monochrome Western narratives shaped from heritage, grit, texture, light, and motion.",
    gatewayKicker: "Western Cowboy Photography",
    gatewayIntroCopy: "Western cowboy photography begins with evidence: a person, a horse, a hat, a rope, dust, leather, weather, and light.",
    gatewaySupportingCopy: "The strongest cowboy photography has always lived between documentation and interpretation. Early Western photographs preserved ranch hands, rodeo figures, open-range riders, and working lives before they disappeared into legend. Modern Western cowboy photography has a different problem: the subject is already famous, already mythologized, already easy to flatten into style.\n\nWayne Heim's cowboy photography uses the camera to keep the work grounded in actual people and physical detail, then uses painterly finishing to move the image toward fine art. Natural light, high-contrast texture, weathered clothing, dust, skin, leather, and the relationship between rider and horse all matter because they keep the work from becoming generic Western decor.\n\nCollectors comparing Western photographers, cowboy portrait work, black and white Western photography, and fine art cowboy prints can begin with images that still feel tied to a real photographic moment.",
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    titles: {
      cowboyColor: "Color Western Cowboy Photography",
      cowboyBlackWhite: "Black and White Cowboy Photography",
      narrativeColor: "Cinematic Western Cowboy Photography",
      narrativeBlackWhite: "Monochrome Western Cowboy Photography",
    },
    descriptions: {
      cowboyColor: "Color cowboy photography starts with the living figure: face, hands, clothing, weather, horse, and natural light shaped into a finished Western portrait.",
      cowboyBlackWhite: "Black and white cowboy photography removes warm color so the photograph has to hold through tone, texture, posture, and the authority of the face.",
      narrativeColor: "Color frontier scenes move cowboy photography toward cinematic fine art, where motion, light, setting, and implied story carry the frame.",
      narrativeBlackWhite: "Monochrome Western narratives connect cowboy photography to the older historical record: shadow, dust, gesture, and silence replacing easy color drama.",
    },
    conceptBlock1Title: "THE PHOTOGRAPHIC RECORD",
    conceptBlock1Copy: "The cowboy entered visual history through photographs long before he became a search category. Historic cowboy images carried practical evidence: the clothing, horse tack, posture, tools, dust, and physical bearing of working lives.\n\nThe color cowboy portraits below keep that documentary root visible. They are not stock cowboy scenes or costume studies. They begin with the photographic facts of the person in front of the camera, then use light and finish to give those facts more weight.",
    conceptBlock2Title: "THE TONAL STUDY",
    conceptBlock2Copy: "Black and white cowboy photography has a different authority than color. It feels closer to old photographs, but it also asks more from the image. Without sunset, blue sky, or warm dust, the work has to survive on structure.\n\nThe black and white cowboy studies below are built around face, brim shadow, weathered skin, worn fabric, and tonal pressure. They answer the historical side of the search without becoming reproductions of old cowboy photos.",
    conceptBlock3Title: "THE CINEMATIC MOMENT",
    conceptBlock3Copy: "Modern Western cowboy photography often competes on atmosphere: dramatic skies, action, riders, ranch work, motion, and golden-hour light. Those elements can be beautiful, but they only matter when the image does more than announce itself.\n\nThe color frontier scenes below use cinematic light and setting as a way into story. The cowboy is not just a subject in a landscape. He is part of a moment with direction, tension, and consequence.",
    conceptBlock4Title: "THE HISTORICAL REGISTER",
    conceptBlock4Copy: "When cowboy photography moves into monochrome narrative, it comes closest to the historical imagination: old West photographs, ranch records, rodeo images, and the visual memory of a frontier already receding.\n\nThe black and white Western narrative works below are not documentary archives, but they use the authority of monochrome to make the scene feel remembered rather than staged.",
    archiveContextTitle: "Browse the Western Cowboy Photography Collection",
    archiveContextCopy: "Use this page when the photographic medium matters: start with color cowboy portraits for character, black and white portraits for tonal authority, color frontier scenes for cinematic motion, or monochrome narratives for historical atmosphere. For the broader medium-level route behind <a href=\"/Western-Fine-Art-Photography\">photography western</a> searches and the wider <a href=\"/Western-Fine-Art-Photography\">western photographer</a> comparison, continue into Western Fine Art Photography. Each image page includes story, sizing, print presentation, and edition details.",
    faqItems: [
      {
        q: "What is Western cowboy photography?",
        a: [
          "Western cowboy photography includes historical ranch and rodeo photographs, modern cowboy portraits, riders, horses, working Western life, and fine art images shaped around light, texture, motion, and character.",
        ],
      },
      {
        q: "How is this different from cowboy art?",
        a: [
          "Cowboy photography begins with the camera and a photographed moment. Cowboy art is the broader category that includes paintings, prints, illustrations, canvas wall art, and photographic art inspired by cowboy subjects.",
        ],
      },
      {
        q: "Are black and white cowboy photographs available?",
        a: [
          "Yes. The black and white sections emphasize tonal structure, face, posture, shadow, and the vintage authority many collectors associate with historic Western photography.",
        ],
      },
    ],
  }),
  westernCowboyArt: makePage({
    pagePath: "/western-cowboy-art",
    label: "Western Cowboy Art",
    title: "Western Cowboy Art by Wayne Heim",
    subject: "cowboy artwork shaped around Western figures, horses, frontier scenes, action, landscape, print collecting, and the wider tradition of cowboy paintings and Western wall art",
    sections: ["narrativeColor", "cowboyColor", "cowboyBlackWhite", "narrativeBlackWhite"],
    hero: "i-LCspRF4",
    heroPath: sources.narrativeColor.galleryPath,
    leftDock: blogDock.cowboyLeft,
    centerDock: [
      sectionDock("Black and White Western Narrative Art", "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White/all#collection-browser", "/img/i-mqQxwNn/s.jpg"),
      sectionDock("Western Narrative Art Collection", "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives", "/img/i-HfQ5NVR/s.jpg"),
      sectionDock("Color Western Narrative Art", "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color/all#collection-browser", "/img/i-B7ZSdfs/s.jpg"),
    ],
    rightDock: [
      supportDock("Explore Cowboy Art Prints", "/cowboy-art-prints", "/img/i-5FX3W9r/s.jpg"),
      supportDock("Explore Cowboy Wall Art", "/cowboy-wall-art", "/img/i-Dw6Z8ff/s.jpg"),
      supportDock("Explore Cowboy Artwork Prints", "/cowboy-artwork-prints", "/img/i-SBjhvGf/s.jpg"),
      supportDock("Compare Decor Art and Fine Art", "/Blog/decor-art-vs-fine-art", blogThumbs.decor),
    ],
    dockCoreCount: 4,
    layoutVariant: "cinematic-concept-series-top",
    seoTitle: "Western Cowboy Art - Fine Art Prints by Wayne Heim",
    seoDescription: "Western cowboy art by Wayne Heim. Cowboy portraits, horses, frontier scenes, black and white studies, framed art, Western wall art, and fine art prints.",
    commercialH1: "Western Cowboy Art for Prints, Walls, and Collector Rooms",
    deck: "Four art routes, {catalogImageCount} works: frontier scenes, cowboy portraits, black and white character studies, and monochrome Western narratives built for collectors searching cowboy art, artwork, framed art, art prints, Western themed rooms, and wall art.",
    gatewayKicker: "Western Cowboy Art",
    gatewayIntroCopy: "Cowboy artwork is a wall language before it is a medium. Riders, horses, frontier scenes, black hats, worn leather, open country, action, silence, myth, and memory all have to resolve into one thing: art that can hold a room.",
    gatewaySupportingCopy: "The search result is full of paintings, canvas wall art, framed art, art prints, product listings, museums, Pinterest boards, vintage cowboy artwork, and contemporary Western artists because the phrase belongs to a broad art tradition. Remington and Russell made the cowboy a serious art subject by giving the figure action, consequence, and narrative weight. Later artists pushed the cowboy into wall decor, illustration, nostalgia, abstraction, and collectible Western imagery.\n\nWayne Heim's cowboy art is built to compete in that art-print conversation: painterly light, controlled color, tonal restraint, character, story pressure, and wall presence. The work is selected for people looking for cowboy artwork that can live as framed art, Western wall art, lodge art, ranch home art, office art, hospitality art, or a collector print with more weight than generic cowboy decor.\n\nCollectors and room planners can begin with cowboy figures, horses, action, atmosphere, print presence, and a reason to support a Western themed room without falling into mass-market decoration.",
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    titles: {
      narrativeColor: "Color Western Narrative Art",
      cowboyColor: "Color Cowboy Portrait Art",
      cowboyBlackWhite: "Black and White Cowboy Art",
      narrativeBlackWhite: "Black and White Western Narrative Art",
    },
    descriptions: {
      narrativeColor: "Start with color frontier scenes when the cowboy subject needs action, landscape, and the story pressure associated with classic Western art, framed prints, and statement walls.",
      cowboyColor: "Color cowboy portraits bring the figure forward: face, clothing, posture, horse tack, and warm Western atmosphere shaped for framed art and wall presence.",
      cowboyBlackWhite: "Black and white cowboy art strips the figure down to tone, face, hat brim, fabric, and character when the wall needs restraint rather than color.",
      narrativeBlackWhite: "Monochrome Western narratives carry the old-West side of cowboy art: shadow, movement, tension, and a story that keeps working after the first glance.",
    },
    conceptBlock1Title: "THE COWBOY AS ART SUBJECT",
    conceptBlock1Copy: "Cowboy art searches usually begin in the painting tradition: riders, horses, desert light, cattle work, bronc action, trail scenes, and Western figures shaped for the wall. The cowboy is not only a person in this category. He is a visual subject with a long history of myth, labor, drama, and design.\n\nThe color frontier scenes below are the closest route to that broader art tradition. They bring the cowboy into landscape and action, where the image can carry motion and consequence rather than simply present a portrait.",
    conceptBlock2Title: "THE WALL FIGURE",
    conceptBlock2Copy: "A cowboy portrait becomes art when the figure holds the wall without needing the viewer to already love cowboy imagery. Hat, coat, horse, rope, and dust are only the outer language. The real work is posture, face, light, and character.\n\nThe color cowboy portraits below are for rooms that need a central Western figure: a print with enough warmth and presence to read as cowboy art, framed Western artwork, or a collector wall piece rather than generic cowboy decor.",
    conceptBlock3Title: "THE RESTRAINED COWBOY",
    conceptBlock3Copy: "Western art is often presented through color: paintings, canvas prints, sunset scenes, and decorative wall products. Black and white goes the other direction. It asks the cowboy figure to hold through tone and structure rather than palette.\n\nThe black and white cowboy works below are useful when the collector wants Western artwork with more gravity and less decorative color.",
    conceptBlock4Title: "THE OLD-WEST STORY",
    conceptBlock4Copy: "Classic cowboy art often works because the scene feels unfinished: a rider leaving, a confrontation forming, a horse in motion, a figure caught before the outcome. That unresolved quality is what keeps Western art from becoming simple illustration.\n\nThe monochrome narrative works below carry that old-West story register with shadow, gesture, and restraint.",
    archiveContextTitle: "Browse the Cowboy Artwork Collection",
    archiveContextCopy: "Use this page when the broader art category matters: frontier scene, cowboy portrait, black and white character study, framed Western art, cowboy themed artwork, or old-West narrative. Each image opens to story, sizing, print presentation, and collector details. For help choosing a piece for a room or wall, contact Wayne at wayne@k4studios.com.",
    faqItems: [
      {
        q: "What is Western cowboy art?",
        a: [
          "Western cowboy art includes paintings, prints, illustrations, framed art, canvas wall art, and collectible artwork centered on cowboys, horses, ranch life, frontier scenes, action, landscape, and the mythology of the American West.",
        ],
      },
      {
        q: "Is this cowboy artwork painted?",
        a: [
          "The finished works are painterly fine art prints rather than oil paintings. They begin with camera-origin source material, then are shaped as Western artwork through light, tone, color, atmosphere, and print presentation.",
        ],
      },
      {
        q: "Does this page include cowboy art prints?",
        a: [
          "Yes. The works shown here are offered as fine art prints, with individual image pages listing story, sizing, edition, and presentation details.",
        ],
      },
    ],
  }),
  eighteenHundredsCowboyArt: makePage({
    pagePath: "/1800s-cowboy-art",
    label: "1800s Cowboy Art",
    title: "1800s Cowboy Art - Old West Fine Art Prints by Wayne Heim",
    subject: "old-West cowboy imagery, frontier narrative scenes, historical Western portrait work, Native American presence, black and white cowboy studies, and contemporary fine art prints rooted in the visual storytelling tradition of the 1800s American West",
    sections: ["narrativeColor", "cowboyColor", "cowboyBlackWhite", "narrativeBlackWhite", "nativeColor", "nativeBlackWhite"],
    hero: "i-LCspRF4",
    heroPath: sources.narrativeColor.galleryPath,
    leftDock: [
      supportDock("Learn What Is Western Cowboy Art", "/Blog/what-is-western-cowboy-art", "/img/i-7Mzzbvp/s.jpg"),
      supportDock("Learn What Is Historical Western Photography", "/Blog/what-is-historical-western-photography", blogThumbs.historical),
      supportDock("Explore Art of the West", "/Art-of-the-West", blogThumbs.westernArt),
      supportDock("Explore Authentic Cowboy Life", "/authentic-cowboy-life", "/img/i-5FX3W9r/s.jpg"),
    ],
    centerDock: [
      sectionDock("Color Old West Narrative Art", "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color/all#collection-browser", "/img/i-B7ZSdfs/s.jpg"),
      sectionDock("1800s Cowboy Portrait Art", "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/all#collection-browser", "/img/i-5FX3W9r/s.jpg"),
      sectionDock("Black and White Cowboy Art", "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White/all#collection-browser", "/img/i-DJMTZ8z/s.jpg"),
      sectionDock("Old West Black and White Narratives", "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White/all#collection-browser", "/img/i-mqQxwNn/s.jpg"),
    ],
    rightDock: [
      supportDock("Explore Vintage Western Art", "/vintage-western-art", "/img/i-FnZ68h3/s.jpg"),
      supportDock("Explore Old Western Art", "/old-western-art", "/img/i-W73hxx4/s.jpg"),
      supportDock("Explore Old West Pictures", "/old-west-pictures", "/img/i-k4b6c5b/s.jpg"),
      supportDock("Explore Western Storytelling Photography", "/western-storytelling-photography", "/img/i-HfQ5NVR/s.jpg"),
    ],
    dockCoreCount: 6,
    layoutVariant: "cinematic-concept-series-top",
    seoTitle: "1800s Cowboy Art - Old West Fine Art Prints by Wayne Heim",
    seoDescription:
      `1800s cowboy art by Wayne Heim. Old West cowboy portraits, frontier narrative scenes, black and white studies, Native American portrait work, and historical Western fine art prints from ${sketchPrintPrice}.`,
    commercialH1: "1800s Cowboy Art, Old West Memory, and Frontier Storytelling",
    deck:
      "Six historical Western routes, {catalogImageCount} works: old-West narrative scenes, cowboy portraits, black and white cowboy studies, monochrome frontier stories, and Native American portrait work for collectors searching 1800s cowboy art with more authority than reproduction decor.",
    gatewayKicker: "K4 Studios - 1800s Cowboy Art and Old West Fine Art Prints",
    gatewayIntroCopy:
      "1800s cowboy art is not a costume category. It is the visual memory of the West before the legend hardened.",
    gatewaySupportingCopy:
      `Searches around 1800s cowboy art pull several intentions into one place: Frederic Remington and Charles M. Russell, old West paintings, historical cowboy pictures, vaquero imagery, black and white frontier photographs, Western art museums, and buyers looking for prints that feel rooted in the original Western storytelling tradition.\n\nThat history matters because the cowboy did not begin as modern rodeo spectacle or decorative ranch branding. The 19th-century cowboy entered art through labor, risk, horse culture, open-range life, racial and cultural overlap, newspaper illustration, frontier painting, early photography, and later the mythmaking that turned working lives into American legend.\n\nWayne Heim's work is contemporary, but the intent is historical: painterly fine art photography shaped around old-West character, unresolved narrative, tonal restraint, and the remembered pressure of the frontier. These are not modern rodeo pics. They are collector-grade Western prints built to keep narrative storytelling art alive - the cowboy as person, the West as memory, and the image as a doorway into what happened before and what may still be arriving.\n\nSketch Series studies begin at ${getFormattedLowestStandardPrintPrice()}, with larger archival paper prints and selected signed Chronicle and Legend editions available for permanent collector walls. Some historically charged images may also be offered on natural Baltic Birch through the Signature Engrained Series, where the material surface strengthens the old-West register.`,
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    titles: {
      narrativeColor: "1800s Cowboy Art - Color Frontier Narratives",
      cowboyColor: "Old West Cowboy Portrait Art",
      cowboyBlackWhite: "Black and White 1800s Cowboy Art",
      narrativeBlackWhite: "Old West Black and White Narrative Art",
      nativeColor: "Native American Portrait Work in the Western Tradition",
      nativeBlackWhite: "Black and White Native American Portrait Studies",
    },
    descriptions: {
      narrativeColor:
        "Start with color frontier narratives when 1800s cowboy art needs action, consequence, landscape, riders, and the unresolved story pressure associated with classic Western painting.",
      cowboyColor:
        "Color cowboy portraits bring the old-West figure forward through face, posture, clothing, horse culture, weathered character, and painterly light.",
      cowboyBlackWhite:
        "Black and white cowboy art answers the historical-photo side of the search: tonal restraint, brim shadow, worn fabric, face, hand, and memory rather than bright modern spectacle.",
      narrativeBlackWhite:
        "Monochrome frontier narratives carry the old-West story register with shadow, silence, gesture, and the feeling that the scene belongs to a larger chapter.",
      nativeColor:
        "Native American portrait work widens the 1800s Western art route beyond cowboy shorthand, adding heritage, presence, and the deeper historical ground beneath the frontier legend.",
      nativeBlackWhite:
        "Black and white Native American portraits are the stillest historical register here, where cloth, face, tone, and quiet authority carry more weight than action.",
    },
    conceptBlock1Title: "THE 1800S WESTERN CANON",
    conceptBlock1Copy:
      "The strongest 1800s cowboy art searches point back to the canon: Remington, Russell, working cowboys, vaqueros, horses, cattle work, frontier violence, Native presence, and the open range becoming memory. The subject is bigger than a cowboy on a wall. It is the moment when labor, documentation, illustration, and myth started feeding one another.\n\nRemington gave the Western image speed, action, and the charged half-second before consequence. Russell gave it lived experience, humor, weather, story, and the authority of a man who knew ranch life from inside the saddle. Together they helped turn the cowboy from a worker into an enduring art subject.",
    conceptBlock2Title: "THE COWBOY BEFORE RODEO",
    conceptBlock2Copy:
      "The 1800s cowboy was not a modern performance figure. He was part of a working world: cattle drives, open ranges, long weather, horse skill, risk, boredom, isolation, and a complicated cultural inheritance that included Mexican vaquero traditions as well as Anglo ranching and frontier settlement.\n\nThat is why this page leans into portrait and narrative rather than spectacle. A useful cowboy image should carry work, pressure, character, and story before it carries entertainment. These color portraits are built for that older register.",
    conceptBlock3Title: "THE HISTORICAL PHOTOGRAPHIC SIGNAL",
    conceptBlock3Copy:
      "Late-1800s and early-1900s cowboy photographs gave the West a different kind of authority. They were often anonymous, practical, monochrome, and imperfect, but they preserved posture, clothing, tack, rooms, wagons, faces, and the physical reality behind the legend.\n\nThe black and white cowboy works below are not archival reproductions. They use that historical photographic signal as a discipline: less color, fewer distractions, more dependence on face, tone, fabric, shadow, and the human weight inside the figure.",
    conceptBlock4Title: "THE UNFINISHED OLD WEST STORY",
    conceptBlock4Copy:
      "Classic Western art holds because it often refuses to finish the story. A rider is leaving. A gun has not yet fired. A card game has gone wrong. A figure waits at a doorway. The viewer stands between cause and consequence.\n\nThat unresolved structure is what Wayne Heim carries forward through painterly photography. The monochrome narrative works below are built as old-West memory rather than simple illustration: shadow, gesture, silence, and a story that asks the viewer to complete what the frame withholds.",
    conceptBlock5Title: "THE WEST WAS NEVER ONE STORY",
    conceptBlock5Copy:
      "A history-tagged cowboy page has to include the deeper frontier field or it becomes only nostalgia. Native American portrait work changes the moral and visual scale of the page. It brings heritage, displacement, endurance, authority, and presence into the same visual conversation that cowboy art too often narrows.\n\nThese works do not sit beside the cowboy subject as decoration. They are part of the foundation underneath the entire Western art tradition.",
    conceptBlock6Title: "REMEMBERING THE OLD WEST WITHOUT COPYING IT",
    conceptBlock6Copy:
      "The goal is not to imitate 1800s painting or reproduce old photographs. It is to keep the storytelling function alive. The old Western masters mattered because their images made viewers feel a larger world pressing beyond the frame.\n\nWayne Heim's work continues that function through a camera-based painterly process: historical subjects, period atmosphere, authored titles, image stories, and deliberate incompleteness. The result is contemporary Western fine art rooted in the foundation of old-West storytelling rather than modern rodeo documentation or mass-market cowboy decor.",
    archiveContextTitle: "Browse 1800s Cowboy Art and Old West Fine Art Prints",
    archiveContextCopy:
      "1800s cowboy art at K4 Studios is organized by historical register: color frontier narratives, old-West cowboy portraits, black and white cowboy studies, monochrome narrative scenes, Native American portrait work, and black and white Native American portraits.\n\nOpen any image to read the story, compare print sizes, review edition options, and decide whether the piece belongs as a small Sketch Series study, a larger archival wall print, or a signed limited edition collector work. Questions about a specific old-West print? Contact Wayne at wayne@k4studios.com.",
    faqTitle: "1800s Cowboy Art FAQ",
    faqItems: [
      {
        q: "What is 1800s cowboy art?",
        a: [
          "1800s cowboy art refers to artwork rooted in the 19th-century American West: working cowboys, vaqueros, open-range life, horses, cattle work, frontier scenes, Native presence, and the visual storytelling tradition later shaped by artists such as Frederic Remington and Charles M. Russell.",
        ],
      },
      {
        q: "Is this page selling antique 1800s paintings?",
        a: [
          "No. These are contemporary fine art prints by Wayne Heim. The page is history-rooted, not antique inventory. The work draws from old-West atmosphere, painterly Western tradition, black and white historical memory, and narrative frontier storytelling.",
        ],
      },
      {
        q: "How does this connect to Remington and Russell?",
        a: [
          "Remington and Russell helped establish the cowboy as a serious Western art subject through action, story, character, and the unresolved frontier moment. Wayne Heim's work continues that storytelling discipline through painterly fine art photography rather than oil painting or bronze sculpture.",
        ],
      },
      {
        q: "Why include Native American portraits on a cowboy art page?",
        a: [
          "Because the 1800s American West was never only a cowboy story. Native American presence, history, displacement, endurance, and portrait tradition belong to the same frontier field. Including those works gives the page historical depth instead of reducing the West to one mythology.",
        ],
      },
      {
        q: "Are these modern rodeo pictures?",
        a: [
          "No. This page is not built around modern rodeo photography. It focuses on old-West character, frontier narrative, historical atmosphere, black and white tonal memory, and the legends of the West as storytelling material.",
        ],
      },
      {
        q: "Can I buy these as fine art prints?",
        a: [
          `Yes. The works open to individual image pages with story, sizing, format, and edition details. Sketch Series prints begin at ${getFormattedLowestStandardPrintPrice()}, with larger archival paper prints and selected signed limited editions available for collector walls.`,
        ],
      },
      {
        q: "Where should I go next if I want related old-West pages?",
        a: [
          "Use <a href='/vintage-western-art'>Vintage Western Art</a> for the broader old-West print route, <a href='/old-west-pictures'>Old West Pictures</a> for image-led historical search intent, and <a href='/western-storytelling-photography'>Western Storytelling Photography</a> for the narrative side of the work.",
        ],
      },
    ],
  }),
  westernCowboyPictures: makePage({
    pagePath: "/western-cowboy-pictures",
    label: "Western Cowboy Pictures",
    title: "Western Cowboy Pictures by Wayne Heim",
    subject: "Western cowboy pictures shaped from broad image search into authored cowboy portraits, old-West scenes, color Western imagery, and black and white frontier pictures",
    sections: cowboyCore,
    hero: "i-QWcX7JT",
    heroPath: sources.cowboyColor.galleryPath,
    leftDock: blogDock.cowboyLeft,
    rightDock: [
      supportDock("Explore Cowboy Pictures", "/cowboy-pictures", "/img/i-k4b6c5b/s.jpg"),
      supportDock("Explore Western Cowboy Photography", "/Western-Cowboy-Photography", "/img/i-5FX3W9r/s.jpg"),
      supportDock("Explore Western Cowboy Art", "/western-cowboy-art", "/img/i-LCspRF4/s.jpg"),
      supportDock("Compare Wood Prints and Paper Prints", "/Blog/wood-prints-vs-paper-prints", blogThumbs.woodPaper),
    ],
    dockCoreCount: 4,
    layoutVariant: "cinematic-concept-series-top",
    seoTitle: "Western Cowboy Pictures - Fine Art Prints by Wayne Heim",
    seoDescription: "Western cowboy pictures by Wayne Heim. Historic-era cowboy imagery, vintage-feeling black and white portraits, modern cinematic Western scenes, and fine art cowboy prints.",
    commercialH1: "Western Cowboy Pictures Beyond the Stock Image Search",
    deck: "Four visual routes, {catalogImageCount} works: modern Western cowboy pictures shaped from the same visual eras people search for - historic cowboy photos, vintage Western art, cinematic landscapes with riders, and print-ready cowboy portraits.",
    gatewayKicker: "Western Cowboy Pictures",
    gatewayIntroCopy: "Western cowboy pictures usually begin as a visual search. A hat. A horse. A rider in dust. A face that feels older than the photograph.",
    gatewaySupportingCopy: "Search results for this term span several different image traditions at once: early historical cowboy photographs, vintage Western art reproductions, stock riders on horseback, sunset silhouettes, Pinterest idea boards, and modern cinematic Western scenes. The intent is broad, but it is not empty. People are trying to find a picture that carries the cowboy signal quickly enough to stop the scroll.\n\nWayne Heim's Western cowboy pictures take that familiar signal and slow it down. The subject is recognizable, but the image is built to hold longer than recognition: posture, character, light, dust, silence, and the unresolved feeling of a person or scene that belongs to a larger Western story.\n\nStart with the image type - color portrait, black and white portrait, color scene, or monochrome frontier story - then open the pieces that feel less like generic cowboy imagery and more like something you would actually live with on a wall.",
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    descriptions: {
      cowboyColor: "Start with color cowboy pictures when the wall needs the quickest human read: hat, face, clothing, weather, and warm Western atmosphere carried by a specific character.",
      cowboyBlackWhite: "Black and white cowboy pictures answer the vintage side of the search. These images lean on tone, posture, and face rather than color or sunset spectacle.",
      narrativeColor: "Color frontier scenes move from picture to story. Use this section when the cowboy image needs motion, tension, setting, or the feeling of a larger old-West moment.",
      narrativeBlackWhite: "Monochrome Western scenes are the quietest picture route: shadow, gesture, and implication replacing the easy drama of color.",
    },
    conceptBlock1Title: "THE IMAGE-FIRST SEARCH",
    conceptBlock1Copy: "Western cowboy pictures is not the same search as Western fine art photography. It is broader, faster, and more visual. The viewer may not know whether they want a vintage photo, a stock image, a poster, a painting reproduction, or a print. They know the image has to read cowboy immediately.\n\nThe color cowboy portraits below are the strongest archive match for that search: a large visual field of Western faces, riders, hats, dust, clothing, and character. This is the section most closely aligned with broad image results and visual gallery intent. The work is still readable at a glance, but the goal is not clip art recognition. It is character strong enough to survive after the search is over.",
    conceptBlock2Title: "THE OLD PHOTO SIGNAL",
    conceptBlock2Copy: "A large part of the cowboy picture search leans toward the historic era: late-1800s and early-1900s cowboy photographs, sepia portraits, open-range riders, rodeo figures, ranch hands, and anonymous men on horseback. That vintage pull matters because monochrome makes cowboy imagery feel closer to memory than advertisement.\n\nThe black and white cowboy pictures below use that old-photo signal, but they are not archival copies. They are authored works shaped for tonal weight, face, brim shadow, clothing texture, and the slower authority of restraint.",
    conceptBlock3Title: "THE COWBOY IN A SCENE",
    conceptBlock3Copy: "Some cowboy pictures need more than a person. They need a moment: a rider moving through dust, a confrontation held open, a figure placed against a Western setting, or a scene that feels as if something has just happened and something else is about to happen.\n\nThe color narrative section below is where the cowboy picture becomes a Western scene. These works carry more atmosphere, more setting, and more story pressure than a straight portrait.",
    conceptBlock4Title: "THE VINTAGE STORY REGISTER",
    conceptBlock4Copy: "Black and white Western scenes sit closest to the visual language people associate with historic cowboy pictures. But the strongest monochrome images are not simply old-looking. They use the absence of color to make the viewer read structure: distance, shadow, gesture, and silence.\n\nThe monochrome narrative works below are for collectors who want cowboy imagery with a vintage register, but without the flatness of stock or reproduction imagery.",
    archiveContextTitle: "Browse the Western Cowboy Pictures Collection",
    archiveContextCopy: "Use this page when you are choosing visually first: color cowboy portrait, black and white cowboy picture, color Western scene, or monochrome old-West story. Each image page includes the story, available sizes, print details, and collector options. For help choosing a piece or scale, contact Wayne at wayne@k4studios.com.",
    faqItems: [
      {
        q: "What are Western cowboy pictures?",
        a: [
          "Western cowboy pictures include historical cowboy photographs, vintage Western art, cowboy portraits, riders on horseback, ranch-life images, old-West scenes, and modern cinematic Western pictures. This page focuses on Wayne Heim's authored fine art versions of those visual categories.",
        ],
      },
      {
        q: "Where should I start if I just want to browse cowboy images?",
        a: [
          "Start with the color cowboy portrait section. It is the strongest visual archive for broad cowboy picture browsing, with faces, riders, hats, weathered clothing, and Western character shown across a large image set.",
        ],
      },
      {
        q: "Are these stock cowboy pictures?",
        a: [
          "No. These are authored Western fine art images by Wayne Heim. They use familiar cowboy picture signals, but the work is built for wall presence, story, character, and print presentation rather than stock download use.",
        ],
      },
      {
        q: "Are black and white cowboy pictures available?",
        a: [
          "Yes. The black and white cowboy portrait and narrative sections are built for the vintage side of the search, with monochrome images that emphasize tone, posture, face, shadow, and old-West restraint.",
        ],
      },
    ],
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
    layoutVariant: "cinematic-concept-series-top",
    commercialH1: "Cowboy Fine Art Photography Beyond the Costume",
    seoTitle: "Cowboy Fine Art Photography - Wayne Heim Western Prints",
    seoDescription:
      `Cowboy fine art photography by Wayne Heim. Authored cowboy portraits, black and white cowboy studies, frontier scenes, and archival Western prints from ${sketchPrintPrice}.`,
    deck:
      "Four fine-art routes, {catalogImageCount} works: color cowboy portraits, black and white cowboy studies, color frontier scenes, and monochrome Western narratives shaped by authorship rather than simple record.",
    gatewayKicker: "K4 Studios - Cowboy Fine Art Photography",
    gatewayIntroCopy:
      "Cowboy fine art photography begins when the subject stops being enough.",
    gatewaySupportingCopy:
      `A cowboy in a photograph is not automatically fine art. The hat, horse, coat, rope, and weathered face only establish the subject. The finished work has to do more: organize light, hold character, imply a life outside the frame, and make the viewer return after recognition has passed.\n\nWayne Heim's cowboy fine art photography starts with photographic reality and moves through painterly finishing. The camera keeps the person specific. The process gives the image tonal weight, atmosphere, and the kind of restraint that lets a portrait or scene live as artwork rather than cowboy documentation.\n\nSketch Series studies begin at ${getFormattedLowestStandardPrintPrice()}, with larger archival paper prints and selected signed Chronicle and Legend editions available for collectors who want provenance and permanent wall presence.`,
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    titles: {
      cowboyColor: "Color Cowboy Fine Art Photography",
      cowboyBlackWhite: "Black and White Cowboy Fine Art Photography",
      narrativeColor: "Cowboy Fine Art Photography - Frontier Scenes",
      narrativeBlackWhite: "Monochrome Cowboy Fine Art Narratives",
    },
    descriptions: {
      cowboyColor:
        "Start with color cowboy fine art photography when the figure needs warmth, specificity, and human presence without becoming lifestyle imagery.",
      cowboyBlackWhite:
        "Black and white cowboy fine art photography strips the subject to tone, face, posture, fabric, and the authority of restraint.",
      narrativeColor:
        "Color frontier scenes move cowboy photography toward authored Western art, where atmosphere and story pressure carry the frame.",
      narrativeBlackWhite:
        "Monochrome cowboy narratives are the quietest fine-art route, built around shadow, implication, and a story that refuses to close.",
    },
    conceptBlock1Title: "THE PERSON BEFORE THE TYPE",
    conceptBlock1Copy:
      "Fine art cowboy photography has to keep the person ahead of the type. If the viewer only sees cowboy, the image is shallow. If the viewer sees a specific face carrying work, weather, and interior life, the photograph begins to hold.",
    conceptBlock2Title: "THE TONAL AUTHORITY",
    conceptBlock2Copy:
      "Black and white is not a style filter here. It is a test of structure. The image has to stand on face, posture, fabric, light, and shadow without relying on warm Western color.",
    conceptBlock3Title: "THE AUTHORED WESTERN SCENE",
    conceptBlock3Copy:
      "When cowboy photography enters a frontier scene, it takes on narrative responsibility. The frame has to imply consequence, not merely show costume or action.",
    conceptBlock4Title: "THE WITHHELD STORY",
    conceptBlock4Copy:
      "Monochrome narrative work gives cowboy fine art photography its slowest register. These pieces hold because they leave space for the viewer to complete the story.",
    archiveContextTitle: "Browse Cowboy Fine Art Photography",
    archiveContextCopy:
      "Cowboy fine art photography at K4 Studios is organized by treatment: color portrait, black and white portrait, color frontier scene, and monochrome narrative. For the broader medium-level context behind <a href=\"/Western-Fine-Art-Photography\">photography western</a> searches and the larger <a href=\"/Western-Fine-Art-Photography\">western photographer</a> comparison, continue into Western Fine Art Photography. Open any image for the authored story, print sizes, formats, and edition details.",
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
    layoutVariant: "cinematic-concept-series-top",
    commercialH1: "Cowboy Fine Art Prints by Subject and Wall Presence",
    seoTitle: "Cowboy Fine Art Prints - Western Portrait & Scene Prints",
    seoDescription:
      `Cowboy fine art prints by Wayne Heim. Color cowboy portraits, black and white studies, frontier scenes, and archival Western prints from ${sketchPrintPrice}.`,
    deck:
      "Four print routes, {catalogImageCount} works: color cowboy portrait prints, black and white cowboy studies, color frontier scenes, and monochrome Western narratives for collector walls.",
    gatewayKicker: "K4 Studios - Cowboy Fine Art Prints",
    gatewayIntroCopy:
      "Cowboy fine art prints are chosen by subject first, but they succeed by wall presence.",
    gatewaySupportingCopy:
      `A collector may begin with the cowboy figure, but the wall decides whether the print holds. Some rooms need the direct human anchor of a color portrait. Some need the tonal authority of black and white. Some need a story scene that guests can read slowly rather than a single figure.\n\nWayne Heim's cowboy works are available as archival paper prints, with Sketch Series studies beginning at ${getFormattedLowestStandardPrintPrice()} and selected signed Chronicle and Legend editions available for collector walls. Some images may also suit Engrained natural Baltic Birch panels when the subject benefits from a more object-based historical surface.\n\nChoose the path below by the kind of presence the room needs: color, monochrome, portrait, or story.`,
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    titles: {
      cowboyColor: "Color Cowboy Fine Art Prints",
      cowboyBlackWhite: "Black and White Cowboy Fine Art Prints",
      narrativeColor: "Color Western Cowboy Scene Prints",
      narrativeBlackWhite: "Black and White Cowboy Narrative Prints",
    },
    descriptions: {
      cowboyColor:
        "Start with color cowboy fine art prints when the wall needs immediate human warmth, Western character, and portrait presence.",
      cowboyBlackWhite:
        "Black and white cowboy fine art prints suit rooms where restraint, tone, and character need to carry more weight than color.",
      narrativeColor:
        "Color Western cowboy scene prints work when a wall needs story, atmosphere, and a wider frontier moment around the figure.",
      narrativeBlackWhite:
        "Black and white cowboy narrative prints are the slowest route, built for rooms where implication and tone matter most.",
    },
    conceptBlock1Title: "THE PORTRAIT PRINT",
    conceptBlock1Copy:
      "Color portrait prints are the direct route. They give the room a figure, an eye line, and a human center. The print has to hold beyond recognition through face, light, and posture.",
    conceptBlock2Title: "THE MONOCHROME PRINT",
    conceptBlock2Copy:
      "Black and white cowboy prints integrate easily into rooms with strong materials or existing color. Tone and shadow provide authority without adding another warm Western accent.",
    conceptBlock3Title: "THE STORY PRINT",
    conceptBlock3Copy:
      "A scene print changes the room differently than a portrait. It gives the viewer a situation to read, which works well in offices, halls, dining spaces, lodge rooms, and collector walls.",
    conceptBlock4Title: "THE COLLECTOR REGISTER",
    conceptBlock4Copy:
      "Monochrome narrative prints often become the collector route because they reveal slowly. The image keeps working as the viewer returns to the unresolved story.",
    archiveContextTitle: "Browse Cowboy Fine Art Prints",
    archiveContextCopy:
      "Cowboy fine art prints at K4 Studios are organized by wall presence: color portrait prints, black and white portrait prints, color story scenes, and monochrome narratives. Open any image for story, sizing, print format, and edition details.",
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
    layoutVariant: "cinematic-concept-series-top",
    commercialH1: "Painterly Cowboy Photography and the Shaped Photograph",
    seoTitle: "Cowboy Painterly Fine Art Photography - Wayne Heim",
    seoDescription:
      "Cowboy painterly fine art photography by Wayne Heim. Authored Western portraits, black and white cowboy studies, and frontier scenes shaped through painterly process.",
    deck:
      "Four painterly routes, {catalogImageCount} works: color cowboy portraits, monochrome studies, color frontier scenes, and black and white narratives where the photograph is shaped for atmosphere and value.",
    gatewayKicker: "K4 Studios - Cowboy Painterly Fine Art Photography",
    gatewayIntroCopy:
      "Painterly cowboy photography is not a photograph made to look painted. It is a photograph shaped like an artwork.",
    gatewaySupportingCopy:
      `The painterly question is not whether the image has texture. It is whether light, value, atmosphere, and omission have been worked with enough intention to change how the photograph reads. A cowboy subject can be photographed plainly. It becomes painterly fine art when the finished image carries tonal architecture, human presence, and the kind of restraint associated with Western painting.\n\nWayne Heim's cowboy work begins with real photographic source material, then moves through a finishing process that shapes shadow, light, detail, and atmosphere. The result remains photographic, but the wall experience is closer to authored Western art than to straight record.\n\nSketch Series studies begin at ${getFormattedLowestStandardPrintPrice()}, with larger archival paper prints and selected signed editions available for collectors who want the painterly process in a permanent format.`,
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    titles: {
      cowboyColor: "Painterly Color Cowboy Photography",
      cowboyBlackWhite: "Painterly Black and White Cowboy Photography",
      narrativeColor: "Painterly Western Cowboy Scenes",
      narrativeBlackWhite: "Painterly Monochrome Western Narratives",
    },
    descriptions: {
      cowboyColor:
        "Start with color painterly cowboy photography when the work needs warmth, face, texture, and shaped light without losing photographic specificity.",
      cowboyBlackWhite:
        "Painterly black and white cowboy photography tests value, tone, and shadow without relying on color atmosphere.",
      narrativeColor:
        "Painterly Western scenes use color, light, and setting to move the cowboy subject into story and room presence.",
      narrativeBlackWhite:
        "Painterly monochrome narratives are built around tonal restraint, withheld story, and the slower pressure of black and white.",
    },
    conceptBlock1Title: "THE SHAPED PHOTOGRAPH",
    conceptBlock1Copy:
      "A painterly photograph is still a photograph. The difference is what happens to light, tone, edge, and detail after the moment is made. The color cowboy portraits below show the process in its most direct human form.",
    conceptBlock2Title: "THE VALUE STRUCTURE",
    conceptBlock2Copy:
      "Black and white makes the painterly process visible as value. Shadow has to earn its place. Light has to pull the eye. Detail has to serve the subject instead of competing with it.",
    conceptBlock3Title: "THE PAINTERLY SCENE",
    conceptBlock3Copy:
      "Scenes give the process more room: atmosphere, weather, distance, and story all become material. The image is not only finished; it is composed to keep the viewer inside the moment.",
    conceptBlock4Title: "THE TONAL STORY",
    conceptBlock4Copy:
      "The monochrome narrative route is the most restrained painterly branch. It shows how little a Western image needs when tone, silence, and implication are doing the work.",
    archiveContextTitle: "Browse Cowboy Painterly Fine Art Photography",
    archiveContextCopy:
      "Cowboy painterly fine art photography at K4 Studios is organized by treatment: color portrait, black and white portrait, color scene, and monochrome narrative. Open any image for story, print options, size, and edition details.",
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
    layoutVariant: "cinematic-concept-series-top",
    commercialH1: "Old West Pictures with Story Behind the Image",
    seoTitle: "Old West Pictures - Cowboy, Frontier & Western Fine Art Prints",
    seoDescription:
      `Old West pictures by Wayne Heim. Cowboy portraits, vintage frontier scenes, black and white Western imagery, and old-West fine art prints from ${sketchPrintPrice}.`,
    deck:
      "Four visual routes, {catalogImageCount} works: old-West cowboy pictures, color frontier character, black and white story scenes, and cinematic Western images for collectors and walls.",
    gatewayKicker: "K4 Studios - Old West Pictures",
    gatewayIntroCopy:
      "Old West pictures are often searched as images first. The stronger ones refuse to stop there.",
    gatewaySupportingCopy:
      `A picture can show a cowboy, a horse, a porch, a gun hand, a dusty road, or a room from the frontier era and still have nothing to say. The Old West becomes interesting when the picture carries a question: what just happened, what is about to happen, who is waiting, who is leaving, what has the face learned?\n\nThese works are made for visual browsing, but they are not stock-style Western imagery. Wayne Heim's old-West pictures use historical styling, real photographic source, and painterly finishing to turn recognizable frontier subjects into images with pressure, atmosphere, and collector presence.\n\nUse this path when you want the old West as image: portraits, scenes, monochrome studies, and color story work. Sketch Series pieces begin at ${getFormattedLowestStandardPrintPrice()}, with larger archival paper prints and selected signed editions available for permanent walls.`,
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    titles: {
      cowboyBlackWhite: "Black and White Old West Pictures",
      cowboyColor: "Color Old West Cowboy Pictures",
      narrativeBlackWhite: "Black and White Old West Story Pictures",
      narrativeColor: "Color Old West Scene Pictures",
    },
    descriptions: {
      cowboyBlackWhite:
        "Start with black and white old-West pictures when the image needs to feel closest to memory: face, hat, posture, and tone carrying the subject.",
      cowboyColor:
        "Color cowboy pictures add warmth, clothing, dust, and period atmosphere without losing the person inside the Western signal.",
      narrativeBlackWhite:
        "Black and white story pictures slow the page down. These scenes use shadow and implication instead of color to carry the frontier moment.",
      narrativeColor:
        "Color old-West scene pictures bring the broader story world into view: roads, rooms, horses, confrontation, weather, and cinematic frontier atmosphere.",
    },
    conceptBlock1Title: "THE SEARCH FOR A PICTURE",
    conceptBlock1Copy:
      "Old West pictures is a broad visual phrase. Some visitors want historical-looking cowboy images, some want frontier scenes, and some want wall art with enough story to feel older than ordinary Western decor. The black and white portrait route gives that search its most immediate answer.",
    conceptBlock2Title: "THE RECOGNIZABLE FIGURE",
    conceptBlock2Copy:
      "Color cowboy pictures carry quick recognition, so the image has to do extra work. It needs face, posture, and painterly control strong enough that the subject feels like a person instead of a prop.",
    conceptBlock3Title: "THE IMAGE WITH A BEFORE AND AFTER",
    conceptBlock3Copy:
      "The old West becomes more than costume when the picture suggests a before and after. Monochrome narrative scenes let the viewer build the missing chapter from light, setting, and silence.",
    conceptBlock4Title: "THE CINEMATIC OLD WEST",
    conceptBlock4Copy:
      "Color frontier scenes are the most cinematic old-West pictures on the page. They work when a wall needs warmth, motion, and story rather than a single portrait subject.",
    archiveContextTitle: "Browse Old West Pictures",
    archiveContextCopy:
      "Old West pictures at K4 Studios are organized for visual discovery: black and white cowboy pictures, color cowboy pictures, monochrome story scenes, and color frontier scenes. Open any image for story, print sizes, edition options, and collector details.",
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
  westernFineArtPhotography: makePage({
    pagePath: "/Western-Fine-Art-Photography",
    label: "Western Fine Art Photography",
    title: "Western Fine Art Photography by Wayne Heim",
    subject: "authored Western fine art photography across working West portraits, frontier narratives, Native American portrait work, and American West landscapes",
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
    layoutVariant: "cinematic-concept-series-top",
    seoTitle: "Western Fine Art Photography by Wayne Heim",
    seoDescription: "Western fine art photography by Wayne Heim. Authored cowboy portraits, frontier narratives, Native American portrait work, and Western landscapes as archival fine art prints.",
    commercialH1: "Western Fine Art Photography as an Authored Western Medium",
    deck: "A medium-level route through {catalogImageCount} works where documentary Western subjects are shaped into finished fine art photographs: working cowboys, frontier stories, Native presence, and the land itself.",
    gatewayKicker: "Western Fine Art Photography",
    gatewayIntroCopy: "Western fine art photography is not the West photographed beautifully. It is the West authored into a finished work.",
    gatewaySupportingCopy: "The subject may be familiar: a cowboy, a horse, a weathered face, a distant range, a room lit by a single window. The difference is what happens after recognition. A fine art photograph has to carry a point of view. It has to organize light, posture, atmosphere, and omission until the image becomes more than evidence that something was there.\n\nWayne Heim's Western fine art photography works in that space between documentary realism and painterly construction. The camera keeps the work tied to actual people, actual garments, actual weather, actual light. The finishing process moves the photograph toward the older language of Western art: value, restraint, story pressure, and the emotional weight of what the frame withholds.\n\nFor collectors comparing Western photographers, this page is the genre route. It gathers the major subjects of Heim's Western work - working West portraits, old-West narrative scenes, Native American studies, and landscapes - so the medium itself stays visible before the collection becomes a shopping grid.",
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    titles: {
      cowboyColor: "Western Fine Art Cowboy Portraits",
      narrativeColor: "Western Fine Art Narrative Photography",
      nativeColor: "Native American Western Fine Art Portraits",
      landscapeWest: "Western Fine Art Landscape Photography",
    },
    descriptions: {
      cowboyColor: "Western fine art photography begins here with the working figure: cowboy portraits where face, posture, clothing, and light carry the human reality behind the Western subject.",
      narrativeColor: "Color frontier narratives move the medium toward story. These scenes use painterly atmosphere and unresolved action to make the photograph feel less like documentation and more like a still from a larger Western memory.",
      nativeColor: "Native American portrait work brings the historical pressure closer to the surface. These images ask for quiet viewing rather than quick recognition.",
      landscapeWest: "Western landscapes widen the genre. The land is not background decoration here; it is scale, silence, weather, distance, and the emotional geography that shaped the people in the other sections.",
    },
    conceptBlock1Title: "THE WESTERN FIGURE",
    conceptBlock1Copy: "Most searches for Western fine art photography surface cowboys, ranch life, horses, and weathered Western figures because the human subject still carries the quickest signal of the genre. The risk is that the cowboy becomes a costume before he becomes a person.\n\nThe color cowboy portraits below work against that flattening. They keep the evidence of lived work - hats, dust, leather, hands, gaze - but use light and painterly finish to slow the image down. The point is not lifestyle photography. The point is presence.",
    conceptBlock2Title: "THE AUTHORED SCENE",
    conceptBlock2Copy: "A Western photograph becomes fine art when the frame is doing more than recording what stood in front of the lens. It has to choose a moment with pressure: before the answer, after the wound, during the pause when the viewer can feel the story but cannot finish it cleanly.\n\nThe color frontier narrative works below carry that authored scene logic. They sit closer to narrative Western painting than to straight documentary photography, using atmosphere, gesture, and withheld resolution to make the viewer participate.",
    conceptBlock3Title: "THE HISTORICAL PRESENCE",
    conceptBlock3Copy: "Western fine art photography also has to answer for what earlier Western art often simplified. Native American subjects cannot function as scenery or decorative heritage without weakening the work.\n\nThe Native American portrait studies below are organized around stillness, dignity, and atmosphere. They belong inside the Western fine art photography conversation because they carry historical presence without turning it into spectacle.",
    conceptBlock4Title: "THE LAND AS SUBJECT",
    conceptBlock4Copy: "Landscape is one of the strongest signals in Western fine art photography because the West has always been read through distance and scale. But a landscape print only holds when the land feels like a force, not a backdrop.\n\nThe Western landscape works below give the collection its open register: mountains, desert air, plains, fences, weather, and the kind of silence that makes the human figure elsewhere feel smaller and more real.",
    archiveContextTitle: "Continue Through Western Fine Art Photography",
    archiveContextCopy: "Use this page as the medium-level overview: start with the subject that carries the strongest pull, then move sideways into story, portrait, and landscape. Image pages include the story, available sizes, print options, and edition details. For help choosing scale or presentation, reach Wayne directly at wayne@k4studios.com.",
  }),
  westernFineArtPhotographyCollection: makePage({
    pagePath: "/western-fine-art-photography-collection",
    label: "Western Fine Art Photography Collection",
    title: "Western Fine Art Photography Collection by Wayne Heim",
    subject: "a curated Western fine art photography collection for subject-first browsing, gallery wall planning, and collector comparison",
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
    layoutVariant: "cinematic-concept-series-top",
    seoTitle: "Western Fine Art Photography Collection by Wayne Heim",
    seoDescription: "Western fine art photography collection by Wayne Heim. Curated cowboy portraits, frontier narratives, Native American studies, Western landscapes, and monochrome prints.",
    commercialH1: "Curated Routes Through the Western Fine Art Photography Collection",
    deck: "Six browsing routes, {catalogImageCount} works: a Western fine art photography collection organized for collectors, designers, and gallery wall planning across people, story, land, color, and monochrome.",
    gatewayKicker: "Collection Guide",
    gatewayIntroCopy: "A collection page has a different job than a genre page. It helps you sort the West before choosing a single print.",
    gatewaySupportingCopy: "Western fine art photography collections are usually judged by range: working cowboys, ranch life, horses and gear, dramatic landscapes, Native presence, and black and white images that feel older than the moment they came from. Range matters, but only if the collection gives that range a usable structure.\n\nThis collection is organized for browsing decisions. Start with subject if you already know what the room needs. Start with color if warmth, leather, wood, and atmosphere matter most. Start with monochrome when the wall needs restraint. Move into landscape when scale, distance, and breathing room are the design problem.\n\nThe goal is not to make every image compete at once. The goal is to give collectors and interior designers a clear path through the body of work so a single print, pair, or grouped wall can be chosen with intention.",
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    descriptions: {
      cowboyColor: "Start here for the working West: color cowboy portraits and ranch-life figures with enough human presence to hold a wall on their own or anchor a larger grouping.",
      narrativeColor: "Move into color narrative work when the wall needs story. These frontier scenes bring action, pause, atmosphere, and old-West tension into the collection route.",
      nativeColor: "Native American portrait studies add historical gravity and a quieter register. They are often the stillest works in the collection and pair well with restrained rooms.",
      landscapeWest: "Western landscapes create room inside the collection. Use this route when the wall needs distance, scale, weather, mountains, or open country rather than a figure-led subject.",
      cowboyBlackWhite: "Black and white cowboy portraits remove the warmth of color so face, posture, and tonal structure carry the work. This route is for collectors who want restraint and character.",
      narrativeBlackWhite: "Black and white Western narratives are the most austere story route: shadow, silence, and implication carrying frontier scenes without decorative color.",
    },
    conceptBlock1Title: "THE FIGURE ROUTE",
    conceptBlock1Copy: "Collection browsing often starts with the figure because the human subject gives the room an immediate center. Cowboy portraits, ranch-life details, and weathered Western character let the viewer enter the collection through recognition before the image asks for anything deeper.\n\nThe color cowboy portrait section below is the practical first route for statement walls, offices, lodges, and Western rooms that need a human anchor.",
    conceptBlock2Title: "THE STORY WALL",
    conceptBlock2Copy: "A Western fine art photography collection becomes more interesting when it includes scenes that do not resolve themselves. Narrative images create motion inside a static wall: the viewer reads the posture, the distance, the light, and the missing chapter.\n\nThe color narrative works below are the story-led route through the collection, useful when a print needs to feel like more than a portrait or landscape.",
    conceptBlock3Title: "THE HISTORICAL GROUND",
    conceptBlock3Copy: "The American West cannot be curated honestly without Native presence. In a collection context, these works change the emotional register of the page. They slow the viewing down and keep the Western subject from becoming only cowboy myth or open-country romance.\n\nThe Native American portrait studies below belong in the collection as quiet, historically weighted works rather than decorative side notes.",
    conceptBlock4Title: "THE EXPANSIVE REGISTER",
    conceptBlock4Copy: "Landscape gives a Western fine art photography collection its breathing room. Without land, the human subjects can feel theatrical. With land, the collection regains scale: mountains, sky, open distance, and the environmental pressure that made the West feel larger than the people moving through it.\n\nUse the landscape section below when a room needs openness, horizontal calm, or a visual pause between figure-led works.",
    conceptBlock5Title: "THE MONOCHROME PORTRAIT",
    conceptBlock5Copy: "Color carries warmth quickly. Black and white carries authority slowly. For collectors building a more restrained wall, monochrome cowboy portraits shift the collection from Western atmosphere toward tonal structure and character.\n\nThe black and white cowboy portraits below work well when the room already has strong material color - leather, stone, wood, or darker furnishings - and the artwork needs to hold without adding more warmth.",
    conceptBlock6Title: "THE BLACK AND WHITE STORY",
    conceptBlock6Copy: "The final route through the collection is the most withheld one. Black and white narrative work removes the easy romance of color and leaves the viewer with shadow, gesture, and implication.\n\nThese works are useful in grouped walls where one image needs to slow the room down, or in collector spaces where the story should continue working after the first glance.",
    archiveContextTitle: "Browse the Western Fine Art Photography Collection",
    archiveContextCopy: "This is the curation page: choose by subject, mood, color temperature, or room need before opening individual image pages for story, sizing, print presentation, and edition details. For scale guidance or a room mockup, contact Wayne at wayne@k4studios.com.",
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
    layoutVariant: "cinematic-concept-series-top",
    commercialH1: "Historical Fine Art Photography Across Four American Eras",
    seoTitle: "Historical Fine Art Photography Collection - Wayne Heim",
    seoDescription: `Historical fine art photography by Wayne Heim across the American frontier, Civil War, World War II, and the Roaring Twenties. 1,810 works from ${getFormattedLowestStandardPrintPrice()} through signed limited editions.`,
    deck: "1,810 works organized by historical pressure: the American frontier, Civil War, World War II, and the Roaring Twenties, each treated as lived narrative rather than costume.",
    currentDockTitle: "Explore the Facing History Time Zones",
    gridIntroTitle: "",
    gridIntroCopy: "",
    gatewayIntroCopy:
      "Historical fine art photography begins where period costume stops being the point.",
    gatewaySupportingCopy:
      `A uniform, a hat, a rifle, a nurse's cap, a flapper dress, or a frontier coat can identify an era quickly. But identification is not history. The work has to make the viewer feel that a person is standing inside a pressure system larger than the clothing: war, migration, duty, class, danger, memory, survival, or a country still deciding what it is becoming.\n\nThe Facing History collection is organized as four time zones of the American past. The frontier carries the foundation of the Western legend. The Civil War carries national fracture and private burden. World War II carries machinery, service, and remembrance. The Roaring Twenties carries glamour with unease under it. Each route begins as photography, then moves through Wayne Heim's painterly process until the image feels less like reenactment documentation and more like historical fine art.\n\nSketch Series studies begin at ${getFormattedLowestStandardPrintPrice()}, with archival paper prints, signed Chronicle editions, ultra-limited Legend works, and selected Engrained natural Baltic Birch panels available where the material surface reinforces the historical character of the piece.`,
    titles: {
      cowboyColor: "Frontier Portrait Photography",
      narrativeColor: "American Frontier Narrative Art",
      nativeColor: "Native American Historical Portraits",
      civilWarColor: "Civil War Fine Art Portraits",
      wwiiWarColor: "World War II War Scene Art",
      wwiiMachines: "World War II Machine Studies",
      wwiiPortraits: "World War II Portrait Art",
      roaringColor: "Roaring Twenties Historical Portraits",
    },
    descriptions: {
      cowboyColor:
        "Start with frontier portrait work when the historical pull is the person before the legend: face, posture, clothing, and old-West presence.",
      narrativeColor:
        "Frontier narrative scenes carry the American West as story, with unresolved moments where the viewer feels the history around the figure.",
      nativeColor:
        "Native American historical portraits bring deeper presence to the frontier route and keep the collection from reducing the West to settler myth alone.",
      civilWarColor:
        "Civil War portraits shift the collection into duty, youth, loss, and the private burden carried inside national fracture.",
      wwiiWarColor:
        "World War II war scenes are organized around memory and consequence rather than spectacle, using smoke, weather, posture, and atmosphere.",
      wwiiMachines:
        "World War II machines are treated as artifacts with human consequence: metal, rivets, aircraft, armor, and equipment shaped by service.",
      wwiiPortraits:
        "World War II portraits return the era to the individual through face, uniform, care, fatigue, service, and quiet remembrance.",
      roaringColor:
        "Roaring Twenties portraits carry period elegance with unease beneath it: social performance, danger, glamour, and the edge of collapse.",
    },
    conceptBlock1Title: "THE FRONTIER FOUNDATION",
    conceptBlock1Copy:
      "The frontier route is where Western history begins to become legend. Portraits and narrative scenes show the older world before the image hardened into nostalgia: people, choices, distance, and unresolved story.",
    conceptBlock2Title: "THE DEEPER PRESENCE",
    conceptBlock2Copy:
      "Historical work weakens when it treats Indigenous presence as background. Native American portrait studies slow the collection down and place the American frontier inside a longer, more serious history.",
    conceptBlock3Title: "THE CIVIL WAR BURDEN",
    conceptBlock3Copy:
      "Civil War portrait work carries a different kind of silence. The subject is not adventure or frontier myth, but duty, youth, division, loss, and the weight of a country under pressure.",
    conceptBlock4Title: "THE WAR MACHINE",
    conceptBlock4Copy:
      "World War II imagery can become spectacle quickly. The machine studies and war scenes here treat aircraft, armor, smoke, and equipment as historical artifacts with people behind them, not as hardware decoration.",
    conceptBlock5Title: "THE FACE OF SERVICE",
    conceptBlock5Copy:
      "The WWII portrait route brings the collection back to individual memory. A uniform can identify an era, but a face gives the era consequence.",
    conceptBlock6Title: "THE UNEASY DECADE",
    conceptBlock6Copy:
      "The Roaring Twenties route is not only glamour. It is performance, speed, social tension, and the instability beneath the shine. These portraits close the collection with a different kind of historical pressure.",
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
          `Yes. The Chronicle Series offers signed limited editions with numbered certificates of authenticity across the full Facing History collection — frontier, Civil War, WWII, and Roaring Twenties. The Legend Series is ultra-limited, very small runs for collectors who want documented provenance and permanent wall placement. Open-edition Sketch and Foundation works are also available starting at ${sketchPrintPrice} for collectors who want archival quality without edition constraints.`,
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
    subject: "Western photos shaped as fine art prints, including cowboy portraits, frontier scenes, Native American portrait work, and open-country landscapes for visual discovery",
    sections: ["cowboyColor", "narrativeColor", "nativeColor", "landscapeWest"],
    hero: "i-QWcX7JT",
    heroPath: sources.cowboyColor.galleryPath,
    leftDock: blogDock.standardLeft,
    rightDock: [
      supportDock("Explore Western Photography Art", "/Western-Photography-Art", "/img/i-B7ZSdfs/s.jpg"),
      supportDock("Explore Western Portrait Photography", "/western-portrait-photography", "/img/i-5FX3W9r/s.jpg"),
      supportDock("Explore Western Storytelling Photography", "/western-storytelling-photography", "/img/i-HfQ5NVR/s.jpg"),
      supportDock("Compare Decor Art and Fine Art", "/Blog/decor-art-vs-fine-art", blogThumbs.decor),
    ],
    dockCoreCount: 4,
    layoutVariant: "cinematic-concept-series-top",
    commercialH1: "Four Visual Doors Into the West",
    seoTitle: "Western Photos - Cowboy, Frontier & Landscape Fine Art Prints",
    seoDescription:
      `Western photos by Wayne Heim. Cowboy portraits, frontier scenes, Native American portrait work, and Western landscape photographs shaped as fine art prints from ${sketchPrintPrice}.`,
    deck:
      "Four series, {catalogImageCount} works: Western photos organized for visual discovery - cowboy portraits, frontier narrative scenes, Native American portrait work, and open-country landscapes.",
    gatewayKicker: "K4 Studios - Western Photos",
    gatewayIntroCopy:
      "Western photos is the broad door. The work has to meet that search without staying broad.",
    gatewaySupportingCopy:
      `People looking for western photos may not yet know whether they want cowboy portraits, Wild West scenes, Native American portrait work, landscapes, wall art, or collectible prints. The first visual pass should stay broad without treating the images as generic inventory.\n\nWayne Heim's Western photos begin as camera-made images and are shaped through a painterly process into fine art prints with atmosphere, authorship, and story pressure. The collection opens the main visual lanes so a visitor can move from broad Western imagery into a more precise subject family.\n\nBecause the first step is broad visual browsing, the print path stays straightforward: start small with Sketch Series pieces from ${getFormattedLowestStandardPrintPrice()}, move into archival paper prints when a subject earns wall space, and look for signed Chronicle or Legend editions on selected collector works. Where the image benefits from a more tactile historical object, a limited set may also be available on natural Baltic Birch through the Signature Engrained Series.`,
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    descriptions: {
      cowboyColor:
        "Start with cowboy photos when the search needs a human subject: faces, posture, clothing, painterly light, and Western character strong enough to move beyond a simple picture.",
      narrativeColor:
        "Frontier scene photos carry story, atmosphere, and action pressure. Use this section when Western photos should feel cinematic rather than merely descriptive.",
      nativeColor:
        "Native American portrait photos widen the visual route with heritage, presence, and historical gravity that keeps the Western subject from narrowing into cowboy shorthand.",
      landscapeWest:
        "Western landscape photos bring open country, weather, distance, and land into the collection for visitors looking for the West as place rather than figure.",
    },
    conceptBlock1Title: "THE BROAD SEARCH",
    conceptBlock1Copy:
      "Western photos is a broad phrase. It can mean pictures of cowboys, frontier towns, open land, Native American portraits, old-West atmosphere, or images that simply feel like the American West.\n\nA useful page has to honor that broad search without becoming a flat image pile. The first job is visual sorting: person, scene, heritage, or land.",
    conceptBlock2Title: "THE SCENE WITH PRESSURE",
    conceptBlock2Copy:
      "Frontier narrative photos give the broad search a story direction. They are not only pictures of Western subject matter. They imply a before and after through atmosphere, gesture, light, and the unresolved moment.\n\nThis is where western photos begin moving toward storytelling photography and fine art rather than simple documentation.",
    conceptBlock3Title: "THE WIDER HUMAN GROUND",
    conceptBlock3Copy:
      "Western photos can become too narrow if the route stops at cowboy imagery. Native American portrait work changes the visual field immediately because it carries heritage, presence, and historical ground that predates the frontier myth.\n\nPlaced here, these works keep the broad Western photo route honest and more complete.",
    conceptBlock4Title: "THE WEST AS PLACE",
    conceptBlock4Copy:
      "Landscape photos answer a different version of the search. Sometimes the visitor is looking for the West as place: open country, horizon, weather, mountain distance, and the physical scale that shaped the people inside the story.\n\nThese images give the collection room to breathe and offer a path for visitors who want Western atmosphere without a figure dominating the frame.",
    archiveContextTitle: "Browse the Western Photos Collection",
    archiveContextCopy:
      "Western photos at K4 Studios are organized by four discovery routes: cowboy portraits, frontier narrative scenes, Native American portrait work, and Western landscapes.\n\nUse this page to narrow the visual direction. If the subject is monochrome cowboy portraiture, browse the full <a href=\"/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White/all#collection-browser\">black and white cowboy photos</a> gallery, then open the image that feels right for the details that matter: story, subject, size, print format, and whether the work belongs as a casual study or a collector piece. Questions about a specific Western photo? Contact wayne@k4studios.com.",
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
    layoutVariant: "cinematic-concept-series-top",
    commercialH1: "Four Portrait Routes Through the Western Face",
    seoTitle: "Western Portrait Photography - Cowboy & Native Portrait Prints",
    seoDescription:
      `Western portrait photography by Wayne Heim. Cowboy portraits, Native American portrait work, and black and white Western character studies shaped as fine art prints from ${sketchPrintPrice}.`,
    deck:
      "Four series, {catalogImageCount} works: Western portrait photography organized around character, presence, tonal restraint, and historically grounded faces of the American West.",
    gatewayKicker: "K4 Studios - Western Portrait Photography",
    gatewayIntroCopy:
      "Western portrait photography fails when the person becomes only a type.",
    gatewaySupportingCopy:
      `A Western portrait can collapse quickly into shorthand: hat, coat, rifle, horse, beadwork, backdrop, period clothing. Those details may place the subject in the West, but they do not make the portrait hold. The stronger portrait begins when a person arrives before the category.\n\nWayne Heim's Western portrait photography is built around character, expression, weathering, posture, light, and restraint. The images begin as photography, then are shaped through a painterly process so the finished work carries the presence of fine art portraiture rather than costume documentation.\n\nPortraits ask for a different kind of print decision. Smaller Sketch Series works from ${getFormattedLowestStandardPrintPrice()} let the face live close, while larger archival paper prints give posture, hands, fabric, and light enough scale to hold a room. Selected Chronicle and Legend editions are signed and numbered with certificates for collectors who want permanence. When the subject gains from a physical historical surface, some portraits may also be offered on natural Baltic Birch in the Signature Engrained Series.`,
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    descriptions: {
      cowboyColor:
        "Start with color cowboy portraits when the work needs warmth, direct presence, clothing detail, painterly light, and the immediacy of a specific person in the frame.",
      cowboyBlackWhite:
        "Black and white cowboy portraits remove period color and leave face, posture, cloth, shadow, and tone to carry the character study.",
      nativeColor:
        "Native American portrait work brings heritage, presence, and historical gravity into the portrait route, widening the Western face beyond cowboy imagery.",
      nativeBlackWhite:
        "Black and white Native American portraits are the stillest works here, where cloth, face, tone, and quiet authority carry the frame.",
    },
    conceptBlock1Title: "THE PERSON BEFORE THE TYPE",
    conceptBlock1Copy:
      "Western portrait photography has to fight familiarity. The viewer recognizes the cowboy, the hat, the period clothing, the visual code of the West before they see the person.\n\nThe stronger portrait slows that recognition down. It lets expression, posture, light, and specific human presence arrive first. That is what keeps a portrait from becoming costume.",
    conceptBlock2Title: "THE TONAL FACE",
    conceptBlock2Copy:
      "Black and white cowboy portraits remove the comfort of Western color. What remains is the face, the hands, the stance, the texture of clothing, and the pressure of light and shadow.\n\nThis route works when the portrait needs restraint. It is less about the romance of the West and more about character held under tonal pressure.",
    conceptBlock3Title: "THE WIDER PORTRAIT FIELD",
    conceptBlock3Copy:
      "A Western portrait route cannot stop with cowboys and remain complete. Native American portrait work brings different historical ground into the frame: heritage, displacement, endurance, authority, and presence.\n\nThese works give the page a wider human field and keep Western portrait photography from becoming one mythology repeated in different hats.",
    conceptBlock4Title: "THE QUIET AUTHORITY",
    conceptBlock4Copy:
      "Black and white Native American portraits are the quietest portrait works on this page. They do not depend on scene, action, or color atmosphere. The image holds through face, cloth, tonal restraint, and stillness.\n\nThis is portrait photography as presence rather than performance. It belongs where the collector wants the work to continue speaking after the obvious subject has been understood.",
    archiveContextTitle: "Browse the Western Portrait Photography Collection",
    archiveContextCopy:
      "Western portrait photography at K4 Studios is organized by four portrait routes: color cowboy portraits, black and white cowboy portraits, Native American portrait work, and black and white Native American portraits.\n\nThe individual portrait pages carry the decision details: who the image holds, how the print scales, what formats are available, and whether a signed limited edition is offered for collector walls. Questions about a specific portrait? Contact wayne@k4studios.com.",
  }),
  westernStorytellingPhotography: makePage({
    pagePath: "/western-storytelling-photography",
    label: "Western Storytelling Photography",
    title: "Western Storytelling Photography - Fine Art Prints by Wayne Heim",
    subject: "Western narrative scenes, frontier storytelling, cinematic cowboy images, and old-West moments where a single frame carries a before and after",
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
    layoutVariant: "cinematic-concept-series-top",
    commercialH1: "Four Ways a Still Frame Carries Story",
    seoTitle: "Western Storytelling Photography - Narrative Fine Art Prints",
    seoDescription:
      `Western storytelling photography by Wayne Heim. Frontier narrative scenes, cinematic cowboy images, and old-West moments where one frame implies a larger story. Fine art prints from ${sketchPrintPrice}.`,
    deck:
      "Four series, {catalogImageCount} works: Western storytelling photography organized around the held moment - color frontier narratives, black and white narratives, cowboy portraits, and monochrome character studies where the frame implies more than it explains.",
    gatewayKicker: "K4 Studios - Western Storytelling Photography",
    gatewayIntroCopy:
      "Western storytelling photography begins with the unfinished moment.",
    gatewaySupportingCopy:
      `A storytelling photograph does not simply show what was in front of the camera. It implies what happened before the frame, what may happen after it, and what emotional pressure lives inside the visible moment. In Western work, that pressure often comes from posture, distance, weather, silence, gesture, and the land pressing back on the figure.\n\nWayne Heim's Western storytelling photography is built around that unresolved pressure. These images begin as photography, then are shaped through a painterly process into fine art prints that feel closer to one-image movies than static records. The story is not packed into a caption. It lives in what the frame withholds.\n\nA storytelling print has to survive repeat viewing, so format matters. Sketch Series pieces begin at ${getFormattedLowestStandardPrintPrice()} for smaller spaces and close reading; archival paper editions give the scene more room to breathe; selected Chronicle and Legend works add signed numbering and certificates for collector walls. When wood grain can act like part of the buried story, certain images may also appear as Signature Engrained Series natural Baltic Birch panels.`,
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    descriptions: {
      narrativeColor:
        "Start with color Western narrative scenes when the work needs atmosphere, light, motion, and the feeling of a story continuing beyond the visible frame.",
      narrativeBlackWhite:
        "Black and white Western narratives remove color and ask shadow, posture, silence, and implication to carry the story pressure.",
      cowboyColor:
        "Color cowboy portraits become storytelling photography when the figure feels caught inside a larger life, not merely posed as a Western type.",
      cowboyBlackWhite:
        "Black and white cowboy portraits are the quietest storytelling route here, built around face, posture, tone, and what the subject refuses to explain.",
    },
    conceptBlock1Title: "THE MOMENT HOLDS",
    conceptBlock1Copy:
      "The frame holds because it refuses to settle. A before and after are both present, but neither is handed to the viewer. That is the doorway into Western storytelling photography: one image carrying the pressure of a larger scene without resolving it too quickly.\n\nIn Wayne Heim's work, gesture, spacing, directional light, and atmosphere carry that pressure. The still image is complete, but it does not feel finished because the viewer has to participate in what remains unwritten.",
    conceptBlock2Title: "WHAT THE FRAME WITHHOLDS",
    conceptBlock2Copy:
      "Black and white storytelling photography makes the withholding more severe. Without color warmth, the story has to live in distance, gaze, posture, shadow, and the way the environment presses against the subject.\n\nIn Western storytelling photography, the landscape or room is never just background. Scale, weather, doorway, dust, lamplight, and silence become part of the narrative structure. Nothing is there only to decorate the frame.",
    conceptBlock3Title: "THE PORTRAIT AS STORY",
    conceptBlock3Copy:
      "A cowboy portrait becomes storytelling photography when it moves past costume. Hat, coat, horse, rifle, and period setting can establish the West, but they do not create story on their own.\n\nThe story begins when the person in the frame seems to carry motive, consequence, memory, or a decision not yet spoken. A portrait can imply an entire life if posture, light, expression, and restraint leave enough room for the viewer to enter.",
    conceptBlock4Title: "THE QUIET UNRESOLVED",
    conceptBlock4Copy:
      "Black and white cowboy portraits are the most restrained storytelling works on this page. They do not depend on action. Often the stiller image carries more pressure than the active one.\n\nThese works are built for return. The viewer sees more on the second look because the frame never spends everything on the first one. That is part of their collector weight: the image stays active because the story never closes.",
    archiveContextTitle: "Browse the Western Storytelling Photography Collection",
    archiveContextCopy:
      "Western storytelling photography at K4 Studios is organized by four ways a single frame can carry narrative pressure: color frontier scenes, black and white frontier scenes, color cowboy portraits, and black and white cowboy portraits.\n\nWhen an image creates the right unfinished question, open it for the authored story, available sizes, print format, and collector information. The goal is not just to choose a scene, but to choose the story you want living on the wall. Questions about a specific storytelling print? Contact wayne@k4studios.com.",
  }),
  westernWallArtForInteriorDesigners: makePage({
    pagePath: "/Western-Wall-Art-for-Interior-Designers",
    label: "Western Wall Art for Interior Designers",
    title: "Western Wall Art for Interior Designers - Fine Art Prints by Wayne Heim",
    subject: "Western wall art selected for interior designers, including portraits, frontier narrative pieces, landscapes, mountain prints, and room-scaled collector works for project sourcing",
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
    categoryCrumb: { href: "/Western-Wall-Art", name: "Western Wall Art" },
    layoutVariant: "cinematic-concept-series-top",
    commercialH1: "Project Routes for Western Wall Art",
    seoTitle: "Western Wall Art for Interior Designers - Fine Art Prints",
    seoDescription:
      `Western wall art for interior designers by Wayne Heim. Project-ready cowboy portraits, frontier narratives, Western landscapes, mountain prints, and fine art print options from ${sketchPrintPrice}.`,
    deck:
      "Five series, {catalogImageCount} works: Western fine art prints organized for design projects - human anchors, narrative statement pieces, open-country landscapes, mountain scale, and water studies for rooms that need Western presence without theme decor.",
    gatewayKicker: "K4 Studios - Western Wall Art for Interior Designers",
    gatewayIntroCopy:
      "Interior designers are not just choosing Western art. They are managing scale, palette, client identity, and the risk of theme.",
    gatewaySupportingCopy:
      `A Western piece can solve a room, or it can push the room into costume. The difference usually comes down to specification: subject, scale, substrate, color temperature, sightline, and how much narrative pressure the project can carry.\n\nDesigners, decorators, hospitality buyers, and project teams often need Western wall art with authorship rather than generic inventory. Wayne Heim's images begin as photography, then are shaped through a painterly process into fine art prints with atmosphere, story, and room presence. The work can support ranch homes, lodge interiors, offices, restaurants, boutique hospitality spaces, and contemporary rooms that need Western identity without visual noise.\n\nFor design work, the practical choice is format first, image second, scale third. Sketch Series prints begin at ${getFormattedLowestStandardPrintPrice()} for small placements and art groupings; archival paper editions cover the main wall-art need; selected signed Chronicle and Legend editions bring numbered certificates for collector-level projects. When the room calls for an object rather than a framed print, some images can shift into Signature Engrained Series natural Baltic Birch panels for a more material, rustic presentation.`,
    collectionIntro: "",
    gridIntroTitle: "",
    gridIntroCopy: "",
    descriptions: {
      cowboyColor:
        "Use color cowboy portraits when a project needs a human anchor: a face, stance, and direct Western presence strong enough for entries, offices, restaurants, lodge walls, and ranch interiors.",
      narrativeColor:
        "Color frontier narrative pieces work as statement art when a room can carry story, warmth, movement, and a scene that gives guests something to read beyond the first glance.",
      landscapeWest:
        "Western landscapes are the spacing tool. They bring horizon, weather, air, and distance into rooms that need the West without another figure or object.",
      mountains:
        "Mountain prints are for scale decisions: stairwells, fireplace elevations, tall walls, conference rooms, lodge entries, and architecture that needs vertical authority.",
      water:
        "Water and waterfall prints soften the Western register for projects that need movement, reflection, cooler tone, or a calming counterweight to leather, wood, stone, and darker furnishings.",
    },
    conceptBlock1Title: "THE SPECIFICATION PROBLEM",
    conceptBlock1Copy:
      "Western wall art for a design project has to survive more questions than a personal purchase. Does it match the client brief without becoming themed? Does it carry the wall at the intended size? Does it work with leather, stone, wood, linen, metal, or contemporary neutrals? Does the subject support the room's function?\n\nThat is the specification problem. The right image does not simply look Western. It resolves a design decision: human presence, story, distance, scale, or atmosphere.",
    conceptBlock2Title: "THE STATEMENT WALL",
    conceptBlock2Copy:
      "Narrative Western art is the strongest choice when a project needs a statement wall with more than decorative mood. A frontier scene gives the room a before and after, a sense of consequence, and a reason for the viewer to pause.\n\nFor hospitality, office, lodge, and ranch-house projects, narrative work can carry brand identity without relying on signage or obvious theme cues. It lets the room feel Western through story rather than props.",
    conceptBlock3Title: "THE NEGATIVE SPACE",
    conceptBlock3Copy:
      "Designers often need Western art that opens a room instead of filling it with more subject matter. Western landscapes do that well. A horizon line, weather system, open field, or distant mountain can create breath in a room with strong furniture or heavy materials.\n\nLandscape prints are especially useful when the room already has enough human imagery, pattern, or object weight. They give the project Western atmosphere without making every wall speak at the same volume.",
    conceptBlock4Title: "THE ARCHITECTURAL WALL",
    conceptBlock4Copy:
      "Mountain prints solve vertical problems. They can hold stairwells, fireplace walls, double-height entries, conference rooms, and lodge architecture because the subject already carries structure upward.\n\nFor designers, the question is not only image preference. It is whether the artwork reinforces the architecture. A mountain piece can make a tall wall feel intentional rather than empty.",
    conceptBlock5Title: "THE SOFTENING ELEMENT",
    conceptBlock5Copy:
      "Not every Western project needs more leather, dust, or warm light. Water and waterfall prints bring movement and cooler tone into rooms that could otherwise become too heavy.\n\nUse water when the project needs calm, reflection, or a visual pause between stronger Western subjects. It can keep a ranch, lodge, office, or hospitality space from becoming one-note while still staying inside the Western landscape language.",
    archiveContextTitle: "Browse Western Wall Art for Interior Designers",
    archiveContextCopy:
      "Western wall art for interior designers at K4 Studios is organized by project need: human anchor, narrative statement, open-country spacing, mountain scale, or water and reflection.\n\nUse the individual image pages to choose the practical presentation: archival paper for framed installations, selected signed limited editions when a project needs provenance, or Signature Engrained Series natural Baltic Birch panels when the room needs a more object-based rustic surface. Need help choosing size, subject, or format for a room? Contact wayne@k4studios.com for a complimentary mockup.",
    faqItems: designerWallArtFaq,
  }),
};
