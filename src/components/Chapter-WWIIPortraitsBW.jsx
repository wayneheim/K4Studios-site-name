import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White.mjs";

export default function ChapterWWIIPortraitsBWWrapper(props) {
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White"
      titleBase="Facing History — WWII Portraits (B&W)"
      sectionKey="/Facing-History/WWII/Portraits/Black-White"
      swipeHintKey="WWII-Portraits-Black-White"
      {...props}
    />
  );
}
