import React, { useEffect, useState } from "react";
import SiteNavMenu from "./siteNavMenu.jsx";
import "../styles/landing-header.css";

function LogoSlot() {
  return (
    <a href="/" className="k4-header-logo">
      <img src="/images/K4Logo-web.webp" alt="K4 Studios Home" className="k4-logo-img" />
    </a>
  );
}

export default function LandingHeader({ breadcrumb }) {
  const [animateStripes, setAnimateStripes] = useState(false);
  const [showWHLogo, setShowWHLogo] = useState(false);
  const [navReady, setNavReady] = useState(false);

  useEffect(() => {
    setNavReady(true);

    const stripeTimer = window.setTimeout(() => {
      setAnimateStripes(true);
    }, 500);
    const logoTimer = window.setTimeout(() => {
      setShowWHLogo(true);
    }, 875);

    return () => {
      window.clearTimeout(stripeTimer);
      window.clearTimeout(logoTimer);
    };
  }, []);

  return (
    <div
      role="banner"
      className={`landing-header${animateStripes ? " desktop-animate" : ""}`}
      style={{ position: "relative", zIndex: 100 }}
    >
      <div
        className="breadcrumb-text desktop-only breadcrumb-fade"
        style={{ animationDelay: ".5s" }}
        dangerouslySetInnerHTML={{ __html: breadcrumb }}
      />

      <LogoSlot />

      <div className="rhs">
        {navReady ? <SiteNavMenu /> : <div className="nav-hydration-placeholder" aria-hidden="true" />}
      </div>

      <a
        href="mailto:wayne@k4studios.com"
        className={`wh-logo-mobile${showWHLogo ? " fade-in" : ""}`}
        aria-label="Email Wayne Heim"
        rel="external"
        target="_blank"
      >
        <img src="/images/WH.png" alt="WH logo" />
      </a>
    </div>
  );
}
