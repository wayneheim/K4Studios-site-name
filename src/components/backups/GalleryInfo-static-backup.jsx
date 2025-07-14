import { motion } from "framer-motion";
import "../styles/galleryinfo.css";
export default function GalleryInfo() {
  function handleExploreClick() {
  const header    = document.getElementById("header-section");
  const intro     = document.getElementById("intro-section");
  const chapter   = document.getElementById("chapter-section");
  const navToggle = document.getElementById("nav-toggle");
  const topSpacer = document.getElementById("top-spacer");

  if (intro) {
    intro.classList.add("slide-fade-out");
  }
  if (header) {
    header.classList.add("slide-fade-out");
  }

  // Wait for animation to complete
  setTimeout(() => {
    if (header) header.classList.add("section-hidden");
    if (intro) {
      intro.classList.add("section-hidden");
      intro.classList.remove("slide-fade-out");
    }

    if (chapter) {
      chapter.style.display = "block";

      // Force reflow
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
  }, 10); // Matches animation duration
}

  return (
    <>
     
      

     <section className="intro-wrapper" style={{ zIndex: 0, position: 'relative' }}>
        <motion.div
          className="intro-text"
    initial={{ opacity: 0, x: -40 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 1.2, delay: 0 }}
        >
          <h2>Cowboy Art Prints by Wayne Heim - Authentic Western Fine Art Photography in Color</h2>
          <h3>Capturing the Spirit of the American West</h3>
          <p>Discover a painterly take on cowboy photography that brings the color and grit of the frontier to life. Wayne Heim's Western art prints are more than portraits — they are vivid stories etched in sun, shadow, and dust.</p>
          <details>
             <summary>
    <span className="arrow-icon">▶</span> More…
  </summary>
  <p className="mt-2 text-base">
    These black and white and color cowboy photographs are captured with the soul of the American West in mind—no studio backdrops, no Hollywood tropes. Just real cowboys, historic reenactors, and the spirit of wide-open spaces. Printed using painterly techniques, these works blend the realism of photography with the brushlike textures of illustration.
  </p>
</details>
        </motion.div>

      <motion.div
  className="intro-image"
  style={{ zIndex: 0, position: 'relative' }}
  initial={{ opacity: 0, x: 50 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ duration: 1.2, ease: [0.33, 1, 0.68, 1] }}
>
          <figure>
            <img src="https://photos.smugmug.com/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/i-44jcjTQ/3/MgTD8rSCgsDJVpFJp8MMrqrC5fFZGT7qHBHjvjbGR/XL/cowboy%20art%20_O1H0384-Edit-2-Edit-2-Edit-2-XL.jpg" alt="Portrait preview" />
            <figcaption>"The Old Hand"</figcaption>
          </figure>
        </motion.div>
      </section>

<motion.div
  className="explore-section explore-button"
  role="button"
  tabIndex="0"
  onClick={handleExploreClick}
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 1.2, delay: 0.0, ease: [0.33, 1, 0.68, 1] }}
>
        Explore the Gallery <span style={{ fontSize: "1.8rem", verticalAlign: "middle" }}>→</span>
        <div className="divider"><span style={{ fontSize: "1.5rem" }}>{'◆'}</span></div>
      </motion.div>
    </>
  );
}
