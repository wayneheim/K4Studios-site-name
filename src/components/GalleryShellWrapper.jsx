import { useState, useEffect } from 'react';
import MobileMiniDrawer from './MobileMiniDrawer.jsx';

export default function GalleryShellWrapper() {
  const [showMiniMenu, setShowMiniMenu] = useState(false);
  const [inGalleryMode, setInGalleryMode] = useState(false);

  // Monitor for .gallery-entered class on <body>
  useEffect(() => {
    const updateState = () => {
      setInGalleryMode(document.body.classList.contains('gallery-entered'));
    };

    updateState(); // Run on mount

    const observer = new MutationObserver(updateState);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Button only shows after entering gallery */}
      {inGalleryMode && (
        <button
          className="mini-menu-trigger"
          onClick={() => setShowMiniMenu(true)}
          style={{
            position: 'fixed',
            top: '1rem',
            left: '1rem',
            zIndex: 10000,
            padding: '0.5rem 1rem',
            background: '#333',
            color: '#fff',
            borderRadius: '5px',
          }}
        >
          ☰ Menu
        </button>
      )}

      {/* Drawer opens only if toggled */}
      {showMiniMenu && (
        <div
          className="fixed top-0 right-0 h-full z-[9999] bg-white overflow-y-auto shadow-xl transition-all duration-300 force-static-mini"
          style={{ width: '100%', maxWidth: '90vw' }}
        >
          <MobileMiniDrawer onClose={() => setShowMiniMenu(false)} />
        </div>
      )}
    </>
  );
}
