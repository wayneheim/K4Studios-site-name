import { motion } from "framer-motion";
import "../styles/galleryinfo.css";

//export default function GalleryInfo() {
export default function GalleryInfo({ entranceData }) {
  function handleExploreClick() {
    const header    = document.getElementById("header-section");
    const intro     = document.getElementById("intro-section");
    const chapter   = document.getElementById("chapter-section");
    const navToggle = document.getElementById("nav-toggle");
    const topSpacer = document.getElementById("top-spacer");

    if (intro) intro.classList.add("slide-fade-out");
    if (header) header.classList.add("slide-fade-out");

    setTimeout(() => {
      if (header) header.classList.add("section-hidden");
      if (intro) {
        intro.classList.add("section-hidden");
        intro.classList.remove("slide-fade-out");
      }
      if (chapter) {
        chapter.style.display = "block";
        // Force reflow for animation
        void chapter.offsetWidth;
        chapter.classList.remove("section-hidden");
        chapter.classList.add("section-visible", "slide-fade-in");
      }
      if (navToggle) navToggle.classList.remove("hidden");
      if (topSpacer) {
        topSpacer.style.marginTop = "0px";
        topSpacer.style.height = "0px";
        topSpacer.style.overflow = "hidden";
      }

        window.__forceStartAtIndex = 1;
    }, 10);
  }

  return (
    <>
      <section className="intro-wrapper" style={{ zIndex: 0, position: "relative" }}>
        <motion.div
          className="intro-text"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, delay: 0 }}
        >
          <h2>{entranceData.title}</h2>
          <h3>{entranceData.subtitle}</h3>
          <p>{entranceData.description}</p>
          {entranceData.details && (
            <details>
              <summary>
                <span className="arrow-icon">▶</span> More…
              </summary>
              <p className="mt-2 text-base">{entranceData.details}</p>
            </details>
          )}
        </motion.div>

        <motion.div
          className="intro-image"
          style={{ zIndex: 0, position: "relative" }}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, ease: [0.33, 1, 0.68, 1] }}
        >
          {entranceData.image && (
            <figure>
              <img
                src={entranceData.image.src}
                alt={entranceData.image.alt || "Portrait preview"}
                style={{
  maxWidth: "100%",
  borderRadius: "9px",
  boxShadow: "0 8px 32px #0002",
  border: "2px solid #ddd" // <-- soft gray border
}}
              />
              <figcaption>{entranceData.image.caption}</figcaption>
            </figure>
          )}
        </motion.div>
      </section>

      <motion.div
        className="explore-section explore-button"
        role="button"
        tabIndex={0}
        onClick={() => {
  window.dispatchEvent(new CustomEvent("enterChapters")); // ✅ new trigger
  handleExploreClick();
}}

        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 0, ease: [0.33, 1, 0.68, 1] }}
      >
        Explore the Gallery <span style={{ fontSize: "1.8rem", verticalAlign: "middle" }}>→</span>
        <div className="divider">
          <span style={{ fontSize: "1.5rem" }}>◆</span>
        </div>
      </motion.div>
    </>
  );
}
