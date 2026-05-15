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
const artisticWesternThumb = "/img/i-FfNxQVd/s.jpg";
const narrativeThumb = "/img/i-B7ZSdfs/s.jpg";
const painterlyThumb = "/images/tombstones/Painterly-ts.webp";
const westernArtThumb = "/images/tombstones/traditional-ts.webp";
const cinematicThumb = "/img/i-7VWX9vk/s.jpg";
const printOptionsThumb = "/images/tombstones/print-options-ts.webp";
const nativeThumb = "/img/i-LCspRF4/s.jpg";

export const buildWesternPhotographyArtDock = () => {
  const sectionDockItems = [
    supportItem(
      "What Is Western Fine Art Photography?",
      "/Blog/what-is-western-fine-art-photography",
      westernFineArtThumb
    ),
    supportItem(
      "What Is Artistic Western Photography?",
      "/Blog/what-is-artistic-western-photography",
      artisticWesternThumb
    ),
    supportItem(
      "What Is Painterly Photography?",
      "/Blog/what-is-painterly-photography",
      painterlyThumb
    ),
    supportItem(
      "What Is Western Art?",
      "/Blog/what-is-western-art",
      westernArtThumb
    ),
    { separator: true, label: "Core Western photography art collections" },
    asDockItem(westernNarrativeLanding.tombstones[0], {
      title: "Western Narrative Photography Art",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color/all#collection-browser",
      thumb: narrativeThumb,
      dockRole: "core",
    }),
    asDockItem(westernNarrativeLanding.tombstones[1], {
      title: "Black and White Western Narrative Art",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White/all#collection-browser",
      dockRole: "core",
    }),
    asDockItem(cowboyPortraitLanding.tombstones[0], {
      title: "Cowboy Photography Art",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/all#collection-browser",
      dockRole: "core",
    }),
    asDockItem(cowboyPortraitLanding.tombstones[1], {
      title: "Black and White Cowboy Photography Art",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White/all#collection-browser",
      dockRole: "core",
    }),
    asDockItem(wildWestLanding.tombstones[1] || wildWestLanding.tombstones[0], {
      title: "Native American Western Photography Art",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color/all#collection-browser",
      thumb: nativeThumb,
      dockRole: "core",
    }),
    { separator: true, label: "Western photography art context" },
    asDockItem(wildWestLanding.tombstones[0], {
      title: "Wild West",
      href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West",
      dockRole: "support",
    }),
    supportItem(
      "Can Photography Be Narrative Western Art?",
      "/Blog/can-photography-be-narrative-western-art",
      narrativeThumb
    ),
    supportItem(
      "What Makes an Image Feel Cinematic?",
      "/Blog/what-makes-an-image-feel-cinematic",
      cinematicThumb
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
    dockCenterIndex: sectionDockItems.findIndex((item: any) => item.title === "Black and White Western Narrative Art"),
  };
};
