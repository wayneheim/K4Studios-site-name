import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Landscapes/By-Location/Midwest/Gallery.mjs";

export default function ChapterLandscapesMidwestWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Fine-Art-Photography/Landscapes/By-Location/Midwest/Gallery"
      titleBase="Landscapes — Midwest"
      sectionKey="/Landscapes/Midwest"
      swipeHintKey="Landscapes-Midwest"
      {...props}
    />
  );
}