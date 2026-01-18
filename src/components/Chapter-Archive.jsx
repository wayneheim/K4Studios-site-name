import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from "../data/Other/Archive/Archive.mjs";

export default function ChapterArchiveWrapper(props){
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Other/Archive"
      titleBase="Archive"
      sectionKey="/Other/Archive"
      swipeHintKey="Archive"
      {...props}
    />
  );
}
