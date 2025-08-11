import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Painterly-Fine-Art-Photography/Transportation/Cars.mjs";

export default function ChapterTransportationCarsWrapper(props) {
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Transportation/Cars"
      titleBase="Transportation — Cars"
      sectionKey="/Transportation/Cars"
      swipeHintKey="Transportation-Cars"
      {...props}
    />
  );
}
