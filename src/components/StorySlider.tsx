import { useState, useEffect, useRef } from 'react';

interface StoryItem {
  id: string;
  title: string;
  story: string;
}

interface StorySliderProps {
  stories: StoryItem[];
  galleryPath: string;
}

export default function StorySlider({ stories, galleryPath }: StorySliderProps) {
  const [selected, setSelected] = useState<StoryItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stories.length > 0) {
      // Shuffle and pick 5 random stories
      const shuffled = [...stories].sort(() => Math.random() - 0.5);
      setSelected(shuffled.slice(0, 5));
    }
  }, [stories]);

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
    if (story.length <= maxLength) return story;
    const truncated = story.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return truncated.slice(0, lastSpace) + '...';
  };

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
      "url": `https://k4studios.net${galleryPath}/${item.id}`
    }))
  };

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
        className="story-slider-container relative bg-[#ebe5dc] rounded-lg shadow-md px-6 py-5 max-w-2xl mx-auto border-2 border-[#d8d0c4] mb-12 h-[280px] touch-pan-y overflow-hidden"
      >
        {/* Subtle paper texture overlay */}
        <div 
          className="absolute inset-0 pointer-events-none z-0 rounded-lg"
          style={{
            opacity: 0.12,
            mixBlendMode: 'multiply',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' seed='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '400px 400px',
            backgroundRepeat: 'repeat',
            filter: 'contrast(0.5) brightness(0.7)'
          }}
        />
        
        {/* Decorative corner flourishes - upper left and lower right */}
        <div className="absolute top-2.5 left-2.5 w-3.5 h-3.5 border-l-2 border-t-2 border-[#c8bfb0] z-10"></div>
        <div className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-r-2 border-b-2 border-[#c8bfb0] z-10"></div>

        <p className="text-[11px] uppercase tracking-[0.12em] text-[#8c7d6b] mb-3">
          <strong className="font-semibold">One-Image Movie™</strong> Preview
        </p>

        {/* Only render current story - clickable overlay behind text */}
        {selected[current] && (
          <div className="relative h-[180px] overflow-hidden">
            {/* Invisible clickable overlay */}
            <a 
              href={`${galleryPath}/${selected[current].id}`}
              className="absolute inset-0 z-0"
              aria-label={`View ${selected[current].title}`}
            />
            <article key={selected[current].id} className={`relative z-10 pointer-events-none transition-opacity duration-400 ease-in-out ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
              <h4 className="text-[18px] text-[#4a3c2e] mb-3 font-semibold" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                "{selected[current].title}"
              </h4>
              <div className="flex gap-1 mb-4 ml-2">
                <span className="text-3xl leading-none -mt-1" style={{ fontFamily: 'Georgia, serif', color: 'rgba(74, 60, 46, 0.3)' }}>"</span>
                <p className="text-[#6b5d4d] text-[15px] leading-[1.7]" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                  {getExcerpt(selected[current].story)}
                </p>
              </div>
              <span
                className="inline-flex items-center"
                style={{ color: '#5a4d40', fontSize: '12px' }}
              >
                See the rest of the story
                <span className="ml-1.5">→</span>
              </span>
            </article>
          </div>
        )}

        {/* Divider line */}
        <div className="border-t border-[#d8d0c4] mt-4 mb-3"></div>

        {/* Navigation dots - larger tap targets on mobile */}
        <div className="flex justify-center gap-5" role="tablist" aria-label="Story navigation">
          {selected.map((item, index) => (
            <button
              key={item.id}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === current
                  ? 'bg-[#8a7a65]'
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
