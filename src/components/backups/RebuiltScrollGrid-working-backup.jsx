import { motion } from "framer-motion";
import { ArrowLeft, Menu } from "lucide-react";

/* ───── animation variants ───── */
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      /* children will pick up the stagger below */
      staggerChildren: 0.08,
    },
  },
};

const card = {
  hidden: { opacity: 0, scale: 0.85 },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.9,
      ease: [0.33, 1, 0.68, 1],
    },
  },
};

export default function RebuiltScrollGrid({ galleryData, onCardClick }) {
  return (
    <section className="bg-white py-10 px-6">
      {/* ── Section heading ─────────────────────────────── */}
      <div className="mb-[-3rem] z-20 relative flex items-center justify-center gap-4">
        <div className="fade-line" />
        <h2 className="watermark-title whitespace-nowrap">Chapter Index</h2>
        <div className="fade-line" />
      </div>

      {/* ── Grid wrapper (motion) ───────────────────────── */}
      <motion.div
        /* kick-off once the grid is ~20 % in view */
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        /* responsive centering + auto-fit columns */
        className="
          grid gap-4 sm:gap-6 mx-auto mt-20 max-w-6xl
          justify-center
          [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]
        "
      >
        {galleryData.map((entry, i) => (
          <motion.div
            key={i}
            variants={card}
            onClick={() => onCardClick(i)}
            className="
              rounded-xl border border-gray-300 p-4 hover:shadow-md
              cursor-pointer flex flex-col will-change-transform
            "
            style={{ backgroundColor: "#f7f3eb" }}
          >
            {/* image + bevel mat */}
            <div className="aspect-[4/5] bg-[#eae6df] rounded-sm overflow-hidden relative">
              <div
                className="absolute inset-0 rounded-sm pointer-events-none"
                style={{
                  boxShadow: `
                    inset 2px 0px 3px rgba(75, 75, 75, 0.4),
                    inset -2px 0px 3px rgba(236, 236, 236, 0.68),
                    inset 0px 2px 3px rgba(77, 77, 77, 0.4),
                    inset 0px -3px 4px rgba(255, 255, 255, 0.81)
                  `,
                }}
              />
              <img
                src={entry.image}
                alt={entry.title}
                className="w-full h-full object-cover rounded-sm"
              />
            </div>

            {/* staggered title fade-in */}
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
