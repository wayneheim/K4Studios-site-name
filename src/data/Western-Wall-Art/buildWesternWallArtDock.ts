import { landingWestern as facingHistoryLanding } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/landingstones.ts";
import { landingWestern as wildWestLanding } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/landingstones.ts";
import { landingWestern as cowboyPortraitLanding } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/landingstones.ts";
import { landingWestern as westernNarrativeLanding } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/landingstones.ts";
import { landingWestern as landscapeLocationLanding } from "@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/landingstones.ts";

const withoutFragment = (href = "") => String(href).split("#")[0];
const toAllHref = (href = "") => `${withoutFragment(href).replace(/\/$/, "")}/all#collection-browser`;

const asDockItem = (stone: Record<string, any>, overrides: Record<string, any> = {}) => ({
  ...stone,
  ...overrides,
  href: overrides.href || stone.dockHref || toAllHref(stone.href),
  cue: "Browse collection ->",
});

const supportItem = (title: string, href: string, thumb: string, subtitle = "") => asDockItem({
  title,
  subtitle,
  href,
  thumb,
}, {
  href,
  dockRole: "support",
  dockPrefix: "",
});

const narrativeWomanRiderThumb = "/img/i-G7csptc/s.jpg";
const narrativeJourneyThumb = "/img/i-4zxZQQ2/s.jpg";
const cinematicWesternThumb = "/img/i-7VWX9vk/s.jpg";
const displayWesternArtThumb = "/img/i-44jcjTQ/s.jpg";
const decorVsFineArtThumb = "/images/tombstones/traditional-ts.webp";
const westernFineArtPhotographyThumb = "/img/i-gxMVNh3/s.jpg";

export const buildWesternWallArtDock = () => {
  const landscapeWest = landscapeLocationLanding.tombstones.find((stone: any) =>
    String(stone.href || "").includes("/Landscapes/By-Location/West/")
  );
  const facingHistoryWildWest = facingHistoryLanding.tombstones.find((stone: any) =>
    String(stone.href || "").includes("/Facing-History/Wild-West")
  );

  const sectionDockItems = [
    supportItem(
      "Learn What Is Painterly Photography",
      "/Blog/what-is-painterly-photography",
      "/images/tombstones/Painterly-ts.webp"
    ),
    supportItem(
      "Learn What Is Western Fine Art Photography",
      "/Blog/what-is-western-fine-art-photography",
      westernFineArtPhotographyThumb
    ),
    supportItem(
      "Compare Narrative and Traditional Western Art",
      "/Blog/narrative-western-art-vs-traditional",
      narrativeJourneyThumb
    ),
    supportItem(
      "Learn How to Display Western Art at Home",
      "/Blog/how-to-display-western-art-in-a-modern-home",
      displayWesternArtThumb
    ),
    asDockItem(facingHistoryLanding.tombstones[0], {
      title: "Facing History Series",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History",
      dockRole: "support",
      dockPrefix: "",
    }),
    { separator: true, label: "Core Western wall art collections" },
    asDockItem(westernNarrativeLanding.tombstones[0], {
      title: "Western Narrative Color Series",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color/all#collection-browser",
      thumb: narrativeWomanRiderThumb,
      dockRole: "core",
      dockPrefix: "",
    }),
    asDockItem(westernNarrativeLanding.tombstones[1], {
      title: "Black and White Western Narrative Series",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White/all#collection-browser",
      dockRole: "core",
      dockPrefix: "",
    }),
    asDockItem(landscapeWest || {}, {
      title: "Western Landscape Series",
      href: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery/all#collection-browser",
      dockRole: "core",
      dockPrefix: "",
    }),
    asDockItem(cowboyPortraitLanding.tombstones[0], {
      title: "Color Cowboy Portrait Series",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/all#collection-browser",
      dockRole: "core",
      dockPrefix: "",
    }),
    asDockItem(cowboyPortraitLanding.tombstones[1], {
      title: "Black and White Cowboy Portrait Series",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White/all#collection-browser",
      dockRole: "core",
      dockPrefix: "",
    }),
    { separator: true, label: "Western wall art context and collector notes" },
    asDockItem(facingHistoryWildWest || wildWestLanding.tombstones[0], {
      title: "Wild West Series",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West",
      dockRole: "support",
      dockPrefix: "",
    }),
    supportItem(
      "Learn What Makes an Image Feel Cinematic",
      "/Blog/what-makes-an-image-feel-cinematic",
      cinematicWesternThumb
    ),
    supportItem(
      "Compare Decor Art and Fine Art",
      "/Blog/decor-art-vs-fine-art",
      decorVsFineArtThumb
    ),
    supportItem(
      "Learn What Makes a Fine Art Print Worth Owning",
      "/Blog/what-makes-a-fine-art-print-worth-owning",
      "/images/tombstones/print-options-ts.webp"
    ),
    supportItem(
      "Compare Wood Prints and Paper Prints",
      "/Blog/wood-prints-vs-paper-prints",
      "/images/tombstones/engrained-ts.webp"
    ),
  ];

  return {
    sectionDockItems,
    dockCenterIndex: sectionDockItems.findIndex((item: any) => item.title === "Western Landscape Series"),
  };
};
