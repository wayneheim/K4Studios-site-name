import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color.mjs";

export default function ChapterWWIIMachinesColorWrapper(props) {
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color"
      titleBase="Facing History — WWII Machines (Color)"
      sectionKey="/Facing-History/WWII/Machines/Color"
      swipeHintKey="WWII-Machines-Color"
      {...props}
    />
  );
}
