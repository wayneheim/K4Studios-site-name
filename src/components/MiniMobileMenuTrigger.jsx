// components/MiniMobileMenuTrigger.jsx
import React, { useState } from "react";
import MobileMiniDrawer from "./MobileMiniDrawer.jsx";
import useForceMobileMenu from "./hooks/useForceMobileMenu.js";

export default function MiniMobileMenuTrigger() {
  const [showDrawer, setShowDrawer] = useState(false);

  // Optional: Activate mobile mode class (sets body class, for example)
  useForceMobileMenu(showDrawer);

  return (
    <>
      <button
        className="px-2 py-0.0 border border-gray-100 bg-white text-gray-200 text-sm rounded shadow-sm min-w-[36px] transition-colors duration-150 hover:text-gray-400 focus:text-gray-400 hover:border-gray-500 focus:border-gray-500"
        aria-label="Show Menu"
        title="Show Menu"
        onClick={() => setShowDrawer(true)}
      >
        <span className="font-bold text-sm">Menu</span>
      </button>

      {showDrawer && (
        <MobileMiniDrawer onClose={() => setShowDrawer(false)} />
      )}
    </>
  );
}


  
