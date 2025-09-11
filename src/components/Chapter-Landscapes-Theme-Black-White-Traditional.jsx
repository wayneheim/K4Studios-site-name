import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Black-White/Black-White.mjs";

export default function ChapterLandscapesColorWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Black-White"
      titleBase="Painterly Landscapes — Black & White"
      sectionKey="/Landscapes/Black-White"
      swipeHintKey="Landscapes-Black-White"
      {...props}
    />
  );
}
