import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Architecture/Gallery.mjs";

export default function ChapterLandscapesWaterWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Fine-Art-Photography/Architecture/Gallery"
      titleBase="Architecture — Traditional"
      sectionKey="/Architecture/Gallery"
      swipeHintKey="Architecture-Water"
      {...props}
    />
  );
}
