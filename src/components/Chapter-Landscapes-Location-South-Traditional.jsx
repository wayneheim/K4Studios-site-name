import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Landscapes/By-Location/South/Gallery.mjs";

export default function ChapterLandscapesSouthWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Fine-Art-Photography/Landscapes/By-Location/South/Gallery"
      titleBase="Painterly Landscapes — South"
      sectionKey="/Landscapes/South"
      swipeHintKey="Landscapes-South"
      {...props}
    />
  );
}
