// GallerySwitchButton.jsx
import React from "react";
import { useLocation } from "react-router-dom"; // or use Astro's route if in Astro

export default function GallerySwitchButton({ currentHref }) {
  // Use simple logic if you're passing currentHref in directly

  const isColor = currentHref.includes("/Color");
  const isBW = currentHref.includes("/Black-White");

  let switchHref = null;
  let switchLabel = null;

  if (isColor) {
    switchHref = currentHref.replace("/Color", "/Black-White");
    switchLabel = "B";
  } else if (isBW) {
    switchHref = currentHref.replace("/Black-White", "/Color");
    switchLabel = "C";
  }

  if (!switchHref) return null;

  return (
    <a
      href={switchHref}
      className="circle-button"
      title={`Jump to ${switchLabel === "B" ? "Black & White" : "Color"} gallery`}
    >
      {switchLabel}
    </a>
  );
}
