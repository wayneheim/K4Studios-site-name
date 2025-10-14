import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Color/Color.mjs";

export default function ChapterLandscapesColorWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Color"
      titleBase="Painterly Landscapes — Color"
      sectionKey="/Landscapes/Color-Traditional"
      swipeHintKey="Landscapes-Color"
      {...props}
    />
  );
}
