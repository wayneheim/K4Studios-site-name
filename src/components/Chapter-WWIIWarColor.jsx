import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Color.mjs";

export default function ChapterWWIIWarColorWrapper(props) {
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Color"
      titleBase="Facing History — WWII War (Color)"
      sectionKey="/Facing-History/WWII/War/Color"
      swipeHintKey="WWII-War-Color"
      {...props}
    />
  );
}
