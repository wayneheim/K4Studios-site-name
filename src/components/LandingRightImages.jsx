export default function LandingRightImages({ heading = "", images = [] }) {
  // Responsive src selection logic (matches home carousel)
  function selectResponsiveSrc(img) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 700;
    let selected = '';
    if (isMobile) {
      selected = img.srcS || img.srcM || img.srcL || img.src || '';
    } else {
      selected = img.srcM || img.srcS || img.srcL || img.src || '';
    }
    // -L.jpg override for srcS
    if (img.srcS && img.srcS.endsWith('-L.jpg')) {
      selected = img.srcS;
    }
    return selected;
  }

  // Force re-render on resize to update src responsively
  const [, setWindowWidth] = React.useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  React.useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <aside className="sidebar-thumbnails">
      <div className="thumb-heading-wrapper">
        <h3 className="thumb-heading">{heading}</h3>
      </div>

      {images.map((img) => (
        <a href={img.href} target="_blank" rel="noopener" key={img.href}>
          <img
            src={selectResponsiveSrc(img)}
            alt={img.alt}
            title={img.title}
            className="thumb-img"
            loading="lazy"
            decoding="async"
          />
        </a>
      ))}

      <style jsx>{`
        .sidebar-thumbnails {
          width: 100%;
          max-width: 260px;
          margin-left: auto;
          margin-right: 1rem;
          text-align: center;
        }

        .thumb-heading-wrapper {
          width: 100%;
          margin-bottom: 1.25rem;
        }

        .thumb-heading {
          font-family: 'Glegoo', serif;
          font-size: 1.15rem;
          font-weight: 600;
          color: #3e2c1c;
          margin-top: 3rem;
          margin-bottom: -40px;
        }

        .thumb-img {
          display: inline-block;
          width: 100%;
          max-width: 260px;
          margin: 2.25rem auto;
          border-radius: 8px;
          box-shadow: 0 7px 16px rgba(0, 0, 0, 0.18);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .thumb-img:hover {
          transform: scale(1.025);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.24);
        }

        @media (max-width: 768px) {

         .thumb-heading {
         margin-top: -50px;
         margin-bottom: 10px;
      }
          .sidebar-thumbnails {
            margin: 0 auto;
          }

        .thumb-img-stack {
        display: block;
        margin-top: 2rem;
        }

  .thumb-img {
      display: block;
   }
        }
      `}</style>
    </aside>
  );
}
