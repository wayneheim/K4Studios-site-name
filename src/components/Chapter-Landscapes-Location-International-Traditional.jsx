import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/Gallery.mjs";

export default function ChapterLandscapesInternationalWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/Gallery"
      titleBase="Landscapes — International"
      sectionKey="/Landscapes/International"
      swipeHintKey="Landscapes-International"
      {...props}
    />
  );
}
