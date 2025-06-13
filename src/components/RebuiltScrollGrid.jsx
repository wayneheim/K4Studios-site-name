import { motion } from "framer-motion";

export default function RebuiltScrollGrid({ galleryData, onCardClick }) {
  const animationDelay = 0.08;

  return (
    <section className="bg-white py-10 px-6">
      <div className="mb-[-3rem] z-20 relative text-center">
        <h2 className="watermark-title">Chapter Index</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto mt-20">
        {galleryData.map((entry, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: i * animationDelay,
              duration: 0.9,
              ease: [0.33, 1, 0.68, 1],
            }}
            className="rounded-xl border border-gray-300 p-4 hover:shadow-md cursor-pointer flex flex-col will-change-transform"
            style={{
              backgroundColor: "#f7f3eb",
            }}
            onClick={() => onCardClick(i)}
          >
         <div className="aspect-[4/5] bg-[#eae6df] rounded-sm overflow-hidden relative">
  {/* Inset bevel on mat layer */}
  <div
  className="absolute inset-0 rounded-sm pointer-events-none"
  style={{
    boxShadow: `
      inset 2px 0px 3px rgba(75, 75, 75, 0.4),     /* left highlight */
      inset -2px 0px 3px rgba(236, 236, 236, 0.68),    /* right highlight */
      inset 0px 2px 3px rgba(77, 77, 77, 0.4),     /* top highlight */
      inset 0px -3px 4px rgba(255, 255, 255, 0.81)       /* bottom shadow */
    `
  }}
></div>

  <img
    src={entry.image}
    alt={entry.title}
    className="w-full h-full object-cover rounded-sm"
  />
</div>

            {/* Staggered title fade-in */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                delay: i * animationDelay + 0.5,
                duration: 0.4,
                ease: "easeOut",
              }}
              className="h-[3.25rem] mt-4 flex items-center justify-center"
            >
              <h3 className="text-sm sm:text-base font-semibold text-center text-warm-fade">
                {entry.title}
              </h3>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
