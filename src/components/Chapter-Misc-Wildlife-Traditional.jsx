import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Miscellaneous/Wildlife.mjs";

export default function ChapterTransportationCarsWrapper(props) {
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Fine-Art-Photography/Miscellaneous/Wildlife"
      titleBase="Miscellaneous - Wildlife"
      sectionKey="/Miscellaneous/Wildlife"
      swipeHintKey="Miscellaneous/Wildlife"
      {...props}
    />
  );
}
