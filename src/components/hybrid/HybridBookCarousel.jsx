/**
 * HybridBookCarousel.jsx
 *
 * Coffee-table-book spread carousel for Hybrid Authority–Commerce Hub pages.
 *
 * Layout:  Image (left 60%) | Title + Story (right 40%)
 * Mobile:  Image on top, text below (stacked)
 *
 * Behavior:
 *   - Auto-fades every 7 seconds
 *   - Manual prev/next arrows (no dots, no thumbs)
 *   - Crossfade transition
 *   - Pauses on hover
 *   - First slide visible immediately (no hydration gate)
 *
 * Images use /img/{id}/l — never xl.
 */
import { useState, useEffect, useRef, useCallback } from "react";

const INTERVAL_MS = 8500;
const FADE_MS = 1200;

// Proxy helper — never expose SmugMug URLs
const getProxySrc = (id, size = "l") => `/img/${id}/${size}`;

export default function HybridBookCarousel({
  slides = [],
  galleryBasePath = "",
  kicker = "",
  counterLabel = "",
}) {
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);
  const [textPhase, setTextPhase] = useState("idle");
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);
  const textTimerRef = useRef(null);
  const total = slides.length;

  const goTo = useCallback(
    (next) => {
      if (fading || total < 2) return;
      if (textTimerRef.current) clearTimeout(textTimerRef.current);
      setTextPhase("exiting");
      setFading(true);
      setTimeout(() => {
        setActive(next);
        setTextPhase("entering");
        setFading(false);
        textTimerRef.current = setTimeout(() => {
          setTextPhase("idle");
        }, FADE_MS);
      }, FADE_MS);
    },
    [fading, total]
  );

  const goNext = useCallback(() => goTo((active + 1) % total), [active, total, goTo]);
  const goPrev = useCallback(
    () => goTo((active - 1 + total) % total),
    [active, total, goTo]
  );

  // Auto-advance
  useEffect(() => {
    if (paused || total < 2) return;
    timerRef.current = setInterval(goNext, INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [paused, goNext, total]);

  useEffect(() => {
    return () => {
      if (textTimerRef.current) clearTimeout(textTimerRef.current);
    };
  }, []);

  if (!slides.length) return null;

  const current = slides[active];
  const chapterLink = current.href || (current.id
    ? `${galleryBasePath}/${current.id}`
    : galleryBasePath);

  return (
    <div
      className="hybrid-book-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="region"
      aria-label="Featured works carousel"
      aria-roledescription="carousel"
    >
      <div className="hybrid-book-spread">
        {/* ── Image Panel ── */}
        <div className={`hybrid-book-image${fading ? " is-fading" : ""}`}>
          <a href={chapterLink} aria-label={`View "${current.title}"`}>
            <img
              src={getProxySrc(current.id, "l")}
              alt={current.alt || current.title}
              width="960"
              height="640"
              loading={active === 0 ? "eager" : "lazy"}
              fetchpriority={active === 0 ? "high" : undefined}
              decoding="async"
            />
          </a>
        </div>

        {/* ── Text Panel ── */}
        <div className="hybrid-book-text">
          <div
            key={active}
            className={`hybrid-book-text-swipe${textPhase === "exiting" ? " is-exiting" : ""}${textPhase === "entering" ? " is-entering" : ""}`}
          >
            {kicker ? <p className="hybrid-book-kicker">{kicker}</p> : null}
            <p className="hybrid-book-title">{current.title}</p>
            <p className="hybrid-book-story">{current.story}</p>
            <a href={chapterLink} className="hybrid-book-cta">
              Continue the Story →
            </a>
          </div>
        </div>
      </div>

      {/* ── Navigation Arrows ── */}
      {total > 1 && (
        <>
          <button
            className="hybrid-book-arrow hybrid-book-arrow--prev"
            onClick={goPrev}
            aria-label="Previous work"
          >
            ‹
          </button>
          <button
            className="hybrid-book-arrow hybrid-book-arrow--next"
            onClick={goNext}
            aria-label="Next work"
          >
            ›
          </button>
        </>
      )}

      {/* ── Slide counter (subtle) ── */}
      {total > 1 && (
        <div className="hybrid-book-counter" aria-hidden="true">
          {counterLabel ? `${counterLabel} ${active + 1} of ${total}` : `${active + 1} / ${total}`}
        </div>
      )}

      <style>{`
        .hybrid-book-carousel {
          position: relative;
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 1rem;
        }

        .hybrid-book-spread {
          display: flex;
          align-items: stretch;
          gap: 0;
          height: 650px;
          border-radius: 12px;
          overflow: hidden;
          background: #f9f7f4;
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
        }

        /* ── Image (left 60%) ── */
        .hybrid-book-image {
          flex: 0 0 60%;
          max-width: 60%;
          height: 100%;
          overflow: hidden;
          opacity: 1;
          transition: opacity ${FADE_MS}ms ease-in-out;
        }
        .hybrid-book-image.is-fading {
          opacity: 0;
        }
        .hybrid-book-image a {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 1.25rem;
          background: #f9f7f4;
          box-sizing: border-box;
        }
        .hybrid-book-image img {
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: auto;
          object-fit: contain;
          border-radius: 10px;
          display: block;
          transition: transform 12s ease-out;
        }
        .hybrid-book-carousel:hover .hybrid-book-image img {
          transform: scale(1.04);
        }

        /* ── Text (right 40%) ── */
        .hybrid-book-text {
          flex: 0 0 40%;
          max-width: 40%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 2.5rem 2rem;
          font-family: 'Glegoo', serif;
          overflow: hidden;
        }

        .hybrid-book-text-swipe {
          opacity: 1;
          transform: translateX(0);
          will-change: transform, opacity;
        }

        .hybrid-book-text-swipe.is-entering {
          animation: hybridBookTextSwipeIn ${FADE_MS}ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .hybrid-book-text-swipe.is-exiting {
          animation: hybridBookTextSwipeOut ${FADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1) both;
        }

        @keyframes hybridBookTextSwipeIn {
          from {
            opacity: 0;
            transform: translateX(52px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes hybridBookTextSwipeOut {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(-52px);
          }
        }

        .hybrid-book-kicker {
          margin: 0 0 0.45rem;
          font-size: 0.7rem;
          line-height: 1.2;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #9b8772;
          font-weight: 600;
        }

        .hybrid-book-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0 0 1rem;
          line-height: 1.25;
        }

        .hybrid-book-story {
          font-size: 0.95rem;
          line-height: 1.65;
          color: #4a4038;
          margin: 0 0 1.5rem;
          max-height: 10.5em;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 6;
          -webkit-box-orient: vertical;
        }

        .hybrid-book-cta {
          display: inline-block;
          font-size: 0.9rem;
          font-weight: 600;
          color: #8b5a2b;
          text-decoration: none;
          border-bottom: 1px solid transparent;
          transition: border-color 0.2s ease, color 0.2s ease;
          font-family: 'Glegoo', serif;
        }
        .hybrid-book-cta:hover {
          border-color: #8b5a2b;
          color: #6d3f1a;
        }

        /* ── Arrows ── */
        .hybrid-book-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255,255,255,0.85);
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          font-size: 1.5rem;
          line-height: 1;
          cursor: pointer;
          color: #4a4038;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease, box-shadow 0.2s ease;
          z-index: 10;
          font-family: 'Glegoo', serif;
        }
        .hybrid-book-arrow:hover {
          background: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }
        .hybrid-book-arrow--prev { left: 0.25rem; }
        .hybrid-book-arrow--next { right: 0.25rem; }

        /* ── Counter ── */
        .hybrid-book-counter {
          text-align: center;
          font-size: 0.75rem;
          color: #a09080;
          margin-top: 0.75rem;
          font-family: 'Glegoo', serif;
          letter-spacing: 0.05em;
        }

        /* ── Mobile: stack vertically ── */
        @media (max-width: 768px) {
          .hybrid-book-spread {
            flex-direction: column;
            height: 620px;
          }
          .hybrid-book-image {
            flex: 0 0 320px;
            max-width: 100%;
            height: 320px;
          }
          .hybrid-book-text {
            flex: 1 1 0%;
            max-width: 100%;
            height: auto;
            padding: 1.5rem 1.25rem;
          }
          .hybrid-book-title {
            font-size: 1.25rem;
          }
          .hybrid-book-kicker {
            font-size: 0.66rem;
            margin-bottom: 0.35rem;
          }
          .hybrid-book-story {
            font-size: 0.9rem;
            -webkit-line-clamp: 4;
            max-height: 7em;
          }
          .hybrid-book-arrow {
            width: 34px;
            height: 34px;
            font-size: 1.3rem;
          }
          .hybrid-book-arrow--prev { left: 0.5rem; top: 160px; }
          .hybrid-book-arrow--next { right: 0.5rem; top: 160px; }
        }
      `}</style>
    </div>
  );
}
