import React, { useEffect, useState } from "react";
import SiteNavMenu from "./siteNavMenu.jsx";
import GalleryToggleButton from "./GalleryToggleButton.jsx";

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pathname, setPathname] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPathname(window.location.pathname);
    }
  }, []);

  return (
    <header
      className={`landing-header ${useIsMobile() ? "mobile-animate" : ""}`}
      style={{ position: "relative", zIndex: 100 }}
    >
      {/* ── BREADCRUMB ON STRIPE BAR ── */}
      <div className="breadcrumb-toggle-wrapper desktop-only">
        <div className="breadcrumb-overlay">{breadcrumb}</div>
        {/* Safe to show toggle if pathname exists */}
        {pathname && <GalleryToggleButton currentPath={pathname} />}
      </div>

      <a href="/" className="logo-slot">
        <img
          src="/images/K4Logo-web.jpg"
          alt="K4 Studios Logo"
          className="logo-img"
        />
      </a>

      <div className="rhs">
        <SiteNavMenu mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      </div>

      <a
        href="mailto:wayne@k4studios.com"
        className="wh-logo-mobile"
        aria-label="Email Wayne Heim"
      >
        <img src="/images/WH.png" alt="Contact" style={{ filter: "invert(100%)" }} />
      </a>

      {/* MOBILE BREADCRUMB */}
      <div className="mobile-breadcrumb-wrapper mobile-only">
        <div
          className="mobile-breadcrumb"
          style={{
            color: "#c2c2c2",
            marginTop: "105px",
            fontWeight: 600,
            fontSize: ".85rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.125rem",
            textAlign: "center"
          }}
        >
          <span>{breadcrumb}</span>
          {pathname && <GalleryToggleButton currentPath={pathname} />}
        </div>
      </div>

      {/* — styles that belong only to LandingHeader — */}
      <style jsx>{`
.breadcrumb-toggle-wrapper {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding-right: 0.5rem;
  margin-top: 2px;
  font-size: 1.1rem;
}
.gallery-toggle-button {
  display: flex;
  gap: 0.5rem;
}
.gallery-toggle-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 50%;
  font-size: 0.85rem;
  font-weight: 600;
  color: #f0f0f0;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: transparent;
  cursor: pointer;
  transition: all 0.25s ease;
}
.gallery-toggle-pill:hover {
  transform: scale(1.05);
  background-color: rgba(255, 255, 255, 0.1);
}
.gallery-toggle-pill.active {
  background-color: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}
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
        .landing-header {
          margin-top: 1rem;
          font-family: "Glegoo", serif;
          font-size: 1.15rem;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 0.75rem;
          line-height: 1.4; 
          letter-spacing: -0.02em;  
          padding-left: 1.25rem;  /* Hamburger location adjustment */
          height: 60px;
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
          width: 85px;
          height: 85px;
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
        @media (max-width: 1024px) {
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
  transform: translateY(-50%);
  opacity: 0.2;
  z-index: 10;
  display: none; /* Default hidden (desktop) */
  align-items: center;
  justify-content: center;
}
.wh-logo-mobile img {
  height: 25px;
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
      `}</style>
    </header>
  );
}
