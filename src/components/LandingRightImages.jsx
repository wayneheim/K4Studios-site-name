export default function LandingRightImages({ heading = "", images = [] }) {
  return (
    <aside className="sidebar-thumbnails" data-dynamic-sidebar>
      <div className="thumb-heading-wrapper">
        <h3 className="thumb-heading">{heading}</h3>
      </div>

      {images.map(({ href, src, srcS, srcM, srcL, alt, title }, index) => (
        <a href={href} key={href} data-sidebar-index={index} style={index > 0 ? { visibility: 'hidden' } : {}}>
          <img
            src={srcS || srcM || srcL || src}
            alt={alt}
            title={title}
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
          margin-bottom: -15px;
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

      {/* Vanilla JS for dynamic spacing - runs without React hydration */}
      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          function calcSidebarSpacing() {
            var textCol = document.querySelector('.text-column');
            var sidebar = document.querySelector('[data-dynamic-sidebar]');
            if (!textCol || !sidebar) return;
            
            var links = sidebar.querySelectorAll('a[data-sidebar-index]');
            if (links.length <= 1) return;
            
            var imgs = sidebar.querySelectorAll('.thumb-img');
            var allLoaded = Array.from(imgs).every(function(img) { return img.complete; });
            if (!allLoaded) {
              setTimeout(calcSidebarSpacing, 100);
              return;
            }
            
            var textHeight = textCol.offsetHeight;
            var totalImgHeight = Array.from(imgs).reduce(function(sum, img) { return sum + img.offsetHeight; }, 0);
            var headingArea = 80;
            var firstGap = 36;
            var bottomBuffer = 750;
            var available = textHeight - headingArea - firstGap - totalImgHeight - bottomBuffer;
            var numGaps = links.length - 1;
            
            if (available > 0 && numGaps > 0) {
              var gap = Math.max(available / numGaps, 36);
              links.forEach(function(link, i) {
                if (i > 0) {
                  link.style.display = 'block';
                  link.style.marginTop = gap + 'px';
                  link.style.visibility = 'visible';
                }
              });
            } else {
              links.forEach(function(link) { link.style.visibility = 'visible'; });
            }
          }
          
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() { setTimeout(calcSidebarSpacing, 150); });
          } else {
            setTimeout(calcSidebarSpacing, 150);
          }
          window.addEventListener('resize', calcSidebarSpacing);
        })();
      `}} />
    </aside>
  );
}
