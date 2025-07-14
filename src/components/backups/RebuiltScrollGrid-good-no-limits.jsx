import { motion } from "framer-motion";
import { Menu, ChevronLeft } from "lucide-react";  
const cardVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: (i) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.08,          // ← old animationDelay
      duration: 0.9,
      ease: [0.33, 1, 0.68, 1],
    },
  }),
};

export default function RebuiltScrollGrid({ galleryData, onCardClick }) {
  return (
    <section className="bg-white py-10 px-6">
      {/* heading */}
      <div className="chapter-title-block mb-[-3rem] z-20 relative flex items-center justify-center gap-4">
  <div className="fade-line" />
  <h2 className="watermark-title whitespace-nowrap">Chapter Index</h2>
  <div className="fade-line" />
</div>

      {/* grid */}
      <motion.div
        /* reveal once when 15 % of the grid is visible */
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="scroll-grid bg-white"
      >
        {galleryData.map((entry, i) => (
          <motion.div
            key={i}
            variants={cardVariants}
            custom={i}
            onClick={() => onCardClick(i)}
            className="rounded-xl border border-gray-300 p-4 hover:shadow-md cursor-pointer flex flex-col will-change-transform"
            style={{ backgroundColor: "#f7f3eb" }}
          >
            {/* image + mat bevel */}
            <div className="aspect-[4/5] bg-[#eae6df] rounded-sm overflow-hidden relative">
              <div
                className="absolute inset-0 rounded-sm pointer-events-none"
                style={{
                  boxShadow: `
                    inset 2px 0 3px rgba(75,75,75,.4),
                    inset -2px 0 3px rgba(236,236,236,.68),
                    inset 0 2px 3px rgba(77,77,77,.4),
                    inset 0 -3px 4px rgba(255,255,255,.81)
                  `,
                }}
              />
              <img
                src={entry.src}
                alt={entry.title}
                className="w-full h-full object-cover rounded-sm"
              />
            </div>

            {/* title fade-in (independent) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4, ease: "easeOut" }}
              className="h-[3.25rem] mt-4 flex items-center justify-center"
            >
              <h3 className="text-sm sm:text-base font-semibold text-center text-warm-fade">
                {entry.title}
              </h3>
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      
    </section>
  );
}
