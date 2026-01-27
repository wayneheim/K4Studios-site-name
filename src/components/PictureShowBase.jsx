import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SquareChevronLeft, SquareChevronRight, ShoppingCart, Notebook, MonitorPlay, Volume2, VolumeX, Copyright, Mail } from "lucide-react";
import "./ScrollFlipZoomStyles.css";
import "../styles/global.css";
import ShareDrawer from "./ShareDrawer.jsx";
import SimpleStoryShow from "./Gallery-Slideshow.jsx";
import StoryShowWithAudio from "./Gallery-Slideshow-Story.jsx";
import { getProxySrc, normalizeImageSrc } from "../utils/imageProxy.js";
import { warmImage } from "../utils/warmImage";

// Helper function to select the best image source for slideshow display
const getBestImageSrc = (image) => {
  if (!image) return "";
  // Use proxy if we have an ID
  if (image.id) return getProxySrc(image.id, 'xl');
  // Normalize any URL to proxy format
  return normalizeImageSrc(image.srcXL || image.srcL || image.srcM || image.src || "", 'xl');
};

export default function PictureShowBase({ rawData = [], basePath = "", titleBase = "", globalAudioSrc = "", globalAudioMode = "score", introMeta = {}, outroMeta = {} }) {
  // Detect if this is a story (has audio or intro metadata) vs gallery (neither)
  const isStory = useMemo(() => {
    return Boolean(globalAudioSrc) || Object.keys(introMeta).length > 0 || Object.keys(outroMeta).length > 0;
  }, [globalAudioSrc, introMeta, outroMeta]);

  // Choose the appropriate slideshow component
  const StoryShow = isStory ? StoryShowWithAudio : SimpleStoryShow;
  
  // Detect actual global audio mode from data if not explicitly set
  const detectedGlobalAudioMode = useMemo(() => {
    if (globalAudioMode !== "score") return globalAudioMode;
    // Check if any item has globalAudioMode set
    const itemWithGlobalMode = rawData.find(item => item?.globalAudioMode);
    return itemWithGlobalMode?.globalAudioMode || "score";
  }, [rawData, globalAudioMode]);

  // Use detected mode for audio logic
  const effectiveGlobalAudioMode = detectedGlobalAudioMode;
  // 🖼️ Existing slideshow logic follows here...
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [matColor, setMatColor] = useState("white");
  const [showNotes, setShowNotes] = useState(false);
  const [direction, setDirection] = useState(1);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [isCardHovered, setIsCardHovered] = useState(false);
  const isMessengerWebView = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /FBAN|FBAV|Messenger|Instagram/i.test(navigator.userAgent);
  }, []);
  const [isMuted, setIsMuted] = useState(false);
  // Control when the intro stack should fan out (start stacked, then fan after ~75% of main card entrance)
  const [fanOut, setFanOut] = useState(false);
  // Start-page hover image sequencing (base -> src2 -> src3)
  const [hoverPhase, setHoverPhase] = useState(0); // 0=base, 1=src2, 2=src3
  const hoverTimerRef = useRef(null);


  const audioRef = useRef(null);
  const ambientAudioRef = useRef(null);
  const currentIndexRef = useRef(0);
  // swipe tracking
  const touchStart = useRef({ x: 0, y: 0, t: 0 });


  // Normalize incoming data: strip any explicit closing slide since the viewer renders its own end page
  const filteredData = useMemo(() => {
    try {
      return Array.isArray(rawData)
        ? rawData.filter(img => img?.visibility !== 'closing' && img?.id !== 'i-k4studios-closing')
        : [];
    } catch {
      return rawData || [];
    }
  }, [rawData]);

  // Determine default volume: 30% for ambient, 50% for score, 70% for mixed/individual audio
  const defaultVolume = useMemo(() => {
    if (globalAudioSrc && filteredData.length > 0) {
      // Check if any non-ghost images have individual audio (exclude system intro slides)
      const hasIndividualAudio = filteredData.some(img => img?.audioSrc && img?.visibility !== 'ghost');

      if (hasIndividualAudio) {
        // Stories with individual content audio default to 70%
        return 0.7;
      } else {
        // Global-only audio: ambient = 30%, score = 50%
        return effectiveGlobalAudioMode === "ambient" ? 0.3 : 0.5;
      }
    }
    return 0.7; // Default fallback
  }, [globalAudioSrc, effectiveGlobalAudioMode, filteredData]);

  const [volume, setVolume] = useState(defaultVolume);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Find score audio source from data (full volume background music)
  const scoreAudioSrc = useMemo(() => {
    if (effectiveGlobalAudioMode === "score") {
      // First try the globalAudioSrc prop
      if (globalAudioSrc && globalAudioSrc.trim()) {
        return globalAudioSrc;
      }
      // Then try to find it from the data items
      const scoreItem = filteredData.find(item => item.globalAudioMode === "score" && item.audioSrc);
      return scoreItem?.audioSrc || null;
    }
    return null;
  }, [filteredData, globalAudioSrc, effectiveGlobalAudioMode]);

  // Find ambient audio source from data (continuous background music)
  const ambientAudioSrc = useMemo(() => {
    if (effectiveGlobalAudioMode === "ambient") {
      // First try the globalAudioSrc prop
      if (globalAudioSrc && globalAudioSrc.trim()) {
        return globalAudioSrc;
      }
      // Then try to find it from the data items
      const ambientItem = filteredData.find(item => item.globalAudioMode === "ambient" && item.audioSrc);
      return ambientItem?.audioSrc || null;
    }
    return null;
  }, [filteredData, globalAudioSrc, effectiveGlobalAudioMode]);

  // ✅ Unified global audio controller (score + ambient)
  useEffect(() => {
    if (!ambientAudioRef.current) return;
    const player = ambientAudioRef.current;

    // Stop any existing playback before changing mode or src
    player.pause();
    player.currentTime = 0;

    // Determine which global audio to use
    let nextSrc = null;
    let nextVol = 0;
    let shouldPlay = false;

    if (showSlideshow && !isMuted) {
      if (effectiveGlobalAudioMode === "score" && scoreAudioSrc) {
        nextSrc = scoreAudioSrc;
        nextVol = volume; // full volume for score
        shouldPlay = true;
      } else if (effectiveGlobalAudioMode === "ambient" && ambientAudioSrc) {
        nextSrc = ambientAudioSrc;
        nextVol = volume * 0.3; // lower volume for ambient
        shouldPlay = true;
      }
    }

    if (shouldPlay && nextSrc) {
      player.src = nextSrc;
      player.volume = nextVol;
      player.loop = true;
      const playPromise = player.play();
      if (playPromise) playPromise.catch((err) => {
        console.warn("Global audio playback blocked:", err);
      });
    }

    return () => {
      // 🚫 Stop audio cleanly when leaving slideshow or unmounting
      player.pause();
      player.currentTime = 0;
    };
  }, [
    showSlideshow,
    isMuted,
    effectiveGlobalAudioMode,
    scoreAudioSrc,
    ambientAudioSrc,
    volume,
  ]);

  // Hide site header/intro and ensure chapter section is visible while Picture Show is active
  useEffect(() => {
    // Hide header and intro when the Picture Show is active
    const header = document.getElementById("header-section");
    const intro = document.getElementById("intro-section");
    const chapter = document.getElementById("chapter-section");

    if (header) header.classList.add("section-hidden");
    if (header) header.style.display = "none";
    if (intro) intro.classList.add("section-hidden");
    if (chapter) {
      chapter.style.display = "block";
      chapter.classList.remove("section-hidden");
      chapter.classList.add("section-visible");
    }

    // Restore on exit
    return () => {
      if (header) header.classList.remove("section-hidden");
      if (header) header.style.display = "";
      if (intro) intro.classList.remove("section-hidden");
      if (chapter) {
        chapter.classList.remove("section-visible");
        chapter.classList.add("section-hidden");
        chapter.style.display = "none";
      }
    };
  }, []);

  // Force viewport reset AFTER layout paint to remove top gap
  useEffect(() => {
    const raf1 = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    });
    const raf2 = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  // ✅ Hydration guard with fallback for Messenger WebView
