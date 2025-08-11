import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs";

export default function ChapterCowboyBWWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White"
      titleBase="Western Cowboy Portraits – Black & White"
      sectionKey="/Facing-History/Cowboy-BW"
      swipeHintKey="Painterly-Cowboy-BW"
      {...props}
    />
  );
}
