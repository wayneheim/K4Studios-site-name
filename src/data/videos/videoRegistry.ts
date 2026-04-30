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
  | "Process"
  | "Movie"
  | "Commentary"
  | "Show"
  | "Event";

export type VideoMetadataSource = "manual" | "youtube-api";

export const DEFAULT_VIDEO_TEASER_IMAGE = "/images/show-2t.webp";
export const K4_YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@K4StudiosFineArt";
export const K4_YOUTUBE_VIDEOS_URL = "https://www.youtube.com/@K4StudiosFineArt/videos";
export const K4_YOUTUBE_SHORTS_URL = "https://www.youtube.com/@K4StudiosFineArt/shorts";

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
  featuredImages?: string[];
  metadataSource?: VideoMetadataSource;
  metadataSyncedAt?: string;
}

export const videos: K4Video[] = [
  {
    slug: "women-of-the-west-journey",
    title: "Women of the West: A Journey for Those Who Follow",
    youtubeId: "icR5i4Kf4ZY",
    externalUrl: "https://www.youtube.com/watch?v=icR5i4Kf4ZY",
    type: "Narrated Film",
    theme: "Wild West",
    date: "2026-04-27",
    duration: "PT2M10S",
    featured: true,
    hasDedicatedPage: false,
    thumbnailAlt: "Narrative Western art video featuring women of the American frontier.",
    dek: "A narrated sequence of painterly Western photographs honoring the women whose endurance shaped frontier life beyond the legend.",
    description:
      "This K4 Studios narrative slideshow film combines still fine art photography, voice, music, and written text to explore sacrifice, endurance, and legacy in the American West.",
    transcript: "",
    relatedLinks: [
      { label: "American Western Art", href: "/American-Western-Art" },
      { label: "Western Fine Art Photography", href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History" },
      { label: "Wild West Galleries", href: "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/" },
      { label: "Watch on YouTube", href: "https://www.youtube.com/watch?v=icR5i4Kf4ZY" },
      { label: "K4 Studios on YouTube", href: "https://www.youtube.com/@K4StudiosFineArt/videos" },
    ],
  },
  {
    slug: "k4-studios-short-hdkr34fur4a",
    title: "K4 Studios Short: Painterly Western Story",
    youtubeId: "HDKR34fUR4A",
    externalUrl: "https://www.youtube.com/shorts/HDKR34fUR4A",
    type: "Short",
    theme: "Wild West",
    date: "2026-04-27",
    duration: "PT58S",
    featured: false,
    hasDedicatedPage: false,
    thumbnailAlt: "K4 Studios YouTube short featuring painterly fine art Western imagery.",
    dek: "A short-form K4 Studios visual story drawn from painterly Western fine art photography.",
    description:
      "This K4 Studios short presents a compact visual story connected to Wayne Heim's painterly Western photography and historical fine art imagery.",
    relatedLinks: [{ label: "K4 Studios Shorts", href: K4_YOUTUBE_SHORTS_URL }],
  },
  {
    slug: "k4-studios-short-ailj8rowvxw",
    title: "K4 Studios Short: Fine Art Photography Moment",
    youtubeId: "AiLj8rOwVXw",
    externalUrl: "https://www.youtube.com/shorts/AiLj8rOwVXw",
    type: "Short",
    theme: "General",
    date: "2026-04-27",
    duration: "PT1M04S",
    featured: false,
    hasDedicatedPage: false,
    thumbnailAlt: "K4 Studios YouTube short featuring painterly fine art photography.",
    dek: "A short-form video piece from the K4 Studios fine art photography archive.",
    description:
      "This K4 Studios short offers a brief visual piece from the broader archive of painterly fine art photography, video stories, and studio work.",
    relatedLinks: [{ label: "K4 Studios Shorts", href: K4_YOUTUBE_SHORTS_URL }],
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
  "Movie",
  "Commentary",
  "Show",
  "Event",
];

export function formatIsoDuration(duration?: string): string | undefined {
  if (!duration) return undefined;
  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!match) return undefined;

  const [, hours, minutes, seconds] = match;
  const parts = [];
  if (hours && Number(hours) > 0) parts.push(`${Number(hours)} hr`);
  if (minutes && Number(minutes) > 0) parts.push(`${Number(minutes)} min`);
  if (seconds && Number(seconds) > 0) parts.push(`${Number(seconds)} sec`);

  return parts.length ? parts.join(" ") : undefined;
}

export function slugifyVideoLabel(label: string): string {
  return label.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function getVideoTypeGroup(type: VideoType): { key: string; label: string } {
  if (type === "Narrated Film" || type === "Movie" || type === "Full Video") {
    return { key: "movie-narrative", label: "Narrated Film / Movie" };
  }
  if (type === "Short" || type === "Reel") {
    return { key: "short-reel", label: "Short / Reel" };
  }
  if (type === "Process" || type === "Behind the Scenes") {
    return { key: "process-bts", label: "Process / Behind the Scenes" };
  }
  if (type === "Artist Talk" || type === "Commentary") {
    return { key: "artist-commentary", label: "Artist Talk / Commentary" };
  }
  if (type === "Show" || type === "Event") {
    return { key: "show-event", label: "Show / Event" };
  }
  return { key: "general", label: "General" };
}

export function getVideoThumbnail(video: Pick<K4Video, "thumbnail" | "youtubeId">): string {
  if (video.thumbnail) return video.thumbnail;
  if (isRealYouTubeId(video.youtubeId)) return `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;
  return DEFAULT_VIDEO_TEASER_IMAGE;
}

export function getVideoBySlug(slug: string): K4Video | undefined {
  return videos.find((video) => video.slug === slug);
}

export function isRealYouTubeId(youtubeId?: string): youtubeId is string {
  return Boolean(youtubeId && !youtubeId.startsWith("REPLACE_"));
}

export function getVideoUrl(video: K4Video): string {
  if (video.hasDedicatedPage) return `/Videos/${video.slug}/`;
  if (video.externalUrl) return video.externalUrl;
  if (isRealYouTubeId(video.youtubeId)) return `https://www.youtube.com/watch?v=${video.youtubeId}`;
  return `/Videos/#${video.slug}`;
}
