import React, { useEffect, useState } from "react";
import SiteNavMenu from "./GalleryNavMenu-mini.jsx";

/* — simple hook only for the stripe-load animation — */
function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

export default function GalleryLandingHeader({ breadcrumb }) {
  return (
    <header
      className={`landing-header ${useIsMobile() ? "mobile-animate" : ""}`}
      style={{ position: "relative", zIndex: 100 }}
    >
      {/* ── Breadcrumb on the stripe bar ── */}
      <div className="breadcrumb-overlay desktop-only">{breadcrumb}</div>

      {/* Center badge */}
      <a href="/" className="logo-slot">
        <img
          src="/Public/images/K4Logo-web.jpg"
          alt="K4 Studios Logo"
          className="logo-img"
        />
      </a>

      {/* Mobile-style hamburger / drawer (now used at all widths) */}
      <div className="rhs">
        <SiteNavMenu />
      </div>

      {/* WH logo on the right - now always visible */}
      <a
        href="mailto:wayne@k4studios.com"
        className="wh-logo-mobile"
        aria-label="Email Wayne Heim"
      >
        <img
          src="/images/WH.png"
          alt="Contact"
          style={{ filter: "invert(100%)" }}
        />
      </a>

      {/* — styles that belong only to LandingHeader — */}
      <style jsx>{`


.k4-watermark {
border: none!important;

}

      /* ─── Mobile entrance animation for the stripes ─── */
@keyframes slideFromLeft  { from { transform: translateX(-100%); } to { transform: translateX(0); } }
@keyframes slideFromRight { from { transform: translateX(100%);  } to { transform: translateX(0); } }

@media (max-width: 768px) {
  /* only run once per page-load */
  .mobile-animate::before,
  .mobile-animate::after {
    animation-duration: .7s;
    animation-timing-function: cubic-bezier(.33,1,.68,1);
    animation-fill-mode: forwards;
  }
  .mobile-animate::before {             /* top stripe → from left */
    transform: translateX(-100%);
    animation-name: slideFromLeft;
  }
  .mobile-animate::after {              /* bottom stripe → from right */
    transform: translateX(100%);
    animation-name: slideFromRight;
  }
}


      
        @import url("https://fonts.googleapis.com/css2?family=Glegoo&display=swap");

        :root {
          --dark-brown: rgb(122, 102, 94);
          --stripe-color: rgb(180, 168, 162);
        }




        
        .landing-header { /*button bar*/
          margin-top: 1rem;
          font-family: "Glegoo", serif;
          font-size: 1.15rem;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 0.75rem;
          line-height: .8; 
      border-radius: 25px;
          letter-spacing: -0.02em;  
          padding-left: 3.5rem;
          height: 40px;
            color: white;
            background: rgb(73, 62, 58);
          border-top: 3px solid var(--dark-brown);
          border-bottom: 3px solid var(--dark-brown);
          z-index: 100;
        }

        /* stripe background behind logo */
        .landing-header::before,
        .landing-header::after {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          background-image: repeating-linear-gradient(
            to bottom,
            var(--stripe-color) 0 2px,
            transparent 2px 6px
          );
          opacity: 0.8;
          z-index: 0;
        }
        .landing-header::before {
          left: 0;
          right: 50%;
          margin-right: -30px;
          mask-image: linear-gradient(
            to right,
            transparent 40%,
            #000 85%,
            #000 100%
          );
        }
        .landing-header::after {
          left: 50%;
          right: 0;
          margin-left: -30px;
          mask-image: linear-gradient(
            to left,
            transparent 10%,
            transparent 40%,
            #000 85%,
            #000 100%
          );
        }

        /* breadcrumb */
        .breadcrumb-text {
        top: 5.3rem;
          font-size: 1.15rem;
          color:rgb(233, 233, 233);
          white-space: nowrap;
          z-index: 300;
        }

        /* logo badge */
        .logo-slot {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          top: -17px;
          width: 55px;
          height: 55px;
          background: #000;
          border: 5px solid #fff;
          box-shadow: 0 6px 8px rgba(0, 0, 0, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
        }
        .logo-img {
          height: 100%;
          object-fit: contain;
          filter: grayscale(100%);
          opacity: 0.9;
          transition: filter 0.3s, opacity 0.3s;
        }
        .logo-slot:hover {
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4),
            0 0 12px rgba(160, 82, 45, 0.6);
        }
        .logo-slot:hover .logo-img {
          filter: grayscale(20%);
          opacity: 1;
        }

        /* Right-hand side wrapper so nav stays right-aligned */
        .rhs {
          display: flex;
          align-items: center;
          z-index: 3; /* above stripes */
        }

        /* Hide breadcrumb & stripes tweak on tablet/mobile */
        @media (max-width: 10024px) {
        
          .desktop-only {
            display: none;
          }
          .landing-header::before,
          .landing-header::after {
            transform: scaleX(0.76);
            transform-origin: center;
            opacity: 0.25;
          }
        }

        body.mobile-open .logo-slot {
        margin-top: 30px;
        margin-left: -8px;
      
  z-index: 1 !important;  /* lower than drawer z-index 2001 */
  position: relative;
}

.wh-logo-mobile {
  position: absolute;
  right: 4.25%;
  top: 50%;
  width: 50%;
  transform: translateY(-30%);
  opacity: 0.2;
  z-index: 10;
  display: none; /* Default hidden (desktop) */
  align-items: center;
  justify-content: center;
}

.wh-logo-mobile img {
  height: 15px;
  width: auto;
  filter: grayscale(100%);
  transition: opacity 0.3s ease;
}

.wh-logo-mobile:hover {
  opacity: 0.45;
}

@media (max-width: 1024px) {
  .wh-logo-mobile {
    display: inline-flex;
  }
}

  .hamburger-circle {
     border: 2px solid rgb(190, 177, 172);
     }

      .hamburger-circle .bar {
          background:  rgb(190, 177, 172);
        }

            /* Hide the desktop bar forever */
        .nav-bar:not(.open) {
          display: none !important;
        }

      `}</style>
    </header>
  );
}
