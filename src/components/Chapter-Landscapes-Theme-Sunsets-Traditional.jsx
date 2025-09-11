import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Sunsets/Sunsets.mjs";

export default function ChapterLandscapesSunsetsWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Sunsets"
      titleBase="Landscapes — Sunsets"
      sectionKey="/Landscapes/Sunsets"
      swipeHintKey="Landscapes-Sunsets"
      {...props}
    />
  );
}
