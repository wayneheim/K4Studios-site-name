import { useEffect, useLayoutEffect, useRef, useState } from "react";

export default function ZoomOverlay({ onClose, imageData, matColor, setMatColor }) {
  const [isMobile, setIsMobile] = useState(false);
  const [maxImageHeight, setMaxImageHeight] = useState(() => Math.round(window.innerHeight * 0.8));
  const frameRef = useRef(null); // outer frame (contains image + credit)
  const bottomRef = useRef(null); // bottom controls + text

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 600);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Lock scroll + reset mat color on open
  useEffect(() => {
    setMatColor("no-wood");
    document.body.classList.add("zoom-open");
    return () => document.body.classList.remove("zoom-open");
  }, []);

  if (!imageData) return null;

  // Recompute available image height so full UI fits (or shrinks image first) on resize / mat change
  useLayoutEffect(() => {
    const compute = () => {
      const vh = window.innerHeight;
      const bottomH = bottomRef.current ? bottomRef.current.offsetHeight : 0;
      // Estimate vertical extras: frame padding + margins above/below, top spacing
      const topExtras = 40; // tweakable cushion
      let available = vh - bottomH - topExtras;
      // If available is large, cap to 90% vh so bottom still feels anchored
      const upperCap = Math.round(vh * 0.9);
      available = Math.min(available, upperCap);
      // Minimum image height so it never disappears
      available = Math.max(available, 140);
      setMaxImageHeight(available);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [matColor]);

  // Styles
  const frame = {
    background:
      matColor === "white"
        ? "#ffffff"
        : matColor === "white2"
        ? "#9e9d9d"
        : matColor === "white3"
        ? "#000000"
        : matColor === "wood"
        ? "url('/images/materials/Maple-w.jpg') center / cover no-repeat"
        : matColor === "no-wood"
        ? "url('/images/materials/White-w.jpg') center / cover no-repeat"
        : matColor === "gray"
        ? "#888888"
        : matColor === "black"
        ? "#000000"
        : "transparent",

    border:
      matColor === "white"
        ? "0vw solid white"
        : matColor === "white2"
        ? "0vw solid white"
        : matColor === "white3"
        ? "0vw solid white"
        : matColor === "wood"
        ? "0vw solid #ffffff"
        : "0vw solid transparent",

    // Responsive padding: smaller on mobile
    // Make top padding visually consistent with side padding so mat thickness feels uniform
    paddingTop:
      ["white", "white2", "white3", "wood", "no-wood"].includes(matColor)
        ? isMobile ? "1.95rem" : "calc(1.5rem + 20px)"
        : isMobile ? "1.95rem" : "1.5rem",
    paddingBottom: isMobile ? ".5rem" : "1.5rem",
    paddingLeft:
      ["white", "white2", "white3", "wood", "no-wood"].includes(matColor)
        ? isMobile ? "1.95rem" : "calc(1.5rem + 20px)"
        : isMobile ? "1.95rem" : "1.5rem",
    paddingRight:
      ["white", "white2", "white3", "wood", "no-wood"].includes(matColor)
        ? isMobile ? "1.95rem" : "calc(1.5rem + 20px)"
        : isMobile ? "1.95rem" : "1.5rem",

    boxShadow:
      ["white", "white2", "white3", "gray", "black", "wood"].includes(matColor)
        ? "0 8px 20px rgba(0,0,0,.2)"
        : "none",

    outline:
      ["white", "white2", "white3", "gray", "black", "wood"].includes(matColor)
        ? "1px solid #ccc"
        : "none",

    transition: "background .25s ease, padding .25s ease",
    display: "inline-block",
    marginTop: 10, // breathing room for top edge/shadow
  };

  const cutEdge = {
    padding: 6,
    background:
      matColor === "wood"
        ? "transparent"
        : ["white", "white2", "white3", "gray", "black"].includes(matColor)
        ? "linear-gradient(-40deg,#ffffff,#8d8d8d)"
        : ["no-wood"].includes(matColor)
        ? "rgba(255,255,255,0.25)"
        : "transparent",

    boxShadow:
      matColor === "wood"
        ? "none"
        : ["white", "white2", "white3", "gray", "black"].includes(matColor)
        ? "inset -1px 1px 1px rgba(255,255,255,.6), inset 6px 10px 14px rgba(0,0,0,0)"
        : ["no-wood"].includes(matColor)
        ? "inset -1px 1px 1px rgba(255,255,255,0.25), inset 8px 12px 16px rgba(0,0,0,0)"
        : "none",

    border: "1px solid transparent",
    transition: "box-shadow .25s ease, background .25s ease",
  };

  const context =
    matColor === "no-wood"
      ? "Click the color icons above to preview different finishing/display options. All images are available for order on a selection of Fine Papers. Aluminum & Acrylic Face Mounting available through custom order. Contact us for details."
      : ["wood", "no-wood"].includes(matColor)
      ? "For an unforgetable presentation, order a custom 5-layer UV printed Maple / Baltic-Birch Wood Print"
      : "Additional Finishing/Display Suggestions for your prints. *Matting not included.";

  const creditColorMap = {
    white: { color: '#888888ff', opacity: 0.55 },
    white2: { color: '#505050ff', opacity: 0.55 },
    white3: { color: '#b1b1b1ff', opacity: 0.62 },
    gray: { color: '#f4f4f4', opacity: 0.60 },
    black: { color: '#f0f0f0', opacity: 0.62 },
    wood: { color: '#4d3c2dff', opacity: 0.55 },
    'no-wood': { color: '#888888ff', opacity: 0.50 },
  };
  const creditStyle = creditColorMap[matColor] || { color: '#2c2c2c', opacity: 0.5 };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-white overflow-y-auto"
      style={{ all: "initial", display: "block" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: "100%",
          padding: isMobile ? "0 0.3rem" : "0 1rem",
          boxSizing: "border-box",
          display: "flex",
          justifyContent: "center",
          overflowX: "hidden",
        }}
      >
  <div style={{ all: "unset", maxWidth: 1100, textAlign: "center" }}>
          {/* FRAME */}
    <div ref={frameRef} style={{ ...frame, maxWidth: "calc(100vw - 2rem)", boxSizing: "border-box" }}>
            <div style={cutEdge}>
              <img
                src={imageData.src}
                alt={imageData.title}
                style={{
      maxWidth: "100%",
      maxHeight: maxImageHeight + 'px',
                  objectFit: "contain",
                  display: "block",
                  border: "1px solid #bbb",
                }}
              />
            </div>
            <div
              style={{
                marginTop: 8,
                marginRight: 12,
                fontSize: "0.75rem",
                textAlign: "right",
                fontFamily: "'Glegoo', serif",
                ...creditStyle,
                transition: 'color .25s ease, opacity .25s ease'
              }}
            >
              © Wayne Heim
            </div>
          </div>

          {/* SWATCH ROW WITH FRAMING LINES */}
          <div
            ref={bottomRef}
            style={{
              marginTop: 22,
              maxWidth: isMobile ? '88vw' : '60ch',
              marginLeft: 'auto',
              marginRight: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 14
            }}
          >
            {/* Left line */}
            <div style={{ flex: 1, height: 1, backgroundColor: '#ccc', opacity: 0.5 }} />

            {/* Button group */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
              {/* no-wood */}
              <button
                title="Paper"
                onClick={(e) => { e.stopPropagation(); setMatColor("no-wood"); }}
                style={{
                  width: 20, height: 20, border: "1px solid #777", borderRadius: 4,
                  backgroundImage: "url('/images/materials/White-w.jpg')", backgroundSize: "cover",
                  backgroundPosition: "center", cursor: "pointer"
                }}
              />

              {/* wood */}
              <button
                title="Wood print"
                onClick={(e) => { e.stopPropagation(); setMatColor("wood"); }}
                style={{
                  width: 20, height: 20, border: "1px solid #777", borderRadius: 4,
                  backgroundImage: "url('/images/materials/Maple-w.jpg')", backgroundSize: "cover",
                  backgroundPosition: "center", cursor: "pointer"
                }}
              />

              {/* circle mats */}
              {[
                ["white", "#ffffff"],
                ["white2", "#9e9d9d"],
                ["white3", "#000000"],
              ].map(([key, bg]) => (
                <button
                  key={key}
                  title={`${key} mat`}
                  onClick={(e) => { e.stopPropagation(); setMatColor(key); }}
                  style={{
                    width: 20, height: 20, border: "1px solid #777", borderRadius: "50%",
                    background: bg, cursor: "pointer"
                  }}
                />
              ))}

              {/* exit */}
              <button
                onClick={onClose}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e2e2e2';
                  e.currentTarget.style.borderColor = '#999';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f5f5f5';
                  e.currentTarget.style.borderColor = '#ccc';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                style={{
                  padding: "0.005rem .5rem",
                  border: "1px solid #ccc",
                  marginTop: -2,
                  borderRadius: 8,
                  fontFamily: "'Glegoo', serif",
                  background: "#f5f5f5",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  transition: 'background .18s ease, border-color .18s ease, box-shadow .18s ease'
                }}
              >
                Exit
              </button>
            </div>

            {/* Right line */}
            <div style={{ flex: 1, height: 1, backgroundColor: '#ccc', opacity: 0.5 }} />
          </div>

          {/* CONTEXT TEXT */}
          <p
            style={{
              marginTop: 10,
              fontSize: "0.9rem",
              color: "#555",
              opacity: .5,
              fontFamily: "'Glegoo', serif",
              maxWidth: isMobile ? '88vw' : '60ch',
              marginLeft: 'auto',
              marginRight: 'auto',
              lineHeight: 1.35,
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
              hyphens: 'auto'
            }}
          >
            {context}
          </p>

          <div style={{ marginTop: 10 }}>
            <a
              href="mailto:info@k4studios.com?subject=Custom%20Order%20Inquiry"
              onClick={(e) => e.stopPropagation()}
              style={{
                fontFamily: "'Glegoo', serif",
                display: 'inline-block',
                background: '#ffffff',        // white default
                color: '#ccc8c0ff',
                padding: '6px 14px',
                borderRadius: 29,
                fontSize: '0.75rem',
                textDecoration: 'none',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                letterSpacing: '.5px',
                transition: 'background .25s ease',
                marginBottom: 10,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#a8a5a2ff')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
