import { landingWestern as facingHistoryLanding } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/landingstones.ts";
import { landingWestern as wildWestLanding } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/landingstones.ts";
import { landingWestern as cowboyPortraitLanding } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/landingstones.ts";
import { landingWestern as westernNarrativeLanding } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/landingstones.ts";

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

const cowboyContextThumb = "/img/i-3SxncXS/s.jpg";
const painterlyThumb = "/images/tombstones/Painterly-ts.webp";
const fineArtPrintThumb = "/images/tombstones/print-options-ts.webp";
const engrainedThumb = "/images/tombstones/engrained-ts.webp";
const displayWesternArtThumb = "/img/i-44jcjTQ/s.jpg";
const narrativeThumb = "/img/i-B7ZSdfs/s.jpg";

export const buildCowboyArtPrintsDock = () => {
  const facingHistoryWildWest = facingHistoryLanding.tombstones.find((stone: any) =>
    String(stone.href || "").includes("/Facing-History/Wild-West")
  );

  const sectionDockItems = [
    supportItem(
      "Learn What Makes a Fine Art Print Worth Owning",
      "/Blog/what-makes-a-fine-art-print-worth-owning",
      fineArtPrintThumb
    ),
    supportItem(
      "Compare Wood Prints and Paper Prints",
      "/Blog/wood-prints-vs-paper-prints",
      engrainedThumb
    ),
    supportItem(
      "Learn What Is Western Cowboy Art",
      "/Blog/what-is-western-cowboy-art",
      cowboyContextThumb
    ),
    supportItem(
      "Learn What Is Painterly Photography",
      "/Blog/what-is-painterly-photography",
      painterlyThumb
    ),
    asDockItem(facingHistoryLanding.tombstones[0], {
      title: "Facing History Series",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History",
      dockRole: "support",
      dockPrefix: "",
    }),
    { separator: true, label: "Core cowboy art print collections" },
    asDockItem(cowboyPortraitLanding.tombstones[0], {
      title: "Color Cowboy Portrait Prints",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/all#collection-browser",
      dockRole: "core",
      dockPrefix: "",
    }),
    asDockItem(cowboyPortraitLanding.tombstones[1], {
      title: "Black and White Cowboy Portrait Prints",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White/all#collection-browser",
      dockRole: "core",
      dockPrefix: "",
    }),
    asDockItem(westernNarrativeLanding.tombstones[0], {
      title: "Color Western Narrative Prints",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color/all#collection-browser",
      thumb: narrativeThumb,
      dockRole: "core",
      dockPrefix: "",
    }),
    asDockItem(westernNarrativeLanding.tombstones[1], {
      title: "Black and White Western Narrative Prints",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White/all#collection-browser",
      dockRole: "core",
      dockPrefix: "",
    }),
    { separator: true, label: "Print context and collector notes" },
    asDockItem(facingHistoryWildWest || wildWestLanding.tombstones[0], {
      title: "Wild West Series",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West",
      dockRole: "support",
      dockPrefix: "",
    }),
    supportItem(
      "Learn How to Display Western Art at Home",
      "/Blog/how-to-display-western-art-in-a-modern-home",
      displayWesternArtThumb
    ),
    supportItem(
      "Start Collecting Fine Art Photography",
      "/Blog/collecting-fine-art-photography-beginners-guide",
      fineArtPrintThumb
    ),
    supportItem(
      "Explore the One-Image Movie",
      "/Other/One-Image-Movie",
      narrativeThumb
    ),
    supportItem(
      "Compare Decor Art and Fine Art",
      "/Blog/decor-art-vs-fine-art",
      "/images/tombstones/traditional-ts.webp"
    ),
  ];

  return {
    sectionDockItems,
    dockCenterIndex: sectionDockItems.findIndex((item: any) => item.title === "Color Cowboy Portrait Prints"),
  };
};
