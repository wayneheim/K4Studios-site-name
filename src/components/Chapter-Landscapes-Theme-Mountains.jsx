import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains/Mountains.mjs";

export default function ChapterLandscapesMountainsWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains"
      titleBase="Painterly Landscapes — Mountains"
      sectionKey="/Landscapes/Mountains-Painterly"
      swipeHintKey="Painterly-Landscapes-Mountains"
      {...props}
    />
  );
}
