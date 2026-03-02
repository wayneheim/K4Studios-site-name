/**
 * ImageDetailsWidget - Editorial artifact text bound to the artwork
 * 
 * Inspired by ThemeBlock pattern - lives in DOM flow, always SSR'd,
 * semantically scoped to the image, no "UI box" feel.
 * 
 * ARCHITECTURE:
 * - Notes content lives here canonically (for SEO)
 * - Notes tab in ChapterGalleryBase can "borrow" the DOM node when opened
 * - Single source of truth, multiple access points
 * 
 * Follows Quill's rules:
 * - Editorial, not UI (no cards, no heavy borders)
 * - Visible at load (drawer-peek pattern)
 * - Lives inside <article>
 * - Emits scoped structured data
 * - Never a "SEO dump"
 * 
 * @param {Object} image - The current image object with title, description, notes
 * @param {string} galleryTitle - The gallery/chapter title
 * @param {string} sisterLink - Optional link to related images
 */
import blogImageMap from "../data/blogImageMap.js";

export default function ImageDetailsWidget({ 
  image, 
  galleryTitle,
  sisterLink,
  exitPath,
  imageId, // unique ID for this image, used for DOM node targeting
  useDetailsElement = false // Tier 1 SEO: use native <details> instead of CSS truncation
}) {
  // story = short visible text, description = full content for <details>
  if (!image?.description) return null;

  // Structured data scoped to this specific artwork
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    "name": image.title || image.alt,
    "description": image.description,
    "image": image.src,
    "creator": {
      "@type": "Person",
      "name": "Wayne Heim",
      "url": "https://www.k4studios.com"
    },
    "artform": "Photograph",
    "artMedium": "Digital Fine Art Print"
  };

  // Add collector notes as "about" if present
  if (image.notes) {
    structuredData.about = image.notes;
  }

  return (
    <>
      {/* Scoped structured data for this artwork */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Mobile diamond divider - between chapter endcap and widget */}
      <div className="widget-mobile-divider" aria-hidden="true">
        <span className="divider-line" />
        <span className="divider-diamond">◆</span>
        <span className="divider-line" />
      </div>

      <aside 
        className="image-details-widget"
        itemScope 
        itemType="https://schema.org/VisualArtwork"
        aria-label="Artwork details"
      >
        <style>{`
          .image-details-widget {
            max-width: 680px;
            margin: 1.5rem auto 0.5rem;
            padding: 1.25rem 1.5rem;
            font-family: 'Glegoo', serif;
            color: #7a6a58; /* Warm brown/grey */
            position: relative;
            /* No background - integrates seamlessly */
            border-top: 1px solid rgba(200, 190, 180, 0.3);
          }
          
          /* Mobile diamond divider - sits ABOVE the border line */
          .widget-mobile-divider {
            display: none;
          }
          
          @media (max-width: 767px) {
            .widget-mobile-divider {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 0.75rem;
              margin-bottom: 3rem;
              color: rgba(122, 106, 88, 0.75);
            }
            
            .widget-mobile-divider .divider-line {
              width: 2.5rem;
              height: 1px;
              background: rgba(122, 106, 88, 0.4);
            }
            
            .widget-mobile-divider .divider-diamond {
              font-size: 1.5rem;
            }
          }
          
          /* H1 - minimal museum caption, fully visible to crawlers */
          .widget-h1 {
            font-size: 0.85rem;
            font-weight: 500;
            letter-spacing: 0.04em;
            color: #b6afa6;
            text-align: center;
            margin: 0 0 0.75rem;
            font-family: 'Glegoo', serif;
          }
          
          /* Drawer peek - shows first ~5 lines, expandable */
          .widget-description {
            max-height: 8em; /* ~5 lines */
            overflow: hidden;
            position: relative;
            transition: max-height 0.4s ease;
            line-height: 1.6;
            font-size: 0.95rem;
            margin: 0;
          }
          
          /* Fade hint at bottom when collapsed */
          .widget-description::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 1.5em;
            background: linear-gradient(transparent, #fff);
            pointer-events: none;
            transition: opacity 0.3s ease;
          }
          
          /* Expanded state */
          .image-details-widget.expanded .widget-description {
            max-height: 50em;
          }
          
          .image-details-widget.expanded .widget-description::after {
            opacity: 0;
          }
          
          /* Collector notes - canonical location, can be moved to popup */
          .widget-notes-container {
            margin-top: 1rem;
            padding-top: 0.75rem;
            border-top: 1px dashed rgba(200, 190, 180, 0.4);
          }
          
          .widget-notes-container.borrowed {
            /* When notes are "borrowed" by popup, hide container but keep space */
            visibility: hidden;
            height: 0;
            overflow: hidden;
            margin: 0;
            padding: 0;
            border: none;
          }
          
          .widget-notes {
            font-size: 0.875rem;
            font-style: italic;
            color: #6b6b6a;
            max-height: 6.4em; /* ~4 lines peek */
            overflow: hidden;
            transition: max-height 0.4s ease;
            margin: 0;
          }
          
          .image-details-widget.expanded .widget-notes {
            max-height: 30em;
          }
          
          /* When notes are in popup, different styling */
          .notes-in-popup .widget-notes {
            max-height: none;
            font-style: normal;
            color: #333;
          }
          
          /* Expand trigger - minimal, unobtrusive */
          .widget-expand-trigger {
            display: block;
            width: 100%;
            text-align: center;
            padding: 0.5rem 0 0;
            font-size: 0.75rem;
            letter-spacing: 0.05em;
            color: #928176;
            cursor: pointer;
            border: none;
            background: transparent;
            font-family: 'Glegoo', serif;
            transition: color 0.2s ease;
          }
          
          .widget-expand-trigger:hover {
            color: #7b1e1e;
          }
          
          .widget-expand-trigger::before {
            content: '▼';
            display: inline-block;
            margin-right: 0.4em;
            font-size: 0.65em;
            transition: transform 0.3s ease;
          }
          
          .image-details-widget.expanded .widget-expand-trigger::before {
            transform: rotate(180deg);
          }
          
          /* Navigation links - subtle, integrated */
          .widget-nav {
            display: flex;
            justify-content: space-between;
            margin-top: 1rem;
            padding-top: 0.75rem;
            border-top: 1px solid rgba(200, 190, 180, 0.3);
            font-size: 0.8rem;
            margin-bottom: 0.75rem;
          }
          
          /* Bottom rule - visual anchor, 30% wider than top */
          .widget-bottom-rule {
            width: 130%;
            margin-left: -15%;
            height: 1px;
            background: rgba(200, 190, 180, 0.4);
            margin-top: 0;
          }
          
          .widget-nav a {
            color: #7b1e1e;
            text-decoration: none;
            transition: opacity 0.2s ease;
          }
          
          .widget-nav a:hover {
            opacity: 0.7;
          }
          
          /* Mobile adjustments */
          @media (max-width: 767px) {
            .image-details-widget {
              padding: 1rem;
              margin: 0 0.5rem 1.5rem;
            }
            
            .widget-description {
              font-size: 0.9rem;
            }
          }
          
          /* ===== TIER 1 MODE: Native <details> for SEO ===== */
          /* Google treats <details> as Tier 1 indexable content */
          /* Matches gallery landing page "More about this gallery" pattern */
          
          .widget-story {
            font-size: 0.95rem;
            line-height: 1.6;
            margin: 0 0 0.75rem;
            font-style: italic;
            color: #5a5a5a;
          }
          
          .widget-details-more {
            margin: 0;
          }
          
          .widget-details-more summary {
            display: block;
            list-style: none;
            cursor: pointer;
            font-size: 0.85rem;
            color: #7a6a58;
            font-family: 'Glegoo', serif;
            transition: color 0.2s ease;
            padding: 0.5rem 0;
          }
          
          .widget-details-more summary::-webkit-details-marker {
            display: none;
          }
          
          .widget-details-more summary .arrow-icon {
            display: inline-block;
            font-size: 0.7em;
            margin-right: 0.4em;
            transition: transform 0.3s ease;
          }
          
          .widget-details-more[open] summary .arrow-icon {
            transform: rotate(180deg);
          }
          
          .widget-details-more summary:hover {
            color: #7b1e1e;
          }
          
          .widget-details-more .details-content {
            font-size: 0.9rem;
            line-height: 1.7;
            padding-top: 0.5rem;
            border-top: 1px dashed rgba(200, 190, 180, 0.4);
          }
          
          .widget-details-more .details-content p {
            margin: 0 0 1rem;
          }
          
          .widget-notes-inside {
            margin-top: 1rem;
            padding-top: 0.75rem;
            border-top: 1px dashed rgba(200, 190, 180, 0.4);
          }
          
          .widget-notes-inside .notes-label {
            font-size: 0.8rem;
            font-weight: 600;
            color: #928176;
            margin: 0 0 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          
          .widget-notes-inside p:last-child {
            font-style: italic;
            color: #6b6b6a;
            margin: 0;
          }
        `}</style>

        {/* H1 - the page heading, visible and semantic */}
        <h1 className="widget-h1" itemProp="name">
          {image.title || image.alt}
        </h1>

        {/* === TIER 1 MODE: Native <details> for SEO === */}
        {useDetailsElement ? (
          <>
            {/* Story - short visible text (like gallery landing) */}
            {image.story && (
              <p className="widget-story">
                {image.story}
              </p>
            )}

            {/* "More about this image" - matches gallery landing pattern */}
            <details className="widget-details-more">
              <summary>
                <span className="arrow-icon">▼</span> More about this image
              </summary>
              <div className="details-content">
                <p itemProp="description">
                  {image.description}
                </p>
                {/* Collector notes inside details */}
                {image.notes && (
                  <div 
                    id={`canonical-notes-${imageId || 'default'}`}
                    className="widget-notes-inside"
                    data-notes-canonical="true"
                  >
                    <p className="notes-label">Collector Notes:</p>
                    <p itemProp="about">
                      {image.notes}
                    </p>
                  </div>
                )}
                {/* Featured in blog — links image → conversation post */}
                {imageId && blogImageMap[imageId] && (
                  <a
                    href={blogImageMap[imageId].url}
                    style={{
                      display: 'block',
                      marginTop: '1rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px dashed rgba(200, 190, 180, 0.4)',
                      fontSize: '0.8rem',
                      color: '#7b1e1e',
                      textDecoration: 'none',
                      fontFamily: "'Glegoo', serif"
                    }}
                  >
                    📖 Featured in <em>Inside the Frame: {blogImageMap[imageId].title}</em>
                  </a>
                )}
              </div>
            </details>
          </>
        ) : (
          <>
            {/* === TIER 2 MODE: CSS truncation (legacy) === */}
            {/* Description - first few lines visible, rest revealed on expand */}
            <p 
              className="widget-description" 
              itemProp="description"
            >
              {image.description}
            </p>

            {/* Collector notes if present - canonical DOM location */}
            {/* This container can be "borrowed" by the Notes popup via DOM move */}
            {image.notes && (
              <div 
                id={`canonical-notes-${imageId || 'default'}`}
                className="widget-notes-container"
                data-notes-canonical="true"
              >
                <p className="widget-notes" itemProp="about">
                  {image.notes}
                </p>
              </div>
            )}

            {/* Minimal expand trigger */}
            <button 
              type="button"
              className="widget-expand-trigger"
              onClick={(e) => {
                e.currentTarget.closest('.image-details-widget').classList.toggle('expanded');
              }}
              aria-label="Show more details"
            >
              more
            </button>

            {/* Navigation - exit and related (legacy mode only) */}
            {(exitPath || sisterLink) && (
              <nav className="widget-nav">
                {exitPath ? (
                  <a href={exitPath}>← Return to gallery</a>
                ) : (
                  <span></span>
                )}
                {sisterLink && (
                  <a href={sisterLink}>Discover related →</a>
                )}
              </nav>
            )}

            {/* Bottom rule - visual anchor to page */}
            <div className="widget-bottom-rule" aria-hidden="true" />
          </>
        )}

        {/* Hidden semantic data for crawlers */}
        <meta itemProp="name" content={image.title || image.alt} />
        <link itemProp="image" href={image.src} />
      </aside>
    </>
  );
}
