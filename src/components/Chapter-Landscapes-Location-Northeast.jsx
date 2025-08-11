import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Northeast/Gallery.mjs";

export default function ChapterLandscapesNortheastWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Northeast/Gallery"
      titleBase="Painterly Landscapes — Northeast"
      sectionKey="/Landscapes/Northeast"
      swipeHintKey="Painterly-Landscapes-Northeast"
      {...props}
    />
  );
}
