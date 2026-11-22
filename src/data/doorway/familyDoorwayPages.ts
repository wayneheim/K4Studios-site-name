import { galleryData as gallery0_0 } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Color.mjs";
import { galleryData as gallery0_1 } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Black-White.mjs";
import { galleryData as gallery0_2 } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color.mjs";
import { galleryData as gallery0_3 } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White.mjs";
import { galleryData as gallery0_4 } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color.mjs";
import { galleryData as gallery0_5 } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White.mjs";
import { galleryData as gallery1_0 } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color.mjs";
import { galleryData as gallery1_1 } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White.mjs";
import { galleryData as gallery2_0 } from "@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains/Mountains.mjs";
import { galleryData as gallery2_1 } from "@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Sunsets/Sunsets.mjs";
import { galleryData as gallery2_2 } from "@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water/Water.mjs";
import { galleryData as gallery2_3 } from "@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/International/Gallery.mjs";
import { galleryData as gallery2_4 } from "@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Midwest/Gallery.mjs";
import { galleryData as gallery2_5 } from "@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Northeast/Gallery.mjs";
import { galleryData as gallery2_6 } from "@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/South/Gallery.mjs";
import { galleryData as gallery2_7 } from "@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery.mjs";
import { galleryData as gallery3_0 } from "@/data/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Color.mjs";
import { galleryData as gallery3_1 } from "@/data/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Black-White.mjs";
import { galleryData as gallery3_2 } from "@/data/Galleries/Painterly-Fine-Art-Photography/Transportation/Cars.mjs";
import { galleryData as gallery4_0 } from "@/data/Galleries/Painterly-Fine-Art-Photography/Miscellaneous/Portraits.mjs";

// Counts always follow public gallery visibility, including the placeholder guard.
const visible = (items: any[]) => items.filter(item => item?.id && item.id !== 'i-k4studios' && !['hidden', 'hide', 'ghost', 'non', 'none', ''].includes(String(item.visibility ?? 'show').trim().toLowerCase()));
type FamilySection = { title: string; slug: string; galleryPath: string; allHref: string; ctaLabel: string; items: any[]; limit: number };
type FamilySubject = { name: string; text: string; links: { href: string; label: string }[] };
function subjects(sections: FamilySection[], entries: [string, string, number[]][]): FamilySubject[] {
  return entries.map(([name, text, indices]) => ({ name, text, links: indices.map(index => ({ href: sections[index].galleryPath, label: sections[index].title })) }));
}
function makePage(path: string, heading: string, title: string, description: string, eyebrow: string, opening: string, technique: string, sections: FamilySection[], taxonomy: FamilySubject[]) {
  const faqItems = [
    { q: 'What is ' + heading.toLowerCase() + ' and how is it made?', a: [technique] },
    { q: 'What print formats are available?', a: ['Works are available as archival paper prints. Where an individual artwork offers an <a href="/Engrained">Engrained Series</a> panel, it is printed directly onto Baltic Birch wood. Check each artwork page for its available materials, sizes, and editions.'] },
    { q: 'Are limited editions signed and numbered?', a: ['Yes. Chronicle and Legend limited editions are individually signed and numbered and include a certificate of authenticity. Each artwork page identifies its available editions.'] },
    { q: 'How do I choose a size for my room?', a: ['Start with the wall dimensions and viewing distance. For sizing guidance or a complimentary room mockup, <a href="/Contact">contact Wayne Heim</a> with the wall dimensions and a room photo.'] },
  ];
  return {
    taxonomy,
    heroPortraitIds: sections.map(section => section.items[0]?.id),
    rawGalleryData: sections.flatMap(section => section.items),
    entranceData: { subtitle: heading }, basePath: sections[0].galleryPath, canonicalPath: path,
    breadcrumbHtml: '<a href="/">Home</a> / ' + heading,
    breadcrumbStructuredItems: [], sectionDockItems: [], dockCenterIndex: 0, currentDockTitle: heading,
    identity: { collectionName: heading, gatewayBrandLabel: heading },
    // Show compact families in full so their first grid stays within the opening ~15%.
    gridSections: sections.map(section => ({ ...section, limit: sections.length <= 2 ? section.items.length : section.limit })), faqItems, gatewayVideoWidget: null, relatedCollectionsSlug: '',
    copy: {
      seoTitle: title, seoDescription: description, gatewayKicker: eyebrow, gatewayIntroCopy: opening,
      gatewaySupportingCopy: 'Open a work below for its story, available editions, sizes, and collector details.',
      gatewayCollectionName: heading, breadcrumbCurrentName: heading,
      catalogSectionKicker: '{sectionCount} works in this collection', showAuthorityPanel: false,
      archiveContextKicker: 'Collect the work', archiveContextTitle: heading + ' for your wall',
      archiveContextCopy: 'Explore the full collections through the links in each grid. Every artwork page carries its story and available print options. For help choosing a piece or a size, <a href="/Contact">contact Wayne Heim</a>.',
      faqTitle: heading + ' FAQ',
    },
  };
}

