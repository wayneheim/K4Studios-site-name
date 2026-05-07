import ChapterGalleryBase from "./ChapterGalleryBase.jsx";
import { getDirectChapterConfig } from "@/data/chapterDirectConfigs.js";

const galleryLoaders = import.meta.glob("../data/**/*.mjs");

export default function ChapterGalleryDirect({ directImagePayload, initialImageId, galleryPath }) {
  const directConfig = getDirectChapterConfig(galleryPath);

  if (!directConfig) {
    throw new Error(`Missing direct gallery config for ${galleryPath}`);
  }

  const loadFullGallery = () => {
    const loader = galleryLoaders[directConfig.galleryModulePath];
    if (!loader) {
      throw new Error(`Missing gallery module loader for ${directConfig.galleryModulePath}`);
    }

    return loader().then((mod) => mod.galleryData || []);
  };

  return (
    <ChapterGalleryBase
      directImagePayload={directImagePayload}
      loadFullGallery={loadFullGallery}
      basePath={galleryPath}
      titleBase={directConfig.titleBase}
      sectionKey={directConfig.sectionKey}
      swipeHintKey={directConfig.swipeHintKey}
      initialImageId={initialImageId}
    />
  );
}
