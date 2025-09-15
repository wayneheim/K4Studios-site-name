import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Portraits/Black-White.mjs";

export default function ChapterTransportationCarsWrapper(props) {
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Fine-Art-Photography/Portraits/Black-White"
      titleBase="Portraits — Portraits-Black-White"
      sectionKey="/Portraits/Black-White"
      swipeHintKey="Portraits-Black-White"
      {...props}
    />
  );
}
