import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Galleries/Fine-Art-Photography/Transportation/Military.mjs";

export default function ChapterTransportationCarsWrapper(props) {
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Fine-Art-Photography/Transportation/Military"
      titleBase="Transportation — Military"
      sectionKey="/Transportation/Military"
      swipeHintKey="Transportation-Military"
      {...props}
    />
  );
}
