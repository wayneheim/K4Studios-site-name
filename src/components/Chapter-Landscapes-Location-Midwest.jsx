import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Midwest/Gallery.mjs";

export default function ChapterLandscapesMidwestWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Midwest/Gallery"
      titleBase="Painterly Landscapes — Midwest"
      sectionKey="/Landscapes/Midwest"
      swipeHintKey="Painterly-Landscapes-Midwest"
      {...props}
    />
  );
}