import { _ as __vite_glob_0_26, a as __vite_glob_0_25, b as __vite_glob_0_24, c as __vite_glob_0_23, d as __vite_glob_0_22, e as __vite_glob_0_21, f as __vite_glob_0_20, g as __vite_glob_0_19, h as __vite_glob_0_18, i as __vite_glob_0_17, j as __vite_glob_0_16, k as __vite_glob_0_15, l as __vite_glob_0_12, m as __vite_glob_0_11, n as __vite_glob_0_10, o as __vite_glob_0_9, p as __vite_glob_0_8, q as __vite_glob_0_7, r as __vite_glob_0_2, s as __vite_glob_0_1, t as __vite_glob_0_0, F as FAQAccordion, L as LandingRightImages, T as TombstoneNav, I as ImageBar2, u as LandingHeader } from '../../../../chunks/FAQAccordion_yZwMAX2c.mjs';
import { _ as __vite_glob_0_3 } from '../../../../chunks/Black-White_KdVP8gLQ.mjs';
import { _ as __vite_glob_0_4 } from '../../../../chunks/Color_B0tZ5rnE.mjs';
import { _ as __vite_glob_0_5 } from '../../../../chunks/Black-White_CacyG34n.mjs';
import { _ as __vite_glob_0_6 } from '../../../../chunks/Color_D9UJrp0k.mjs';
import { _ as __vite_glob_0_13 } from '../../../../chunks/Black-White_BdpB_JkH.mjs';
import { _ as __vite_glob_0_14 } from '../../../../chunks/Color_CB1i983B.mjs';
import { c as createComponent, d as createAstro, i as renderComponent, k as renderSlot, r as renderTemplate, f as addAttribute, u as unescapeHTML, m as maybeRenderHead } from '../../../../chunks/astro/server_DU4U1nxe.mjs';
import 'kleur/colors';
import { a as $$BaseLayout, s as siteNav, $ as $$Footer } from '../../../../chunks/Footer_DDl_rOo7.mjs';
import { a as autoLinkKeywordsInText } from '../../../../chunks/autoLinkKeywordsInText_DPtl50UX.mjs';
/* empty css                                         */
/* empty css                                                        */
/* empty css                                                             */
export { renderers } from '../../../../renderers.mjs';

function getFeatheredImages({
  sectionPath,
  headingCount,
  excludeIds = /* @__PURE__ */ new Set(),
  galleryDatas = [],
  minRating = 4,
  fallbackMin = 3
}) {
  function filterAndSort(data, count) {
    const strong = data.filter((img) => !excludeIds.has(img.id) && (img.rating ?? 0) >= minRating);
    const fallback = data.filter((img) => !excludeIds.has(img.id) && (img.rating ?? 0) >= fallbackMin);
    const all = data.filter((img) => !excludeIds.has(img.id));
    const source = strong.length >= count ? strong : fallback.length >= count ? fallback : all;
    return source.sort(() => 0.5 - Math.random()).slice(0, count);
  }
  const half = Math.floor(headingCount / 2);
  const extra = headingCount % 2;
  const colorGallery = Array.isArray(galleryDatas[0]) ? galleryDatas[0] : [];
  const bwGallery = Array.isArray(galleryDatas[1]) ? galleryDatas[1] : [];
  const colorImages = filterAndSort(colorGallery, half + extra);
  colorImages.forEach((img) => excludeIds.add(img.id));
  const bwImages = filterAndSort(bwGallery, half);
  bwImages.forEach((img) => excludeIds.add(img.id));
  const output = [];
  for (let i = 0; i < headingCount; i++) {
    if (i % 2 === 0 && colorImages.length) {
      output.push(colorImages.shift());
    } else if (bwImages.length) {
      output.push(bwImages.shift());
    } else if (colorImages.length) {
      output.push(colorImages.shift());
    }
  }
  return output.map((img) => ({
    ...img,
    href: `${sectionPath}/i-${img.id}`
  }));
}

