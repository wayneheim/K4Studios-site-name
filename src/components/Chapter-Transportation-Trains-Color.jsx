import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Color.mjs";

export default function ChapterTransportationTrainsColorWrapper(props) {
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Color"
      titleBase="Transportation — Trains (Color)"
      sectionKey="/Transportation/Trains-Color"
      swipeHintKey="Transportation-Trains-Color"
      {...props}
    />
  );
}
