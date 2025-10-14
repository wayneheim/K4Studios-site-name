import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Mountains/Mountains.mjs";

export default function ChapterLandscapesMountainsWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Mountains"
      titleBase="Landscapes — Mountains"
      sectionKey="/Landscapes/Mountains-Traditional"
      swipeHintKey="Landscapes-Mountains"
      {...props}
    />
  );
}
