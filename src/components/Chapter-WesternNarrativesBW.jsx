import ChapterGalleryBase from './ChapterGalleryBase.jsx';
import { galleryData as rawData } from '@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White.mjs';

export default function ChapterWesternNarrativesBWWrapper(props) {
  return (
    <ChapterGalleryBase
      rawData={rawData}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White"
      titleBase="Western Narratives - Black & White"
      sectionKey="/Facing-History/Wild-West/Western-Narratives-BW"
      swipeHintKey="Western-Narratives-BW"
      {...props}
    />
  );
}