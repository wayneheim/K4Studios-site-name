import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color.mjs";

export default function ChapterWWIIPortraitsColorWrapper(props) {
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color"
      titleBase="Facing History — WWII Portraits (Color)"
      sectionKey="/Facing-History/WWII/Portraits/Color"
      swipeHintKey="WWII-Portraits-Color"
      {...props}
    />
  );
}
