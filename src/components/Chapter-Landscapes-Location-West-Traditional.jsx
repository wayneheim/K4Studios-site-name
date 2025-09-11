import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Landscapes/By-Location/West/Gallery.mjs";

export default function ChapterLandscapesWestWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Fine-Art-Photography/Landscapes/By-Location/West/Gallery"
      titleBase="Fine Art Landscapes — West"
      sectionKey="/Landscapes/West"
      swipeHintKey="Landscapes-West"
      {...props}
    />
  );
}
