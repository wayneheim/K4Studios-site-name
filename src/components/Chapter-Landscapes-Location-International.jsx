import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/International/Gallery.mjs";

export default function ChapterLandscapesInternationalWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/International/Gallery"
      titleBase="Painterly Landscapes — International"
      sectionKey="/Landscapes/International"
      swipeHintKey="Painterly-Landscapes-International"
      {...props}
    />
  );
}
