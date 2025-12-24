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

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pick N random items from an array
function pickRandom(arr, n) {
  return shuffle(arr).slice(0, n);
}

// Select carousel slides from pools with variety
// Strategy: 1 cowboy (hero) + 4 images from 4 different random pools
function selectSlides(pools, heroWebpSrcs) {
  const slides = [];
  const usedIds = new Set();
  
  // Get recently used IDs from session storage to avoid repetition
  let recentlyUsed = [];
  try {
    const stored = sessionStorage.getItem('carouselRecentIds');
    if (stored) recentlyUsed = JSON.parse(stored);
  } catch (e) { /* ignore */ }
  
  // 1. Pick hero from cowboy pool (always first)
  if (pools.westernCowboy?.length > 0) {
    // Prefer cowboys not recently used
    const available = pools.westernCowboy.filter(img => !recentlyUsed.includes(img.id));
    const cowboyPool = available.length > 0 ? available : pools.westernCowboy;
    const cowboy = pickRandom(cowboyPool, 1)[0];
    
    // Use pre-optimized .webp if available
    const heroSrc = heroWebpSrcs[cowboy.id] || cowboy.srcS || cowboy.src;
    slides.push({
      ...cowboy,
      src: heroSrc,
      srcS: heroWebpSrcs[cowboy.id] || cowboy.srcS,
      fetchpriority: 'high',
      loading: undefined,
      className: 'k4-home-carousel-img k4-home-carousel-img--1 loaded'
    });
    usedIds.add(cowboy.id);
  }
  
  // 2. Pick 4 random pools from the available categories (excluding westernCowboy)
  const allPoolNames = [
    'painterlyLandscapes',
    'traditionalLandscapes', 
    'civilWar',
    'traditionalTransportation',
    'wwii',
    'painterlyTransportation',
    'roaring20s',
    'traditionalOther'
  ];
  
  // Shuffle and pick first 4 pools
  const selectedPoolNames = shuffle(allPoolNames).slice(0, 4);
  
  // 3. Pick 1 image from each of the 4 selected pools
  for (const poolName of selectedPoolNames) {
    const pool = pools[poolName];
    if (!pool?.length) continue;
    
    // Prefer images not recently used
    let available = pool.filter(img => !usedIds.has(img.id) && !recentlyUsed.includes(img.id));
    if (available.length === 0) {
      available = pool.filter(img => !usedIds.has(img.id));
    }
    
    if (available.length > 0) {
      const pick = pickRandom(available, 1)[0];
      slides.push({
        ...pick,
        fetchpriority: undefined,
        loading: 'lazy',
        className: `k4-home-carousel-img k4-home-carousel-img--${slides.length + 1}`
      });
      usedIds.add(pick.id);
    }
  }
  
  // Save used IDs to session storage for next page load variety
  try {
    const newRecent = slides.map(s => s.id).slice(0, 10); // Keep last 10
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
        (fullSize ? " carousel-fullsize" : "")
      }
      aria-label="Fine-Art Photography Carousel"
      role="region"
      itemScope
      itemType="https://schema.org/ImageGallery"
    >
      <meta itemProp="name" content="Fine Art Gallery Carousel" />
      <meta itemProp="creator" content="K4 Studios" />
      <div className="carousel-track" ref={trackRef}>
        {displaySlides.map((s, i) => (
          <figure
            className="carousel-slide"
            key={`slide-${i}`}
            itemScope
            itemType="https://schema.org/ImageObject"
          >
            <a href={s.href} title={s.alt} aria-label={s.alt}>
              <img
                src={s.srcS || s.src || s.srcM || s.srcL}
                alt={s.alt}
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
        ))}
      </div>
    </section>
  );
}
