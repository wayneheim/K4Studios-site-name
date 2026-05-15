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

const westernFineArtThumb = "/img/i-gxMVNh3/s.jpg";
const narrativeThumb = "/img/i-B7ZSdfs/s.jpg";
const printOptionsThumb = "/images/tombstones/print-options-ts.webp";
const engrainedThumb = "/images/tombstones/engrained-ts.jpg";
const displayWesternArtThumb = "/img/i-44jcjTQ/s.jpg";
const westernArtThumb = "/images/tombstones/traditional-ts.webp";

export const buildWesternArtPrintsDock = () => {
  const facingHistoryWildWest = facingHistoryLanding.tombstones.find((stone: any) =>
    String(stone.href || "").includes("/Facing-History/Wild-West")
  );

  const sectionDockItems = [
    supportItem(
      "What Is Western Fine Art Photography?",
      "/Blog/what-is-western-fine-art-photography",
      westernFineArtThumb
    ),
    supportItem(
      "What Makes a Fine Art Print Worth Owning?",
      "/Blog/what-makes-a-fine-art-print-worth-owning",
      printOptionsThumb
    ),
    supportItem(
      "Wood Prints vs Paper Prints",
      "/Blog/wood-prints-vs-paper-prints",
      engrainedThumb
    ),
    supportItem(
      "What Is Western Art?",
      "/Blog/what-is-western-art",
      westernArtThumb
    ),
    { separator: true, label: "Core Western art print collections" },
    asDockItem(westernNarrativeLanding.tombstones[0], {
      title: "Western Narrative Color Prints",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color/all#collection-browser",
      thumb: narrativeThumb,
      dockRole: "core",
    }),
    asDockItem(westernNarrativeLanding.tombstones[1], {
      title: "Black and White Western Narrative Prints",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White/all#collection-browser",
      dockRole: "core",
    }),
    asDockItem(cowboyPortraitLanding.tombstones[0], {
      title: "Color Cowboy Art Prints",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/all#collection-browser",
      dockRole: "core",
    }),
    asDockItem(cowboyPortraitLanding.tombstones[1], {
      title: "Black and White Cowboy Art Prints",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White/all#collection-browser",
      dockRole: "core",
    }),
    { separator: true, label: "Western art print context and collector notes" },
    asDockItem(facingHistoryWildWest || wildWestLanding.tombstones[0], {
      title: "Wild West",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West",
      dockRole: "support",
    }),
    supportItem(
      "How to Display Western Art in a Modern Home Without Turning It Into a Theme Room",
      "/Blog/how-to-display-western-art-in-a-modern-home",
      displayWesternArtThumb
    ),
    supportItem(
      "Narrative Western Art vs Traditional Western Art",
      "/Blog/narrative-western-art-vs-traditional",
      narrativeThumb
    ),
    supportItem(
      "Decor Art vs Fine Art: What Is the Difference?",
      "/Blog/decor-art-vs-fine-art",
      "/images/tombstones/traditional-ts.webp"
    ),
  ];

  return {
    sectionDockItems,
    dockCenterIndex: sectionDockItems.findIndex((item: any) => item.title === "Western Narrative Color Prints"),
  };
};
