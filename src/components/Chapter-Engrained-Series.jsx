import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Other/K4-Select-Series/Engrained/Engrained-Series.mjs";

export default function ChapterEngrainedSeriesWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Other/K4-Select-Series/Engrained/Engrained-Series"
      titleBase="Engrained Series — Painterly Wood Prints"
      sectionKey="/Other/Engrained-Series"
      swipeHintKey="Engrained-Series"
      {...props}
    />
  );
}
