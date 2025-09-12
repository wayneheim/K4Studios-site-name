import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/Canada-Western.mjs";

export default function ChapterLandscapesInternationalWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/Canada-Western"
      titleBase="Landscapes — International-Canada-Western"
      sectionKey="/Landscapes/International/Canada-Western"
      swipeHintKey="Landscapes-International-Canada-Western"
      {...props}
    />
  );
}
