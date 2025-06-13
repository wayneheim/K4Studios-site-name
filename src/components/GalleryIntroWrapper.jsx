import { motion } from "framer-motion";
import GalleryIntro from "./GalleryInfo.jsx";

export default function GalleryIntroWrapper() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.3 } },
      }}
    >
      {/* Text Section: from left */}
      <motion.div
        variants={{
          hidden: { opacity: 0, x: -50 },
          visible: { opacity: 1, x: 0 },
        }}
        transition={{ duration: 1.2, ease: [0.33, 1, 0.68, 1] }}
      >
        <GalleryIntro.Text />
      </motion.div>

      {/* Image Section: from right */}
      <motion.div
        variants={{
          hidden: { opacity: 0, x: 50 },
          visible: { opacity: 1, x: 0 },
        }}
        transition={{ duration: 1.2, ease: [0.33, 1, 0.68, 1] }}
      >
        <GalleryIntro.Image />
      </motion.div>

      {/* Explore Section: from bottom */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 40 },
          visible: { opacity: 1, y: 0 },
        }}
        transition={{ duration: 1.2, ease: [0.33, 1, 0.68, 1] }}
      >
        <GalleryIntro.Explore />
      </motion.div>
    </motion.div>
  );
}
