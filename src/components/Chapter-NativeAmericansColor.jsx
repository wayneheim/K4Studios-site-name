import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color.mjs';

export default function ChapterNativeAmericansColorWrapper(props) {
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color"
      titleBase="Native American Portraits - Color"
      sectionKey="/Facing-History/Wild-West/Native-Americans-Color"
      swipeHintKey="Native-Americans-Color"
      {...props}
    />
  );
}