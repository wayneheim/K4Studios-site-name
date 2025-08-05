import React, { useEffect, useState } from "react";
import SiteNavMenu from "./siteNavMenu.jsx"; // adjust path if needed

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

function LogoSlot({ isMobile, triggerStripe }) {
  const [logoIn, setLogoIn] = useState(isMobile);
  useEffect(() => {
    if (!isMobile) {
      const timer = setTimeout(() => {
        setLogoIn(true);
        triggerStripe();
      }, 500); // ⏱️ Synced to breadcrumb fade-in
      return () => clearTimeout(timer);
    } else {
      setLogoIn(true);
    }
  }, [isMobile, triggerStripe]);
  return (
    <a href="/" className={`logo-slot${logoIn ? " logo-in" : ""}`}>
      <img src="/images/K4Logo-web.jpg" alt="K4 Studios Home" className="logo-img" />
    </a>
  );
}

function DelayedRH() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 500); // ⏱️ Synced to breadcrumb fade-in
    return () => clearTimeout(timer);
  }, []);
  return show ? (
    <div className="rhs">
      <SiteNavMenu />
    </div>
  ) : (
    <div className="rhs" style={{ width: 220 }} />
  );
}

export default function LandingHeader({ breadcrumb }) {
  const isMobile = useIsMobile();
  const [animateStripes, setAnimateStripes] = useState(false);
  const [showWHLogo, setShowWHLogo] = useState(false);

  useEffect(() => {
    if (isMobile) {
      const timer = setTimeout(() => setShowWHLogo(true), 875); // WH logo fade timing unchanged
      return () => clearTimeout(timer);
    } else {
      setShowWHLogo(false);
    }
  }, [isMobile]);

  return (
    <header
      className={`landing-header ${isMobile ? "mobile-animate" : ""} ${
        animateStripes ? "desktop-animate" : ""
      }`}
      style={{ position: "relative", zIndex: 100 }}
    >
      <div
  className="breadcrumb-text desktop-only breadcrumb-fade"
  style={{ animationDelay: ".5s" }}
  dangerouslySetInnerHTML={{ __html: breadcrumb }}
/>


      <LogoSlot isMobile={isMobile} triggerStripe={() => setAnimateStripes(true)} />
      {isMobile || typeof window === "undefined" ? (
        <div className="rhs">
          <SiteNavMenu />
        </div>
      ) : (
        <DelayedRH />
      )}

      {isMobile && (
  <a
    href="mailto:wayne@k4studios.com"
    className={`wh-logo-mobile${showWHLogo ? " fade-in" : ""}`}
    aria-label="Email Wayne Heim"
    rel="external"
    target="_blank"
  >
    <img src="/images/WH.png" alt="WH logo" />
  </a>
)}

      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Glegoo&display=swap");

        :root {
          --dark-brown: rgb(122, 102, 94);
          --stripe-color: rgb(180, 168, 162);
        }

        @keyframes stripeInLeft {
          from { transform: translateX(-200%); }
          to { transform: translateX(0); }
        }

        @keyframes stripeInRight {
          from { transform: translateX(200%); }
          to { transform: translateX(0); }
        }

        .landing-header {
          margin-bottom: 1.25rem;
          margin-top: 1rem;
          font-family: "Glegoo", serif;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 0.75rem;
          height: 60px;
          background: #fff;
          border-top: 3px solid var(--dark-brown);
          border-bottom: 3px solid var(--dark-brown);
          z-index: 100;
        }

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
          z-index: 0;
          opacity: 1;
          transform: translateX(0);
          pointer-events: none;
        }

        .landing-header::before {
          left: 0;
          right: 50%;
          margin-right: -20px;
          transform: translateX(-100%);
          mask-image: linear-gradient(to right, transparent 40%, #000 85%, #000 100%);
        }

        .landing-header::after {
          left: 50%;
          right: 0;
          margin-left: -20px;
          transform: translateX(100%);
          mask-image: linear-gradient(to left, transparent 10%, transparent 40%, #000 85%, #000 100%);
        }

        .desktop-animate::before {
          animation: stripeInLeft 0.6s ease-out forwards;
        }

        .desktop-animate::after {
          animation: stripeInRight 0.6s ease-out forwards;
        }

        .breadcrumb-text {
          font-size: 1.1rem;
          color: #2c2c2c;
          white-space: nowrap;
          z-index: 3;
        }

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

        .rhs {
          display: flex;
          align-items: center;
          z-index: 3;
        }

        @media (max-width: 1024px) {
          .desktop-only {
            display: none;
          }
          .landing-header::before,
          .landing-header::after {
            transform: scaleX(0.76);
            transform-origin: center;
            opacity: 0.25;
            animation: none !important;
          }
        }

        body.mobile-open .logo-slot {
          margin-top: 30px;
          margin-left: -8px;
          z-index: 1 !important;
          position: relative;
        }

        .wh-logo-mobile {
          position: absolute;
          right: 1.25rem;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0;
          transition: opacity 0.5s ease;
          z-index: 10;
          align-items: center;
          justify-content: center;
        }

        .wh-logo-mobile.fade-in {
          opacity: 0.2;
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
      `}</style>
    </header>
  );
}
