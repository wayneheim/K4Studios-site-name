import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Transportation/Boats.mjs";

export default function ChapterTransportationCarsWrapper(props) {
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Fine-Art-Photography/Transportation/Boats"
      titleBase="Transportation — Boats"
      sectionKey="/Transportation/Boats"
      swipeHintKey="Transportation-Boats"
      {...props}
    />
  );
}
