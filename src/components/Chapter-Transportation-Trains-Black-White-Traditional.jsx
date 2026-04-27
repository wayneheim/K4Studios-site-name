import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Transportation/Trains-Black-White.mjs";

export default function ChapterTransportationTrainsBlackWhiteTraditional(props) {
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Fine-Art-Photography/Transportation/Trains-Black-White"
      titleBase="Transportation — Trains — Black & White"
      sectionKey="/Transportation/Trains-Black-White"
      swipeHintKey="Transportation-Trains-Black-White"
      {...props}
    />
  );
}