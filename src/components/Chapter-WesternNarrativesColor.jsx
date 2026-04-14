import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color.mjs';

export default function ChapterWesternNarrativesColorWrapper(props) {
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color"
      titleBase="Western Narratives - Color"
      sectionKey="/Facing-History/Wild-West/Western-Narratives-Color"
      swipeHintKey="Western-Narratives-Color"
      {...props}
    />
  );
}