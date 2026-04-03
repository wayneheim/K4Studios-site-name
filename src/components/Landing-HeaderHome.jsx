import React, { useEffect, useState } from "react";
import SiteNavMenu from "./siteNavMenu.jsx";
import "../styles/landing-header-home.css";

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
  <img src="/images/K4Logo-web.webp" alt="K4 Studios Home" className="logo-img" />
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
  const [showWHLogo, setShowWHLogo] = useState(false);

  useEffect(() => {
    if (isMobile) {
      const timer = setTimeout(() => setShowWHLogo(true), 420); // Delay fade-in
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

      <div className="header-border-top" />
      <div className="header-border-bottom" />
    </header>
  );
}
