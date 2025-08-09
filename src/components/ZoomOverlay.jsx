import { useEffect, useState } from "react";

export default function ZoomOverlay({ onClose, imageData, matColor, setMatColor }) {
  const [isMobile, setIsMobile] = useState(false);

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

    // Responsive padding: smaller on mobile!
    paddingTop:
      ["white", "white2", "white3", "wood", "no-wood"].includes(matColor)
        ? isMobile ? "1.85rem" : "calc(1.5rem + 15px)"
        : isMobile ? "1.85rem" : "1.5rem",
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
  // Provide breathing room so the top edge (shadow/outline) is fully visible
  marginTop: 10,
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
      ? "Available for order on Fine Papers. Aluminum & Acrylic Face Mounting available through custom order. Contact us for details."
      : ["wood", "no-wood"].includes(matColor)
      ? "For an unforgetable presentation, order a custom 5-layer UV printed Maple / Baltic-Birch Wood Print"
      : "Additional Finishing/Display Suggestions for your prints. *Matting not included.";

  // Credit text color / opacity tuned per mat for contrast & subtlety
  const creditColorMap = {
    white: { color: '#555', opacity: 0.50 },
    white2: { color: '#ffffffff', opacity: 0.40 },
    white3: { color: '#f2f2f2', opacity: 0.40 }, // black background
    gray: { color: '#f4f4f4', opacity: 0.40 },
    black: { color: '#f0f0f0', opacity: 0.40 },
    wood: { color: '#4a3827', opacity: 0.55 },
    'no-wood': { color: '#4d4d4d', opacity: 0.50 },
  };
  const creditStyle = creditColorMap[matColor] || { color: '#2c2c2c', opacity: 0.5 };

  // Render
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
          <div style={{ ...frame, maxWidth: "calc(100vw - 2rem)", boxSizing: "border-box" }}>
            <div style={cutEdge}>
              <img
                src={imageData.src}
                alt={imageData.title}
                style={{
                  maxWidth: "100%",
                  maxHeight: "80vh",
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

          {/* SWATCH ROW */}
          <div
            style={{
              marginTop: 22,
              display: "flex",
              gap: 14,
              justifyContent: "center",
              flexWrap: "wrap",
              width: "100%",
            }}
          >
            {/* no-wood */}
            <button title="Paper" onClick={(e) => { e.stopPropagation(); setMatColor("no-wood"); }} style={{ width: 20, height: 20, border: "1px solid #777", borderRadius: 4, backgroundImage: "url('/images/materials/White-w.jpg')", backgroundSize: "cover", backgroundPosition: "center", cursor: "pointer" }} />

            {/* wood */}
            <button title="Wood print" onClick={(e) => { e.stopPropagation(); setMatColor("wood"); }} style={{ width: 20, height: 20, border: "1px solid #777", borderRadius: 4, backgroundImage: "url('/images/materials/Maple-w.jpg')", backgroundSize: "cover", backgroundPosition: "center", cursor: "pointer" }} />

            {/* circle mats */}
            {[
              ["white", "#ffffff"],
              ["white2", "#9e9d9d"],
              ["white3", "#000000"],
            ].map(([key, bg]) => (
              <button key={key} title={`${key} mat`} onClick={(e) => { e.stopPropagation(); setMatColor(key); }} style={{ width: 20, height: 20, border: "1px solid #777", borderRadius: "50%", background: bg, cursor: "pointer" }} />
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

          {/* CONTEXT TEXT */}
          <p
            style={{
              marginTop: 7,
              fontSize: "0.9rem",
              color: "#555",
              opacity: .5,
              fontFamily: "'Glegoo', serif",
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
    background: '#ffffffff',
    color: '#a09d98ff',
    padding: '2px 14px',
    borderRadius: 12,
    fontSize: '0.75rem',
    textDecoration: 'none',
    
    letterSpacing: '.75px',
    border: '1px solid #d4d1ccff',
    transition: 'background .25s ease, color .25s ease'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.background = '#867d7aff';
    e.currentTarget.style.color = '#ffffff'; // Change text to white
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.background = '#ffffffff';
    e.currentTarget.style.color = '#a09d98ff'; // Reset text color
  }}
>
  Contact Us
</a>

          </div>
        </div>
      </div>
    </div>
  );
}
