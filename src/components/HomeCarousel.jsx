/**
 * HomeCarousel - A CLS-safe carousel component for the homepage.
 * 
 * This component reads from pre-generated static pools (public/carouselPools.json)
 * and selects images randomly at runtime. This avoids:
 * 
 * 1. SSR/hydration mismatch (no import.meta.glob at runtime)
 * 2. CLS issues (fixed-height container, client-only rendering)
 * 3. #418 React hydration errors (client:only="react" in Astro)
 * 
 * Selection strategy:
 * - Always start with 1 cowboy image (hero position)
 * - Pick from alternating pools (painterly/traditional) for variety
 * - Use session storage to avoid showing same images on navigation
 */

import { useEffect, useRef, useState } from "react";
import "../styles/ImageBar2.css";
import { warmImage } from "../utils/warmImage";

// ✅ Proxy URL helper - never expose SmugMug URLs to crawlers
const getProxySrc = (id, size = "s") => `/img/${id}/${size}.jpg`;

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function trackHomeHeroNavigation(href, imageId) {
  if (typeof window === 'undefined' || typeof window.k4ShouldSuppressAnalytics === 'function' && window.k4ShouldSuppressAnalytics()) {
    return;
  }

  const galleryId = href ? href.replace(/\/i-[^/]+$/, '') : null;

  if (typeof window.k4track === 'function') {
    window.k4track('gallery_hero_click', {
      galleryId,
      imageId,
      pageType: 'landing',
      sourceLayer: 'home_carousel_image_click'
    });
  }

  if (typeof window.k4emitActionPixel === 'function') {
    window.k4emitActionPixel('gallery_hero_click', imageId, {
      galleryId,
      pageType: 'landing',
      sourceLayer: 'home_carousel_image_click'
    });
  }
}

