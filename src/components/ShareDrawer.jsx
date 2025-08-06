import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clipboard } from "lucide-react";

export default function ShareDrawer({ imageUrl, pageTitle }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPageUrl(window.location.href);
    }
  }, []);

  const finalTitle = pageTitle || "Check this out from K4 Studios";
  const encodedTitle = encodeURIComponent(finalTitle);
  const encodedUrl = encodeURIComponent(pageUrl);
  const shareText = encodeURIComponent(`${finalTitle}\n\n${pageUrl}`);
  const links = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}%20${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodeURIComponent(imageUrl || "")}&description=${encodedTitle}`,
    email: `mailto:?subject=${encodedTitle}&body=${shareText}`,
  };

  const iconSize = 20;
  const gray = "444444";
  const red = "8B0000";

  return (
    <div
      className="relative inline-block text-center font-serif w-max"
      style={{ fontFamily: "'Glegoo', serif" }}
    >
      {/* Icon-only pill button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Share this page"
        className="bg-[#85644b] text-white w-10 h-10 rounded-full flex items-center justify-center shadow-md hover:bg-[#a07556] transition-all"
      >
        🔗
      </button>

      {/* Slide-up panel */}
      <AnimatePresence>
        {isOpen && pageUrl && (
          <motion.div
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-[#fffbe6] border border-[#85644b] rounded-xl px-6 py-4 text-sm w-[90vw] max-w-md shadow-lg z-50"
            style={{ fontFamily: "'Glegoo', serif" }}
           initial={{ opacity: 0, y: 10, x: -160 }}
            animate={{ opacity: 1, y: -10 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <p className="mb-3 text-[#2c2c2c] font-bold">Share your find:</p>
            <div className="flex justify-center items-center gap-6">
              {/* Copy Link */}
              <button
  onClick={() => {
    navigator.clipboard.writeText(pageUrl);
    alert("Link copied!");
  }}
  title="Copy link"
  className="group flex flex-col items-center gap-1 text-[#85644b] transition-colors"
>
  {/* Icon will inherit text color and transition on group-hover */}
  <Clipboard
    size={iconSize}
    className="transition-colors group-hover:text-[#8B0000]"
  />
  {/* Optional: make the label match the icon on hover */}
  <span className="text-xs transition-colors group-hover:text-[#8B0000]">
    Copy
  </span>
</button>


              {/* Twitter */}
              <a
                href={links.twitter}
                target="_blank"
                rel="noopener noreferrer"
                title="Twitter"
                className="flex flex-col items-center gap-1"
              >
                <img
                  src={`https://cdn.simpleicons.org/X/${gray}`}
                  alt="Twitter"
                  width={iconSize}
                  height={iconSize}
                  className="social-icon"
                  onMouseEnter={e => (e.currentTarget.src = `https://cdn.simpleicons.org/X/${red}`)}
                  onMouseLeave={e => (e.currentTarget.src = `https://cdn.simpleicons.org/X/${gray}`)}
                />
                <span className="text-xs">Twitter</span>
              </a>

              {/* Facebook */}
              <a
                href={links.facebook}
                target="_blank"
                rel="noopener noreferrer"
                title="Facebook"
                className="flex flex-col items-center gap-1"
              >
                <img
                  src={`https://cdn.simpleicons.org/facebook/${gray}`}
                  alt="Facebook"
                  width={iconSize}
                  height={iconSize}
                  className="social-icon"
                  onMouseEnter={e => (e.currentTarget.src = `https://cdn.simpleicons.org/facebook/${red}`)}
                  onMouseLeave={e => (e.currentTarget.src = `https://cdn.simpleicons.org/facebook/${gray}`)}
                />
                <span className="text-xs">Facebook</span>
              </a>

              {/* Pinterest */}
              <a
                href={links.pinterest}
                target="_blank"
                rel="noopener noreferrer"
                title="Pinterest"
                className="flex flex-col items-center gap-1"
              >
                <img
                  src={`https://cdn.simpleicons.org/pinterest/${gray}`}
                  alt="Pinterest"
                  width={iconSize}
                  height={iconSize}
                  className="social-icon"
                  onMouseEnter={e => (e.currentTarget.src = `https://cdn.simpleicons.org/pinterest/${red}`)}
                  onMouseLeave={e => (e.currentTarget.src = `https://cdn.simpleicons.org/pinterest/${gray}`)}
                />
                <span className="text-xs">Pinterest</span>
              </a>

              {/* Email */}
              <a
                href={links.email}
                target="_blank"
                rel="noopener noreferrer"
                title="Email"
                className="flex flex-col items-center gap-1"
              >
                <img
                  src={`https://cdn.simpleicons.org/gmail/${gray}`}
                  alt="Email"
                  width={iconSize}
                  height={iconSize}
                  className="social-icon"
                  onMouseEnter={e => (e.currentTarget.src = `https://cdn.simpleicons.org/gmail/${red}`)}
                  onMouseLeave={e => (e.currentTarget.src = `https://cdn.simpleicons.org/gmail/${gray}`)}
                />
                <span className="text-xs">Email</span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
