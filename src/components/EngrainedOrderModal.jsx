import CollectionOrderModal from "./commerce/CollectionOrderModal.jsx";

const ENGRAINED_GALLERY_PATH = "/Other/K4-Select-Series/Engrained/Engrained-Series";

function getInStockCount(inventory = {}) {
  return Number(inventory.inStock) || Math.max(
    0,
    (Number(inventory.printed) || 0) - (Number(inventory.sold) || 0),
  );
}

/**
 * Dedicated Engrained pages use the same first-party collection cart as every
 * other physical print. Each record supplies its own size, price, edition
 * limit, and inventory; no generic Engrained price is substituted here.
 */
export default function EngrainedOrderModal({ isOpen, onClose, image, trackEvent }) {
  if (!image) return null;

  const engrainedLink = {
    engrainedId: image.id,
    title: image.title,
    description: image.description,
    url: `${ENGRAINED_GALLERY_PATH}/${image.id}`,
    price: image.price,
    imageSize: image.imageSize,
    editionSize: image.editionSize,
    hasInventory: getInStockCount(image.inventory) > 0,
  };

  return (
    <CollectionOrderModal
      isOpen={isOpen}
      onClose={onClose}
      image={image}
      trackEvent={trackEvent}
      displaySeries={[]}
      engrainedLink={engrainedLink}
      oneImageMovie={Boolean(image.oneImageMovie)}
    />
  );
}
