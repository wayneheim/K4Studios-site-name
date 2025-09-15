import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Portraits/Reenactors.mjs";

export default function ChapterTransportationCarsWrapper(props) {
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Fine-Art-Photography/Portraits/Reenactors"
      titleBase="Portraits — Portraits-Reenactors"
      sectionKey="/Portraits/Reenactors"
      swipeHintKey="Portraits-Reenactors"
      {...props}
    />
  );
}
