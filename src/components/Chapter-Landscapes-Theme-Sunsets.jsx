import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Sunsets/Sunsets.mjs";

export default function ChapterLandscapesSunsetsWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Sunsets"
      titleBase="Painterly Landscapes — Sunsets"
      sectionKey="/Landscapes/Sunsets-Painterly"
      swipeHintKey="Painterly-Landscapes-Sunsets"
      {...props}
    />
  );
}