const [isReady, setIsReady] = useState(false);

useEffect(() => {
  if (typeof window === "undefined") return;

  const ua = navigator.userAgent || "";
  const isMessenger = /FBAN|FBAV|Messenger|Instagram/i.test(ua);

  const handleReady = () => setIsReady(true);

  // 🔹 In Messenger, skip waiting for "load" – fire immediately
  if (isMessenger) {
    console.warn("⚠️ Messenger WebView detected — forcing early hydration");
    setIsReady(true);
    return;
  }

  // Normal browsers: wait for full load or readyState
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setIsReady(true);
  } else {
    window.addEventListener("load", handleReady, { once: true });
  }

  // Always add a failsafe timeout just in case "load" never fires
  const fallback = setTimeout(() => {
    if (!isReady) {
      console.warn("⏳ Hydration fallback triggered");
      setIsReady(true);
    }
  }, 2500);

  return () => {
    window.removeEventListener("load", handleReady);
    clearTimeout(fallback);
  };
}, []);

// 🧩 Messenger WebView silent prime for playback permission
useEffect(() => {
  const ua = navigator.userAgent || "";
  if (!/FBAN|FBAV|Messenger|Instagram/i.test(ua)) return;

  // 1 second after hydration, quietly prime audio
  const timer = setTimeout(() => {
    try {
      const a = document.createElement("audio");
      a.src = "";
      a.muted = true;
      const playPromise = a.play();
      if (playPromise) playPromise.catch(()=>{});
      setTimeout(() => a.pause(), 200);
    } catch {}
  }, 1000);

  return () => clearTimeout(timer);
}, []);

