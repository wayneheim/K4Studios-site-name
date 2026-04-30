import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Transportation/Trains.mjs";

export default function ChapterTransportationTrainsBlackWhiteTraditional(props) {
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Fine-Art-Photography/Transportation/Trains"
      titleBase="Transportation — Trains — Black & White"
      sectionKey="/Transportation/Trains"
      swipeHintKey="Transportation-Trains"
      {...props}
    />
  );
}
