import { useEffect } from "react";

export default function ZoomOverlay({ onClose, imageData, matColor, setMatColor }) {
  /* lock scroll + reset to first square on open */
  useEffect(() => {
  setMatColor("no-wood");
  document.body.classList.add("zoom-open");
  return () => document.body.classList.remove("zoom-open");
}, []);

  if (!imageData) return null;

  /* ------------- CALC STYLES ------------- */
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

  paddingTop:
    ["white", "white2", "white3", "wood", "no-wood"].includes(matColor)
      ? "calc(1.5rem + 15px)"
      : "1.5rem",

  paddingBottom: "1.5rem",

  paddingLeft:
    ["white", "white2", "white3", "wood", "no-wood"].includes(matColor)
      ? "calc(1.5rem + 20px)"
      : "1.5rem",

  paddingRight:
    ["white", "white2", "white3", "wood", "no-wood"].includes(matColor)
      ? "calc(1.5rem + 20px)"
      : "1.5rem",

  boxShadow:
    ["white", "white2", "white3", "gray", "black", "wood"].includes(matColor)
      ? "0 4px 20px rgba(0,0,0,.2)"
      : "none",

  outline:
    ["white", "white2", "white3", "gray", "black", "wood"].includes(matColor)
      ? "1px solid #ccc"
      : "none",

      
  transition: "background .25s ease, padding .25s ease",
  display: "inline-block",
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
    ? "Paper, Aluminum & Acrylic Prints"
    : ["wood", "no-wood"].includes(matColor)
    ? "Maple / Baltic-Birch Wood Print"
    : "Additional Display Ideas";


 /* ------------- RENDER ------------- */
return (
  <div
    className="fixed inset-0 z-[9999] bg-white overflow-y-auto"
    style={{ all: "initial", display: "block" }}
    onClick={(e) => e.target === e.currentTarget && onClose()}
  >
    <div
      style={{
        width: "100%",
        padding: "0 1rem",
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
              fontSize: "0.75rem",
              textAlign: "right",
              opacity: 0.6,
              color: ["black", "gray"].includes(matColor) ? "#fdfcf9" : "#2c2c2c",
            }}
          >
            © Wayne Heim
          </div>
        </div>

        {/* SWATCH ROW — moved here */}
        <div
          style={{
            marginTop: 22,
            display: "flex",
            gap: 15,
            justifyContent: "center",
            flexWrap: "wrap",
            width: "100%",
          }}
        >
          {/* no-wood */}
          <button title="Paper" onClick={(e) => { e.stopPropagation(); setMatColor("no-wood"); }} style={{ width: 26, height: 26, border: "1px solid #777", borderRadius: 4, backgroundImage: "url('/images/materials/White-w.jpg')", backgroundSize: "cover", backgroundPosition: "center", cursor: "pointer" }} />

          {/* wood */}
          <button title="Wood print" onClick={(e) => { e.stopPropagation(); setMatColor("wood"); }} style={{ width: 26, height: 26, border: "1px solid #777", borderRadius: 4, backgroundImage: "url('/images/materials/Maple-w.jpg')", backgroundSize: "cover", backgroundPosition: "center", cursor: "pointer" }} />

          {/* circle mats */}
          {[
            ["white", "#ffffff"],
            ["white2", "#9e9d9d"],
            ["white3", "#000000"],
          ].map(([key, bg]) => (
            <button key={key} title={`${key} mat`} onClick={(e) => { e.stopPropagation(); setMatColor(key); }} style={{ width: 26, height: 26, border: "1px solid #777", borderRadius: "50%", background: bg, cursor: "pointer" }} />
          ))}

          {/* exit */}
          <button
            onClick={onClose}
            style={{
              padding: "0.15rem 1rem",
              border: "1px solid #ccc",
              borderRadius: 6,
              fontFamily: "'Glegoo', serif",
              background: "#f5f5f5",
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            Exit
          </button>
        </div>

        {/* CONTEXT TEXT — also moved in */}
        <p
          style={{
            marginTop: 14,
            fontSize: "0.9rem",
            color: "#555",
            fontFamily: "'Glegoo', serif",
          }}
        >
          {context}
        </p>
      </div>
    </div>
  </div>
);

}
