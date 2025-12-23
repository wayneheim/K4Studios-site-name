// /src/utils/autoTextGenerator.mjs
// Browser-safe metadata generator derived from generate-unique-text.js
// Generates randomized titles, descriptions, stories, alt text, and keyword enrichments
// Uses K4-Sem.ts semantic data and section detection via datasetPath

import { semantic } from "../data/semantic/K4-Sem.ts";
import { siteNav } from "../data/siteNav.ts";

// Helper: capitalize words
function toTitleCase(str) {
  return str.replace(/\b\w/g, (l) => l.toUpperCase());
}

// Helper: random item
function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper: get multiple random phrases
function getUniquePhrases(phrases, count = 6) {
  const selected = [];
  if (!Array.isArray(phrases) || !phrases.length) return selected;
  while (selected.length < count) {
    selected.push(rand(phrases));
  }
  return selected;
}

// Detect section from path
function detectSection(datasetPath = "") {
  const lowerPath = datasetPath.toLowerCase();

  // 1️⃣ Try direct match to known semantic paths
  for (const [key, value] of Object.entries(semantic)) {
    if (value?.path && lowerPath.includes(value.path.toLowerCase())) {
      return { section: key, location: "" };
    }
  }

  // 2️⃣ Fall back to pattern logic (existing implementation)
  const result = { section: "cowboy", location: "" };
  if (lowerPath.includes("civil-war")) result.section = "civilwar";
  else if (lowerPath.includes("roaring-20s")) result.section = "roaring20s";
  else if (lowerPath.includes("wwii") && lowerPath.includes("machines")) result.section = "wwiiMenAndMachines";
  else if (lowerPath.includes("wwii") && lowerPath.includes("portraits")) result.section = "wwiiPortraits";
  else if (lowerPath.includes("wwii") && lowerPath.includes("art-of-war")) result.section = "wwiiArtOfWar";
  else if (lowerPath.includes("landscapes")) {
    result.section = "landscapes";
    if (lowerPath.includes("international")) result.location = "International";
    else if (lowerPath.includes("west")) result.location = "West";
    else if (lowerPath.includes("midwest")) result.location = "Midwest";
    else if (lowerPath.includes("northeast")) result.location = "Northeast";
    else if (lowerPath.includes("south")) result.location = "South";
    else if (lowerPath.includes("mountains")) result.location = "Mountains";
    else if (lowerPath.includes("water")) result.location = "Water";
    else if (lowerPath.includes("sunsets")) result.location = "Sunsets";
  } else if (lowerPath.includes("transportation")) result.section = "transportation";
  else if (lowerPath.includes("architecture")) result.section = "architecture";
  else if (lowerPath.includes("reenact")) result.section = "reenactors";
  else if (lowerPath.includes("wildlife")) result.section = "wildlife";
  else if (lowerPath.includes("engrained")) result.section = "engrained";
  else if (lowerPath.includes("miscellaneous")) result.section = "miscellaneous";
  return result;
}

