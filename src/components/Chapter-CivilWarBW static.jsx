import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Black-White.mjs";

export default function ChapterCivilWarBWWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Black-White"
      titleBase="Civil War Portraits – Black & White"
      sectionKey="/Facing-History/Civil-War-BW"
      swipeHintKey="Painterly-Civil-War-BW"
      {...props}
    />
  );
}
