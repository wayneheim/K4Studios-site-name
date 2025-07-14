import { useState } from "react";
import MobileMiniDrawer from "./MobileMiniDrawer.jsx";

export default function FloatingMiniDrawer() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* ☰ Menu button */}
      <button
        className="fixed top-3 left-3 z-[9998] px-3 py-1 bg-white border shadow rounded"
        aria-label="Open Menu"
        title="Open Menu"
        onClick={() => setIsOpen(true)}
      >
        ☰
      </button>

      {/* Drawer container, always shows mobile menu layout */}
      {isOpen && (
        <div
          className="fixed top-0 right-0 h-full z-[9999] bg-white w-[90vw] max-w-md overflow-y-auto shadow-xl force-static-mini"
        >
          <MobileMiniDrawer onClose={() => setIsOpen(false)} />
        </div>
      )}
    </>
  );
}