// Core generator
export function generateSmartMetadata(item, datasetPath = "") {
  const { section, location } = detectSection(datasetPath);

  // Pick the right phrase pool
  let phrases =
    semantic?.[section]?.imagePhrases?.filter((p) => p.use)?.map((p) => p.phrase) || [];
  if (!phrases.length && semantic.cowboy) {
    phrases = semantic.cowboy.imagePhrases.filter((p) => p.use).map((p) => p.phrase);
  }

  const selected = getUniquePhrases(phrases, 6);
  const storyPhrases = getUniquePhrases(phrases, 4);

  // --- Title templates ---
  let titleTemplates;
  if (section === "landscapes") {
    titleTemplates = [
      () => location ? `${location} Landscape: ${selected[0]}` : `${selected[0]} Landscape`,
      () => location ? `Capturing ${selected[0]} in ${location}` : `Capturing ${selected[0]}`,
      () => location ? `${selected[0]} in ${location}` : `${selected[0]} in Fine Art`,
      () => location ? `Fine Art ${selected[0]} of ${location}` : `Fine Art ${selected[0]}`,
      () => location ? `${location} ${selected[0]} Study` : `${selected[0]} Study`,
      () => location ? `The Essence of ${selected[0]} in ${location}` : `The Essence of ${selected[0]}`,
      () => location ? `${selected[0]} Moment in ${location}` : `${selected[0]} Moment`,
      () => location ? `${selected[0]} - ${selected[1]} in ${location}` : `${selected[0]} - ${selected[1]}`,
      () => location ? `${selected[0]} and ${selected[1]} of ${location}` : `${selected[0]} and ${selected[1]}`,
      () => location ? `Exploring ${selected[0]} in ${location}` : `Exploring ${selected[0]}`,
    ];
  } else {
    titleTemplates = [
      () => `${selected[0]} Portrait`,
      () => `Capturing ${selected[0]}`,
      () => `${selected[0]} in Fine Art`,
      () => `Fine Art ${selected[0]}`,
      () => `${selected[0]} Study`,
      () => `The Essence of ${selected[0]}`,
      () => `${selected[0]} Moment`,
      () => `${selected[0]} - ${selected[1]}`,
      () => `${selected[0]} and ${selected[1]}`,
      () => `Exploring ${selected[0]}`,
    ];
  }
  const title = toTitleCase(rand(titleTemplates)());

  // --- Description templates ---
  const descTemplates = [
    () => `Discover the ${selected[0]} in this powerful ${selected[1]} by Wayne Heim${location ? ` from ${location}` : ""}. A compelling work that embodies ${selected[2]}, ${selected[3]}, and ${selected[4]}. Featuring ${selected[5]}, perfect for art lovers seeking ${selected[0]} to enhance their collection. © Wayne Heim`,
    () => `Experience ${selected[0]} through this evocative ${selected[1]} from Wayne Heim's portfolio${location ? ` of ${location}` : ""}. This piece highlights ${selected[2]} with ${selected[3]}, while conveying ${selected[4]}, ideal for those who appreciate ${selected[0]}. Explore ${selected[5]} in fine art. © Wayne Heim`,
    () => `Immerse yourself in ${selected[0]} with this stunning ${selected[1]} by Wayne Heim${location ? ` captured in ${location}` : ""}. Capturing ${selected[2]}, ${selected[3]}, and ${selected[4]}, it's a must-have for collectors of ${selected[0]}. Including ${selected[5]} themes. © Wayne Heim`,
    () => `This ${selected[0]} artwork by Wayne Heim showcases ${selected[1]} in a ${selected[2]} style${location ? ` from ${location}` : ""}. Reflecting ${selected[3]}, ${selected[4]}, and ${selected[0]}, it's suited for admirers of ${selected[1]}. With ${selected[5]} elements. © Wayne Heim`,
    () => `Wayne Heim's ${selected[0]} captures the spirit of ${selected[1]} in this ${selected[2]} image${location ? ` of ${location}` : ""}. Featuring ${selected[3]}, ${selected[4]}, and ${selected[0]}, it's ideal for ${selected[1]} enthusiasts. Discover ${selected[5]} in photography. © Wayne Heim`,
  ];
  const description = rand(descTemplates)();

  // --- Story templates (narrative, no copyright - that goes in description) ---
  const storyTemplates = [
    () => `This image embodies ${storyPhrases[0]} and ${storyPhrases[1]}, captured by Wayne Heim in his signature style${location ? ` in ${location}` : ""}. It reflects ${storyPhrases[2]} with a touch of ${storyPhrases[3]}.`,
    () => `Wayne Heim's exploration of ${storyPhrases[0]} comes alive in this piece, showcasing ${storyPhrases[1]} and ${storyPhrases[2]}${location ? ` from ${location}` : ""}. A testament to ${storyPhrases[3]} in fine art.`,
    () => `Delving into ${storyPhrases[0]}, this work by Wayne Heim highlights ${storyPhrases[1]} through ${storyPhrases[2]} and ${storyPhrases[3]}${location ? ` in ${location}` : ""}. A powerful statement in photography.`,
  ];
  const story = rand(storyTemplates)();

  // --- Alt templates ---
  const altTemplates = [
    () => `Fine art photography of ${selected[0]} by Wayne Heim`,
    () => `${selected[0]} in fine art photography`,
    () => `Wayne Heim's ${selected[0]} artwork`,
  ];
  const alt = rand(altTemplates)();

  // --- Keywords ---
  const existingKW = Array.isArray(item.keywords)
    ? item.keywords
    : String(item.keywords || "")
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

  const newKeywords = Array.from(new Set([...existingKW, ...selected, ...storyPhrases]));

  return {
    title,
    description,
    story,
    alt,
    keywords: newKeywords,
  };
}