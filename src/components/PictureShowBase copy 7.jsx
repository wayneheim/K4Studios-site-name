import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SquareChevronLeft, SquareChevronRight, ShoppingCart, Notebook, MonitorPlay, Volume2, VolumeX } from "lucide-react";
import ZoomOverlay from "./ZoomOverlay.jsx";
import GallerySlideshowStory from "./Gallery-Slideshow-Story.jsx";
import ShareDrawer from "./ShareDrawer.jsx";
import { storyVoices } from "./storyVoices.js";
import "./ScrollFlipZoomStyles.css";
import "../styles/global.css";

export default function PictureShowBase({ rawData = [], basePath = "", titleBase = "" }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [matColor, setMatColor] = useState("white");
  const [showNotes, setShowNotes] = useState(false);
  const [direction, setDirection] = useState(1);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentVoice, setCurrentVoice] = useState(null);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const activeUtterances = useRef([]);
  const activeTimeouts = useRef([]);
  const audioRef = useRef(null);
  // swipe tracking
  const touchStart = useRef({ x: 0, y: 0, t: 0 });
  const [voicePreferences, setVoicePreferences] = useState(() => {
    // Load saved preferences from localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ttsVoicePreferences');
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    }
    return {};
  });

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

  // Save voice preferences for consistency
  const saveVoicePreference = (storytellerName, voiceName) => {
    const updatedPreferences = {
      ...voicePreferences,
      [storytellerName]: voiceName,
      lastUpdated: Date.now()
    };
    setVoicePreferences(updatedPreferences);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ttsVoicePreferences', JSON.stringify(updatedPreferences));
      } catch (e) {
        console.warn('Could not save voice preferences:', e);
      }
    }
  };

  const goPrev = () => {
    activeUtterances.current = []; // Clear any pending utterances
    activeTimeouts.current = []; // Clear any pending timeouts
    stopSpeech();
    setDirection(-1);
    setCurrentIndex((i) => {
      const newIndex = Math.max(i - 1, 0);
      // Trigger audio for new image after a short delay
      setTimeout(() => {
        if (showSlideshow && rawData[newIndex]?.audioSrc && !isMuted) {
          setIsSpeaking(true);
          if (audioRef.current) {
            audioRef.current.src = rawData[newIndex].audioSrc;
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
    activeUtterances.current = []; // Clear any pending utterances
    activeTimeouts.current = []; // Clear any pending timeouts
    stopSpeech();
    setDirection(1);
    if (currentIndex === 0) {
      // Find first non-ghost image
      const firstRealIdx = rawData.findIndex(img => img.id !== 'i-k4studios');
      const newIndex = firstRealIdx > -1 ? firstRealIdx : 1;
      setCurrentIndex(newIndex);
      // Trigger audio for new image after a short delay
      setTimeout(() => {
        if (showSlideshow && rawData[newIndex]?.audioSrc && !isMuted) {
          setIsSpeaking(true);
          if (audioRef.current) {
            audioRef.current.src = rawData[newIndex].audioSrc;
            audioRef.current.play().catch((error) => {
              console.error('Error playing audio on navigation:', error);
              setIsSpeaking(false);
            });
          }
        }
      }, 100);
    } else {
      setCurrentIndex(i => {
        const newIndex = Math.min(i + 1, rawData.length);
        // Trigger audio for new image after a short delay
        setTimeout(() => {
          if (showSlideshow && rawData[newIndex]?.audioSrc && !isMuted) {
            setIsSpeaking(true);
            if (audioRef.current) {
              audioRef.current.src = rawData[newIndex].audioSrc;
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

  const currentImage = rawData[currentIndex];
  const isEndOfStory = currentIndex >= rawData.length;

  // Helper function to check if speech is currently active
  const isSpeechActive = () => {
    return window.speechSynthesis.speaking || window.speechSynthesis.pending;
  };

  // --- hard stop for queued speech (Chrome-safe) ---
  const stopSpeech = () => {
    try {
      // Stop audio playback if playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      // Cancel queued timeouts first
      activeTimeouts.current.forEach(clearTimeout);
      activeTimeouts.current = [];

      // Manually stop every known utterance
      activeUtterances.current.forEach(u => {
        try { u.onend = null; u.onerror = null; } catch {}
        window.speechSynthesis.cancel(); // still required for some browsers
      });
      activeUtterances.current = [];

      // Double flush Chrome's internal queue
      const synth = window.speechSynthesis;
      synth.cancel();
      setTimeout(() => synth.cancel(), 60);
      setTimeout(() => setIsSpeaking(false), 100);
    } catch (err) {
      console.warn("Speech stop failed:", err);
      setIsSpeaking(false);
    }
  };

  // Normalize voice names across browsers for better matching
  const normalizeVoiceName = (voiceName) => {
    return voiceName
      .toLowerCase()
      .replace(/microsoft\s+/g, '')
      .replace(/google\s+/g, '')
      .replace(/apple\s+/g, '')
      .replace(/\s*\([^)]*\)/g, '') // Remove parentheses content
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Detect voice characteristics for better matching
  const detectVoiceCharacteristics = (voice) => {
    const name = voice.name.toLowerCase();
    const lang = voice.lang.toLowerCase();

    return {
      isFemale: name.includes('female') || name.includes('woman') || name.includes('girl') ||
                name.includes('zira') || name.includes('hazel') || name.includes('susan') ||
                name.includes('karen') || name.includes('samantha') || name.includes('zoe') ||
                name.includes('serena') || name.includes('victoria'),
      isMale: name.includes('male') || name.includes('man') || name.includes('boy') ||
              name.includes('david') || name.includes('mark') || name.includes('daniel') ||
              name.includes('alex') || name.includes('fred') || name.includes('ralph'),
      isBritish: lang.includes('gb') || name.includes('uk') || name.includes('british') ||
                 name.includes('english') && !name.includes('us'),
      isAmerican: lang.includes('us') || name.includes('us') || name.includes('american'),
      isAustralian: lang.includes('au') || name.includes('australian'),
      hasAccent: name.includes('accent') || name.includes('regional')
    };
  };

  // Enhanced voice scoring with browser normalization
  const calculateVoiceScore = (voice, storyteller) => {
    let score = 0;
    const name = voice.name.toLowerCase();
    const lang = voice.lang.toLowerCase();

    // Base score for English voices
    if (lang.startsWith('en')) score += 10;

    // Browser-agnostic voice matching with normalized names
    const normalizedName = normalizeVoiceName(voice.name);
    for (let i = 0; i < storyteller.voicePriority.length; i++) {
      const priorityName = storyteller.voicePriority[i].toLowerCase();
      if (normalizedName.includes(priorityName) ||
          priorityName.includes(normalizedName) ||
          voice.name.includes(storyteller.voicePriority[i])) {
        score += 200 - (i * 10); // Higher priority for voices earlier in the list
        break;
      }
    }

    // Quality indicators in name
    if (name.includes('natural') || name.includes('premium') || name.includes('enhanced')) score += 10;
    if (name.includes('google')) score += 8;
    if (name.includes('microsoft') || name.includes('azure')) score += 8;
    if (name.includes('apple') || name.includes('siri')) score += 6;

    // Voice characteristic detection
    const voiceCharacteristics = detectVoiceCharacteristics(voice);
    if (voiceCharacteristics.isFemale && storyteller.name === 'Martha') score += 15;
    if (voiceCharacteristics.isMale && storyteller.name === 'Martha') score += 10; // Still good for grandpa
    if (voiceCharacteristics.isBritish) score += 12;
    if (voiceCharacteristics.isAmerican) score += 8;

    return score;
  };

  // Enhanced TTS control with proper state management
  const speakText = () => {
    // If already playing audio → stop
    if (isSpeaking) {
      stopSpeech();
      return;
    }

    if (!currentImage) return;
    
    // Check if muted
    if (isMuted) return;
    
    setIsSpeaking(true);

    // Check if we have a static audio file
    if (currentImage.audioSrc) {
      // Play static audio file
      if (audioRef.current) {
        audioRef.current.src = currentImage.audioSrc;
        audioRef.current.play().catch((error) => {
          console.error('Error playing audio:', error);
          setIsSpeaking(false);
        });
      }
      return;
    }

    // Fallback to TTS if no audioSrc
    const synth = window.speechSynthesis;

    // Alternate storyteller based on index
    const storytellers = ['Samuel', 'Martha'];
    const storytellerName = storytellers[currentIndex % storytellers.length];
    const storyteller = storyVoices.find(v => v.name === storytellerName);

    console.log(`Picture ${currentIndex}: Selected storyteller ${storytellerName}, voicePriority: [${storyteller.voicePriority.slice(0, 3).join(', ')}...]`);

    setCurrentVoice(storyteller); // just for display/debug consistency

    const rawText = `${currentImage.title || 'Untitled'}. ${currentImage.story || ''}`.trim();

    if (!rawText) {
      setIsSpeaking(false);
      return;
    }

    // Preprocess text for more natural speech
    const processedText = preprocessTextForSpeech(rawText);

    // Split into sentences for more natural pacing
    const sentences = processedText.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // Pass storyteller explicitly
    speakSentences(sentences, storyteller);
  };

  const preprocessTextForSpeech = (text) => {
    return text
      // Handle contractions and common phrases that TTS struggles with
      .replace(/\bI'm\b/g, 'I am')
      .replace(/\bI've\b/g, 'I have')
      .replace(/\bI'll\b/g, 'I will')
      .replace(/\bI'd\b/g, 'I would')
      .replace(/\bcan't\b/g, 'cannot')
      .replace(/\bwon't\b/g, 'will not')
      .replace(/\bdon't\b/g, 'do not')
      .replace(/\bdoesn't\b/g, 'does not')
      .replace(/\bdidn't\b/g, 'did not')
      .replace(/\bisn't\b/g, 'is not')
      .replace(/\baren't\b/g, 'are not')
      .replace(/\bwasn't\b/g, 'was not')
      .replace(/\bweren't\b/g, 'were not')
      .replace(/\bhaven't\b/g, 'have not')
      .replace(/\bhasn't\b/g, 'has not')
      .replace(/\bhadn't\b/g, 'had not')
      .replace(/\bthat's\b/g, 'that is')
      .replace(/\bthere's\b/g, 'there is')
      .replace(/\bhere's\b/g, 'here is')
      .replace(/\bwhat's\b/g, 'what is')
      .replace(/\bwhere's\b/g, 'where is')
      .replace(/\bhow's\b/g, 'how is')
      .replace(/\bwho's\b/g, 'who is')
      .replace(/\bit's\b/g, 'it is')
      // Replace common abbreviations
      .replace(/\bDr\./g, 'Doctor')
      .replace(/\bMr\./g, 'Mister')
      .replace(/\bMrs\./g, 'Misses')
      .replace(/\bMs\./g, 'Miss')
      .replace(/\bSr\./g, 'Senior')
      .replace(/\bJr\./g, 'Junior')
      .replace(/\bvs\./g, 'versus')
      .replace(/\betc\./g, 'et cetera')
      .replace(/\be\.g\./g, 'for example')
      .replace(/\bi\.e\./g, 'that is')
      // Handle numbers and dates more naturally
      .replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g, 'the $1 $2 $3') // dates
      .replace(/\b(\d{4})\b/g, '$1') // years
      // Add breathing room with punctuation
      .replace(/,/g, ', ')
      .replace(/;/g, '; ')
      .replace(/:/g, ': ')
      // Clean up extra spaces
      .replace(/\s+/g, ' ')
      .trim();
  };

  const speakSentences = (sentences, storyteller) => {
    if (sentences.length === 0) return;

    let hasSpoken = false;

    const speakOnce = (sentences, voices) => {
      if (hasSpoken) return;
      hasSpoken = true;
      speakWithBestVoice(sentences, voices, storyteller);
    };

    // Wait for voices to load if they haven't yet
    let voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        speakOnce(sentences, voices);
      };
    } else {
      speakOnce(sentences, voices);
    }
  };

  const isQuestion = (sentence) => {
    const trimmed = sentence.trim();
    return trimmed.endsWith('?') ||
           trimmed.toLowerCase().startsWith('what ') ||
           trimmed.toLowerCase().startsWith('where ') ||
           trimmed.toLowerCase().startsWith('when ') ||
           trimmed.toLowerCase().startsWith('why ') ||
           trimmed.toLowerCase().startsWith('how ') ||
           trimmed.toLowerCase().startsWith('who ') ||
           trimmed.toLowerCase().startsWith('which ') ||
           /\b(can|could|will|would|shall|should|may|might|do|does|did|is|are|was|were|have|has|had)\s+.*\?/.test(trimmed);
  };

  const speakWithBestVoice = (sentences, voices, storyteller) => {
    console.log(`Using storyteller: ${storyteller?.name} for picture ${currentIndex}`);

    // Check for saved voice preference first
    const savedVoiceName = voicePreferences[storyteller.name];
    console.log(`Checking saved preference for ${storyteller.name}: ${savedVoiceName || 'none'}`);
    let preferredVoice = null;

    if (savedVoiceName) {
      preferredVoice = voices.find(voice =>
        voice.name === savedVoiceName ||
        normalizeVoiceName(voice.name) === normalizeVoiceName(savedVoiceName)
      );
      console.log(`Found saved voice: ${preferredVoice?.name || 'not found'}`);
    }

    let bestVoice;
    if (preferredVoice) {
      // Check if the saved voice still scores well against current priorities
      const savedVoiceScore = calculateVoiceScore(preferredVoice, storyteller);
      const voiceScores = voices.map(voice => ({
        voice,
        score: calculateVoiceScore(voice, storyteller)
      })).sort((a, b) => b.score - a.score);

      const topScore = voiceScores[0].score;
      const scoreThreshold = topScore * 0.8; // Must be at least 80% of the best score

      if (savedVoiceScore >= scoreThreshold) {
        bestVoice = preferredVoice;
        console.log(`Using saved preferred voice: ${bestVoice.name} (score: ${savedVoiceScore})`);
      } else {
        console.log(`Saved voice ${preferredVoice.name} (score: ${savedVoiceScore}) is below threshold (${scoreThreshold}), selecting better voice`);
        bestVoice = voiceScores[0].voice;
        console.log(`Selected better voice for ${storyteller.name}: ${bestVoice.name} (${bestVoice.lang})`);

        // Update the saved preference
        saveVoicePreference(storyteller.name, bestVoice.name);
      }
    } else {
      // No saved preference, select the best voice
      const voiceScores = voices.map(voice => ({
        voice,
        score: calculateVoiceScore(voice, storyteller)
      })).sort((a, b) => b.score - a.score);

      // Log available voices for debugging (remove in production)
      console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
      console.log('Top voice scores:', voiceScores.slice(0, 3).map(vs => `${vs.voice.name}: ${vs.score}`));

      bestVoice = voiceScores[0].voice;
      console.log(`Selected voice for ${storyteller.name}: ${bestVoice.name} (${bestVoice.lang})`);

      // Save this choice for future consistency
      if (bestVoice) {
        saveVoicePreference(storyteller.name, bestVoice.name);
      }
    }

    if (!bestVoice) {
      // Fallback if no voices available - warm grandma bedtime story settings
      // Clear any old references to prevent overlap
      activeUtterances.current = [];

      sentences.forEach((sentence, index) => {
        const timeoutId = setTimeout(() => {
          const isQuestionSentence = isQuestion(sentence);
          const utterance = new SpeechSynthesisUtterance(sentence.trim() + (isQuestionSentence ? '?' : '.'));
          activeUtterances.current.push(utterance);

          if (isQuestionSentence) {
            utterance.rate = 0.95; // Slightly faster for questions
            utterance.pitch = 0.95; // Higher pitch for questions
            utterance.volume = 0.75; // Softer for questions
          } else {
            utterance.rate = 0.88; // Gentle grandma pace
            utterance.pitch = 0.88; // Warm, nurturing pitch
            utterance.volume = 0.8; // Comforting volume
          }

          if (index === sentences.length - 1) {
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);
          }
          window.speechSynthesis.speak(utterance);
        }, index * 1000); // 1000ms pause between sentences for gentle storytelling rhythm
        activeTimeouts.current.push(timeoutId);
      });
      setIsSpeaking(true);
      return;
    }

    // Speak each sentence with natural pauses
    // Clear any old references to prevent overlap
    activeUtterances.current = [];

    sentences.forEach((sentence, index) => {
      const timeoutId = setTimeout(() => {
        const isQuestionSentence = isQuestion(sentence);
        const utterance = new SpeechSynthesisUtterance(sentence.trim() + (isQuestionSentence ? '?' : '.'));
        activeUtterances.current.push(utterance);
        utterance.voice = bestVoice;

        // Fine-tune settings based on voice characteristics and sentence type
        const baseSettings = getOptimalVoiceSettings(bestVoice, storyteller);

        if (isQuestionSentence) {
          // Questions get slightly higher pitch and more variation for gentle curiosity
          utterance.rate = baseSettings.rate * storyteller.questionMultiplier.rate;
          utterance.pitch = Math.min(baseSettings.pitch * storyteller.questionMultiplier.pitch, 1.0);
          utterance.volume = baseSettings.volume * storyteller.questionMultiplier.volume;
        } else {
          utterance.rate = baseSettings.rate;
          utterance.pitch = baseSettings.pitch;
          utterance.volume = baseSettings.volume;
        }

        // Add gentle variation for nurturing grandma effect (more variation for questions)
        const variationMultiplier = isQuestionSentence ? 1.3 : 1.0;
        utterance.rate += (Math.random() - 0.5) * 0.06 * variationMultiplier; // ±0.03 (±0.039 for questions)
        utterance.pitch += (Math.random() - 0.5) * 0.04 * variationMultiplier; // ±0.02 (±0.026 for questions)

        if (index === 0) {
          utterance.onstart = () => setIsSpeaking(true);
        }
        if (index === sentences.length - 1) {
          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = () => setIsSpeaking(false);
        }

        window.speechSynthesis.speak(utterance);
      }, index * 1000); // 1000ms pause between sentences for gentle storytelling rhythm
      activeTimeouts.current.push(timeoutId);
    });
  };

  const getOptimalVoiceSettings = (voice, storyteller) => {
    const name = voice.name.toLowerCase();
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';

    // Use storyteller's base settings as defaults
    let settings = { ...storyteller.baseSettings };

    // Browser-specific baseline adjustments for consistency
    const browserAdjustments = getBrowserAdjustments(userAgent);
    settings.rate *= browserAdjustments.rateMultiplier;
    settings.pitch *= browserAdjustments.pitchMultiplier;
    settings.volume *= browserAdjustments.volumeMultiplier;

    // Voice-specific fine-tuning
    if (name.includes('karen')) {
      settings.rate = Math.max(settings.rate - 0.05, 0.7);
      settings.pitch = Math.min(settings.pitch + 0.05, 1.0);
    } else if (name.includes('samantha')) {
      settings.rate = Math.max(settings.rate - 0.02, 0.7);
      settings.volume = Math.min(settings.volume + 0.02, 0.9);
    } else if (name.includes('susan')) {
      settings.pitch = Math.min(settings.pitch + 0.03, 1.0);
      settings.volume = Math.max(settings.volume - 0.02, 0.7);
    } else if (name.includes('zoe') || name.includes('serena')) {
      settings.rate = Math.min(settings.rate + 0.05, 1.0);
      settings.pitch = Math.max(settings.pitch - 0.02, 0.8);
    } else if (name.includes('microsoft') && name.includes('zira')) {
      settings.volume = Math.min(settings.volume + 0.03, 0.9);
      settings.rate *= 0.95; // Microsoft voices often need slight slowing
    } else if (name.includes('google') && name.includes('female')) {
      settings.rate = Math.max(settings.rate - 0.03, 0.7);
      settings.pitch *= 1.05; // Google voices often benefit from slight pitch boost
    } else if (name.includes('google') && name.includes('male')) {
      settings.rate = Math.max(settings.rate - 0.05, 0.7);
      settings.pitch *= 0.95; // Slightly lower pitch for male voices
    }

    // Clamp values to valid ranges
    settings.rate = Math.max(0.1, Math.min(settings.rate, 10.0));
    settings.pitch = Math.max(0.0, Math.min(settings.pitch, 2.0));
    settings.volume = Math.max(0.0, Math.min(settings.volume, 1.0));

    return settings;
  };

  // Browser-specific adjustments for consistency
  const getBrowserAdjustments = (userAgent) => {
    if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
      return { rateMultiplier: 1.0, pitchMultiplier: 1.0, volumeMultiplier: 1.0 };
    } else if (userAgent.includes('firefox')) {
      return { rateMultiplier: 1.1, pitchMultiplier: 0.95, volumeMultiplier: 1.1 }; // Firefox often needs rate boost
    } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      return { rateMultiplier: 0.95, pitchMultiplier: 1.05, volumeMultiplier: 0.95 }; // Safari adjustments
    } else if (userAgent.includes('edg')) {
      return { rateMultiplier: 1.05, pitchMultiplier: 0.98, volumeMultiplier: 1.0 }; // Edge adjustments
    } else {
      return { rateMultiplier: 1.0, pitchMultiplier: 1.0, volumeMultiplier: 1.0 }; // Default
    }
  };  // Voice testing function for users to find most consistent experience
  const testVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    const storyteller = storyVoices.find(v => v.name === 'Martha');

    if (!storyteller || voices.length === 0) return;

    // Test top 3 voices with a sample sentence
    const testSentence = "Hello, I am Martha, your storytelling companion.";
    const topVoices = voices
      .map(voice => ({
        voice,
        score: calculateVoiceScore(voice, storyteller)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    console.log('Testing top 3 voices for Martha:');
    topVoices.forEach((voiceScore, index) => {
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(testSentence);
        utterance.voice = voiceScore.voice;

        const settings = getOptimalVoiceSettings(voiceScore.voice, storyteller);
        utterance.rate = settings.rate;
        utterance.pitch = settings.pitch;
        utterance.volume = settings.volume;

        utterance.onstart = () => console.log(`Testing voice ${index + 1}: ${voiceScore.voice.name} (score: ${voiceScore.score})`);
        window.speechSynthesis.speak(utterance);
      }, index * 3000); // 3 second gaps between tests
    });
  };

  // Expose test function globally for debugging (remove in production)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.testTTSVoices = testVoices;
      window.clearTTSPreferences = () => {
        localStorage.removeItem('ttsVoicePreferences');
        setVoicePreferences({});
        console.log('TTS voice preferences cleared');
      };
      return () => {
        delete window.testTTSVoices;
        delete window.clearTTSPreferences;
      };
    }
  }, []);

  // Auto-stop speech when slide changes
  useEffect(() => {
    // Clear any lingering utterances from previous slides
    activeUtterances.current = [];
    activeTimeouts.current = [];
    stopSpeech();  // always silence old narration
  }, [currentIndex]);

  return (
    <>
    <div
  className="picture-show-content min-h-screen bg-white text-black font-serif px-4 sm:px-4 md:px-8 lg:px-12 pt-1 sm:pt-2 md:pt-8 pb-8 overflow-x-hidden overflow-y-visible"
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
                transition={{ duration: 0.8 }}
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

                <div className="flex flex-wrap justify-center gap-4 mb-10">
                  {rawData.filter(img => img.id !== "i-k4studios" && img.visibility !== "closing" && img.id !== "i-k4studios-closing").map((img, idx) => (
                    <a
                      key={idx}
                      href={img.galleries && img.galleries.length > 0 ? `/Galleries/${img.galleries[0].replace('Galleries/', '').replace('.mjs', '')}/${img.id}` : "#"}
                      className="group block rounded-md overflow-hidden border border-gray-300 hover:shadow-md transition-all"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={img.src}
                        alt={img.title}
                        className="w-[110px] h-[110px] object-cover group-hover:opacity-90"
                      />
                    </a>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    activeUtterances.current = []; // Clear any pending utterances
                    activeTimeouts.current = []; // Clear any pending timeouts
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
                transition={{ duration: 0.5 }}
                className="w-full flex flex-col items-center overflow-visible"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                style={{ touchAction: 'pan-y' }}
              >
                {/* CARD CONTAINER FOR START PAGE */}
                {currentIndex === 0 ? (
                  <div className="w-full px-3 sm:px-4 md:px-0">
                    <div style={{ position: 'relative', maxWidth: '28rem', margin: '0 auto', overflow: 'visible', padding: '.25rem 0', perspective: '1000px' }}>
                    {/* Multiple stacked shadow cards for realistic stack effect */}
                    {/* Card stack config: adjust offsets/rotation per card here */}
                    {[ 
                      { top: -2, left: 2, rotate: -4 },
                      { top: 2, left: 4, rotate: 1 },
                      { top: 1, left: 3, rotate: -3 },
                      { top: -3, left: 5, rotate: 3 },
                      { top: 0, left: 6, rotate: 1 },
                    ].map((cfg, i) => (
                      <motion.div
                        key={i}
                        style={{
                          position: 'absolute',
                          top: `${cfg.top}px`,
                          left: `${cfg.left}px`,
                          width: '100%',
                          height: '100%',
                          background: '#ece8dfff',
                          borderRadius: '1rem',
                          boxShadow: '0 4px 10px rgba(26, 22, 20, 0.22)',
                          zIndex: i + 1,
                          border: '1px solid #d6c6b2',
                        }}
                        animate={{
                          rotate: isCardHovered
                            ? cfg.rotate + (Math.random() - 0.5) * 1.5
                            : cfg.rotate,
                          x: isCardHovered
                            ? cfg.left + (Math.random() - 0.5) * 2
                            : cfg.left,
                          y: isCardHovered
                            ? cfg.top + (Math.random() - 0.5) * 2
                            : cfg.top,
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 180,
                          damping: 12,
                          mass: 0.6,
                        }}
                        aria-hidden="true"
                      />
                    ))}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 1.54, ease: [0.33, 1, 0.68, 1] }}
                      onClick={goNext}
                      onMouseEnter={() => setIsCardHovered(true)}
                      onMouseLeave={() => setIsCardHovered(false)}
                      className="rounded-xl border border-gray-300 pt-4 sm:pt-8 md:pt-12 px-8 pb-4 cursor-pointer flex flex-col will-change-transform max-w-md mx-auto group"
                        style={{
                          backgroundColor: "#f7f3ebff",
                          position: 'relative',
                          zIndex: 10,
                          boxShadow: `0 4px 10px rgba(26, 22, 20, 0.52), inset 0 2px 8px rgba(255,255,255,0.18), inset 0 -2px 8px rgba(0,0,0,0.10)`,
                          border: '2px solid #b8a47a', // slightly darker outline
                        }}
                    >
                      {/* IMAGE CONTAINER (hover crossfade by revealing background) */}
                      <div
                        className="aspect-square bg-[#eae6df] rounded-sm relative mb-6 max-w-md mx-auto overflow-hidden border-2 border-gray-400"
                        style={{
                          backgroundImage: currentImage?.src2 ? `url(${currentImage.src2})` : 'none',
                          backgroundSize: 'contain',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                        }}
                      >
                        <div
                          className="absolute inset-0 rounded-sm pointer-events-none"
                          style={{
                            boxShadow: `
                              inset 2px 0 3px rgba(75,75,75,.4),
                              inset -2px 0 3px rgba(236,236,236,.68),
                              inset 0 2px 3px rgba(77,77,77,.4),
                              inset 0 -3px 4px rgba(255,255,255,.81)
                            `,
                            zIndex: 10,
                          }}
                        />
                        <img
                          src={currentImage?.src}
                          alt={currentImage?.title}
                          className={`w-full h-full object-contain rounded-sm transition-opacity duration-[1240ms] ease-out ${currentImage?.src2 ? 'group-hover:opacity-0' : ''}`}
                          onClick={() => setIsZoomed(true)}
                          draggable={false}
                        />
                      </div>

                      {/* TEXT CONTENT AT BOTTOM */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
                        className="text-center max-w-sm mx-auto"
                      >
                        <h1
                          className="font-semibold mb-3 text-3xl"
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
                                  <span className="text-xl block mb-1 text-[#85644b]">Prologue:</span>
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
                        <div className="flex justify-center mt-4">
                          <button
                            type="button"
                            onClick={goNext}
                            className={`w-16 h-16 flex items-center justify-center rounded transition-all duration-200 ${isCardHovered ? 'text-[#8B4513]' : 'text-[#bba798]'}`}
                            title="Begin Story"
                          >
                            <SquareChevronRight className="w-9 h-9" />
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                    </div>
                  </div>
                ) : (
                  /* IMAGE */
                  <div className="w-full px-5 sm:px-6 md:px-8" style={{ boxSizing: 'border-box' }}>
                    <img
                      src={currentImage?.src}
                      alt={currentImage?.title}
                      className="block mx-auto rounded-lg max-h-[70vh] max-w-full object-contain shadow-md border border-gray-300"
                      onClick={() => setIsZoomed(true)}
                      draggable={false}
                    />
                  </div>
                )}
{/* Shopping Cart & Notes Buttons */}
                {currentImage?.notes && (
                  <div className={`w-full ${currentIndex > 0 ? 'px-5 sm:px-6 md:px-8' : ''} flex flex-wrap items-center justify-center gap-3 mt-3`}>
                    <a
                      href={currentImage?.buyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-100 flex items-center gap-2"
                      aria-label="Order"
                    >
                      <ShoppingCart className="w-4 h-4 text-gray-500" aria-hidden="true" />
                      <span className="hidden sm:inline">Order</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => setShowNotes((p) => !p)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Notebook className="w-4 h-4 text-gray-500" />
                      {showNotes ? "Hide Notes" : "View Collector Notes"}
                    </button>

                    {currentIndex !== 0 && (
                      <button
                        type="button"
                        onClick={() => setShowSlideshow(true)}
                        className="px-2 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-900 flex items-center gap-2"
                        title="Launch Cinematic Mode"
                      >
                        <MonitorPlay className="w-4 h-4 text-gray-400" />

                      </button>
                    )}
                  </div>
                )}

                {/* NOTES PANEL */}
                <AnimatePresence>
                  {showNotes && currentImage?.notes && (
                    <motion.div
                      key="notes"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3 }}
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
                <div className={`w-full ${currentIndex > 0 ? 'px-5 sm:px-6 md:px-8' : ''} flex flex-wrap justify-center items-center gap-2 mt-2 max-w-full`} style={{ boxSizing: 'border-box' }}>
                  {/* PREV BUTTON */}
                  {currentIndex > 0 && (
                    <button
                      type="button"
                      onClick={goPrev}
                      className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-gray-400 hover:text-[#8B4513]  rounded transition-all duration-200"
                      title="Previous"
                    >
                      <SquareChevronLeft className="w-7 h-7" />
                    </button>
                  )}

                  {/* PROGRESS DOTS */}
                  {currentIndex > 0 && Array.from({ length: rawData.length + 1 }, (_, idx) => idx).map((idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        activeUtterances.current = []; // Clear any pending utterances
                        activeTimeouts.current = []; // Clear any pending timeouts
                        stopSpeech();
                        setCurrentIndex(idx);
                      }}
                      className={`w-3 h-3 rounded-full transition-all duration-300 hover:ring-2 hover:ring-[#8B4513] hover:ring-opacity-100 ${
                        idx === currentIndex ? "bg-[#8B4513]" : "bg-gray-300"
                      }`}
                      style={{
                        opacity: idx === currentIndex ? 1 : 0.4,
                        transform: idx === currentIndex ? "scale(1.1)" : "scale(0.9)",
                      }}
                      title={`Go to ${idx === rawData.length ? "End" : `Slide ${idx + 1}`}`}
                    ></button>
                  ))}

                  {/* NEXT BUTTON */}
                  {currentIndex > 0 && (
                    <button
                      type="button"
                      onClick={goNext}
                      className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-gray-400 hover:text-[#8B4513] rounded transition-all duration-200"
                      title="Next"
                    >
                      <SquareChevronRight className="w-7 h-7" />
                    </button>
                  )}

                  {/* TEXT-TO-SPEECH BUTTON */}
                  {currentIndex > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isSpeechActive() || isSpeaking) {
                          stopSpeech();
                        } else {
                          speakText();
                        }
                      }}
                      className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded transition-all duration-200 ${
                        isSpeechActive() || isSpeaking
                          ? "text-blue-600 hover:text-blue-700 bg-blue-50"
                          : "text-gray-400 hover:text-[#8B4513]"
                      }`}
                      title={isSpeechActive() || isSpeaking ? "Stop reading" : "Read aloud"}
                    >
                      <Volume2 className="w-6 h-6" />
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
                imageUrl={rawData?.[0]?.src}
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
        <GallerySlideshowStory
          images={rawData}
          startImageId={currentImage?.id}
          onExit={() => setShowSlideshow(false)}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          audioRef={audioRef}
          setIsSpeaking={setIsSpeaking}
          isSpeaking={isSpeaking}
        />
      )}

      {/* Zoom Overlay */}
      {isZoomed && currentImage && (
        <ZoomOverlay
          imageData={currentImage}
          matColor={matColor}
          setMatColor={setMatColor}
          onClose={() => setIsZoomed(false)}
        />
      )}

      {/* Hidden audio element for playing static audio files */}
      <audio
        ref={audioRef}
        onEnded={() => setIsSpeaking(false)}
        onPause={() => setIsSpeaking(false)}
        onPlay={() => setIsSpeaking(true)}
        style={{ display: 'none' }}
      />
    </>
  );
}

