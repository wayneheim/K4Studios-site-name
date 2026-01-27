import { motion } from "framer-motion";
import { normalizeImageSrc } from "../utils/imageProxy.js";

export default function StoryClosingPage({ galleryImages = [], onBackToStart }) {
  return (
    <motion.div
      key="story-end"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.8 }}
      className="flex flex-col items-center justify-center text-center min-h-[70vh] px-6"
    >
      <h1
        className="text-2xl md:text-3xl font-semibold text-[#85644b] mb-4"
        style={{ fontFamily: "'Glegoo', serif" }}
      >
        The End of This Story
      </h1>

      <p className="text-base md:text-lg text-gray-700 max-w-xl mb-8 leading-relaxed">
        Thank you for traveling this story with me. Every photograph in this collection
        connects to a larger world of painterly fine art and narrative.
      </p>

      {/* Optional special offer section */}
      <div className="bg-[#f6f4f1] border border-[#d8d2c8] rounded-lg px-6 py-4 mb-10 shadow-sm">
        <p className="text-[#85644b] font-semibold mb-1">Limited Time Offer</p>
        <p className="text-gray-700 text-sm">
          Enjoy <strong>15% off</strong> any print from this story for the next 7 days.
          Use code <span className="font-mono text-[#85644b]">STORY15</span> at checkout.
        </p>
      </div>

      <hr className="w-full max-w-3xl border-gray-300 mb-8" />

      <h2
        className="text-lg md:text-xl font-medium text-gray-800 mb-6"
        style={{ fontFamily: "'Glegoo', serif" }}
      >
        Gallery Preview
      </h2>

      <div className="flex flex-wrap justify-center gap-4 mb-12">
        {galleryImages.map((img, idx) => (
          <a
            key={idx}
            href={img.pageUrl || "#"}
            className="group block rounded-md overflow-hidden border border-gray-300 hover:shadow-md transition-all"
          >
            <img
              src={normalizeImageSrc(img.src, 'm')}
              alt={img.title}
              className="w-[110px] h-[110px] object-cover group-hover:opacity-90"
            />
          </a>
        ))}
      </div>

      {onBackToStart && (
        <button
          onClick={onBackToStart}
          className="px-6 py-2 bg-[#85644b] text-white rounded-md hover:bg-[#6b4f3a] transition"
        >
          Back to Start
        </button>
      )}
    </motion.div>
  );
}
