import { useState, useEffect, useRef } from 'react';
import { trackEvent } from '../utils/analytics';

interface StoryItem {
  id: string;
  title: string;
  story: string;
}

interface StorySliderProps {
  stories: StoryItem[];
  galleryPath: string;
  variant?: 'primary' | 'secondary';
}

export default function StorySlider({ stories, galleryPath, variant = 'primary' }: StorySliderProps) {
  // Initialize with shuffled stories immediately to avoid flash of empty content
  const [selected, setSelected] = useState<StoryItem[]>(() => {
    if (stories.length === 0) return [];
    const shuffled = [...stories].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
  });
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Secondary variant has reduced visual weight
  const isSecondary = variant === 'secondary';

  // Handle transition with fade - crossfade at 10%
  const goToSlide = (index: number) => {
    if (index === current || isTransitioning) return;
    setIsTransitioning(true);
    // Switch content when opacity is at ~10% (40ms into 400ms fade)
    setTimeout(() => {
      setCurrent(index);
    }, 40);
    // Complete transition
    setTimeout(() => setIsTransitioning(false), 80);
  };

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStart.current.y;
    
    // Only trigger if horizontal swipe is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX < 0) {
        // Swipe left - next
        goToSlide((current + 1) % selected.length);
      } else {
        // Swipe right - previous
        goToSlide((current - 1 + selected.length) % selected.length);
      }
    }
    touchStart.current = null;
  };

  if (selected.length === 0) return null;

  const getExcerpt = (story: string, maxLength = 280) => {
    const normalize = (text: string) =>
      text
        .trim()
        // Avoid quote artifacts from pasted/encoded content (some sources include leading/trailing quotes).
        .replace(/^[\s\u00A0]*["“]+\s*/u, '')
        .replace(/\s*["”]+[\s\u00A0]*$/u, '');

    const cleaned = normalize(story);
    if (cleaned.length <= maxLength) return cleaned;
    const truncated = cleaned.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return normalize(truncated.slice(0, lastSpace) + '...');
  };
  const siteOrigin = 'https://www.k4studios.com';

  // Structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "One-Image Movie™ Story Previews",
    "description": "Featured One-Image Movie™ stories from K4 Studios' Western Cowboy Portrait collection",
    "numberOfItems": selected.length,
    "itemListElement": selected.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.title,
      "description": getExcerpt(item.story, 160),
      "url": `${siteOrigin}${galleryPath}/${item.id}`
    }))
  };

  // Container classes based on variant
  const containerClasses = isSecondary
    ? "story-slider-container story-slider-secondary relative bg-[#f4f1ec] rounded-lg shadow-sm px-5 py-4 max-w-xl mx-auto border border-[#e0d9cf] mb-8 h-[240px] touch-pan-y overflow-hidden opacity-90"
    : "story-slider-container relative bg-[#ebe5dc] rounded-lg shadow-md px-6 py-5 max-w-2xl mx-auto border-2 border-[#d8d0c4] mb-12 h-[280px] touch-pan-y overflow-hidden";

  // Header text based on variant
  const headerText = isSecondary
    ? "How Story Lives in These Images"
    : <><strong className="font-semibold">One-Image Movie™</strong> Preview</>;

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div 
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={containerClasses}
      >
        {/* Subtle paper texture overlay - reduced for secondary */}
        <div 
          className="absolute inset-0 pointer-events-none z-0 rounded-lg"
          style={{
            opacity: isSecondary ? 0.06 : 0.12,
            mixBlendMode: 'multiply',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' seed='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '400px 400px',
            backgroundRepeat: 'repeat',
            filter: 'contrast(0.5) brightness(0.7)'
          }}
        />
        
        {/* Decorative corner flourishes - hidden for secondary variant */}
        {!isSecondary && (
          <>
            <div className="absolute top-2.5 left-2.5 w-3.5 h-3.5 border-l-2 border-t-2 border-[#c8bfb0] z-10"></div>
            <div className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-r-2 border-b-2 border-[#c8bfb0] z-10"></div>
          </>
        )}

        <p className={`uppercase tracking-[0.12em] mb-3 ${isSecondary ? 'text-[10px] text-[#a09080]' : 'text-[11px] text-[#8c7d6b]'}`}>
          {headerText}
        </p>

        {/* Only render current story - clickable overlay behind text */}
        {selected[current] && (
          <div className={`relative overflow-hidden ${isSecondary ? 'h-[150px]' : 'h-[180px]'}`}>
            {/* Invisible clickable overlay */}
            <a 
              href={`${galleryPath}/${selected[current].id}`}
              className="absolute inset-0 z-0"
              aria-label={`View ${selected[current].title}`}
              onClick={() => trackEvent('story_slider_click', {
                imageId: selected[current].id,
                galleryId: galleryPath
              })}
            />
            <article key={selected[current].id} className={`relative z-10 pointer-events-none transition-opacity duration-400 ease-in-out ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
              <h4 
                className={`mb-3 font-semibold ${isSecondary ? 'text-[16px] text-[#5a4d40]' : 'text-[18px] text-[#4a3c2e]'}`} 
                style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
              >
                "{selected[current].title}"
              </h4>
              <p 
                className={`text-[#6b5d4d] leading-[1.7] mb-4 ${isSecondary ? 'ml-1 text-[14px]' : 'ml-2 text-[15px]'}`} 
                style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
              >
                {getExcerpt(selected[current].story, isSecondary ? 200 : 280)}
              </p>
              <span
                className="inline-flex items-center"
                style={{ color: '#5a4d40', fontSize: isSecondary ? '11px' : '12px' }}
              >
                See the rest of the story
                <span className="ml-1.5">→</span>
              </span>
            </article>
          </div>
        )}

        {/* Divider line */}
        <div className={`border-t mt-4 mb-3 ${isSecondary ? 'border-[#e0d9cf]' : 'border-[#d8d0c4]'}`}></div>

        {/* Navigation dots - smaller for secondary variant */}
        <div className={`flex justify-center ${isSecondary ? 'gap-4' : 'gap-5'}`} role="tablist" aria-label="Story navigation">
          {selected.map((item, index) => (
            <button
              key={item.id}
              onClick={() => {
                goToSlide(index);
                trackEvent('story_slider_click', {
                  imageId: item.id,
                  galleryId: galleryPath
                });
              }}
              className={`rounded-full transition-all ${isSecondary ? 'w-2.5 h-2.5' : 'w-3 h-3'} ${
                index === current
                  ? isSecondary ? 'bg-[#a09080]' : 'bg-[#8a7a65]'
                  : isSecondary 
                    ? 'bg-transparent border border-[#d0c9bf] hover:bg-[#e0d9cf]'
                    : 'bg-transparent border border-[#c0b5a5] hover:bg-[#d8d0c4]'
              }`}
              aria-label={`Go to story ${index + 1}: ${item.title}`}
              aria-selected={index === current}
              role="tab"
            />
          ))}
        </div>
      </div>
    </>
  );
}
