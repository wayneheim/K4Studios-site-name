import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/Newfoundland.mjs";

export default function ChapterLandscapesInternationalWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/Newfoundland"
      titleBase="Landscapes — International-Newfoundland"
      sectionKey="/Landscapes/International/Newfoundland"
      swipeHintKey="Landscapes-International-Newfoundland"
      {...props}
    />
  );
}
