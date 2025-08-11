import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clipboard } from "lucide-react";

export default function ShareDrawer({ imageUrl, pageTitle }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pageUrl, setPageUrl] = useState("");
  const [isClipboardHovered, setIsClipboardHovered] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPageUrl(window.location.href);
    }
  }, []);

  const notifyShare = async (platform) => {
    try {
      await fetch("/.netlify/functions/share-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, page: pageUrl, title: pageTitle }),
      });
    } catch (err) {
      console.error("Share notify error:", err);
    }
  };

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
    <div style={{ position: "relative", display: "inline-block", fontFamily: "'Glegoo', serif" }}>
      {/* Share Button */}
      <button
        data-share-btn // 👈 TOUR HOOK
        onClick={() => setIsOpen((o) => !o)}
        title="Share this page"
        style={{
          background: "#fff",
          color: "#7a7876ff",
          width: 150,
          height: 30,
          borderRadius: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 8px rgba(44,44,44,0.12)",
          border: "none",
          cursor: "pointer",
          fontSize: 14,
          fontWeight: "bold",
          zIndex: 10,
          position: "relative",
        }}
      >
        🔗 Share
      </button>

      {/* Drawer Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{
              position: "absolute",
              bottom: "0",
              left: "-135px",
              transform: "translateY( -100%)",
              zIndex: 1000,
              background: "#fff",
              border: "1.5px solid #85644b",
              borderRadius: "1rem",
              width: "90vw",
              maxWidth: 420,
              boxShadow: "0 8px 32px rgba(44,44,44,0.12), 0 1.5px 8px rgba(133,100,75,0.12)",
              padding: "1.25rem 1.5rem",
              textAlign: "center",
            }}
          >
            <p style={{ marginBottom: 14, color: "#2c2c2c", fontWeight: "bold" }}>Share!</p>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 28 }}>
              {/* Copy */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(pageUrl);
                  alert("Link copied!");
                  notifyShare("Copy");
                }}
                title="Copy link"
                onMouseEnter={() => setIsClipboardHovered(true)}
                onMouseLeave={() => setIsClipboardHovered(false)}
                style={{
                  background: "white",
                  border: "none",
                  color: "#635a53ff",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <Clipboard size={iconSize} color={isClipboardHovered ? `#${red}` : `#${gray}`} />
                <span style={{ fontSize: 13 }}>Copy</span>
              </button>

              {/* Twitter */}
              <a
                href={links.twitter}
                target="_blank"
                rel="noopener noreferrer"
                title="Twitter"
                onClick={() => notifyShare("Twitter")}
                style={{
                  color: "#635a53ff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  textDecoration: "none",
                }}
              >
                <img
                  src={`https://cdn.simpleicons.org/X/${gray}`}
                  alt="Twitter"
                  width={iconSize}
                  height={iconSize}
                  onMouseEnter={(e) => (e.currentTarget.src = `https://cdn.simpleicons.org/X/${red}`)}
                  onMouseLeave={(e) => (e.currentTarget.src = `https://cdn.simpleicons.org/X/${gray}`)}
                />
                <span style={{ fontSize: 13 }}>Twitter</span>
              </a>

              {/* Facebook */}
              <a
                href={links.facebook}
                target="_blank"
                rel="noopener noreferrer"
                title="Facebook"
                onClick={() => notifyShare("Facebook")}
                style={{
                  color: "#635a53ff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  textDecoration: "none",
                }}
              >
                <img
                  src={`https://cdn.simpleicons.org/facebook/${gray}`}
                  alt="Facebook"
                  width={iconSize}
                  height={iconSize}
                  onMouseEnter={(e) => (e.currentTarget.src = `https://cdn.simpleicons.org/facebook/${red}`)}
                  onMouseLeave={(e) => (e.currentTarget.src = `https://cdn.simpleicons.org/facebook/${gray}`)}
                />
                <span style={{ fontSize: 13 }}>Facebook</span>
              </a>

              {/* Pinterest */}
              <a
                href={links.pinterest}
                target="_blank"
                rel="noopener noreferrer"
                title="Pinterest"
                onClick={() => notifyShare("Pinterest")}
                style={{
                  color: "#635a53ff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  textDecoration: "none",
                }}
              >
                <img
                  src={`https://cdn.simpleicons.org/pinterest/${gray}`}
                  alt="Pinterest"
                  width={iconSize}
                  height={iconSize}
                  onMouseEnter={(e) => (e.currentTarget.src = `https://cdn.simpleicons.org/pinterest/${red}`)}
                  onMouseLeave={(e) => (e.currentTarget.src = `https://cdn.simpleicons.org/pinterest/${gray}`)}
                />
                <span style={{ fontSize: 13 }}>Pinterest</span>
              </a>

              {/* Email */}
              <a
                href={links.email}
                target="_blank"
                rel="noopener noreferrer"
                title="Email"
                onClick={() => notifyShare("Email")}
                style={{
                  color: "#635a53ff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  textDecoration: "none",
                }}
              >
                <img
                  src={`https://cdn.simpleicons.org/gmail/${gray}`}
                  alt="Email"
                  width={iconSize}
                  height={iconSize}
                  onMouseEnter={(e) => (e.currentTarget.src = `https://cdn.simpleicons.org/gmail/${red}`)}
                  onMouseLeave={(e) => (e.currentTarget.src = `https://cdn.simpleicons.org/gmail/${gray}`)}
                />
                <span style={{ fontSize: 13 }}>Email</span>
              </a>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "#eeeae5ff",
                border: "none",
                color: "#9b9590ff",
                borderRadius: "16px",
                padding: "0.25rem 1rem",
                marginTop: 18,
                fontFamily: "'Glegoo', serif",
                fontWeight: 500,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
