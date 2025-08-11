import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White.mjs";

export default function ChapterRoaring20sBWWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White"
      titleBase="Facing History — Roaring ’20s Portraits (Black & White)"
      sectionKey="/Facing-History/Roaring-20s-Portraits/Black-White"
      swipeHintKey="Painterly-Roaring-20s-BW"
      {...props}
    />
  );
}
