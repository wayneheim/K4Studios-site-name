// src/components/SectionKeywordSuggestions.jsx
// Section Keyword Assist Block — surfaces curated K4-Sem terms for the active gallery section
import { useMemo } from "react";
import { semantic as k4Semantic } from "../data/semantic/K4-Sem.ts";

/**
 * Convert gallery file path to comparable semantic path
 * e.g., "/src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs"
 *    -> "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color"
 */
function galleryPathToSemanticPath(galleryPath) {
  if (!galleryPath) return "";
  let p = galleryPath.replace(/\\/g, "/");
  // Strip /src/data prefix
  p = p.replace(/^\/src\/data/, "");
  // Strip .mjs extension
  p = p.replace(/\.mjs$/i, "");
  return p;
}

/**
 * Find best matching K4-Sem section for a gallery path.
 * Matches most specific path first (longest match wins).
 * Also includes parent sections for inherited phrases.
 */
function findMatchingSections(galleryPath) {
  const targetPath = galleryPathToSemanticPath(galleryPath);
  if (!targetPath) return [];

  const matches = [];

  for (const [key, section] of Object.entries(k4Semantic)) {
    if (!section?.path) continue;
    
    // Check if gallery path starts with or equals this semantic path
    // e.g., target "/Galleries/.../Western-Cowboy-Portraits/Color" matches section path "/Galleries/.../Western-Cowboy-Portraits"
    if (targetPath.startsWith(section.path) || targetPath === section.path) {
      matches.push({
        key,
        section,
        specificity: section.path.length, // longer = more specific
        exact: targetPath === section.path,
      });
    }
  }

  // Sort by specificity (most specific first)
  matches.sort((a, b) => b.specificity - a.specificity);
  
  return matches;
}

/**
 * Extract all phrases from matched sections
 * Filters by: rating >= minRating, use === true
 * Returns unique phrases sorted by specificity, then rating
 */
function extractPhrasesFromSections(matches, minRating = 3) {
  const phraseMap = new Map(); // phrase -> { phrase, rating, fromSection, specificity }

  // Process in order (most specific sections first due to prior sorting)
  for (let i = 0; i < matches.length; i++) {
    const { key, section, specificity } = matches[i];
    const allPhrases = [
      ...(section.imagePhrases || []),  // image phrases first (more relevant)
      ...(section.landingPhrases || []),
    ];

    for (const p of allPhrases) {
      // Skip if not usable or below rating threshold
      if (p.use === false || (p.rating ?? 0) < minRating) continue;
      
      const phraseKey = p.phrase?.toLowerCase?.().trim() ?? "";
      if (!phraseKey) continue;

      // Keep first occurrence (most specific section) or higher-rated version
      const existing = phraseMap.get(phraseKey);
      if (!existing) {
        phraseMap.set(phraseKey, {
          phrase: p.phrase, // preserve original casing
          rating: p.rating ?? 3,
          fromSection: key,
          specificity: specificity,
          sectionOrder: i, // lower = more specific section
        });
      } else if ((p.rating ?? 0) > existing.rating) {
        // Update rating if higher, but keep original section specificity
        phraseMap.set(phraseKey, { ...existing, rating: p.rating });
      }
    }
  }

  // Sort by: section specificity (most specific first), then rating, then alphabetically
  return Array.from(phraseMap.values()).sort((a, b) => {
    // Most specific section first (lower sectionOrder = more specific)
    if (a.sectionOrder !== b.sectionOrder) return a.sectionOrder - b.sectionOrder;
    // Then by rating (highest first)
    if (b.rating !== a.rating) return b.rating - a.rating;
    // Then alphabetically
    return a.phrase.localeCompare(b.phrase);
  });
}

/**
 * Normalize a keyword for comparison (lowercase, trimmed)
 */
function normalizeKeyword(kw) {
  return (kw || "").toLowerCase().trim();
}

/**
 * SectionKeywordSuggestions Component
 * 
 * Displays K4-Sem phrases for the current gallery section as clickable chips.
 * Clicking a chip adds it to the image's keyword list.
 * Already-applied keywords appear as "selected" (highlighted).
 */
