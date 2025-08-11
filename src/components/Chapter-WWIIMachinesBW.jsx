import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White.mjs";

export default function ChapterWWIIMachinesBWWrapper(props) {
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White"
      titleBase="Facing History — WWII Machines (Black & White)"
      sectionKey="/Facing-History/WWII/Machines/Black-White"
      swipeHintKey="WWII-Machines-Black-White"
      {...props}
    />
  );
}
