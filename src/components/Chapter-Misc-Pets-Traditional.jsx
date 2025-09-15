import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Miscellaneous/Pets.mjs";

export default function ChapterTransportationCarsWrapper(props) {
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Fine-Art-Photography/Miscellaneous/Pets"
      titleBase="Miscellaneous - Pets"
      sectionKey="/Miscellaneous/Pets"
      swipeHintKey="Miscellaneous/Pets"
      {...props}
    />
  );
}
