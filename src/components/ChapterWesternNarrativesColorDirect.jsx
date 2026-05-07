import ChapterGalleryBase from "./ChapterGalleryBase.jsx";

export default function ChapterWesternNarrativesColorDirect({ directImagePayload, initialImageId }) {
  const loadFullGallery = () =>
    import("@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color.mjs")
      .then((mod) => mod.galleryData || []);

  return (
    <ChapterGalleryBase
      directImagePayload={directImagePayload}
      loadFullGallery={loadFullGallery}
      basePath="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color"
      titleBase="Western Narratives - Color"
      sectionKey="/Facing-History/Wild-West/Western-Narratives-Color"
      swipeHintKey="Western-Narratives-Color"
      initialImageId={initialImageId}
    />
  );
}
