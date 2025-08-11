import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/South/Gallery.mjs";

export default function ChapterLandscapesSouthWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/South/Gallery"
      titleBase="Painterly Landscapes — South"
      sectionKey="/Landscapes/South"
      swipeHintKey="Painterly-Landscapes-South"
      {...props}
    />
  );
}
