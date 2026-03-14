import { AnimatePresence, motion } from "framer-motion";
import { CircleX } from "lucide-react";
import { getProxySrc } from "../utils/imageProxy.js";

function getInStockCount(inventory = {}) {
  return inventory.inStock || Math.max(0, (inventory.printed || 0) - (inventory.sold || 0));
}

function buildEngrainedMailtoLink(image) {
  const subject = encodeURIComponent(`Order Inquiry: ${image?.title || "Engrained Series Image"} — Engrained Series`);
  const sizeLine = image?.imageSize
    ? `Size: ${image.imageSize}${image?.price ? ` (${image.price})` : ""}`
    : image?.price
      ? `Price: ${image.price}`
      : "";

  let body = "Hello,\n\nI am interested in ordering:\n\n";
  body += `Image: ${image?.title || "N/A"}\n`;
  body += `Image ID: ${image?.id || "N/A"}\n`;
  body += "Series: Engrained (Baltic Birch Wood Print)\n";
  if (sizeLine) {
    body += `${sizeLine}\n`;
  }
  body += "\nPlease provide ordering information.\n\n";
  body += "---\n";
  body += "Your Name:\n";
  body += "Preferred Contact (email or phone):\n";
  body += "---\n\n";
  body += "Thank you!";

  return `mailto:info@k4studios.com?subject=${subject}&body=${encodeURIComponent(body)}`;
}

export default function EngrainedOrderModal({ isOpen, onClose, image, trackEvent }) {
  if (!image) return null;

  const hasInventory = getInStockCount(image.inventory || {}) > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[10000] bg-black bg-opacity-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-6 relative">
              <div className="mb-4 text-center">
                <h2 className="text-xl font-bold text-gray-800">More About This Image</h2>
              </div>

              <div className="space-y-4">
                <div className="text-center">
                  <img
                    src={getProxySrc(image.id, "s")}
                    alt={image.alt || image.title}
                    className="w-full max-w-48 mx-auto rounded-lg shadow-md"
                  />
                  <h3 className="text-lg font-semibold text-gray-800 mt-3">{image.title}</h3>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Pricing Information</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    {(() => {
                      const editionSize = image.editionSize;
                      const imageSize = image.imageSize;
                      const price = image.price;
                      const availability = image.availability;
                      const shipping = image.shipping;

                      if (editionSize || imageSize || price || availability || shipping) {
                        return (
                          <div className="space-y-1">
                            {editionSize && <p style={{ color: "#1b1a19" }}>• Limited Edition: {editionSize}</p>}
                            {imageSize && <p style={{ color: "#1b1a19" }}>• Size: {imageSize}</p>}
                            {price && <p style={{ color: "#1b1a19" }}>• Price: {price}</p>}
                            {availability && <p style={{ color: "#1b1a19" }}>• Availability: {availability}</p>}
                            {shipping && <p style={{ color: "#1b1a19" }}>• Shipping: {shipping}</p>}
                          </div>
                        );
                      }

                      const description = image.description || "";
                      const pricingMatches = description.match(/\$[\d,]+(?:\.\d{2})?/g);
                      const sizeMatches = description.match(/\d+"?\s*x\s*\d+"?/g);
                      const limitedEdition = description.match(/Limited edition[-\s]*(\d+)/i);

                      if (pricingMatches && pricingMatches.length > 0) {
                        return (
                          <div className="space-y-1">
                            {limitedEdition && <p style={{ color: "#1b1a19" }}>• Limited Edition: {limitedEdition[1]}</p>}
                            {sizeMatches && sizeMatches.length > 0 && (
                              <p style={{ color: "#1b1a19" }}>• Size: {sizeMatches[0].replace(/x/g, " × ")}</p>
                            )}
                            <p style={{ color: "#1b1a19" }}>• Price: {pricingMatches[0]}</p>
                            <p style={{ color: "#1b1a19" }}>• Availability: Call</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-1">
                          <p style={{ color: "#1b1a19" }}>• Contact us for custom pricing</p>
                          <p style={{ color: "#1b1a19" }}>• Various sizes available</p>
                          <p style={{ color: "#1b1a19" }}>• Limited edition</p>
                          <p style={{ color: "#1b1a19" }}>• Availability: Call</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="p-4 rounded-lg" style={{ backgroundColor: "#cfd1c8ff" }}>
                  <h4 className="font-semibold mb-2" style={{ color: "#1b1a19" }}>About Engrained Series</h4>
                  <p className="text-sm" style={{ color: "#1b1a19" }}>
                    Fine art printed on nature's canvas. Each piece is created using a custom 5-layer UV process on hand-selected Baltic Birch, where the wood's natural grain becomes part of the image. The result: rich depth, painterly texture, and a one-of-a-kind fusion of art and nature.
                  </p>
                </div>

                <div className="text-center">
                  <a
                    href={buildEngrainedMailtoLink(image)}
                    className="inline-flex items-center justify-center gap-2 w-full max-w-xs px-4 py-2.5 text-white rounded text-sm transition-all font-medium"
                    style={{
                      background: "linear-gradient(to bottom, #92400e 0%, #78350f 100%)",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                      border: "1px solid #78350f",
                      textShadow: "0 1px 1px rgba(0,0,0,0.3)",
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = "linear-gradient(to bottom, #78350f 0%, #451a03 100%)";
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background = "linear-gradient(to bottom, #92400e 0%, #78350f 100%)";
                    }}
                    onClick={() => {
                      trackEvent?.("order_submitted");
                    }}
                  >
                    <span>Contact Us to Order</span>
                    {hasInventory && <span className="text-xs text-green-200/90 font-normal italic">· Quick ship available</span>}
                  </a>
                </div>
              </div>

              <button
                type="button"
                className="absolute bottom-4 left-4 inline-flex items-center justify-center w-8 h-8 border border-gray-300 bg-white text-gray-300 rounded-full shadow-sm hover:bg-gray-700 hover:text-gray-200 hover:border-red-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 transition-colors cursor-pointer"
                aria-label="Close pricing modal"
                title="Close"
                onClick={onClose}
              >
                <CircleX className="w-7 h-7" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}