import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Landscapes/By-Location/Northeast/Gallery.mjs";

export default function ChapterLandscapesNortheastWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Fine-Art-Photography/Landscapes/By-Location/Northeast/Gallery"
      titleBase="Fine Art Photography Landscapes — Northeast"
      sectionKey="/Landscapes/Northeast"
      swipeHintKey="Landscapes-Northeast"
      {...props}
    />
  );
}