// 🧩 Messenger / iOS WebView gesture unlock
useEffect(() => {
  const unlockAudio = () => {
    try {
      // Use separate audio elements for unlocking to avoid interfering with main audio
      const unlockAudio = document.createElement("audio");
      unlockAudio.muted = true;
      unlockAudio.src = ""; // Empty src for silent unlock
      unlockAudio.play().then(() => {
        unlockAudio.pause();
      }).catch(()=>{});

      const unlockAmbient = document.createElement("audio");
      unlockAmbient.muted = true;
      unlockAmbient.src = "";
      unlockAmbient.play().then(() => {
        unlockAmbient.pause();
      }).catch(()=>{});

      window.removeEventListener("touchend", unlockAudio);
      window.removeEventListener("click", unlockAudio);
    } catch (e) {
      console.warn("Audio unlock failed:", e);
    }
  };

  window.addEventListener("touchend", unlockAudio, { once: true });
  window.addEventListener("click", unlockAudio, { once: true });

  return () => {
    window.removeEventListener("touchend", unlockAudio);
    window.removeEventListener("click", unlockAudio);
  };
}, []);

  // Optional: debug messenger behavior
  useEffect(() => {
    if (typeof navigator !== "undefined" && /FBAN|FBAV|Instagram|Messenger/i.test(navigator.userAgent)) {
      console.warn("⚠️ Running inside Facebook/Messenger WebView — using delayed hydration");
    }
  }, []);



  const goPrev = () => {
    stopSpeech();
    setDirection(-1);
    setCurrentIndex((i) => {
      const newIndex = Math.max(i - 1, 0);
      // Trigger audio for new image after a short delay
      setTimeout(() => {
        if (showSlideshow && filteredData[newIndex]?.audioSrc && !isMuted) {
          setIsSpeaking(true);
          if (audioRef.current) {
            audioRef.current.src = filteredData[newIndex].audioSrc;
            audioRef.current.play().catch((error) => {
              console.error('Error playing audio on navigation:', error);
              setIsSpeaking(false);
            });
          }
        }
      }, 100);
      return newIndex;
    });
  };

  const goNext = () => {
    stopSpeech();
    setDirection(1);
    if (currentIndex === 0) {
      // Find first non-ghost image
  const firstRealIdx = filteredData.findIndex(img => img.id !== 'i-k4studios');
      const newIndex = firstRealIdx > -1 ? firstRealIdx : 1;
      setCurrentIndex(newIndex);
      // Trigger audio for new image after a short delay
      setTimeout(() => {
        if (showSlideshow && filteredData[newIndex]?.audioSrc && !isMuted) {
          setIsSpeaking(true);
          if (audioRef.current) {
            audioRef.current.src = filteredData[newIndex].audioSrc;
            audioRef.current.play().catch((error) => {
              console.error('Error playing audio on navigation:', error);
              setIsSpeaking(false);
            });
          }
        }
      }, 100);
    } else {
      setCurrentIndex(i => {
  const newIndex = Math.min(i + 1, filteredData.length);
        // Trigger audio for new image after a short delay
        setTimeout(() => {
          if (showSlideshow && filteredData[newIndex]?.audioSrc && !isMuted) {
            setIsSpeaking(true);
            if (audioRef.current) {
              audioRef.current.src = filteredData[newIndex].audioSrc;
              audioRef.current.play().catch((error) => {
                console.error('Error playing audio on navigation:', error);
                setIsSpeaking(false);
              });
            }
          }
        }, 100);
        return newIndex;
      });
    }
  };

  const startSlideshow = ({ advanceFromIntro = true, immediate = false } = {}) => {
    const launchSlideshow = () => {
      setShowSlideshow(true);

      // Global audio is handled by the unified controller above

      if (advanceFromIntro && currentIndexRef.current === 0 && filteredData.length > 0) {
        goNext();
      }
    };

    if (immediate) {
      launchSlideshow();
      return;
    }

    const delay = 150;
    setTimeout(launchSlideshow, delay);
  };

  // --- touch swipe handlers (mobile) ---
  const SWIPE_MIN_X = 60; // px
  const SWIPE_MAX_Y = 50; // px vertical tolerance
  const SWIPE_MAX_MS = 700; // ms

  const handleTouchStart = (e) => {
    if (isZoomed) return; // don't hijack when zoom overlay open
    const t = e.changedTouches?.[0] || e.touches?.[0];
    if (!t) return;
    touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };

  const handleTouchEnd = (e) => {
    if (isZoomed) return;
    const t = e.changedTouches?.[0] || e.touches?.[0];
    if (!t) return;
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    const dt = Date.now() - touchStart.current.t;
    // only horizontal, quick-ish swipes
    if (Math.abs(dx) >= SWIPE_MIN_X && Math.abs(dy) <= SWIPE_MAX_Y && dt <= SWIPE_MAX_MS) {
      if (dx < 0) {
        // swipe left → next
        goNext();
      } else if (dx > 0) {
        // swipe right → prev
        goPrev();
      }
    }
  };

  const currentImage = filteredData[currentIndex];
  const isEndOfStory = currentIndex >= filteredData.length;

  // Orchestrate the 3-stage hover for the opening card only
  useEffect(() => {
    // Only apply on first slide (intro/ghost)
    if (currentIndex !== 0) {
      setHoverPhase(0);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      return;
    }

    if (isCardHovered) {
      // immediate fade to src2
      setHoverPhase(1);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      // after src2 finishes + slight pause (~0.2s), fade to src3 if available
      hoverTimerRef.current = setTimeout(() => {
        if (isCardHovered && currentImage?.src3) setHoverPhase(2);
      }, 400);
    } else {
      // mouse out → return to base
      setHoverPhase(0);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    }

    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, [isCardHovered, currentIndex, currentImage?.src3]);

  // Trigger fan-out after the main card is ~75% into its entrance
  useEffect(() => {
    if (currentIndex !== 0) {
      setFanOut(false);
      return;
    }
    setFanOut(false);
    const t = setTimeout(() => setFanOut(true), 450); // main card entrance ~0.6s → fan at ~0.45s
    return () => clearTimeout(t);
  }, [currentIndex]);

  // Preload Chapter Index thumbnails when user reaches second-to-last slide
  useEffect(() => {
    const isSecondToLast = currentIndex === filteredData.length - 1;
    if (!isSecondToLast) return;
    
    // Get the list of images for the Chapter Index (exclude system images)
    const chapterImages = filteredData.filter(img => 
      img.id !== "i-k4studios" &&
      img.id !== "i-k4video-intro" &&
      img.id !== "i-k4video-outro" &&
      !img._isIntro &&
      !img._isOutro
    );
    
    // Preload each thumbnail using small size
    chapterImages.forEach(img => {
      const proxyUrl = normalizeImageSrc(img.src, 's');
      if (proxyUrl && proxyUrl.startsWith('/img/')) {
        const preloadImg = new Image();
        preloadImg.src = proxyUrl;
      }
    });
  }, [currentIndex, filteredData]);

  // Preload next/prev images when navigating through the story
  useEffect(() => {
    if (!filteredData?.length || currentIndex === 0) return;
    
    // Warm current image at 'xl' size
    if (filteredData[currentIndex]?.id) {
      warmImage(filteredData[currentIndex].id, 'xl');
    }
    
    // Warm previous image at 'xl' size
    if (currentIndex > 1 && filteredData[currentIndex - 1]?.id) {
      warmImage(filteredData[currentIndex - 1].id, 'xl');
    }
    
    // Warm next image at 'xl' size
    if (currentIndex < filteredData.length - 1 && filteredData[currentIndex + 1]?.id) {
      warmImage(filteredData[currentIndex + 1].id, 'xl');
    }
  }, [currentIndex, filteredData]);

// ✅ Simple speech status check (MP3 only, no TTS)
const isSpeechActive = () => {
  return isSpeaking;
};  // --- simple audio stop (MP3 only) ---
  const stopSpeech = () => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsSpeaking(false);
    } catch {
      setIsSpeaking(false);
    }
  };




  // MP3 audio playback only (no TTS fallback)
  const speakText = () => {
    // If already playing audio → stop
    if (isSpeaking) {
      stopSpeech();
      return;
    }

    if (!currentImage) return;

    // Check if muted
    if (isMuted) return;

    // Only play if we have an audio file
    if (!currentImage.audioSrc) {
      return; // No audio available
    }

    setIsSpeaking(true);

    // Play MP3 audio file
    if (audioRef.current) {
      audioRef.current.src = currentImage.audioSrc;
      audioRef.current.play().catch((error) => {
        console.error('Error playing audio:', error);
        setIsSpeaking(false);
      });
    }
  };















  // Auto-stop speech when slide changes
  useEffect(() => {
    // Clear any lingering utterances from previous slides
    stopSpeech();  // always silence old narration
  }, [currentIndex]);

  // Watermark support
  // Global trigger: if the ghost intro (id 'i-k4studios') has showMark === 'yes'/true,
  // then watermark shows for ALL slides unless an individual slide explicitly sets showMark.
  const globalWatermark = useMemo(() => {
    try {
      const ghost = Array.isArray(rawData)
        ? rawData.find(img => img && img.id === 'i-k4studios')
        : null;
      const raw = ghost?.showMark;
      const enabled = typeof raw === 'string' ? raw.toLowerCase() === 'yes' : !!raw;
      return {
        enabled,
        text: ghost?.watermarkText || 'K4 Studios',
      };
    } catch {
      return { enabled: false, text: 'K4 Studios' };
    }
  }, [rawData]);

  const showWatermark = (img) => {
    if (!img) return globalWatermark.enabled;
    // Never show on the ghost/intro slide
    if (img.id === 'i-k4studios') return false;
    // Per-slide override if provided
    if (typeof img.showMark !== 'undefined') {
      const val = img.showMark;
      return typeof val === 'string' ? val.toLowerCase() === 'yes' : !!val;
    }
    // Otherwise inherit global setting
    return globalWatermark.enabled;
  };

  const WatermarkOverlay = ({ text }) => {
    const rawLabel = text || globalWatermark.text || 'Wayne Heim';
    const nameLabel = typeof rawLabel === 'string'
      ? rawLabel.replace(/^\s*©\s*/i, '').trim()
      : 'Wayne Heim';
    return (
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          pointerEvents: 'none',
          zIndex: 15,
          userSelect: 'none',
          padding: '10px 18px',
        }}
      >
        <a
          href="/copyright"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            // Avoid triggering any parent click handlers (e.g., zoom)
            e.stopPropagation();
          }}
          style={{
            // bottom-right signature-style mark
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            transform: 'none',
            color: '#fff',
            fontWeight: 700,
            letterSpacing: 0.3,
            fontFamily: "'Glegoo', serif",
            fontSize: 'clamp(18px, 2.9vw, 28px)',
            textTransform: 'none',
            textAlign: 'right',
            lineHeight: 1.1,
            WebkitTextStroke: '1px rgba(0,0,0,0.75)',
            textShadow: '0 1px 2px rgba(0,0,0,0.6), 0 0 2px rgba(0,0,0,0.45)',
            opacity: 0.5,
            textDecoration: 'none',
            pointerEvents: 'auto',
            cursor: 'pointer',
          }}
        >
          <span
            style={{
              // Render only the © glyph in a crisp sans-serif stack for clarity
              fontFamily:
                "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji'",
              fontWeight: 700,
              fontSize: '0.9em',
              marginRight: 6,
            }}
          >
            ©
          </span>
          {nameLabel}
        </a>
      </div>
    );
  };

  if (!isReady) {
    return (
      <div className="flex items-center justify-center w-full h-[80vh] text-[#8b7355]">
        <p>Loading slideshow…</p>
      </div>
    );
  }

  // Compute safe speaking flag once
  const safeSpeaking = isSpeaking || isSpeechActive();

  return (
    <>
    <div
  className="picture-show-content min-h-screen bg-white text-black font-serif px-4 sm:px-4 md:px-8 lg:px-12 pt-1 sm:pt-2 md:pt-8 pb-8 overflow-visible"
  style={{ fontFamily: "Glegoo, serif", boxSizing: 'border-box' }}
>
        <link
          href="https://fonts.googleapis.com/css2?family=Glegoo:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />

  <div className="relative max-w-6xl mx-auto flex flex-col items-center overflow-visible">
          <AnimatePresence mode="wait">
            {isEndOfStory ? (
              // ===================== CLOSING PAGE =====================
              <motion.div
                key="closing"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40 }}
                transition={{ duration: 0.72 }}
                className="flex flex-col items-center justify-center text-center mt-12 w-full"
              >
                <h1
                  className="text-2xl md:text-3xl font-semibold text-[#85644b] mb-4"
                  style={{ fontFamily: "'Glegoo', serif" }}
                >
                  The End of This Story
                </h1>

                <p className="text-base md:text-lg text-gray-700 max-w-xl mb-10 leading-relaxed">
                  Every photograph carries a fragment of the past — thank you for walking
                  through this story. Continue exploring the gallery below.
                </p>

                <hr className="w-full max-w-3xl border-gray-300 mb-8" />

                <h2
                  className="text-lg md:text-xl font-medium text-gray-800 mb-6"
                  style={{ fontFamily: "'Glegoo', serif" }}
                >
                 Chapter Index
                </h2>

                <div className="flex flex-wrap justify-center gap-4 mb-10 max-w-[614px] mx-auto">
                  {filteredData.filter(img => 
                    img.id !== "i-k4studios" &&
                    img.id !== "i-k4video-intro" &&
                    img.id !== "i-k4video-outro" &&
                    !img._isIntro &&
                    !img._isOutro
                  ).map((img, idx) => (
                    <a
                      key={idx}
                      href={img.galleries && img.galleries.length > 0 ? `/Galleries/${img.galleries[0].replace('Galleries/', '').replace('.mjs', '')}/${img.id}` : "#"}
                      className="group block rounded-md overflow-hidden border border-gray-300 hover:shadow-md transition-all"
                    >
                      <img
                        src={normalizeImageSrc(img.src, 's')}
                        alt={img.alt || img.title}
                        className="w-[110px] h-[110px] object-cover group-hover:opacity-90"
                      />
                    </a>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    stopSpeech();
                    setCurrentIndex(0);
                  }}
                  className="px-6 py-2 bg-[#85644b] text-white rounded-md hover:bg-[#6b4f3a] transition"
                >
                  Back to Start
                </button>

              </motion.div>
            ) : (
              // ===================== IMAGE SEQUENCE =====================
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: direction > 0 ? 100 : -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction > 0 ? -100 : 100 }}
                transition={{ duration: 0.45 }}
                className="w-full flex flex-col items-center overflow-visible"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                style={{ touchAction: 'pan-y' }}
              >
                {/* CARD CONTAINER FOR START PAGE */}
                {currentIndex === 0 ? (
                  <div className="w-full px-3 sm:px-4 md:px-0 mt-8 md:mt-16 lg:mt-20">
                    <motion.div
                      initial={false}
                      animate={fanOut ? "fan" : "stack"}
                      variants={{
                        stack: {},
                        fan: { transition: { staggerChildren: 0, delayChildren: 0 } }
                      }}
                      style={{ position: 'relative', maxWidth: '28rem', margin: '0 auto', overflow: 'visible', padding: '.25rem 0', perspective: '1000px' }}
                    >
                      {/* Shadow stack cards animate from a neat stack to fanned offsets */}
                      {[ 
                        { y: -2, x: 2, rotate: -4 },
                        { y: 2, x: 4, rotate: 1 },
                        { y: 1, x: 3, rotate: -3 },
                        { y: -3, x: 5, rotate: 3 },
                        { y: 0, x: 6, rotate: 1 },
                      ].map((cfg, i) => (
                        <motion.div
                          key={`shadow-${i}`}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            background: '#ece8dfff',
                            borderRadius: '1rem',
                            boxShadow: '0 4px 10px rgba(26, 22, 20, 0.22)',
                            zIndex: i + 1,
                            border: '1px solid #d6c6b2',
                          }}
                          variants={{
                            stack: { opacity: 0, y: 40, x: 0, rotate: 0, scale: 1 },
                            fan: {
                              opacity: 1,
                              y: cfg.y,
                              x: cfg.x,
                              rotate: cfg.rotate,
                              scale: 1,
                              transition: { type: 'tween', ease: [0.22, 1, 0.36, 1], duration: 1.5 }
                            }
                          }}
                          aria-hidden="true"
                        />
                      ))}

                    {/* Clickable portal cards (desktop only) */}
{[
  { rotate: -15, x: -80, y: 8, href: "/", label: "HOME" },
  { rotate: 16, x: 130, y: 10, href: "/Contact/", label: "@" },
  { rotate: 14, x: 190, y: 80, href: "/Other/Stories", label: "INDEX" },
].map((card, i) => (
  <motion.a
    key={`portal-${i}`}
    href={card.href}
    aria-label={`Go to ${card.label}`}
    className="hidden md:block k4-card k4-card-link"
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "75%",
      height: "86%",
      zIndex: 6 + i,
      cursor: "pointer",
      transformOrigin: "center",
    }}
    variants={{
      stack: { opacity: 0, y: 40, x: 0, rotate: 0, scale: 1 },
      fan: {
        opacity: 1,
        y: card.y,
        x: card.x,
        rotate: card.rotate,
        scale: 1,
        transition: {
          type: "tween",
          ease: [0.42, 0, 0.38, 1],
          duration: 0.8,
          delay: card.label === "HOME" ? 0.1 : 0,
        },
      },
    }}
    whileHover={{ scale: 1.02 }}
  >
    <span className="sr-only">{card.label}</span>

    {/* Label rendering */}
    {(() => {
      // stack each letter vertically for HOME and INDEX, use icon for @
      let labelText = card.label;
      let side, topOffset;
      if (card.label === "HOME") {
        side = "left-5";
        topOffset = "top-[4%]";
        const letters = labelText.split("");
        return (
          <span
            aria-hidden="true"
            className={`absolute ${side} ${topOffset} k4-home-label tracking-[0.15em] select-none text-sm leading-[1.51em] font-semibold opacity-50`}
            style={{ whiteSpace: "pre-line", textAlign: "center", transition: 'color .5s ease' }}
          >
            {letters.join("\n")}
          </span>
        );
      } else if (card.label === "INDEX") {
        side = "right-5";
        topOffset = "top-[4%]";
        const letters = labelText.split("");
        return (
          <span
            aria-hidden="true"
            className={`absolute ${side} ${topOffset} k4-index-label tracking-[0.15em] select-none text-sm leading-[1.51em] font-semibold opacity-50`}
            style={{ whiteSpace: "pre-line", textAlign: "center", transition: 'color .5s ease' }}
          >
            {letters.join("\n")}
          </span>
        );
      } else if (card.label === "@") {
        side = "right-5";
        topOffset = "top-[4%]";
        return (
          <span
            aria-hidden="true"
            className={`absolute ${side} ${topOffset} k4-contact-label select-none opacity-70`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 1s ease' }}
          >
            <Mail size={18} strokeWidth={2} className="k4-contact-label-icon" />
          </span>
        );
      }
    })()}
  </motion.a>
))}


                      {/* Top primary card (main) */}
                      <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'tween', ease: [0.22, 1, 0.36, 1], duration: 0.6 }}
                        onClick={goNext}
                        onMouseEnter={() => setIsCardHovered(true)}
                        onMouseLeave={() => setIsCardHovered(false)}
                        className="k4-card pt-4 sm:pt-8 md:pt-12 px-8 pb-6 cursor-pointer flex flex-col will-change-transform max-w-md mx-auto group"
                        style={{
                          position: 'relative',
                          zIndex: 10,
                        }}
                      >
                      {/* IMAGE CONTAINER (three-stage hover: src -> src2 -> src3) */}
                      <div
                        className="relative mb-6 max-w-md mx-auto"
                        style={{
                          background: '#f7f3eb',
                          WebkitUserDrag: 'none',
                          userSelect: 'none',
                          WebkitTouchCallout: 'none',
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        {/* Base image (show only when not hovered) */}
                        <img
                          src={normalizeImageSrc(currentImage?.src, 'xl')}
                          alt={currentImage?.alt || currentImage?.title}
                          className="w-full h-full object-contain"
                          style={{ opacity: isCardHovered ? 0 : 1, transition: 'opacity 500ms ease-out' }}
                          draggable={false}
                        />
                        {/* Hover phase 1 */}
                        {currentImage?.src2 && (
                          <img
                            src={normalizeImageSrc(currentImage.src2, 'xl')}
                            alt=""
                            className="absolute inset-0 w-full h-full object-contain"
                            style={{ opacity: isCardHovered ? 1 : 0, transition: 'opacity 500ms ease-out', pointerEvents: 'none' }}
                            draggable={false}
                          />
                        )}
                        {/* Hover phase 2 (animated gif) */}
                        {currentImage?.src3 && (
                          <img
                            src={normalizeImageSrc(currentImage.src3, 'xl')}
                            alt=""
                            className="absolute inset-0 w-full h-full object-contain"
                            style={{ opacity: hoverPhase === 2 ? 1 : 0, transition: 'opacity 500ms ease-out', pointerEvents: 'none' }}
                            draggable={false}
                          />
                        )}
                        {showWatermark(currentImage) && (
                          <WatermarkOverlay text={currentImage?.watermarkText || 'Wayne Heim'} />
                        )}
                      </div>

                      {/* TEXT CONTENT AT BOTTOM */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.27, duration: 0.36, ease: "easeOut" }}
                        className="text-center max-w-sm mx-auto"
                      >
                        <h1
                          className="font-semibold mb-1 text-3xl"
                          style={{
                            opacity: 0.7,
                            fontFamily: "'Glegoo', serif",
                            color: '#85644b',
                            transition: 'color 0.2s',
                          }}
                        >
                          {(() => {
                            const title = currentImage?.title || titleBase || "Untitled";
                            if (title.startsWith("Prologue:")) {
                              const parts = title.split("Prologue:");
                              return (
                                <>
                                  <span className="text-xl block  text-[#85644b]">Prologue:</span>
                                  <span
                                    className="text-2xl font-bold"
                                    style={{
                                      color: isCardHovered ? '#470b00ff' : '#723a20ff',
                                      transition: 'color 0.25s ease',
                                    }}
                                  >
                                    {parts[1]?.trim() || ""}
                                  </span>
                                </>
                              );
                            }
                            return (
                              <span
                                style={{
                                  color: isCardHovered ? '#8B4513' : '#85644b',
                                  transition: 'color 0.25s ease',
                                }}
                              >
                                {title}
                              </span>
                            );
                          })()}
                        </h1>
                        {currentImage?.story && (
                          <p className="italic text-sm leading-relaxed text-gray-700 mb-4">
                            {currentImage.story}
                          </p>
                        )}

                        {/* NEXT BUTTON INSIDE CARD */}
                        <div className="flex justify-center mb-3 mt-2">
                          <button
                            type="button"
                            onClick={goNext}
                            className="k4-play-btn"
                            title="Begin Story"
                            aria-label="Begin Story"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M8 6l10 6-10 6z" />
                            </svg>
                          </button>
                        </div>
                      </motion.div>
                      </motion.div>
                    </motion.div>
                  </div>
                ) : (
                  /* IMAGE - border removed, kept simple to avoid narrow image spacing issues */
                  <div className="w-full px-5 sm:px-6 md:px-8 flex items-start justify-center pt-2 sm:pt-4 md:pt-8" style={{ boxSizing: 'border-box' }}>
                    <div className="relative" style={{ lineHeight: 0 }}>
                      <img
                        src={getBestImageSrc(currentImage)}
                        alt={currentImage?.alt || currentImage?.title}
                        className="rounded-lg shadow-md"
                        onContextMenu={(e) => e.preventDefault()}
                        style={{
                          WebkitUserDrag: 'none',
                          userSelect: 'none',
                          WebkitTouchCallout: 'none',
                          display: 'block',
                          maxHeight: '70vh',
                          maxWidth: '100%',
                          width: 'auto',
                          height: 'auto'
                        }}
                        draggable={false}
                      />
                      {showWatermark(currentImage) && (
                        <WatermarkOverlay text={currentImage?.watermarkText || 'Wayne Heim'} />
                      )}
                    </div>
                  </div>
                )}
{/* Shopping Cart & Notes Buttons */}
                <div className={`w-full ${currentIndex > 0 ? 'px-5 sm:px-6 md:px-8' : ''} flex flex-wrap items-center justify-center gap-3 mt-3`}>
                  {currentImage?.buyLink && (
                    <a
                      href={currentImage?.buyLink}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="px-2 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-100 flex items-center gap-2"
                      aria-label="Order"
                    >
                      <ShoppingCart className="w-4 h-4 text-gray-500" aria-hidden="true" />
                      <span className="hidden sm:inline">Order</span>
                    </a>
                  )}

                  {currentIndex > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (currentImage?.notes) setShowNotes((p) => !p);
                      }}
                      className={`px-4 py-2 border border-gray-300 rounded-md text-sm flex items-center gap-2 ${currentImage?.notes ? 'bg-white hover:bg-gray-100 cursor-pointer' : 'bg-white'}`}
                      title={currentImage?.notes ? (showNotes ? 'Hide Notes' : 'View Collector Notes') : ''}
                      disabled={!currentImage?.notes}
                      
                    >
                      <Notebook
                        className={`w-4 h-4 ${!currentImage?.notes ? 'opacity-0' : ''}`}
                        aria-hidden={!currentImage?.notes}
                      />
                      <span className={`${!currentImage?.notes ? 'opacity-0' : ''}`} aria-hidden={!currentImage?.notes}>
                        {showNotes ? "Hide Notes" : "View Collector Notes"}
                      </span>
                    </button>
                  )}

                  {currentIndex > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        startSlideshow({ advanceFromIntro: false, immediate: true });
                      }}
                      className="px-2 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-900 flex items-center gap-2"
                      title="Launch Cinematic Mode"
                    >
                      <MonitorPlay className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>

                {/* NOTES PANEL */}
                <AnimatePresence>
                  {showNotes && currentImage?.notes && (
                    <motion.div
                      key="notes"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.27 }}
                      className="mt-4 max-w-2xl text-sm bg-[#e9ebe4] p-4 rounded-md border border-gray-300 shadow-inner"
                    >
                      {currentImage.notes.split("\n\n").map((para, idx) => (
                        <p key={idx} className="mb-3 last:mb-0">
                          {para}
                        </p>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* PROGRESS DOTS & NAV */}
                <div className={`w-full ${currentIndex > 0 ? 'px-5 sm:px-6 md:px-8' : ''} flex flex-wrap justify-center items-center gap-1 mt-2 max-w-full`} style={{ boxSizing: 'border-box' }}>
                  {/* PREV BUTTON */}
                  {currentIndex > 0 && (
                    <button
                      type="button"
                      onClick={goPrev}
                      className="w-8 h-10 sm:w-10 sm:h-12 flex items-center justify-center text-gray-400 hover:text-[#8B4513]  rounded transition-all duration-200"
                      title="Previous"
                    >
                      <SquareChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
                    </button>
                  )}

                  {/* PROGRESS DOTS */}
                  {currentIndex > 0 && Array.from({ length: filteredData.length + 1 }, (_, idx) => idx).map((idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        stopSpeech();
                        setCurrentIndex(idx);
                      }}
                      className={`w-2 h-2.5 rounded-full transition-all duration-300 hover:ring-2 hover:ring-[#8B4513] hover:ring-opacity-100 ${
                        idx === currentIndex ? "bg-[#8B4513]" : "bg-gray-300"
                      }`}
                      style={{
                        opacity: idx === currentIndex ? 1 : 0.4,
                        transform: idx === currentIndex ? "scale(1.1)" : "scale(0.9)",
                      }}
                      title={`Go to ${idx === 0 ? "Intro" : (idx === filteredData.length ? "End" : `Slide ${idx}`)}`}
                    ></button>
                  ))}

                  {/* NEXT BUTTON */}
                  {currentIndex > 0 && (
                    <button
                      type="button"
                      onClick={goNext}
                      className="w-8 h-10 sm:w-10 sm:h-12 flex items-center justify-center text-gray-400 hover:text-[#8B4513] rounded transition-all duration-200"
                      title="Next"
                    >
                      <SquareChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
                    </button>
                  )}

                  {/* TEXT-TO-SPEECH BUTTON */}
                  {currentIndex > 0 && !isEndOfStory && currentImage?.audioSrc && (
                    <button
                      type="button"
                      onClick={() => {
                        if (safeSpeaking) {
                          stopSpeech();
                        } else {
                          speakText();
                        }
                      }}
                      className={`w-8 h-10 sm:w-10 sm:h-12 flex items-center justify-center rounded transition-all duration-200 ${
                        safeSpeaking
                          ? "text-blue-600 hover:text-blue-700 bg-blue-50"
                          : "text-gray-400 hover:text-[#8B4513]"
                      }`}
                      title={safeSpeaking ? "Stop reading" : "Read aloud"}
                    >
                      <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                  )}
                </div>

                {/* TEXT SECTION - Only for non-start pages */}
                {currentIndex > 0 && (
                  <motion.div
                    key={`text-${currentIndex}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mt-10 text-center max-w-3xl px-5 sm:px-6 md:px-8"
                  >
                    <h1
                      className={`text-[#85644b] font-semibold mb-2 ${currentIndex === 0 ? 'text-3xl' : 'text-xl'}`}
                      style={{ opacity: 0.7, fontFamily: "'Glegoo', serif" }}
                    >
                      {(() => {
                        const title = currentImage?.title || titleBase || "Untitled";
                        if (currentIndex === 0 && title.startsWith("Prologue:")) {
                          const parts = title.split("Prologue:");
                          return (
                            <>
                              <span className="text-2xl">Prologue:</span>
                              <br />
                              <span className="text-[#722F0F]">{parts[1]?.trim() || ""}</span>
                            </>
                          );
                        }
                        return title;
                      })()}
                    </h1>
                    {currentImage?.story && (
                      <p className="italic text-base leading-relaxed">
                        {currentImage.story}
                      </p>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer
          className="bg-[#fff] font-serif text-center pb-16 w-full mt-12"
          style={{ fontFamily: "'Glegoo', serif" }}
          aria-label="Site footer"
          itemScope
          itemType="https://schema.org/Organization"
        >
          <div className="mx-auto max-w-xl px-4 pt-8 pb-4 footer-fade" aria-label="Footer controls and info">
            {/* 🔗 Share Drawer */}
            <div className="pb-4">
              <ShareDrawer
                imageUrl={filteredData?.[0]?.src}
                pageTitle="Story Complete - K4 Studios"
              />
            </div>

            {/* 🌐 Social Icons */}
            <div className="flex justify-center gap-5 mb-3">
              <a href="https://www.facebook.com/k4studiosphotography/" target="_blank" rel="noopener noreferrer">
                <img className="social-icon" src="https://cdn.simpleicons.org/facebook/444444" alt="Facebook" width="20" height="20" itemProp="sameAs" />
              </a>
              <a href="https://www.instagram.com/k4studios/" target="_blank" rel="noopener noreferrer">
                <img className="social-icon" src="https://cdn.simpleicons.org/instagram/444444" alt="Instagram" width="20" height="20" itemProp="sameAs" />
              </a>
              <a href="https://www.threads.com/@k4studios" target="_blank" rel="noopener noreferrer">
                <img className="social-icon" src="https://cdn.simpleicons.org/threads/444444" alt="Threads" width="20" height="20" itemProp="sameAs" />
              </a>
              <a href="https://www.pinterest.com/K4studios/" target="_blank" rel="noopener noreferrer">
                <img className="social-icon" src="https://cdn.simpleicons.org/pinterest/444444" alt="Pinterest" width="20" height="20" itemProp="sameAs" />
              </a>
              <a href="https://500px.com/wayneheim" target="_blank" rel="noopener noreferrer">
                <img className="social-icon" src="https://cdn.simpleicons.org/500px/444444" alt="500px" width="20" height="20" itemProp="sameAs" />
              </a>
              <a href="/Contact">
                <img className="social-icon" src="https://cdn.simpleicons.org/gmail/444444" alt="Email" width="20" height="20" itemProp="sameAs" />
              </a>
            </div>

            {/* 🄯 Copyright */}
            <div className="text-xs text-[#2c2c2c] opacity-70" itemProp="name">
              <time dateTime={new Date().getFullYear().toString()} aria-label={`Copyright ${new Date().getFullYear()}`}>&copy; {new Date().getFullYear()}</time>
              {' '}Wayne Heim - K4 Studios |{' '}
              <a href="/Glossary" className="underline hover:no-underline" title="Story Glossary">Story Glossary</a>
              {' '}| All rights reserved.
            </div>

            <div className="mt-5 flex justify-center">
              <a href="/" className="home-btn" aria-label="Go to homepage">Home</a>
            </div>
          </div>
        </footer>
      </div>

      {showSlideshow && (
        <StoryShow
          images={filteredData}
          startImageId={currentImage?.id}
          onExit={() => {
            // Stop all audio when exiting slideshow
            if (ambientAudioRef.current) {
              ambientAudioRef.current.pause();
              ambientAudioRef.current.currentTime = 0;
            }
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
            }
            setShowSlideshow(false);
            setIsSpeaking(false);
          }}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          volume={volume}
          setVolume={setVolume}
          audioRef={audioRef}
          ambientAudioRef={ambientAudioRef}
          setIsSpeaking={setIsSpeaking}
          isSpeaking={isSpeaking}
          globalAudioSrc={globalAudioSrc}
          globalAudioMode={globalAudioMode}
          introMeta={introMeta}
          outroMeta={outroMeta}
        />
      )}

      {/* Zoom Overlay disabled in this viewer */}

      {/* Hidden audio element for playing static audio files */}
      <audio
        ref={audioRef}
        onEnded={() => setIsSpeaking(false)}
        onPause={() => setIsSpeaking(false)}
        onPlay={() => setIsSpeaking(true)}
        style={{ display: 'none' }}
      />

      {/* Hidden ambient audio element for background music */}
      <audio
        ref={ambientAudioRef}
        loop
        style={{ display: 'none' }}
      />
    </>
  );
}

