import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Miscellaneous/Reenactments.mjs";

export default function ChapterTransportationCarsWrapper(props) {
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Fine-Art-Photography/Miscellaneous/Reenactments"
      titleBase="Miscellaneous - Reenactments"
      sectionKey="/Miscellaneous/Reenactments"
      swipeHintKey="Miscellaneous/Reenactments"
      {...props}
    />
  );
}
