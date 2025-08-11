import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color.mjs";

export default function ChapterRoaring20sColorWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color"
      titleBase="Facing History — Roaring ’20s Portraits (Color)"
      sectionKey="/Facing-History/Roaring-20s-Portraits/Color"
      swipeHintKey="Painterly-Roaring-20s-Color"
      {...props}
    />
  );
}
