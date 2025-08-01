import React, { useEffect, useState } from "react";
import SiteNavMenu from "./siteNavMenu.jsx";

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

function K4Splash({ isMobile }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const hideTime = isMobile ? 1100 : 1100;
    const timer = setTimeout(() => setVisible(false), hideTime);
    return () => clearTimeout(timer);
  }, [isMobile]);
  return (
    <div className={`k4splash${visible ? "" : " k4splash-out"}`} aria-hidden={!visible}>
      K4 Studios
      <style jsx>{`
        .k4splash {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 100%;
          text-align: center;
          transform: translate(-50%, -50%);
          font-family: "Glegoo", serif;
          font-weight: 700;
          font-size: 3.0rem;
          letter-spacing: -0.04em;
          color: #5f574bff;
          opacity: 1;
          z-index: 14;
          pointer-events: none;
          transition: opacity 0.8s cubic-bezier(.44, 0, .53, 1);
        }
        .k4splash-out {
          opacity: 0;
        }
      `}</style>
    </div>
  );
}

function LogoSlot({ isMobile, triggerStripe }) {
  const [logoIn, setLogoIn] = useState(isMobile);
  useEffect(() => {
    if (!isMobile) {
      const timer = setTimeout(() => {
        setLogoIn(true);
        triggerStripe();
      }, 1300);
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
    const timer = setTimeout(() => setShow(true), 1325);
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

  return (
    <header
      className={`landing-header ${isMobile ? "mobile-animate" : ""} ${
        animateStripes ? "desktop-animate" : ""
      }`}
      style={{ position: "relative", zIndex: 100 }}
    >
      <div className="breadcrumb-text desktop-only breadcrumb-fade" style={{ animationDelay: "1.2s" }}>
        {breadcrumb}
      </div>

      <K4Splash isMobile={isMobile} />
      <LogoSlot isMobile={isMobile} triggerStripe={() => setAnimateStripes(true)} />
      {isMobile || typeof window === "undefined" ? (
        <div className="rhs">
          <SiteNavMenu />
        </div>
      ) : (
        <DelayedRH />
      )}

      <a href="mailto:wayne@k4studios.com" className="wh-logo-mobile" aria-label="Email Wayne Heim">
        <img src="/images/WH.png" alt="WH logo" />
      </a>

      {/* NEW: Animated dark bars */}
      <div className="header-border-top" />
      <div className="header-border-bottom" />

      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Glegoo&display=swap");

        :root {
          --dark-brown: rgb(122, 102, 94);
          --stripe-color: rgb(180, 168, 162);
        }

        @keyframes slideLeftToCenter {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 0.4;
          }
        }

        @keyframes slideRightToCenter {
          0% {
            transform: translateX(100%);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 0.4;
          }
        }

        @keyframes fadeOpacityUp {
          0% {
            opacity: 0.4;
          }
          100% {
            opacity: 0.8;
          }
        }

        @keyframes growBarsOutward {
          0% {
            width: 0%;
            opacity: 0;
          }
          100% {
            width: 100%;
            opacity: 1;
          }
        }

        .landing-header {
          margin-top: 1rem;
          font-family: "Glegoo", serif;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 0.75rem;
          height: 60px;
          background: #fff;
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
          opacity: 0;
          transform: translateX(0);
          z-index: 0;
        }

        .landing-header.desktop-animate::before {
          animation: slideLeftToCenter 0.55s ease-out 0.135s forwards,
            fadeOpacityUp 0.4s ease-in 2.15s forwards;
        }

        .landing-header.desktop-animate::after {
          animation: slideRightToCenter 0.55s ease-out 0.135s forwards,
            fadeOpacityUp 0.4s ease-in 2.15s forwards;
        }

        .landing-header::before {
          left: 0;
          right: 50%;
          margin-right: -20px;
          mask-image: linear-gradient(to right, transparent 40%, #000 85%, #000 100%);
        }

        .landing-header::after {
          left: 50%;
          right: 0;
          margin-left: -20px;
          mask-image: linear-gradient(to left, transparent 10%, transparent 40%, #000 85%, #000 100%);
        }

        .header-border-top,
        .header-border-bottom {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          height: 3px;
          background-color: var(--dark-brown);
          z-index: 0;
          opacity: 0;
          width: 0%;
          animation: growBarsOutward 0.5s ease-out 1.75s forwards;
        }

        @keyframes barGrowOut {
  0% {
    transform: scaleX(0);
    opacity: 0.24;
  }
  80% {
    transform: scaleX(1);
    opacity: 0.24;
  }
  100% {
    transform: scaleX(1);
    opacity: 1;
  }
}


        .header-border-top {
          top: 0;
        }

        .header-border-bottom {
          bottom: 0;
        }

        .homepage .breadcrumb-fade {
          animation-delay: 1.2s !important;
        }

        .breadcrumb-text {
          font-size: 1.015rem;
          color: #2c2c2c;
          white-space: nowrap;
          z-index: 3;
        }

        .logo-slot {
          position: absolute;
          left: 50%;
          transform: translateX(-50%) scale(0.75);
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
          opacity: 0;
          transition: transform 0.75s cubic-bezier(0.44, 0, 0.53, 1), opacity 0.56s cubic-bezier(0.44, 0, 0.53, 1);
        }

        .logo-slot.logo-in {
          transform: translateX(-50%) scale(1);
          opacity: 1;
        }

        .logo-img {
          height: 100%;
          object-fit: contain;
          filter: grayscale(100%);
          opacity: 0.9;
          transition: filter 0.3s, opacity 0.3s;
        }

        .logo-slot:hover {
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4), 0 0 12px rgba(160, 82, 45, 0.6);
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
          opacity: 0.2;
          z-index: 10;
          display: none;
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
      `}</style>
    </header>
  );
}
