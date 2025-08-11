import ChapterGalleryBase from "./ChapterGalleryBase.jsx";
import { galleryData as rawData } from "../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color.mjs";

export default function ChapterCivilWarColorWrapper(props) {
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color"
      titleBase="Civil War Portraits – Color"
      sectionKey="/Facing-History/Civil-War-Color"
      swipeHintKey="Painterly-Civil-War-Color"
      {...props}
    />
  );
}