export default function SectionKeywordSuggestions({
  galleryPath,
  currentKeywords = [],
  onAddKeyword,
  minRating = 3,
  darkMode = false,
  sectionOnly = false, // If true, only show phrases from the most specific matching section
}) {
  // Find matching K4-Sem sections for this gallery
  const allMatchingSections = useMemo(
    () => findMatchingSections(galleryPath),
    [galleryPath]
  );

  // If sectionOnly, limit to just the most specific section
  const matchingSections = useMemo(
    () => sectionOnly && allMatchingSections.length > 0 
      ? [allMatchingSections[0]] 
      : allMatchingSections,
    [allMatchingSections, sectionOnly]
  );

  // Extract all available phrases
  const availablePhrases = useMemo(
    () => extractPhrasesFromSections(matchingSections, minRating),
    [matchingSections, minRating]
  );

  // Normalize current keywords for comparison
  const appliedKeywordsSet = useMemo(() => {
    const set = new Set();
    for (const kw of currentKeywords) {
      set.add(normalizeKeyword(kw));
    }
    return set;
  }, [currentKeywords]);

  // If no sections match, show nothing
  if (matchingSections.length === 0 || availablePhrases.length === 0) {
    return null;
  }

  // Get section name for display
  const primarySection = matchingSections[0];
  const sectionLabel = primarySection?.key || "Section";

  const handleChipClick = (phrase) => {
    const normalized = normalizeKeyword(phrase);
    if (!appliedKeywordsSet.has(normalized)) {
      onAddKeyword?.(phrase);
    }
  };

  // Group phrases by section for visual organization
  const phrasesBySection = useMemo(() => {
    const groups = new Map();
    for (const p of availablePhrases) {
      const section = p.fromSection;
      if (!groups.has(section)) groups.set(section, []);
      groups.get(section).push(p);
    }
    return groups;
  }, [availablePhrases]);

  // Color scheme by rating (when not applied) - with dark mode variants
  const getRatingStyle = (rating) => {
    if (darkMode) {
      if (rating >= 5) return "bg-emerald-700 text-emerald-100 border-emerald-500 hover:bg-emerald-600 hover:border-emerald-400";
      if (rating >= 4) return "bg-sky-700 text-sky-100 border-sky-500 hover:bg-sky-600 hover:border-sky-400";
      return "bg-gray-600 text-gray-200 border-gray-500 hover:bg-gray-500 hover:border-gray-400";
    }
    if (rating >= 5) return "bg-emerald-100 text-emerald-900 border-emerald-400 hover:bg-emerald-200 hover:border-emerald-500";
    if (rating >= 4) return "bg-sky-100 text-sky-900 border-sky-400 hover:bg-sky-200 hover:border-sky-500";
    return "bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200 hover:border-stone-400";
  };

  // Container and text styles for dark/light mode
  const containerClass = darkMode 
    ? "mt-3 p-3 bg-gray-800 border border-gray-600 rounded-lg" 
    : "mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg";
  const headerClass = darkMode
    ? "text-xs text-amber-400 mb-2 font-medium"
    : "text-xs text-amber-800 mb-2 font-medium";
  const subHeaderClass = darkMode
    ? "text-amber-500 font-normal ml-1"
    : "text-amber-600 font-normal ml-1";
  const legendTextClass = darkMode ? "text-gray-400" : "";
  const dividerClass = darkMode 
    ? "mt-2 pt-2 border-t border-gray-600" 
    : "mt-2 pt-2 border-t border-amber-200";
  const sectionLabelClass = darkMode
    ? "text-[10px] text-gray-400 mb-1 uppercase tracking-wide"
    : "text-[10px] text-amber-600 mb-1 uppercase tracking-wide";

  return (
    <div className={containerClass}>
      <div className={headerClass}>
        K4-Sem Suggestions
        <span className={subHeaderClass}>— click to add</span>
      </div>
      <div className={`flex items-center gap-3 mb-2 text-[10px] ${legendTextClass}`}>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Rating 5</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-sky-500"></span> Rating 4</span>
        <span className="flex items-center gap-1"><span className={`w-3 h-3 rounded-full ${darkMode ? "bg-gray-500" : "bg-stone-300"}`}></span> Rating 3</span>
      </div>
      {Array.from(phrasesBySection.entries()).map(([sectionKey, phrases], groupIdx) => (
        <div key={sectionKey} className={groupIdx > 0 ? dividerClass : ""}>
          {phrasesBySection.size > 1 && (
            <div className={sectionLabelClass}>{sectionKey}</div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {phrases.map(({ phrase, rating }) => {
              const isApplied = appliedKeywordsSet.has(normalizeKeyword(phrase));
              return (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => handleChipClick(phrase)}
                  disabled={isApplied}
                  className={`
                    px-2 py-1 text-xs rounded-full border transition-all duration-150 cursor-pointer
                    ${isApplied
                      ? "bg-amber-600 text-white border-amber-700 cursor-default"
                      : getRatingStyle(rating)
                    }
                    ${rating >= 5 ? "font-semibold" : rating >= 4 ? "font-medium" : "font-normal"}
                  `}
                  title={isApplied ? "Already applied" : `Add "${phrase}" (rating: ${rating})`}
                >
                  {phrase}
                  {isApplied && <span className="ml-1">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
