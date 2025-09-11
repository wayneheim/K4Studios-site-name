import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Water/Water.mjs";

export default function ChapterLandscapesWaterWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Water"
      titleBase="Landscapes — Water"
      sectionKey="/Landscapes/Water"
      swipeHintKey="Landscapes-Water"
      {...props}
    />
  );
}
