export default function ImageId({ imageId }) {
  const id = String(imageId || "").replace(/-sketch$/i, "");
  if (!id) return null;

  return (
    <p className="mt-1 select-text text-xs normal-case tracking-normal text-stone-400" aria-label={`Image ID ${id}`}>
      {id}
    </p>
  );
}
