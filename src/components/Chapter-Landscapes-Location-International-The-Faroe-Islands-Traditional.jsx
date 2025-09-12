import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/The-Faroe-Islands.mjs";

export default function ChapterLandscapesInternationalWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/The-Faroe-Islands"
      titleBase="Landscapes — International-The-Faroe-Islands"
      sectionKey="/Landscapes/International/The-Faroe-Islands"
      swipeHintKey="Landscapes-International-The-Faroe-Islands"
      {...props}
    />
  );
}
