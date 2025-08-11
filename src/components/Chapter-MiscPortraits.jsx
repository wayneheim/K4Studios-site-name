import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Painterly-Fine-Art-Photography/Miscellaneous/Portraits.mjs";

export default function ChapterMiscPortraitsWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Miscellaneous/Portraits"
      titleBase="Painterly Miscellaneous — Portraits"
      sectionKey="/Miscellaneous/Portraits"
      swipeHintKey="Misc-Painterly-Portraits"
      {...props}
    />
  );
}

