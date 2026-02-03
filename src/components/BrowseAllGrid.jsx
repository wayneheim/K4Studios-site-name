/**
 * BrowseAllGrid.jsx
 * 
 * Client-only in-page expansion component for browsing all gallery images.
 * This is UI infrastructure, NOT a routable page.
 * 
 * Architecture (per Quill):
 * - NOT indexable, NOT canonical, NOT a page
 * - Client-only state toggle
 * - Reuses /all.astro grid styling
 * - Triggered from footer, expands in-place
 */
import { useState, useEffect, useRef } from 'react';

// ✅ Grid styling matches /all.astro
const gridStyles = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
  gap: '20px',
  maxWidth: '1400px',
  margin: '30px auto',
  padding: '0 40px',
};

const cardStyles = {
  position: 'relative',
  border: '1px solid #ddd',
  borderRadius: '8px',
  background: '#fff',
  boxShadow: '0 2px 5px rgba(0,0,0,.1)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  transition: 'box-shadow 0.3s ease, transform 0.2s ease',
};

const cardHoverStyles = {
  boxShadow: '0 8px 20px rgba(0,0,0,.18)',
  transform: 'translateY(-2px)',
};

const cardLinkStyles = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  textDecoration: 'none',
  color: 'inherit',
  cursor: 'pointer',
};

const cardContentStyles = {
  padding: '10px 12px',
  fontFamily: "'Glegoo', serif",
};

const cardTitleStyles = {
  fontSize: '0.95rem',
  fontWeight: '600',
  color: '#2a1f17',
  margin: '0 0 4px 0',
  lineHeight: '1.3',
};

const cardNumberStyles = {
  fontSize: '0.75rem',
  color: '#888',
  marginBottom: '4px',
};

// ✅ Proxy URL helper
const getProxySrc = (id, size) => `/img/${id}/${size}`;

// ✅ Text cleaner
const cleanText = (val = '') =>
  String(val)
    .replace(/[\u0000-\u001F]+/g, ' ')
    .replace(/\r?\n|\r/g, ' ')
    .trim();

// ✅ Truncate story
const truncateStory = (story, maxLen = 100) => {
  if (!story) return '';
  const cleaned = cleanText(story);
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
};

/**
 * Single image card component
 */
function ImageCard({ item, index, basePath }) {
  const [isHovered, setIsHovered] = useState(false);
  
  const title = cleanText(item.title || `Image ${index + 1}`);
  const storyExcerpt = truncateStory(item.story);
  const linkUrl = `${basePath}/${item.id}`;
  // Use 'm' size for thumbnails (medium)
  const imgSrc = getProxySrc(item.id, 'm');
  const altText = item.alt || `${title} – Wayne Heim Fine Art Photography`;

  return (
    <div
      style={{ ...cardStyles, ...(isHovered ? cardHoverStyles : {}) }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <a href={linkUrl} style={cardLinkStyles}>
        <img
          src={imgSrc}
          alt={altText}
          loading="lazy"
          className="browse-all-thumb"
          style={{
            width: '100%',
            height: '180px',
            objectFit: 'cover',
            objectPosition: 'center top',
          }}
        />
        <div style={cardContentStyles}>
          <span style={cardNumberStyles}>#{index + 1}</span>
          <h3 style={cardTitleStyles}>{title}</h3>
          {storyExcerpt && (
            <p style={{ fontSize: '0.85rem', color: '#555', margin: 0, lineHeight: '1.4' }}>
              {storyExcerpt}
            </p>
          )}
        </div>
      </a>
    </div>
  );
}

/**
 * Main BrowseAllGrid component
 */
export default function BrowseAllGrid({ 
  allImages = [], 
  basePath = '',
  galleryTitle = 'Gallery',
  buttonText = 'View All Images'
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const gridRef = useRef(null);
  
  // ✅ Filter out ghosts and hidden images
  const visibleImages = allImages.filter(
    (img) => img.visibility !== 'ghost' && img.visibility !== 'hidden' && img.id !== 'i-k4studios'
  );
  
  const imageCount = visibleImages.length;

  // ✅ Handle expand with optional history state
  const handleExpand = () => {
    setIsExpanded(true);
    // Shallow history state for back-button sanity (no URL change)
    if (typeof window !== 'undefined') {
      history.replaceState({ view: 'browse-all' }, '', location.pathname);
    }
  };

  // ✅ Handle collapse
  const handleCollapse = () => {
    setIsExpanded(false);
    // Scroll back to where the button was
    if (gridRef.current) {
      gridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // ✅ Listen for back button to collapse
  useEffect(() => {
    const handlePopState = (e) => {
      if (isExpanded && (!e.state || e.state.view !== 'browse-all')) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isExpanded]);

  // ✅ Smooth scroll to grid when expanded
  useEffect(() => {
    if (isExpanded && gridRef.current) {
      setTimeout(() => {
        gridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [isExpanded]);

  if (imageCount === 0) return null;

  return (
    <div ref={gridRef} style={{ width: '100%' }}>
      {/* ✅ Expand button */}
      {!isExpanded && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
          <button
            onClick={handleExpand}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#85644b',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '1rem',
              fontFamily: "'Glegoo', serif",
              padding: '8px 16px',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => (e.target.style.color = '#5a3e2b')}
            onMouseLeave={(e) => (e.target.style.color = '#85644b')}
          >
            {buttonText} ({imageCount})
          </button>
        </div>
      )}

      {/* ✅ Expanded grid */}
      {isExpanded && (
        <div
          style={{
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: '1px solid #e5e0db',
            animation: 'fadeIn 0.4s ease',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{
              fontFamily: "'Glegoo', serif",
              fontSize: '1.3rem',
              fontWeight: '600',
              color: '#2a1f17',
              margin: '0 0 8px 0',
            }}>
              {galleryTitle} – Complete Index
            </h2>
            <p style={{
              fontFamily: "'Glegoo', serif",
              fontSize: '0.95rem',
              color: '#666',
              margin: 0,
            }}>
              {imageCount} images • Click any image to view with story
            </p>
          </div>

          {/* Grid */}
          <div style={gridStyles}>
            {visibleImages.map((item, idx) => (
              <ImageCard
                key={item.id}
                item={item}
                index={idx}
                basePath={basePath}
              />
            ))}
          </div>

          {/* Collapse button */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px', marginBottom: '16px' }}>
            <button
              onClick={handleCollapse}
              style={{
                background: '#f5f0eb',
                border: '1px solid #d4ccc4',
                borderRadius: '6px',
                color: '#5a4a3a',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontFamily: "'Glegoo', serif",
                padding: '10px 24px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#ebe5de';
                e.target.style.borderColor = '#c4b8a8';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#f5f0eb';
                e.target.style.borderColor = '#d4ccc4';
              }}
            >
              ↑ Collapse Gallery
            </button>
          </div>
        </div>
      )}

      {/* ✅ Animations + responsive styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        /* Mobile: show full image (no cropping since no hover available) */
        @media (max-width: 768px) {
          .browse-all-thumb {
            height: auto !important;
            max-height: none !important;
          }
        }
      `}</style>
    </div>
  );
}