const landingWestern = {
  title: "Western Cowboy Portraits",
  subtitle: "Painterly Cowboy & Western Art by Wayne Heim",
  breadcrumb: "Facing History: Western Cowboy Portraits",
  tombstones: [
    {
      title: "Color Cowboy Art",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color",
      thumb: "/images/tombstones/cowboy-c-ts.jpg"
    },
    {
      title: "Black & White Cowboy",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White",
      thumb: "/images/tombstones/cowboy-bw-ts.jpg"
    },
    {
      title: "Engrained Series",
      href: "/Other/Print-Options/Prints-on-Wood",
      thumb: "/images/tombstones/engrained-ts.jpg"
    }
  ]
};

const westernStory = [
  /* ───────────────────────────────────────────── 1 */
  {
    breadcrumb: "Western Cowboy Portraits | Color",
    title: "Cowboy Art & Western Photography by Wayne Heim",
    subhead: "Ride into the Wild West",
    tagline: "Western Art Prints & Cowboy Art That Tells a Story",
    paragraphs: [
      `Step into the dusty plains of the American frontier — where <strong>Western art</strong> comes alive in shadow and story. In Wayne Heim’s cowboy art prints, the Wild West isn’t just a backdrop — it’s a character with grit, grace, and a voice of its own.`,
      `Through richly textured compositions, Wayne blurs the line between fine art Western photography and painterly storytelling, inviting you to experience the raw beauty of cowboy artwork, the haunting allure of black and white cowboy art, and the rustic charm of Western wall art and décor.`
    ]
  },
  /* ───────────────────────────────────────────── 2 */
  {
    subhead: "Painterly Photography",
    tagline: "The Art of Storytelling in Every Frame",
    paragraphs: [
      `The American frontier wasn’t just a place — it was a world of dust and dreams, grit and grandeur. And in Wayne Heim’s work, it’s more than a backdrop — it’s a living, breathing character brought to life through painterly photography that blurs the line between photo and painting.`,
      `Drawing inspiration from legendary Western artists like <strong>Frederic Remington</strong>, Wayne’s work evokes the timeless atmosphere of the Old West while capturing the raw, untamed spirit of the frontier. An award-winning medical illustrator and fine art photographer, Wayne brings a trained eye for anatomy, lighting, and narrative detail to every image.`
    ],
    list: [
      `<strong>Painterly Technique:</strong> Each image is meticulously crafted to echo the emotion and texture of classic Western art — through a fine art lens.`,
      `<strong>Emotional Realism:</strong> The painterly process infuses every frame with timeless storytelling and cinematic presence.`,
      `<strong>Transcending Time:</strong> The boundary between past and present softens — inviting you to step inside the scene.`
    ]
  },
  /* ───────────────────────────────────────────── 3 */
  {
    subhead: "Painterly Cowboy Art in Vivid Color",
    tagline: "Western Art Prints That Pop",
    paragraphs: [
      `While black and white cowboy art offers gritty elegance, Wayne Heim’s vivid painterly cowboy artwork in full color brings the sun-soaked vibrancy of the West to your walls.`
    ],
    list: [
      `<strong>Golden Prairie Sunsets:</strong> Evening light dancing with dust across wide horizons.`,
      `<strong>Crimson Cliffs &amp; Painted Skies:</strong> Red rock backdrops that pulse with the warmth of dusk.`,
      `<strong>Weathered Faces, Bold Stories:</strong> Painterly portraits that reveal every crease, every tale.`
    ]
  },
  /* ───────────────────────────────────────────── 4 */
  {
    subhead: "Black and White Cowboy Art",
    tagline: "Sepia & Monochrome Cowboy Wall Decor",
    paragraphs: [
      `Before the West was rendered in Technicolor, it lived in shadows and sepia. Wayne’s black and white cowboy art captures that spirit with painterly restraint — timeless, textured, and true to the era.`
    ],
    list: [
      `<strong>Grit &amp; Grain:</strong> Monochrome pulls every ounce of emotion from the subject’s eyes.`,
      `<strong>Frontier Aesthetic:</strong> Classic tones meet modern storytelling.`,
      `<strong>Perfect for Rustic Spaces:</strong> These images ground a room in authenticity and soul.`
    ]
  },
  /* ───────────────────────────────────────────── 5 */
  {
    subhead: "Gold Rush Dreams",
    tagline: "Fortune, Failure, and Frontier Art Prints",
    paragraphs: [
      `Long before the West was mythologized, it was a place of hunger and hope. Wayne’s Western art prints explore the lives of dreamers and drifters through richly imagined painterly portraits.`
    ],
    list: [
      `<strong>Driven by Gold:</strong> Eyes fixed westward, filled with ambition and fear.`,
      `<strong>Based on Real Reenactors:</strong> Models rooted in historical truth, not fantasy.`,
      `<strong>Visual History:</strong> These aren't scenes from Hollywood — they’re homages to the forgotten.`
    ]
  },
  /* ───────────────────────────────────────────── 6 */
  {
    subhead: "The Engrained Series",
    tagline: "Rustic Wall Art Etched in Wood",
    paragraphs: [
      `The Engrained Series transforms Wayne’s cowboy photography into handcrafted <strong>Western wall decor</strong> by printing selected pieces directly onto Baltic Birch wood panels. The result is both tactile and timeless — painterly cowboy art that feels carved from the era itself.`
    ]
  },
  /* ───────────────────────────────────────────── 7 */
  {
    subhead: "Own a Chapter of the Wild West",
    tagline: "Western Art Prints for Rustic Decor",
    paragraphs: [
      `Every piece Wayne Heim creates carries a story — a visual relic from the past preserved in light and tone. Explore more historically inspired photography through the <strong>Facing History</strong> series.`
    ],
    list: [
      `<strong>Authentic Detail:</strong> Reenactor-based models, hand-researched props, and historical accuracy throughout.`,
      `<strong>Collector-Worthy:</strong> Made for lovers of the Old West and fans of fine art with meaning.`,
      `<strong>Perfect for Interior Design:</strong> Add heritage, texture, and character to cabins, lodges, and offices.`
    ]
  },
  /* ───────────────────────────────────────────── 8 */
  {
    subhead: "Embrace the Past… Live the Story.",
    paragraphs: [
      `Let Wayne Heim’s work bring the spirit of the American frontier into your space — where every print is more than an image… it's a portal to a world long gone but not forgotten.`
    ]
  }
];

