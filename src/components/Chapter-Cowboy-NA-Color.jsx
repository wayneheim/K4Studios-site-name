import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color.mjs";

export default function ChapterCowboyColorWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color"
      titleBase="Western Cowboy Portraits – Native American"
      sectionKey="/Facing-History/Cowboy-Native-American"
      swipeHintKey="Painterly-Cowboy-NA"
      {...props}
    />
  );
}
