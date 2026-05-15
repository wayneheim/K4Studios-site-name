import { landingWestern as wildWestLanding } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/landingstones.ts";
import { landingWestern as cowboyPortraitLanding } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/landingstones.ts";
import { landingWestern as westernNarrativeLanding } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/landingstones.ts";
import { landingWestern as landscapeLocationLanding } from "@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/landingstones.ts";
import { landingWestern as landscapeThemeLanding } from "@/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/landingstones.ts";

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

const westernArtThumb = "/images/tombstones/traditional-ts.webp";
const painterlyThumb = "/images/tombstones/Painterly-ts.webp";
const narrativeThumb = "/img/i-B7ZSdfs/s.jpg";
const displayWesternArtThumb = "/img/i-44jcjTQ/s.jpg";
const printOptionsThumb = "/images/tombstones/print-options-ts.webp";

export const buildWesternArtworkDock = () => {
  const westernLandscape = landscapeLocationLanding.tombstones.find((stone: any) =>
    String(stone.href || "").includes("/Landscapes/By-Location/West/")
  );
  const mountains = landscapeThemeLanding.tombstones.find((stone: any) =>
    String(stone.href || "").includes("/Landscapes/By-Theme/Mountains")
  );

  const sectionDockItems = [
    supportItem(
      "What Is Western Art?",
      "/Blog/what-is-western-art",
      westernArtThumb
    ),
    supportItem(
      "What Is Western Fine Art?",
      "/Blog/what-is-western-fine-art",
      westernArtThumb
    ),
    supportItem(
      "What Is Painterly Photography?",
      "/Blog/what-is-painterly-photography",
      painterlyThumb
    ),
    supportItem(
      "Narrative Western Art vs Traditional Western Art",
      "/Blog/narrative-western-art-vs-traditional",
      narrativeThumb
    ),
    { separator: true, label: "Core Western artwork collections" },
    asDockItem(cowboyPortraitLanding.tombstones[0], {
      title: "Western Portrait Artwork",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/all#collection-browser",
      dockRole: "core",
    }),
    asDockItem(westernLandscape || landscapeLocationLanding.tombstones[0], {
      title: "Western Landscape Artwork",
      href: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery/all#collection-browser",
      dockRole: "core",
    }),
    asDockItem(westernNarrativeLanding.tombstones[0], {
      title: "Narrative Frontier Artwork",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color/all#collection-browser",
      thumb: narrativeThumb,
      dockRole: "core",
    }),
    asDockItem(cowboyPortraitLanding.tombstones[1], {
      title: "Black and White Cowboy Artwork",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White/all#collection-browser",
      dockRole: "core",
    }),
    asDockItem(mountains || landscapeThemeLanding.tombstones[0], {
      title: "Western Mountain Artwork",
      href: "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains/all#collection-browser",
      dockRole: "core",
    }),
    asDockItem(westernNarrativeLanding.tombstones[1], {
      title: "Black and White Narrative Artwork",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White/all#collection-browser",
      dockRole: "core",
    }),
    { separator: true, label: "Western artwork context and collector notes" },
    asDockItem(wildWestLanding.tombstones[0], {
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
      "Decor Art vs Fine Art: What Is the Difference?",
      "/Blog/decor-art-vs-fine-art",
      westernArtThumb
    ),
    supportItem(
      "What Makes a Fine Art Print Worth Owning?",
      "/Blog/what-makes-a-fine-art-print-worth-owning",
      printOptionsThumb
    ),
  ];

  return {
    sectionDockItems,
    dockCenterIndex: sectionDockItems.findIndex((item: any) => item.title === "Western Landscape Artwork"),
  };
};
