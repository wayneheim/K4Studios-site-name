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
import { getSemanticImageUrl } from "../../utils/imageProxy.js";
import { trackEvent } from "../../utils/analytics.ts";

const INTERVAL_MS = 8500;
const FADE_MS = 1200;

// Proxy helper — never expose SmugMug URLs
const getGalleryPathFromImageHref = (href = "") => String(href || "").replace(/\/i-[a-zA-Z0-9-]+\/?$/, "");

export default function HybridBookCarousel({
  slides = [],
  galleryBasePath = "",
  kicker = "",
  counterLabel = "",
  ctaLabel = "Continue the Story →",
  readingMode = false,
  compact = false,
  showFullStory = false,
  showControls = true,
  showCounter = true,
  autoAdvanceMs = INTERVAL_MS,
}) {
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);
  const [textPhase, setTextPhase] = useState("idle");
  const [paused, setPaused] = useState(false);
  const [imageAspect, setImageAspect] = useState(1.5);
  const timerRef = useRef(null);
  const textTimerRef = useRef(null);
  const audioRef = useRef(null);
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
    if (paused || total < 2 || !autoAdvanceMs) return;
    timerRef.current = setInterval(goNext, autoAdvanceMs);
    return () => clearInterval(timerRef.current);
  }, [paused, goNext, total, autoAdvanceMs]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  }, [active]);

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
      className={`hybrid-book-carousel${readingMode ? " hybrid-book-carousel--reading" : ""}${compact ? " hybrid-book-carousel--compact" : ""}${showFullStory ? " hybrid-book-carousel--full-story" : ""}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="region"
      aria-label="Featured works carousel"
      aria-roledescription="carousel"
    >
      <div className="hybrid-book-spread">
        {/* ── Image Panel ── */}
        <div
          className={`hybrid-book-image${fading ? " is-fading" : ""}`}
          style={compact ? { "--hybrid-image-aspect": imageAspect } : undefined}
        >
          <a href={chapterLink} aria-label={`View "${current.title}"`}>
            <img
              src={current.src || getSemanticImageUrl(current, { galleryPath: getGalleryPathFromImageHref(current.href) || galleryBasePath })}
              alt={current.alt || current.title}
              width="960"
              height="640"
              loading={active === 0 ? "eager" : "lazy"}
              fetchpriority={active === 0 ? "high" : undefined}
              decoding="async"
              onLoad={(event) => {
                const image = event.currentTarget;
                if (image.naturalWidth && image.naturalHeight) {
                  setImageAspect(image.naturalWidth / image.naturalHeight);
                }
              }}
              style={current.imageScale ? { transform: `scale(${current.imageScale})` } : undefined}
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
            {current.audioSrc || current.audioPending ? (
              <div className="hybrid-book-audio">
                {current.audioSrc ? (
                  <audio
                    ref={audioRef}
                    controls
                    preload="none"
                    src={current.audioSrc}
                    aria-label={current.audioLabel || `Hear ${current.title} told`}
                    onPlay={() => trackEvent("one_image_movie_audio_play", {
                      imageId: current.id,
                      pageType: "other",
                      trigger: "featured_story_audio",
                    })}
                  />
                ) : (
                  <button type="button" disabled aria-disabled="true"><span aria-hidden="true">▶</span> {current.audioLabel || "Hear this one told"}</button>
                )}
                {current.audioNote ? <p>{current.audioNote}</p> : null}
              </div>
            ) : null}
            <a href={chapterLink} className="hybrid-book-cta">
              {ctaLabel}
            </a>
          </div>
        </div>
      </div>

      {/* ── Navigation Arrows ── */}
      {total > 1 && showControls && (
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
      {total > 1 && showCounter && (
        <div className="hybrid-book-counter" aria-hidden="true">
          {counterLabel ? `${counterLabel} ${active + 1} of ${total}` : `${active + 1} / ${total}`}
        </div>
      )}

      <style>{`
        .hybrid-book-carousel {
          position: relative;
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
          padding: 0;
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
          padding: 1rem 1rem 1rem 1.25rem;
          background: #f9f7f4;
          box-sizing: border-box;
        }
        .hybrid-book-image img {
          width: 100%;
          height: 100%;
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
          min-height: 650px;
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
          max-height: 3.3em;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .hybrid-book-carousel--reading .hybrid-book-spread {
          height: 720px;
        }
        .hybrid-book-carousel--compact {
          padding: .55rem;
          border: 1px solid #9d8774;
          border-radius: 18px;
          background: #2a211b;
          box-shadow: 0 12px 30px rgba(45,32,23,.15), inset 0 0 0 2px rgba(255,255,255,.06);
          overflow: hidden;
        }
        .hybrid-book-carousel--compact .hybrid-book-spread {
          height: 440px;
          gap: 0;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 12px;
          background: #211a16;
          box-shadow: none;
        }
        .hybrid-book-carousel--compact .hybrid-book-image {
          flex: 0 0 min(69%, calc(440px * var(--hybrid-image-aspect, 1.5)));
          max-width: 69%;
          background: #17120f;
        }
        .hybrid-book-carousel--compact .hybrid-book-image a {
          padding: .55rem;
          background: #17120f;
        }
        .hybrid-book-carousel--compact .hybrid-book-text {
          flex: 1 1 0;
          max-width: none;
          min-height: 440px;
          padding: 1.6rem 1.45rem 1.6rem 2.75rem;
          background: linear-gradient(145deg,#2a211b,#1d1713);
          overflow: hidden;
        }
        .hybrid-book-carousel--compact .hybrid-book-title { color: #f4ede4; }
        .hybrid-book-carousel--compact .hybrid-book-story { color: #cfc2b5; }
        .hybrid-book-carousel--compact.hybrid-book-carousel--full-story .hybrid-book-story {
          max-height: none;
          overflow: visible;
          display: block;
          white-space: pre-line;
          -webkit-line-clamp: unset;
          font-size: .86rem;
          line-height: 1.48;
          margin-bottom: 1.1rem;
        }
        .hybrid-book-carousel--compact .hybrid-book-cta { color: #d8a978; }
        .hybrid-book-carousel--compact .hybrid-book-cta:hover { color: #f0c89f; border-color: #d8a978; }
        .hybrid-book-carousel--compact .hybrid-book-image img {
          border-radius: 8px;
        }
        .hybrid-book-carousel--reading .hybrid-book-text {
          justify-content: flex-start;
          min-height: 720px;
          padding-top: 3rem;
          padding-bottom: 3rem;
          overflow-y: auto;
        }
        .hybrid-book-carousel--reading .hybrid-book-story {
          max-height: none;
          overflow: visible;
          display: block;
          white-space: pre-line;
          -webkit-line-clamp: unset;
        }
        .hybrid-book-carousel--reading .hybrid-book-image img,
        .hybrid-book-carousel--reading:hover .hybrid-book-image img {
          transform: none;
          transition: none;
        }
        .hybrid-book-audio {
          margin: 0 0 1.25rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(121,98,78,.18);
        }
        .hybrid-book-audio audio { width: 100%; }
        .hybrid-book-audio button {
          display: inline-flex;
          align-items: center;
          gap: .55rem;
          min-height: 2.5rem;
          padding: .6rem .9rem;
          border: 1px solid #8d735c;
          border-radius: 999px;
          background: #faf8f5;
          color: #6d4225;
          font: 600 .82rem/1.2 'Glegoo', serif;
          opacity: .62;
        }
        .hybrid-book-audio p {
          margin: .55rem 0 0;
          color: #7a6a5c;
          font-size: .75rem;
          font-style: italic;
          line-height: 1.45;
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
            min-height: 0;
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
            -webkit-line-clamp: 2;
            max-height: 3.2em;
          }
          .hybrid-book-carousel--reading .hybrid-book-spread {
            height: auto;
            min-height: 780px;
          }
          .hybrid-book-carousel--reading .hybrid-book-image {
            flex-basis: 300px;
            height: 300px;
          }
          .hybrid-book-carousel--reading .hybrid-book-text {
            min-height: 480px;
            overflow: visible;
          }
          .hybrid-book-carousel--reading .hybrid-book-story {
            max-height: none;
            display: block;
            -webkit-line-clamp: unset;
          }
          .hybrid-book-carousel--compact {
            padding: .4rem;
          }
          .hybrid-book-carousel--compact .hybrid-book-spread {
            height: 600px;
            gap: 0;
          }
          .hybrid-book-carousel--compact .hybrid-book-image {
            flex: 0 0 330px;
            max-width: 100%;
            height: 330px;
          }
          .hybrid-book-carousel--compact .hybrid-book-text {
            flex: 1 1 0%;
            max-width: 100%;
            min-height: 0;
            padding: 1.25rem 1.15rem;
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
