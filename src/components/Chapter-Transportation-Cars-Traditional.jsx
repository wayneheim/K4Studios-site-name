import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Transportation/Cars.mjs";

export default function ChapterTransportationCarsWrapper(props) {
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Fine-Art-Photography/Transportation/Cars"
      titleBase="Transportation — Cars"
      sectionKey="/Transportation/Cars"
      swipeHintKey="Transportation-Cars"
      {...props}
    />
  );
}