function shouldBypassTrackedNavigation(event) {
  return !event || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function handleTrackedNavigation(event, href, tracker) {
  if (!href || typeof window === 'undefined') return;

  if (shouldBypassTrackedNavigation(event)) {
    tracker();
    return;
  }

  event.preventDefault();
  tracker();
  window.setTimeout(() => {
    window.location.assign(href);
  }, 80);
}

// Pick N random items from an array
function pickRandom(arr, n) {
  return shuffle(arr).slice(0, n);
}

// Select carousel slides from pools with variety
// Strategy: 1 cowboy (hero) + 4 images from 4 different random pools + 1 cowboy (not adjacent)
function selectSlides(pools, heroWebpSrcs) {
  const slides = [];
  const usedIds = new Set();
  
  // Get recently used IDs from session storage to avoid repetition
  let recentlyUsed = [];
  try {
    const stored = sessionStorage.getItem('carouselRecentIds');
    if (stored) recentlyUsed = JSON.parse(stored);
  } catch (e) { /* ignore */ }
  
  // Helper to pick from a pool
  const pickFromPool = (pool) => {
    if (!pool?.length) return null;
    let available = pool.filter(img => !usedIds.has(img.id) && !recentlyUsed.includes(img.id));
    if (available.length === 0) available = pool.filter(img => !usedIds.has(img.id));
    if (available.length === 0) return null;
    const pick = pickRandom(available, 1)[0];
    usedIds.add(pick.id);
    return pick;
  };
  
  // 1. Pick FIRST cowboy (hero position)
  const cowboy1 = pickFromPool(pools.westernCowboy);
  if (cowboy1) {
    const heroSrc = getProxySrc(cowboy1.id, 's');
    slides.push({
      ...cowboy1,
      src: heroSrc,
      srcS: heroSrc,
      fetchpriority: 'high',
      loading: undefined,
      className: 'k4-home-carousel-img k4-home-carousel-img--1 loaded'
    });
  }
  
  // 2. Pick 4 random pools from the available categories (excluding westernCowboy)
  const allPoolNames = shuffle([
    'painterlyLandscapes',
    'traditionalLandscapes', 
    'civilWar',
    'traditionalTransportation',
    'wwii',
    'painterlyTransportation',
    'roaring20s',
    'traditionalOther'
  ]).slice(0, 4);
  
  // 3. Pick 1 image from each of the 4 selected pools, inserting cowboy2 at position 4
  for (let i = 0; i < allPoolNames.length; i++) {
    // Insert second cowboy at position 4 (index 3, after 3 other images)
    if (slides.length === 3) {
      const cowboy2 = pickFromPool(pools.westernCowboy);
      if (cowboy2) {
        slides.push({
          ...cowboy2,
          fetchpriority: undefined,
          loading: 'lazy',
          className: `k4-home-carousel-img k4-home-carousel-img--${slides.length + 1}`
        });
      }
    }
    
    const pick = pickFromPool(pools[allPoolNames[i]]);
    if (pick) {
      slides.push({
        ...pick,
        fetchpriority: undefined,
        loading: 'lazy',
        className: `k4-home-carousel-img k4-home-carousel-img--${slides.length + 1}`
      });
    }
  }
  
  // Save used IDs to session storage for next page load variety
  try {
    const newRecent = slides.map(s => s.id).slice(0, 12);
    sessionStorage.setItem('carouselRecentIds', JSON.stringify(newRecent));
  } catch (e) { /* ignore */ }
  
  return slides;
}

export default function HomeCarousel() {
  const trackRef = useRef(null);
  const [slides, setSlides] = useState([]);
  const [show, setShow] = useState(false);
  const [fullSize, setFullSize] = useState(false);
  const [duplicated, setDuplicated] = useState(false);

  useEffect(() => {
    // Fetch the pre-generated pools
    fetch('/carouselPools.json')
      .then(res => res.json())
      .then(data => {
        const selected = selectSlides(data.pools, data.heroWebpSrcs, 7);
        setSlides(selected);
        
        // Mark as ready for duplication (infinite scroll effect)
        if (selected.length > 0) {
          setDuplicated(true);
        }
      })
      .catch(err => {
        console.error('Failed to load carousel pools:', err);
      });

    // Appear animation (after a tiny delay for paint)
    const fadeTimer = setTimeout(() => setShow(true), 30);
    
    // Scale up after hero animation
    const scaleTimer = setTimeout(() => setFullSize(true), 1950);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(scaleTimer);
    };
  }, []);

  // Phase 3: Warm carousel images immediately (s size to match display)
  useEffect(() => {
    if (!slides.length) return;
    
    // Warm immediately - carousel images are user-facing
    slides.forEach(slide => {
      if (slide.id) warmImage(slide.id, 's');
    });
    
    // Also warm 'm' size in idle for responsive scaling
    const warmMedium = () => {
      slides.forEach(slide => {
        if (slide.id) warmImage(slide.id, 'm');
      });
    };
    
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(warmMedium, { timeout: 1500 });
      return () => cancelIdleCallback(id);
    } else {
      const timer = setTimeout(warmMedium, 300);
      return () => clearTimeout(timer);
    }
  }, [slides]);

  if (!slides.length) {
    // Return a placeholder with same dimensions to prevent CLS
    return (
      <section
        className="carousel"
        aria-label="Fine-Art Photography Carousel"
        role="region"
        style={{ minHeight: '200px' }}
      >
        <div className="carousel-track" />
      </section>
    );
  }

  // Double slides for infinite scroll effect
  const displaySlides = duplicated ? [...slides, ...slides] : slides;

  return (
    <section
      className={
        "carousel carousel-fade" +
        (show ? " carousel-fadein" : "") +
        (fullSize ? " carousel-fullsize carousel-ready" : "")
      }
      aria-label="Fine-Art Photography Carousel"
      role="region"
      itemScope
      itemType="https://schema.org/ImageGallery"
    >
      <meta itemProp="name" content="Fine Art Gallery Carousel" />
      <meta itemProp="creator" content="K4 Studios" />
      <div className="carousel-track" ref={trackRef}>
        {displaySlides.map((s, i) => {
          const isDuplicate = duplicated && i >= slides.length;
          return (
          <figure
            className="carousel-slide"
            key={`slide-${i}`}
            itemScope
            itemType="https://schema.org/ImageObject"
            aria-hidden={isDuplicate ? "true" : undefined}
          >
            <a href={s.href} title={isDuplicate ? undefined : s.alt} aria-label={isDuplicate ? undefined : s.alt} tabIndex={isDuplicate ? -1 : undefined} onClick={isDuplicate ? undefined : (event) => handleTrackedNavigation(event, s.href, () => trackHomeHeroNavigation(s.href, s.id || null))}>
              <img
                src={s.id ? getProxySrc(s.id, 's') : (s.srcS || s.src)}
                alt={isDuplicate ? "" : s.alt}
                itemProp="contentUrl"
                loading={s.loading}
                fetchpriority={s.fetchpriority}
                width={s.width || undefined}
                height={s.height || undefined}
                decoding={s.loading === 'lazy' ? 'async' : 'auto'}
              />
            </a>
            <figcaption itemProp="description">{s.description}</figcaption>
          </figure>
          );
        })}
      </div>
    </section>
  );
}
