import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/Iceland.mjs";

export default function ChapterLandscapesInternationalWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/Iceland"
      titleBase="Landscapes — International-Iceland"
      sectionKey="/Landscapes/International/Iceland"
      swipeHintKey="Landscapes-International-Iceland"
      {...props}
    />
  );
}
