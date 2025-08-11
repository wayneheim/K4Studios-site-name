import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery.mjs";

export default function ChapterLandscapesWestWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery"
      titleBase="Painterly Landscapes — West"
      sectionKey="/Landscapes/West"
      swipeHintKey="Painterly-Landscapes-West"
      {...props}
    />
  );
}
