import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water/Water.mjs";

export default function ChapterLandscapesWaterWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water"
      titleBase="Painterly Landscapes — Water"
      sectionKey="/Landscapes/Water"
      swipeHintKey="Painterly-Landscapes-Water"
      {...props}
    />
  );
}
