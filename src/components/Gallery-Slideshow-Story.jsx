import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { ShoppingCart, VolumeX, Volume2 } from "lucide-react";
import PunchInIntro from "./PunchInIntro.jsx";

// Helper function to select the best image source for slideshow display
const getBestImageSrc = (image) => {
  if (!image) return "";
  // For slideshow: prefer srcXL (extra large), then srcL (large), then srcM (medium), then src (original)
  return image.srcXL || image.srcL || image.srcM || image.src || "";
};

export default function StoryShow({ images, startImageId, onExit, isMuted = false, setIsMuted, volume = 0.7, setVolume, audioRef, ambientAudioRef, setIsSpeaking, isSpeaking, globalAudioSrc, globalAudioMode }) {
  const [index, setIndex] = useState(0);
  const [isIntro, setIsIntro] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);
  const [isMobileShort, setIsMobileShort] = useState(false); // NEW: phone/phablet (short side ≤ 900)
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  const fsRef = useRef(null);
  const hasUserUnlockedAudioRef = useRef(false);
  const hasAutoPlayedRef = useRef(false);

  // ➋ Orientation + pointer detection
  useEffect(() => {
    const updateFlags = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const landscape = w > h;

      // Use the short side so it works in both orientations
      const shortSide = Math.min(w, h);
      const isMobileish =
        shortSide <= 900 ||
        (window.matchMedia && window.matchMedia("(max-device-width: 900px)").matches);

      setIsLandscape(landscape);
      setVp({ w, h });

      // Keep if referenced elsewhere
      setIsLandscapeMobile(landscape && isMobileish);

      // NEW: phone/phablet in any orientation
      setIsMobileShort(isMobileish);

      if (window.matchMedia) {
        setIsCoarsePointer(window.matchMedia("(pointer: coarse)").matches);
      }
    };

    updateFlags();
    window.addEventListener("resize", updateFlags);
    window.addEventListener("orientationchange", updateFlags);
    return () => {
      window.removeEventListener("resize", updateFlags);
      window.removeEventListener("orientationchange", updateFlags);
    };
  }, []);

  // ➌ Fullscreen helper
  const enterFullScreen = () => {
    const el = fsRef.current;
    if (!el) return;
    const request =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.msRequestFullscreen;
    request && request.call(el);
  };

  const orderedImages = useMemo(
    () => reorderImages(images, startImageId),
    [images, startImageId]
  );
  const current = orderedImages[index];
  const isVertical = current?.aspectRatio && current.aspectRatio < 1;

  // Compute image max sizes to avoid cropping and use more space for portrait
  const imgStyle = useMemo(() => {
    const style = {};
    const hasText = Boolean(current?.story) && !isMobileShort; // hide story on all phones/phablets

    if (isLandscape) {
      if (isVertical) {
        const maxH = Math.round(vp.h * 0.92);
        style.height = `${maxH}px`;
        style.maxHeight = `${maxH}px`;
        style.width = "auto";
        style.maxWidth = hasText ? `${Math.round(vp.w * 0.7)}px` : "none";
      } else {
        style.maxHeight = `${Math.round(vp.h * 0.92)}px`;
        style.maxWidth = `${Math.round(vp.w * 0.96)}px`;
      }
    } else {
      style.maxHeight = "100vh";
      // Account for mobile margins - use 92% of viewport width instead of 100% (accounting for container padding)
      style.maxWidth = "92vw";
    }
    
    // Apply sharpening filter like in zoom overlay
    style.filter = "contrast(1.14) brightness(1.04) url(#sharpen)";
    
    return style;
  }, [isLandscape, isVertical, vp.h, vp.w, current?.story, isMobileShort]);

  const [kenAngles] = useState(() =>
    images.map((_, idx) => {
      const amount = 0.5 + Math.random() * 2.5; // Base rotation capped at 3° max (0.5-3.0°)
      const direction = idx % 2 === 0 ? -1 : 1;
      return direction * amount;
    })
  );
  const [kenPans] = useState(() =>
    images.map((img) => {
      const isVertical = img?.aspectRatio && img.aspectRatio < 1;
      // Add downward bias since important elements are usually at the top
      // More bias for vertical images (portrait), less for horizontal (landscape)
      const downBias = isVertical ? 15 : 8; // 15px down for vertical, 8px for horizontal
      return {
        x: (Math.random() - 0.5) * 40, // Random pan up to ±20px
        y: (Math.random() - 0.5) * 40 + downBias, // Random pan with downward bias
      };
    })
  );
  const kenAngle = kenAngles[index];
  const kenPan = kenPans[index];

  const kenBurns = useMemo(() => {
    // We zoom in, then gently reverse back out on a loop while the slide is visible.
    // repeatType: 'reverse' returns to the "initial" scale after each zoom-in.
    if (isLandscape && isVertical) {
      // Subtle zoom for portrait-in-landscape
      return {
        initial: { scale: 1, opacity: 0.95, rotate: 0, x: 0, y: 0 },
        animate: { scale: 1.06, opacity: 1, rotate: kenAngle * 0.3, x: kenPan.x * 0.3, y: kenPan.y * 0.3 },
        exit: { opacity: 0 },
        transition: { duration: 22, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" },
      };
    }
    return {
      initial: { scale: 1.14, opacity: 0.92, rotate: 0, x: 0, y: 0 },
      animate: { scale: 1.5, opacity: 1, rotate: kenAngle, x: kenPan.x, y: kenPan.y },
      exit: { opacity: 0 },
      transition: { duration: 22, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" },
    };
  }, [isLandscape, isVertical, kenAngle, kenPan]);

  // Manual navigation, skipping ghost image
  const goNext = () => {
    setIndex((i) => {
      let next = (i + 1) % orderedImages.length;
      while (orderedImages[next]?.id === "i-k4studios" && next !== i) {
        next = (next + 1) % orderedImages.length;
      }
      return next;
    });
  };

  const goPrev = () => {
    setIndex((i) => {
      let prev = (i - 1 + orderedImages.length) % orderedImages.length;
      while (orderedImages[prev]?.id === "i-k4studios" && prev !== i) {
        prev = (prev - 1 + orderedImages.length) % orderedImages.length;
      }
      return prev;
    });
  };

  useEffect(() => {
    if (isIntro) {
      const introTimer = setTimeout(() => setIsIntro(false), 3000);
      return () => clearTimeout(introTimer);
    }
  }, [isIntro]);

  const isMessengerWebView = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /FBAN|FBAV|Messenger|Instagram/i.test(navigator.userAgent);
  }, []);

  // Handle audio playback when slideshow starts (global overrides individual, ambient behind individual)
  useEffect(() => {
    if (isMessengerWebView && !hasUserUnlockedAudioRef.current) {
      return;
    }

    // Only auto-play once per slideshow session
    if (hasAutoPlayedRef.current) {
      return;
    }

    // Determine which audio to play: global audio overrides individual
    let primaryAudioSrc = null;
    let ambientAudioSrc = null;
    let primaryVolume = volume;
    let ambientVolume = volume * 0.3; // Ambient always at 30%
    let shouldLoop = false;

    if (globalAudioSrc && !isMuted) {
      // Global audio takes priority and overrides individual
      primaryAudioSrc = globalAudioSrc;
      primaryVolume = globalAudioMode === "ambient" ? volume * 0.3 : volume;
      shouldLoop = true; // Global audio should loop
      
      // If there's individual audio and global is ambient, play both
      if (current?.audioSrc && globalAudioMode === "ambient") {
        ambientAudioSrc = current.audioSrc;
      }
    } else if (current?.audioSrc && !isMuted) {
      // Individual audio only (no global)
      primaryAudioSrc = current.audioSrc;
      primaryVolume = volume * 0.35; // Individual audio at 35% volume
      shouldLoop = false; // Individual audio doesn't loop
    }

    if (primaryAudioSrc) {
      hasAutoPlayedRef.current = true; // Mark as auto-played
      
      // Small delay to ensure slideshow is fully rendered
      const timer = setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = primaryAudioSrc;
          audioRef.current.volume = primaryVolume;
          audioRef.current.loop = shouldLoop;
          audioRef.current.play().then(() => {
            hasUserUnlockedAudioRef.current = true;
            setIsSpeaking(true); // Indicate audio is playing
          }).catch((error) => {
            console.error('Error playing primary audio in slideshow:', error);
            hasUserUnlockedAudioRef.current = false;
            setIsSpeaking(false);
          });
        }
        
        // Handle ambient audio if needed
        if (ambientAudioSrc && ambientAudioRef.current) {
          ambientAudioRef.current.src = ambientAudioSrc;
          ambientAudioRef.current.volume = ambientVolume;
          ambientAudioRef.current.loop = false; // Individual audio doesn't loop
          ambientAudioRef.current.play().catch((error) => {
            console.error('Error playing ambient audio in slideshow:', error);
          });
        }
      }, 300); // Delay to ensure component is fully mounted
      return () => clearTimeout(timer);
    }
  }, [current?.audioSrc, globalAudioSrc, globalAudioMode, isMuted, volume, isMessengerWebView]);

  // Auto-play audio when slideshow index changes, but skip inside Messenger/Instagram webviews
  useEffect(() => {
    if (isMessengerWebView && !hasUserUnlockedAudioRef.current) {
      setIsSpeaking(false);
      return;
    }

    // Determine which audio to play: global audio overrides individual
    let primaryAudioSrc = null;
    let ambientAudioSrc = null;
    let primaryVolume = volume;
    let ambientVolume = volume * 0.3; // Ambient always at 30%
    let shouldLoop = false;

    if (globalAudioSrc && !isMuted) {
      // Global audio takes priority and overrides individual
      primaryAudioSrc = globalAudioSrc;
      primaryVolume = globalAudioMode === "ambient" ? volume * 0.3 : volume;
      shouldLoop = true; // Global audio should loop
      
      // If there's individual audio and global is ambient, play both
      if (current?.audioSrc && globalAudioMode === "ambient") {
        ambientAudioSrc = current.audioSrc;
      }
    } else if (current?.audioSrc && !isMuted) {
      // Individual audio only (no global)
      primaryAudioSrc = current.audioSrc;
      primaryVolume = volume * 0.35; // Individual audio at 35% volume
      shouldLoop = false; // Individual audio doesn't loop
    }

    if (primaryAudioSrc) {
      // Small delay to ensure slideshow is fully rendered
      const timer = setTimeout(() => {
        setIsSpeaking(true);
        if (audioRef.current) {
          audioRef.current.src = primaryAudioSrc;
          audioRef.current.volume = primaryVolume;
          audioRef.current.loop = shouldLoop;
          audioRef.current.play().then(() => {
            hasUserUnlockedAudioRef.current = true;
          }).catch((error) => {
            console.error('Error auto-playing audio in slideshow:', error);
            hasUserUnlockedAudioRef.current = false;
            setIsSpeaking(false);
          });
        }
        
        // Handle ambient audio if needed
        if (ambientAudioSrc && ambientAudioRef.current) {
          ambientAudioRef.current.src = ambientAudioSrc;
          ambientAudioRef.current.volume = ambientVolume;
          ambientAudioRef.current.loop = false; // Individual audio doesn't loop
          ambientAudioRef.current.play().catch((error) => {
            console.error('Error playing ambient audio in slideshow:', error);
          });
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [index, current?.audioSrc, globalAudioSrc, globalAudioMode, isMuted, volume, isMessengerWebView]);

  // Update audio volume when volume setting or audio type changes
  useEffect(() => {
    // Handle primary audio volume
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = 0;
      } else if (globalAudioSrc) {
        // Global audio is playing (overrides individual)
        audioRef.current.volume = globalAudioMode === "ambient" ? volume * 0.3 : volume;
      } else if (current?.audioSrc) {
        // Individual audio only (no global)
        audioRef.current.volume = volume * 0.35; // Individual at 35%
      }
    }
    
    // Handle ambient audio volume (when playing dual audio)
    if (ambientAudioRef.current) {
      if (isMuted) {
        ambientAudioRef.current.volume = 0;
      } else {
        ambientAudioRef.current.volume = volume * 0.3; // Ambient always at 30%
      }
    }
  }, [volume, isMuted, globalAudioMode, current?.audioSrc, globalAudioSrc]);

  // Stop ambient audio when no longer needed
  useEffect(() => {
    const shouldPlayAmbient = globalAudioSrc && globalAudioMode === "ambient" && current?.audioSrc && !isMuted;
    
    if (!shouldPlayAmbient && ambientAudioRef.current) {
      ambientAudioRef.current.pause();
      ambientAudioRef.current.src = "";
    }
  }, [globalAudioSrc, globalAudioMode, current?.audioSrc, isMuted]);

  // Reset autoplay flag when component unmounts
  useEffect(() => {
    return () => {
      hasAutoPlayedRef.current = false;
    };
  }, []);

  function reorderImages(list, startId) {
    const startIndex = list.findIndex((img) => img.id === startId);
    if (startIndex === -1) return list;
    return [...list.slice(startIndex), ...list.slice(0, startIndex)];
  }

  function handleExit() {
    if (onExit) onExit(current);
  }

  const fade = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.45, ease: "easeOut" } },
    exit: { opacity: 0, transition: { duration: 1.0, ease: "easeInOut" } },
  };

  return createPortal(
    <>
      <style jsx>{`
        /* Hide narrative on small landscape viewports (visual nicety only);
           logic-side already hides it for all phones via isMobileShort. */
        @media (orientation: landscape) and (max-width: 900px) {
          .gallery-slideshow img { object-fit: contain; transition: transform 0.3s ease-in-out; }
          .slideshow-controls {
            background: #000;
            transform: translateX(-50%) scale(0.9);
            transform-origin: bottom center;
            left: 50% !important;
          }
          .slideshow-controls .btn { padding: 0.25rem 0.5rem; font-size: 0.75rem; white-space: nowrap; }
        }

        .gallery-slideshow img { width: 100%; height: auto; }
        .story-title { font-size: 1.125rem; }
        .story-body { font-size: 1rem; line-height: 1.5; }
      `}</style>

      <link
        href="https://fonts.googleapis.com/css2?family=Glegoo:ital,wght@0,400;0,700;1,400&display=swap"
        rel="stylesheet"
      />
      <div
        ref={fsRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100dvh", // use dynamic viewport to avoid offscreen controls in portrait
          backgroundColor: "black",
          color: "white",
          zIndex: 9999,
          overflow: "hidden",
          fontFamily: "'Glegoo', serif",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Landscape prompt */}
        {isLandscape &&
          !(document.fullscreenElement || document.webkitFullscreenElement) && (
            <AnimatePresence>
              {showControls && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute bg-black text-white border border-white rounded px-4 py-2 text-xs pointer-events-auto"
                  style={{
                    cursor: "pointer",
                    zIndex: 10001,
                    top: "0.5rem",
                    left: "50%",
                    transform: "translateX(-50%)",
                  }}
                  onClick={enterFullScreen}
                  onTouchEnd={enterFullScreen}
                >
                  Use full-screen for best experience.
                </motion.div>
              )}
            </AnimatePresence>
          )}

        {/* Mobile-only paused chip (desktop uses the one in the story panel) */}
        <AnimatePresence>
          {false && showControls && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.95, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="absolute text-white text-[0.65rem] tracking-wide font-semibold px-2 py-0.5 border border-white/70 rounded"
              style={{
                zIndex: 10002,
                // Raised 35px total and shifted 65px left via calc on left
                bottom: "calc(max(0.75rem, env(safe-area-inset-bottom)) + 7rem + 35px)",
                left: "calc(50% - 50px)",
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(2px)",
              }}
            >
              PAUSED
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isIntro ? (
            <PunchInIntro onDone={() => setIsIntro(false)} />
          ) : (
            <motion.div
              key={current.id}
              className="absolute inset-0 w-full h-full flex items-center justify-center"
              {...fade}
            >
              <div className="w-screen h-screen flex items-center justify-center relative gallery-slideshow px-4 md:px-0">
                <motion.img
                  src={getBestImageSrc(current)}
                  alt={current.title || ""}
                  className={`object-contain ${isVertical ? "vertical" : ""}`}
                  style={imgStyle}
                  {...kenBurns}
                />

                {/* Title + Story: hidden for all phones/phablets via isMobileShort, and hidden when audio is playing unless muted */}
                <AnimatePresence>
                  {current.story && !isMobileShort && (!isSpeaking || isMuted) && (
                    <motion.div
                      key="story-text"
                      className={`absolute p-4 md:p-6 text-sm md:text-base text-content ${
                        isVertical
                          ? "right-6 top-1/2 -translate-y-1/2"
                          : "bottom-8 right-8"
                      }`}
                      {...fade}
                      style={{
                        // ✅ Cap width to 520px or 92vw (whichever is smaller)
                        maxWidth: "min(92vw, 520px)",
                        // ✅ Prevent the box from stretching wider than the cap
                        width: "auto",
                        backgroundColor: "rgba(0, 0, 0, 0.2)",
                        boxShadow: "0 0 2px 2px rgba(0, 0, 0, 0.2)",
                        borderRadius: "1rem",
                      }}
                    >
                      <div className="font-semibold text-lg mb-2 story-title">
                        {current.title}
                      </div>

                      {/* ✅ Force line wrapping */}
                      <div
                        className="opacity-80 story-body"
                        style={{
                          whiteSpace: "pre-wrap",        // preserve newlines, wrap lines
                          overflowWrap: "anywhere",       // break long words if needed
                          wordBreak: "break-word"         // extra safety for older browsers
                        }}
                      >
                        {current.story}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showControls && !isIntro && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute border rounded-lg p-2 flex gap-3 items-center slideshow-controls"
              style={{
                borderColor: "rgba(255,255,255,0.25)",
                backgroundColor: "rgba(0, 0, 0, 0.8)", // 80% opaque black
                left: "50%",
                transform: "translateX(-50%)",
                bottom: "calc(max(0.75rem, env(safe-area-inset-bottom)) + 4rem)",
              }}
            >
              {/* Prev */}
              <button
                onClick={goPrev}
                className="bg-white/10 text-white rounded px-2 sm:px-3 py-1 hover:bg-white/20 transition btn whitespace-nowrap text-xs sm:text-sm leading-none flex items-center gap-1"
                aria-label="Previous image"
                title="Previous image"
              >
                <span aria-hidden>◀</span>
                <span>Prev</span>
              </button>

              {/* Next */}
              <button
                onClick={goNext}
                className="bg-white/10 text-white rounded px-2 sm:px-3 py-1 hover:bg-white/20 transition btn whitespace-nowrap text-xs sm:text-sm leading-none flex items-center gap-1"
                aria-label="Next image"
                title="Next image"
              >
                <span>Next</span>
                <span aria-hidden>▶</span>
              </button>

              {/* Audio Control - show if current image has audioSrc OR if there's global audio */}
              {(current?.audioSrc || globalAudioSrc || (images.some(img => img.globalAudioMode) && images.some(img => img.globalAudioSrc))) && (
                <div className="relative flex items-center gap-1">
                <div className="relative group">
                  <button
                    onClick={() => {
                      if (isMuted) {
                        // Unmuting - try to start audio playback
                        setIsMuted(false);

                        // Determine which audio to play: individual image audio takes priority, then global audio
                        let audioToPlay = null;
                        let audioVolume = volume;

                        if (current?.audioSrc) {
                          // Individual image audio
                          audioToPlay = current.audioSrc;
                          audioVolume = volume;
                        } else if (globalAudioSrc) {
                          // Global audio (score or ambient)
                          audioToPlay = globalAudioSrc;
                          if (globalAudioMode === "ambient") {
                            audioVolume = volume * 0.3;
                          }
                        }

                        if (audioToPlay && audioRef.current) {
                          audioRef.current.src = audioToPlay;
                          audioRef.current.volume = audioVolume;
                          if (!current?.audioSrc) {
                            audioRef.current.loop = true; // Global audio should loop
                          }
                          hasUserUnlockedAudioRef.current = true;
                          audioRef.current.play().catch((error) => {
                            console.error('Error playing audio on unmute:', error);
                            hasUserUnlockedAudioRef.current = false;
                          });
                          setIsSpeaking(true);
                        }
                      } else {
                        // Muting - stop current playback
                        setIsMuted(true);
                        hasUserUnlockedAudioRef.current = false;
                        if (audioRef.current) {
                          audioRef.current.pause();
                          audioRef.current.currentTime = 0;
                        }
                        setIsSpeaking(false);
                      }
                    }}
                    className={`bg-white/10 text-white rounded px-2 py-1 hover:bg-white/20 transition btn ${
                      isMuted ? 'text-red-400' : ''
                    }`}
                    aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                    title={isMuted ? "Unmute audio" : "Mute audio"}
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>

                  {/* Volume Slider */}
                  <div className="absolute bottom-full mb-2 left-0 bg-black/80 rounded-lg p-3 min-w-32 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-white" />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-white text-xs min-w-8">{Math.round(volume * 100)}%</span>
                    </div>
                  </div>
                </div>
                </div>
              )}

              {/* Exit */}
              <button
                onClick={handleExit}
                className="bg-white/10 text-white rounded px-2 py-1 hover:bg-white/20 transition btn"
                aria-label="Exit slideshow"
                title="Exit slideshow"
              >
                Exit
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>,
    document.body
  );
}