const westernFAQ = [
  {
    q: "What makes Wayne Heim's cowboy art prints different from typical Western photography?",
    a: [
      `Wayne blends painterly photo techniques with decades of artistic training to create imagery that feels more like a story than a snapshot. As both an <a href="https://heimmedicalart.com" target="_blank" rel="noopener">award-winning medical illustrator</a> and fine art photographer, he brings a rare mix of anatomical precision, lighting expertise, and narrative instinct to every portrait.`,
      `These aren't filters or digital gimmicks — each image is built through intentional post-processing, rooted in <strong>historical research</strong> and designed to evoke the emotional texture of <a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits">classic cowboy art</a>.`
    ]
  },
  {
    q: "Are the portraits based on real people or fictional characters?",
    a: [
      `Every figure you see is a real person — often a skilled reenactor or living historian — chosen for their authenticity and deep understanding of the time period.`,
      `They're featured throughout the <a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History">Facing History</a> collection — visual tributes to real-life legacies of the American West.`
    ]
  },
  {
    q: "How are the cowboy art prints produced?",
    a: [
      `Wayne offers museum-quality prints in a variety of formats:`,
      `<ul>
        <li>Archival photographic paper with traditional or deckled edges</li>
        <li>Sleek aluminum panels for contemporary spaces</li>
        <li>Baltic Birch wood panels as part of the <a href="/Other/K4-Select-Series/Engrained">Engrained Series</a></li>
      </ul>`,
      `Each piece is printed with precision to preserve painterly detail, color depth, and tonal richness.`
    ]
  },
  {
    q: "Do you offer both color and black and white cowboy portraits?",
    a: [
      `Yes. Wayne's <a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White">black and white cowboy art</a> taps into the timeless feel of vintage Western photography — while his color work adds painterly warmth and cinematic impact.`,
      `Both approaches share the same painterly process and emotional resonance, offering different moods for collectors, galleries, or interior decor projects.`
    ]
  },
  {
    q: "Are these prints good for Western interior design or commercial spaces?",
    a: [
      `Absolutely. These <a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits">cowboy art prints</a> are ideal for rustic, Western, or Americana-themed interiors — including:`,
      `<ul>
        <li>Cabins, lodges, and ranch homes</li>
        <li>Restaurants, saloons, and hotels with a Western flair</li>
        <li>Corporate offices looking for unique fine art with heritage</li>
        <li>Historical museums or curated public exhibits</li>
      </ul>`,
      `The <a href="/Other/K4-Select-Series/Engrained">Engrained wood-mounted series</a> is especially popular for adding warmth and texture to feature walls.`
    ]
  },
  {
    q: "How can I purchase a Western cowboy portrait print?",
    a: [
      `Visit the <a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits">gallery page</a> to browse available prints. Each product listing includes sizes and materials — or you can <a href="#contact">contact Wayne</a> for custom formats, collector editions, or bulk orders for hospitality and design firms.`
    ]
  },
  {
    q: "What types of cowboy artwork are featured in the Engrained Series?",
    a: [
      `The <a href="/Other/K4-Select-Series/Engrained">Engrained Series</a> includes select cowboy portraits printed directly onto wood using a multi-layer UV process.`,
      `This preserves fine photographic detail while allowing the wood grain to show through in places — creating a hybrid of art photography and rustic Western wall decor.`
    ]
  },
  {
    q: "Can I order custom sizes or finishes for my cowboy art prints?",
    a: [
      `Yes. Whether you're designing for a gallery wall, a commercial lobby, or a collector's cabin, Wayne can accommodate:`,
      `<ul>
        <li>Oversized statement pieces</li>
        <li>Diptychs or multi-panel displays</li>
        <li>Finish options like matte, gloss, metallic, or handcrafted wood</li>
      </ul>`,
      `<a href="/Contact">Contact Wayne directly</a> to start the conversation.`
    ]
  }
];

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Astro = createAstro();
const $$WesternCowboyPortraits = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$WesternCowboyPortraits;
  const sectionPath = "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits";
  function findNavEntry(nav, url) {
    for (const entry of nav) {
      if (entry.href === url) return entry;
      if (entry.children) {
        const found = findNavEntry(entry.children, url);
        if (found) return found;
      }
    }
    return null;
  }
  const landingNav = findNavEntry(siteNav, sectionPath);
  const galleryPaths = landingNav?.children?.filter(
    (c) => /\/Color$|\/Black-White$/.test(c.href)
  ).map((c) => c.href) || [];
  const allGalleryData = /* #__PURE__ */ Object.assign({"../../../../data/galleries/Fine-Art-Photography/Landscapes/By-Theme/Mountains/Mountains.mjs": __vite_glob_0_0,"../../../../data/galleries/Fine-Art-Photography/Landscapes/By-Theme/Sunsets/Sunsets.mjs": __vite_glob_0_1,"../../../../data/galleries/Fine-Art-Photography/Landscapes/By-Theme/Water/Water.mjs": __vite_glob_0_2,"../../../../data/galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Black-White.mjs": __vite_glob_0_3,"../../../../data/galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color.mjs": __vite_glob_0_4,"../../../../data/galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White.mjs": __vite_glob_0_5,"../../../../data/galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color.mjs": __vite_glob_0_6,"../../../../data/galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White.mjs": __vite_glob_0_7,"../../../../data/galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color.mjs": __vite_glob_0_8,"../../../../data/galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White.mjs": __vite_glob_0_9,"../../../../data/galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color.mjs": __vite_glob_0_10,"../../../../data/galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Black-White.mjs": __vite_glob_0_11,"../../../../data/galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Color.mjs": __vite_glob_0_12,"../../../../data/galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs": __vite_glob_0_13,"../../../../data/galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs": __vite_glob_0_14,"../../../../data/galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/International/Gallery.mjs": __vite_glob_0_15,"../../../../data/galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Midwest/Gallery.mjs": __vite_glob_0_16,"../../../../data/galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Northeast/Gallery.mjs": __vite_glob_0_17,"../../../../data/galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery.mjs": __vite_glob_0_18,"../../../../data/galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains/Mountains.mjs": __vite_glob_0_19,"../../../../data/galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water/Water.mjs": __vite_glob_0_20,"../../../../data/galleries/Painterly-Fine-Art-Photography/Miscellaneous/Portraits.mjs": __vite_glob_0_21,"../../../../data/galleries/Painterly-Fine-Art-Photography/Transportation/Cars.mjs": __vite_glob_0_22,"../../../../data/galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Black-White.mjs": __vite_glob_0_23,"../../../../data/galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Color.mjs": __vite_glob_0_24,"../../../../data/galleries/zPainterly-Western-Cowboy-Portraits/BlackWhite.mjs": __vite_glob_0_25,"../../../../data/galleries/zPainterly-Western-Cowboy-Portraits/Color.mjs": __vite_glob_0_26});
  const galleryDatas = galleryPaths.map((path) => {
    const filePath = "../../../../data/galleries" + path.replace(/^\/Galleries/, "") + ".mjs";
    return allGalleryData[filePath]?.galleryData || [];
  });
  const headingCount = westernStory.filter((block, i) => i > 0 && block.subhead).length;
  const featheredImages = getFeatheredImages({ sectionPath, headingCount, galleryDatas });
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": `${landingWestern.title} \u2013 ${landingWestern.subtitle}`, "data-astro-cid-wilt3whu": true }, { "default": ($$result2) => renderTemplate(_a || (_a = __template([" ", '<main class="bg-[#fdfcf9] text-[#2c2c2c] font-serif min-h-screen overflow-x-hidden" data-astro-cid-wilt3whu> <div class="drawer-mode" data-astro-cid-wilt3whu> ', ' </div> <div class="mobile-breadcrumb-wrapper" data-astro-cid-wilt3whu> <div class="mobile-breadcrumb" data-astro-cid-wilt3whu> ', ' </div> </div> <div class="w-full max-w-[1200px] mx-auto px-4" data-astro-cid-wilt3whu> <div class="carousel-fade reveal-on-scroll" data-astro-cid-wilt3whu> ', ' </div> </div> <section class="section-heading-wrap" data-astro-cid-wilt3whu> <div class="section-heading" data-astro-cid-wilt3whu> <h1 class="page-title fade-in reveal-on-scroll" data-astro-cid-wilt3whu> ', ' </h1> <h2 class="page-subtitle fade-in reveal-on-scroll" data-astro-cid-wilt3whu> ', ' </h2> </div> </section> <div class="py-5" data-astro-cid-wilt3whu> ', ' </div> <section class="story-layout" data-astro-cid-wilt3whu> <div class="text-column" data-astro-cid-wilt3whu> <section class="story-section" data-astro-cid-wilt3whu> ', " </section> ", ' </div> <div class="sidebar-column hidden md:block" data-astro-cid-wilt3whu> <div class="sample-fade reveal-on-scroll" data-astro-cid-wilt3whu> ', ' </div></div> </section> <section class="pb-16" data-astro-cid-wilt3whu> <input type="checkbox" id="faq-toggle" class="more-toggle" data-astro-cid-wilt3whu> <div class="truncate-container" data-astro-cid-wilt3whu> <div class="truncate-text" data-astro-cid-wilt3whu> ', ' </div> </div> <label for="faq-toggle" class="more-toggle-label" data-astro-cid-wilt3whu></label> </section> ', ' </main> <script>\n  document.addEventListener("DOMContentLoaded", () => {\n    // Reveal-on-scroll logic\n    const els = document.querySelectorAll(".reveal-on-scroll, .slide-in-left");\n    if ("IntersectionObserver" in window) {\n      const observer = new IntersectionObserver(entries => {\n        entries.forEach(entry => {\n          if (entry.isIntersecting) {\n            entry.target.classList.add("is-visible");\n            observer.unobserve(entry.target);\n          }\n        });\n      }, {\n        threshold: 0.15\n      });\n      els.forEach(el => observer.observe(el));\n    }\n\n    // NEW: auto-expand FAQ box if a question is clicked\n    const faqToggle = document.getElementById("faq-toggle");\n    const truncateContainer = document.querySelector(".truncate-container");\n\n    if (truncateContainer && faqToggle) {\n      truncateContainer.addEventListener("click", (e) => {\n        const summaryClicked = e.target.closest("summary");\n        if (summaryClicked && !faqToggle.checked) {\n          faqToggle.checked = true;\n        }\n      });\n    }\n  });\n<\/script>  '])), maybeRenderHead(), renderComponent($$result2, "LandingHeader", LandingHeader, { "client:load": true, "breadcrumb": "Facing History \u2022 Western Cowboy Portraits", "client:component-hydration": "load", "client:component-path": "C:/Users/Wayne/Documents/GitHub/K4-Studios/src/components/Landing-Header.jsx", "client:component-export": "default", "data-astro-cid-wilt3whu": true }), landingWestern.breadcrumb, renderComponent($$result2, "ImageBar2", ImageBar2, { "client:load": true, "client:component-hydration": "load", "client:component-path": "C:/Users/Wayne/Documents/GitHub/K4-Studios/src/components/ImageBar2.jsx", "client:component-export": "default", "data-astro-cid-wilt3whu": true }), landingWestern.title, landingWestern.subtitle, renderComponent($$result2, "TombstoneNav", TombstoneNav, { "items": landingWestern.tombstones, "data-astro-cid-wilt3whu": true }), westernStory.map((section, index) => renderTemplate`<article class="story-block"${addAttribute(index, "key")} data-astro-cid-wilt3whu> ${section.title && renderTemplate`<h2 class="slide-in-left" data-astro-cid-wilt3whu>${unescapeHTML(autoLinkKeywordsInText(section.title, galleryDatas, featheredImages, galleryPaths))}</h2>`} ${section.subhead && renderTemplate`<h3 class="slide-in-left" data-astro-cid-wilt3whu>${unescapeHTML(autoLinkKeywordsInText(section.subhead, galleryDatas, featheredImages, galleryPaths))}</h3>`} ${section.tagline && renderTemplate`<h4 class="tagline reveal-on-scroll" data-astro-cid-wilt3whu>${unescapeHTML(autoLinkKeywordsInText(section.tagline, galleryDatas, featheredImages, galleryPaths))}</h4>`} ${section.paragraphs?.map((para, i) => renderTemplate`<p${addAttribute(i, "key")} class="reveal-on-scroll" data-astro-cid-wilt3whu>${unescapeHTML(autoLinkKeywordsInText(para, galleryDatas, featheredImages, galleryPaths))}</p>`)} ${section.list && section.list.length > 0 && renderTemplate`<ul data-astro-cid-wilt3whu> ${section.list.map((item, j) => renderTemplate`<li${addAttribute(j, "key")} class="reveal-on-scroll" data-astro-cid-wilt3whu>${unescapeHTML(autoLinkKeywordsInText(item, galleryDatas, featheredImages, galleryPaths))}</li>`)} </ul>`} </article>`), renderComponent($$result2, "MobileStoryImages", null, { "client:only": "react", "images": featheredImages, "client:component-hydration": "only", "data-astro-cid-wilt3whu": true, "client:component-path": "C:/Users/Wayne/Documents/GitHub/K4-Studios/src/components/MobileStoryImages.jsx", "client:component-export": "default" }), renderComponent($$result2, "LandingRightImages", LandingRightImages, { "heading": "Featured Portraits", "images": featheredImages.slice(0, 5), "data-astro-cid-wilt3whu": true }), renderComponent($$result2, "FAQAccordion", FAQAccordion, { "items": westernFAQ, "data-astro-cid-wilt3whu": true }), renderComponent($$result2, "SiteFooter", $$Footer, { "class": "pt-8 pb-12", "data-astro-cid-wilt3whu": true })) })} <div class="page-container" data-astro-cid-wilt3whu> ${renderSlot($$result, $$slots["default"])} </div> <div id="overlay-root" data-astro-cid-wilt3whu></div> `;
}, "C:/Users/Wayne/Documents/GitHub/K4-Studios/src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits.astro", void 0);

const $$file = "C:/Users/Wayne/Documents/GitHub/K4-Studios/src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits.astro";
const $$url = "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$WesternCowboyPortraits,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
