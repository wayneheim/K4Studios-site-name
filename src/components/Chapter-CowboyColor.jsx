import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs";

export default function ChapterCowboyColorWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color"
      titleBase="Western Cowboy Portraits – Color"
      sectionKey="/Facing-History/Cowboy-Color"
      swipeHintKey="Painterly-Cowboy-Color"
      {...props}
    />
  );
}
