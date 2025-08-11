import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Black-White.mjs";

export default function ChapterWWIIWarBlackWhiteWrapper(props) {
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Black-White"
      titleBase="Facing History — WWII War (Black & White)"
      sectionKey="/Facing-History/WWII/War/Black-White"
      swipeHintKey="Painterly-WWIIWar-Black-White"
      {...props}
    />
  );
}
