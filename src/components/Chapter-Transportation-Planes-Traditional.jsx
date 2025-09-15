import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Transportation/Planes.mjs";

export default function ChapterTransportationCarsWrapper(props) {
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Fine-Art-Photography/Transportation/Planes"
      titleBase="Transportation — Planes"
      sectionKey="/Transportation/Planes"
      swipeHintKey="Transportation-Planes"
      {...props}
    />
  );
}
