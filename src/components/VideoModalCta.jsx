import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Play, X } from "lucide-react";
import { emitActionPixel, trackEvent } from "../utils/analytics";

export default function VideoModalCta({
  youtubeId,
  label = "60 Seconds... Beyond the Frame",
  title = "Only Path Forward",
  kicker = "Final frame",
  compact = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [canUsePortal, setCanUsePortal] = useState(false);

  useEffect(() => {
    setCanUsePortal(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!youtubeId) return null;

  const embedSrc = `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`;
  const labelParts = compact ? label.split(":") : [];
  const handleOpen = () => {
    const pageType = window.location.pathname === "/" ? "landing" : "other";
    const context = {
      galleryId: "frontier-story-widget",
      pageType,
      trigger: compact ? "compact_video_cta_open" : "video_cta_open",
      sourceLayer: "frontier_story_video_widget_click_pixel_v1",
    };

    trackEvent("frontier_story_video_widget_click", context);
    emitActionPixel("frontier_story_video_widget_click", null, context);
    setIsOpen(true);
  };

  return (
    <div className={`narrative-video-cta-shell${compact ? " narrative-video-cta-shell--compact" : ""}`}>
      {!compact && <span className="narrative-video-cta-kicker narrative-video-cta-kicker--outer">{kicker}</span>}
      <button type="button" className="narrative-video-cta" onClick={handleOpen}>
        {compact && <span className="narrative-video-cta-kicker narrative-video-cta-kicker--inset">{kicker}</span>}
        <span className="narrative-video-cta-title-row">
          <span className="narrative-video-cta-icon" aria-hidden="true">
            <Play />
          </span>
          <span className="narrative-video-cta-copy">
            <span className="narrative-video-cta-title">
              {compact && labelParts.length > 1 ? (
                <>
                  {labelParts[0]}:
                  <br />
                  {labelParts.slice(1).join(":").trim()}
                </>
              ) : label}
            </span>
          </span>
        </span>
      </button>

      {isOpen && canUsePortal && createPortal(
        <div className="narrative-video-modal" role="dialog" aria-modal="true" aria-label={title}>
          <button
            type="button"
            className="narrative-video-backdrop"
            aria-label="Close video"
            onClick={() => setIsOpen(false)}
          />
          <div className="narrative-video-window">
            <button
              type="button"
              className="narrative-video-close"
              aria-label="Close video"
              onClick={() => setIsOpen(false)}
            >
              <X aria-hidden="true" />
            </button>
            <iframe
              src={embedSrc}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>,
        document.body
      )}
      <style>{`
        .narrative-video-cta-shell {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.45rem;
          width: 100%;
        }

        .narrative-video-cta {
          display: grid;
          justify-items: center;
          width: min(100%, 34rem);
          border: 1px solid rgba(139, 69, 19, 0.28);
          border-radius: 18px;
          padding: 1.2rem 1.2rem 1rem;
          background: #fff;
          color: #3b342e;
          font-family: 'Glegoo', serif;
          font-size: 1rem;
          font-weight: 700;
          line-height: 1.2;
          cursor: pointer;
          box-shadow: 0 0.6rem 1.8rem rgba(42, 31, 23, 0.12);
          transition: border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .narrative-video-cta:hover {
          border-color: rgba(139, 69, 19, 0.72);
          color: #7b3511;
          box-shadow: 0 0.9rem 2rem rgba(42, 31, 23, 0.16);
          background: #fff;
        }

        .narrative-video-cta-shell--compact .narrative-video-cta {
          width: min(100%, 34rem);
          padding: 0.95rem 1rem;
          gap: 0.55rem;
          justify-items: stretch;
        }

        .narrative-video-cta-kicker {
          display: block;
          font-size: 0.72rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #8b4513;
          opacity: 0.8;
          text-align: center;
          font-weight: 700;
        }

        .narrative-video-cta-kicker--inset {
          margin-bottom: 0;
          display: block;
          width: 100%;
          letter-spacing: 0;
          text-transform: none;
          font-size: 1.02rem;
          line-height: 1.18;
          color: inherit;
          opacity: 1;
          font-weight: 700;
          text-align: center;
        }

        .narrative-video-cta-title-row {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          width: 100%;
        }

        .narrative-video-cta-copy {
          display: grid;
          justify-items: start;
          gap: 0.1rem;
          min-width: 0;
        }

        .narrative-video-cta-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.35rem;
          height: 2.35rem;
          border-radius: 999px;
          background: #8b4513;
          color: #fff;
          flex: 0 0 auto;
        }

        .narrative-video-cta-icon svg {
          width: 1.1rem;
          height: 1.1rem;
          margin-left: 0.1rem;
          stroke-width: 2.8;
        }

        .narrative-video-cta-title {
          display: block;
          font-size: 1.25rem;
          line-height: 1.05;
          letter-spacing: 0.01em;
          text-align: center;
        }

        .narrative-video-cta-shell--compact .narrative-video-cta-title {
          font-size: 1rem;
          font-weight: 700;
          text-align: center;
        }

        .narrative-video-modal {
          position: fixed;
          inset: 0;
          z-index: 2147483000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          width: 100vw;
          height: 100vh;
        }

        .narrative-video-backdrop {
          position: absolute;
          inset: 0;
          border: 0;
          background: rgba(20, 17, 15, 0.78);
          cursor: pointer;
        }

        .narrative-video-window {
          position: relative;
          z-index: 1;
          width: min(1180px, 94vw);
          max-height: calc(100vh - 3rem);
          aspect-ratio: 16 / 9;
          background: #111;
          box-shadow: 0 1.2rem 3rem rgba(0, 0, 0, 0.4);
        }

        .narrative-video-window iframe {
          width: 100%;
          height: 100%;
          border: 0;
          display: block;
        }

        .narrative-video-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 999px;
          background: #fff;
          color: #2c2c2c;
          cursor: pointer;
          box-shadow: 0 0.35rem 1rem rgba(0, 0, 0, 0.25);
        }

        .narrative-video-close svg {
          width: 1.2rem;
          height: 1.2rem;
        }

        @media (max-width: 640px) {
          .narrative-video-cta {
            width: 100%;
            padding: 1rem 1rem 0.9rem;
          }

          .narrative-video-cta-title-row {
            gap: 0.6rem;
          }

          .narrative-video-cta-title {
            font-size: 1.1rem;
          }

          .narrative-video-window {
            width: min(calc(100vw - 1.5rem), 1180px);
          }

          .narrative-video-close {
            top: 0.65rem;
            right: 0.65rem;
          }
        }
      `}</style>
    </div>
  );
}
