import { motion } from "framer-motion";

export default function MiniGalleryTopBar({ onClose, onMenu, whLogoSrc = "/images/WH.png" }) {
  return (
    <div
      className="fixed top-0 right-0 w-full flex items-center justify-between px-3 h-14 z-50"
      style={{
        background: 'rgba(255,255,255,0.93)',
        boxShadow: '0 1px 8px 0 rgba(0,0,0,0.04)'
      }}
    >
      {/* Animated X in a box */}
      <motion.button
        initial={{ scale: 0.4, y: -18, opacity: 0 }}
        animate={{
          scale: [0.4, 1.1, 0.95, 1],
          y: [-18, 2, -2, 0],
          opacity: [0, 1, 1, 1]
        }}
        transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
        className="w-9 h-9 rounded-lg border border-gray-400 flex items-center justify-center text-gray-700 bg-white hover:bg-red-100 hover:text-red-500 text-xl shadow"
        aria-label="Close gallery"
        onClick={onClose}
        style={{ fontWeight: 600 }}
      >
        &times;
      </motion.button>

      {/* Faded divider + WH logo + faded divider */}
      <div className="flex-1 flex items-center justify-center gap-3 select-none pointer-events-none">
        {/* Left faded rule */}
        <span style={{
          flex: 1,
          height: "2.5px",
          background: "linear-gradient(to right, #7a6a58bb, #7a6a5800)",
          borderRadius: "2px",
          maxWidth: "90px"
        }} />
      {/* WH Logo */}
<img
  src="/images/WH.png"
  alt="WH logo"
  draggable={false}
  style={{
    height: "34px",
    width: "34px",
    borderRadius: "5px",
    filter: "drop-shadow(0 2px 8px #2223)",
    opacity: 0.92,
    background: "#fff",
    objectFit: "contain",
    display: "block"
  }}
        />
        {/* Right faded rule */}
        <span style={{
          flex: 1,
          height: "2.5px",
          background: "linear-gradient(to left, #7a6a58bb, #7a6a5800)",
          borderRadius: "2px",
          maxWidth: "90px"
        }} />
      </div>

      {/* Animated Circle Hamburger */}
      <motion.button
        initial={{ x: 38, scale: 0.4, opacity: 0, rotate: 30 }}
        animate={{ x: 0, scale: [0.4, 1.15, 0.95, 1], opacity: 1, rotate: [30, -5, 3, 0] }}
        transition={{ type: "spring", stiffness: 350, damping: 15, delay: 0.2 }}
        className="w-9 h-9 rounded-full border border-gray-400 flex items-center justify-center text-gray-700 bg-white hover:bg-yellow-50 shadow"
        aria-label="Open menu"
        onClick={onMenu}
      >
        {/* Hamburger SVG */}
        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="5" y1="8" x2="17" y2="8" />
          <line x1="5" y1="12" x2="17" y2="12" />
          <line x1="5" y1="16" x2="17" y2="16" />
        </svg>
      </motion.button>
    </div>
  );
}