export const familyDoorwayPages = {
"WWII-Photography": (() => {
    const sections = [{ title: "WWII War — Color", slug: "series-1", galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Color", allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Color/all#collection-browser", ctaLabel: "See the full WWII War — Color collection", items: visible(gallery0_0), limit: 15 },
{ title: "WWII War — Black and White", slug: "series-2", galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Black-White", allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Black-White/all#collection-browser", ctaLabel: "See the full WWII War — Black and White collection", items: visible(gallery0_1), limit: 15 },
{ title: "WWII Machines — Color", slug: "series-3", galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color", allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color/all#collection-browser", ctaLabel: "See the full WWII Machines — Color collection", items: visible(gallery0_2), limit: 15 },
{ title: "WWII Machines — Black and White", slug: "series-4", galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White", allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White/all#collection-browser", ctaLabel: "See the full WWII Machines — Black and White collection", items: visible(gallery0_3), limit: 15 },
{ title: "WWII Portraits — Color", slug: "series-5", galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color", allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color/all#collection-browser", ctaLabel: "See the full WWII Portraits — Color collection", items: visible(gallery0_4), limit: 15 },
{ title: "WWII Portraits — Black and White", slug: "series-6", galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White", allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White/all#collection-browser", ctaLabel: "See the full WWII Portraits — Black and White collection", items: visible(gallery0_5), limit: 15 }];
    const taxonomy = subjects(sections, [['War', 'the battle and its aftermath', [0, 1]], ['Machines', 'men and the vehicles they kept running', [2, 3]], ['Portraits', 'faces of the Greatest Generation', [4, 5]]]);
    return makePage("/WWII-Photography", "WWII Photography", "WWII Photography | K4 Studios — Gallery of WWII Photography", "K4 Studios — WWII Photography. WWII fine art photography by Wayne Heim — portraits, machines, and scenes of war made with living historians, as painterly fine art prints.", "K4 STUDIOS — GALLERY OF WWII PHOTOGRAPHY", "World War II, seen the way the people who lived it remember it — not as spectacle, but as waiting, work, and the weight of the moment before. Wayne Heim makes these images with living historians: real photographs, shaped by painterly handling, of the war's faces, machines, and quiet hours.", "Wayne Heim makes WWII portraits, machines, and scenes of war with living historians, never staged. These are real photographs shaped by painterly handling, with attention to waiting, work, and the weight of a quiet moment.", sections, taxonomy);
  })(),
"Roaring-20s-Photography": (() => {
    const sections = [{ title: "Roaring Twenties — Color", slug: "series-1", galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color", allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color/all#collection-browser", ctaLabel: "See the full Roaring Twenties — Color collection", items: visible(gallery1_0), limit: 15 },
{ title: "Roaring Twenties — Black and White", slug: "series-2", galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White", allHref: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White/all#collection-browser", ctaLabel: "See the full Roaring Twenties — Black and White collection", items: visible(gallery1_1), limit: 15 }];
    const taxonomy = subjects(sections, [['Portraits', 'faces of the Jazz Age', [0, 1]], ['The Trade', 'moonshine and bootleggers', [0, 1]], ['The Divide', 'the inequity of the classes', [0, 1]]]);
    return makePage("/Roaring-20s-Photography", "Roaring 20s Photography", "Roaring 20s Photography | K4 Studios — Gallery of Roaring 20s Photography", "K4 Studios — Roaring 20s Photography. Roaring Twenties fine art photography by Wayne Heim — portraits of the Jazz Age's other side: moonshine, bootleggers, and the inequity of the classes, as painterly fine art prints.", "K4 STUDIOS — GALLERY OF ROARING 20S PHOTOGRAPHY", "The Roaring Twenties, away from the glitz — the decade's other rooms, where the music was thinner and the stakes were higher. Wayne Heim's portraits and scenes follow the moonshine, the bootleggers, and the distance between classes: real photographs, shaped by painterly handling, of an era that promised everyone a good time and kept the promise unevenly.", "These Roaring Twenties portraits and scenes are real photographs shaped by painterly handling. They follow the Jazz Age’s other side: moonshine, bootleggers, and the distance between classes.", sections, taxonomy);
  })(),
"Painterly-Landscape-Photography": (() => {
    const sections = [{ title: "Mountains", slug: "series-1", galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains", allHref: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains/all#collection-browser", ctaLabel: "See the full Mountains collection", items: visible(gallery2_0), limit: 15 },
{ title: "Sunsets", slug: "series-2", galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Sunsets", allHref: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Sunsets/all#collection-browser", ctaLabel: "See the full Sunsets collection", items: visible(gallery2_1), limit: 15 },
{ title: "Water", slug: "series-3", galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water", allHref: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water/all#collection-browser", ctaLabel: "See the full Water collection", items: visible(gallery2_2), limit: 15 },
{ title: "International", slug: "series-4", galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/International/Gallery", allHref: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/International/Gallery/all#collection-browser", ctaLabel: "See the full International collection", items: visible(gallery2_3), limit: 15 },
{ title: "Midwest", slug: "series-5", galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Midwest/Gallery", allHref: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Midwest/Gallery/all#collection-browser", ctaLabel: "See the full Midwest collection", items: visible(gallery2_4), limit: 15 },
{ title: "Northeast", slug: "series-6", galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Northeast/Gallery", allHref: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Northeast/Gallery/all#collection-browser", ctaLabel: "See the full Northeast collection", items: visible(gallery2_5), limit: 15 },
{ title: "South", slug: "series-7", galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/South/Gallery", allHref: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/South/Gallery/all#collection-browser", ctaLabel: "See the full South collection", items: visible(gallery2_6), limit: 15 },
{ title: "West", slug: "series-8", galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery", allHref: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery/all#collection-browser", ctaLabel: "See the full West collection", items: visible(gallery2_7), limit: 15 }];
    const taxonomy = subjects(sections, [['Mountains', 'mountain landscapes', [0]], ['Sunsets', 'the changing light', [1]], ['Water', 'water in the landscape', [2]], ['By Location', 'the five location collections', [3, 4, 5, 6, 7]]]);
    return makePage("/Painterly-Landscape-Photography", "Painterly Landscape Photography", "Painterly Landscape Photography | K4 Studios — Gallery of Painterly Landscape Photography", "K4 Studios — Painterly Landscape Photography. Painterly landscape photography by Wayne Heim — mountains, sunsets, water, and open country, real photographs shaped by painterly handling, as fine art prints.", "K4 STUDIOS — GALLERY OF PAINTERLY LANDSCAPE PHOTOGRAPHY", "The land as a force in the story — distance, weather, and silence at scale. Wayne Heim's landscapes are real photographs, shaped by painterly handling until texture, tone, and color become the image itself: mountains, sunsets, water, and open country that hold a wall the way a figure holds a room.", "These landscapes begin as real photographs by Wayne Heim. Painterly handling shapes texture, tone, and color across mountains, sunsets, water, and open country.", sections, taxonomy);
  })(),
"Painterly-Transportation-Photography": (() => {
    const sections = [{ title: "Trains — Color", slug: "series-1", galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Color", allHref: "/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Color/all#collection-browser", ctaLabel: "See the full Trains — Color collection", items: visible(gallery3_0), limit: 15 },
{ title: "Trains — Black and White", slug: "series-2", galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Black-White", allHref: "/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Black-White/all#collection-browser", ctaLabel: "See the full Trains — Black and White collection", items: visible(gallery3_1), limit: 15 },
{ title: "Classic Cars", slug: "series-3", galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Transportation/Cars", allHref: "/Galleries/Painterly-Fine-Art-Photography/Transportation/Cars/all#collection-browser", ctaLabel: "See the full Classic Cars collection", items: visible(gallery3_2), limit: 15 }];
    const taxonomy = subjects(sections, [['Trains', 'railroad character in color and black and white', [0, 1]], ['Classic Cars', 'the character of iron and chrome', [2]]]);
    return makePage("/Painterly-Transportation-Photography", "Painterly Transportation Photography", "Painterly Transportation Photography | K4 Studios — Gallery of Painterly Transportation Photography", "K4 Studios — Painterly Transportation Photography. Painterly transportation photography by Wayne Heim — trains and classic cars, real photographs shaped by painterly handling, as fine art prints.", "K4 STUDIOS — GALLERY OF PAINTERLY TRANSPORTATION PHOTOGRAPHY", "Machines with a past — trains that carried a country and cars that carried its ambitions, photographed as character, not hardware. Real photographs, shaped by painterly handling, of the iron and chrome that moved the West and the roads beyond it.", "These photographs of trains and classic cars are made by Wayne Heim and shaped by painterly handling, with attention to the character of the machines.", sections, taxonomy);
  })(),
"Painterly-Portrait-Photography": (() => {
    const sections = [{ title: "Painterly Portraits", slug: "series-1", galleryPath: "/Galleries/Painterly-Fine-Art-Photography/Miscellaneous/Portraits", allHref: "/Galleries/Painterly-Fine-Art-Photography/Miscellaneous/Portraits/all#collection-browser", ctaLabel: "See the full Painterly Portraits collection", items: visible(gallery4_0), limit: 15 }];
    const taxonomy = subjects(sections, [['Character, stillness, atmosphere', 'portraits that hold the sitter’s presence', [0]]]);
    return makePage("/Painterly-Portrait-Photography", "Painterly Portrait Photography", "Painterly Portrait Photography | K4 Studios — Gallery of Painterly Portrait Photography", "K4 Studios — Painterly Portrait Photography. Painterly portrait photography by Wayne Heim — pure portraits, evocative and honest, real photographs shaped by painterly handling, as fine art prints.", "K4 STUDIOS — GALLERY OF PAINTERLY PORTRAIT PHOTOGRAPHY", "A portrait is a person, not a pose — age, humor, fatigue, and guarded stillness, lit with a painter's patience. Wayne Heim's painterly portraits are real photographs, shaped by painterly handling until the medium disappears and only the sitter remains.", "These are pure portraits by Wayne Heim: real photographs shaped by painterly handling, with attention to character, stillness, and atmosphere.", sections, taxonomy);
  })()
};
