export type VideoTheme =
  | "Wild West"
  | "Civil War"
  | "World War II"
  | "Roaring 20s"
  | "Landscape"
  | "Painterly Process"
  | "Shows & Events"
  | "Artist Commentary"
  | "General";

export type VideoType =
  | "Full Video"
  | "Short"
  | "Reel"
  | "Narrated Film"
  | "Behind the Scenes"
  | "Artist Talk"
  | "Process";

export interface K4Video {
  slug: string;
  title: string;
  youtubeId?: string;
  externalUrl?: string;
  type: VideoType;
  theme: VideoTheme;
  date: string;
  duration?: string;
  featured?: boolean;
  hasDedicatedPage?: boolean;
  thumbnail?: string;
  thumbnailAlt?: string;
  dek?: string;
  description: string;
  transcript?: string;
  relatedLinks?: {
    label: string;
    href: string;
  }[];
}

export const videos: K4Video[] = [
  {
    slug: "women-of-the-west-journey",
    title: "Women of the West: A Journey for Those Who Follow",
    youtubeId: "REPLACE_WITH_YOUTUBE_ID",
    type: "Narrated Film",
    theme: "Wild West",
    date: "2026-04-27",
    duration: "PT2M10S",
    featured: true,
    hasDedicatedPage: true,
    thumbnail: "/images/show-2t.webp",
    thumbnailAlt: "Narrative Western art video featuring women of the American frontier.",
    dek: "A narrated sequence of painterly Western photographs honoring the women whose endurance shaped frontier life beyond the legend.",
    description:
      "This K4 Studios narrative slideshow film combines still fine art photography, voice, music, and written text to explore sacrifice, endurance, and legacy in the American West.",
    transcript: "",
    relatedLinks: [
      { label: "American Western Art", href: "/Western-Fine-Art-Photography/American-Wild-West/" },
      { label: "Western Fine Art Photography", href: "/Western-Fine-Art-Photography/" },
      { label: "Wild West Galleries", href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/" },
    ],
  },
  {
    slug: "placeholder-civil-war-field-notes",
    title: "Placeholder: Civil War Field Notes",
    youtubeId: "REPLACE_WITH_YOUTUBE_ID",
    type: "Artist Talk",
    theme: "Civil War",
    date: "2026-03-12",
    duration: "PT1M45S",
    featured: false,
    hasDedicatedPage: false,
    thumbnail: "/images/default-og.jpg",
    thumbnailAlt: "Placeholder card for a future Civil War artist commentary video.",
    dek: "Placeholder entry for layout testing: a future short commentary on staging, restraint, and historical tone in Civil War portrait work.",
    description:
      "Placeholder video record for the K4 Studios archive. This entry is reserved for a future artist commentary piece connected to Civil War reenactment photography and historical portrait storytelling.",
  },
  {
    slug: "placeholder-landscape-process-study",
    title: "Placeholder: Landscape Process Study",
    type: "Process",
    theme: "Painterly Process",
    date: "2026-02-18",
    duration: "PT3M05S",
    featured: false,
    hasDedicatedPage: false,
    thumbnail: "/images/desktop2.webp",
    thumbnailAlt: "Placeholder card for a future landscape process video.",
    dek: "Placeholder entry for layout testing: a future behind-the-scenes look at painterly landscape editing and tonal decisions.",
    description:
      "Placeholder video record for the K4 Studios archive. This entry is reserved for a future process video about how light, texture, and restraint shape painterly fine art landscape photography.",
  },
  {
    slug: "placeholder-roaring-20s-short",
    title: "Placeholder: Roaring 20s Short",
    type: "Short",
    theme: "Roaring 20s",
    date: "2026-01-24",
    duration: "PT0M58S",
    featured: false,
    hasDedicatedPage: false,
    thumbnail: "/images/Lore.webp",
    thumbnailAlt: "Placeholder card for a future Roaring 20s short video.",
    dek: "Placeholder entry for layout testing: a compact visual story built around period portraiture, theatrical presence, and memory.",
    description:
      "Placeholder video record for the K4 Studios archive. This entry is reserved for a future short connected to Roaring 20s portrait photography and historical visual storytelling.",
  },
];

export const videoThemes: VideoTheme[] = [
  "Wild West",
  "Civil War",
  "World War II",
  "Roaring 20s",
  "Landscape",
  "Painterly Process",
  "Shows & Events",
  "Artist Commentary",
  "General",
];

export const videoTypes: VideoType[] = [
  "Full Video",
  "Short",
  "Reel",
  "Narrated Film",
  "Behind the Scenes",
  "Artist Talk",
  "Process",
];

export function getVideoBySlug(slug: string): K4Video | undefined {
  return videos.find((video) => video.slug === slug);
}

export function isRealYouTubeId(youtubeId?: string): youtubeId is string {
  return Boolean(youtubeId && !youtubeId.startsWith("REPLACE_"));
}

export function getVideoUrl(video: K4Video): string {
  if (video.hasDedicatedPage) return `/Videos/${video.slug}/`;
  if (isRealYouTubeId(video.youtubeId)) return `https://www.youtube.com/watch?v=${video.youtubeId}`;
  return video.externalUrl || `/Videos/#${video.slug}`;
}
