import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Black-White.mjs';

export default function ChapterNativeAmericansBWWrapper(props) {
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Black-White"
      titleBase="Native American Portraits - Black & White"
      sectionKey="/Facing-History/Wild-West/Native-Americans-BW"
      swipeHintKey="Native-Americans-BW"
      {...props}
    />
  );
}