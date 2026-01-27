import { useEffect, useLayoutEffect, useRef, useState } from "react";

// ✅ Proxy URL helper - never expose SmugMug URLs to crawlers
const getProxySrc = (id, size = "xl") => `/img/${id}/${size}`;

export default function ZoomOverlay({ onClose, imageData, matColor, setMatColor, isEngrained = false }) {
  const [isMobile, setIsMobile] = useState(false);
  const [maxImageHeight, setMaxImageHeight] = useState(() =>
    Math.round(window.innerHeight * 0.8)
  );
  const [xlLoaded, setXlLoaded] = useState(false);
  const frameRef = useRef(null);
  const bottomRef = useRef(null);
  const lensRef = useRef(null);

  // Preload XL image and track when ready for crossfade
  useEffect(() => {
    if (!imageData?.id) return;
    setXlLoaded(false);
    const xlImg = new Image();
    xlImg.onload = () => setXlLoaded(true);
    xlImg.src = getProxySrc(imageData.id, 'xl');
  }, [imageData?.id]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 600);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Lock scroll + set default mat color (start with black look via 'white3')
  // Skip mat color for Engrained series - they display with built-in wood border
  useEffect(() => {
    if (!isEngrained) {
      setMatColor("white3");
    }
    document.body.classList.add("zoom-open");
    return () => document.body.classList.remove("zoom-open");
  }, [isEngrained]);

  if (!imageData) return null;

  // Compute available image height
  useLayoutEffect(() => {
    const compute = () => {
      const vh = window.innerHeight;
      const bottomH = bottomRef.current ? bottomRef.current.offsetHeight : 0;
      const topExtras = 40;
      let available = vh - bottomH - topExtras;
      const upperCap = Math.round(vh * 0.9);
      available = Math.min(available, upperCap);
      available = Math.max(available, 140);
      setMaxImageHeight(available);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [matColor]);

  // Magnifier lens logic
  useEffect(() => {
    if (isMobile) return; // disable loupe on mobile

    const img = frameRef.current?.querySelector("img");
    const lens = lensRef.current;
    if (!img || !lens) return;

    const zoom = 1.75;
    const lensSize = 180;

    const move = (e) => {
      const rect = img.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        lens.style.opacity = 0;
        return;
      }

      lens.style.opacity = 1;

      let lensX = x - lensSize / 2;
      let lensY = y - lensSize / 2;
      lensX = Math.max(0, Math.min(lensX, rect.width - lensSize));
      lensY = Math.max(0, Math.min(lensY, rect.height - lensSize));
      lens.style.left = lensX + "px";
      lens.style.top = lensY + "px";

      const bgW = rect.width * zoom;
      const bgH = rect.height * zoom;
      lens.style.backgroundSize = `${bgW}px ${bgH}px`;
      lens.style.backgroundPosition = `-${x * zoom - lensSize / 2}px -${
        y * zoom - lensSize / 2
      }px`;
    };

    img.addEventListener("mousemove", move);
    img.addEventListener("mouseenter", move);
    img.addEventListener("mouseleave", () => (lens.style.opacity = 0));

    return () => {
      img.removeEventListener("mousemove", move);
      img.removeEventListener("mouseenter", move);
    };
  }, [imageData, isMobile]);

  // Frame styles - Engrained series gets no matting but a float-mount drop shadow
  const frame = isEngrained ? {
    background: "transparent",
    border: "none",
    padding: 0,
    // Float mount shadow - upper left light source, shadow cast to lower right
    boxShadow: "12px 16px 32px rgba(0,0,0,0.4), 6px 8px 14px rgba(0,0,0,0.25)",
    outline: "none",
    display: "inline-block",
    marginTop: 10,
  } : {
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
    border: "0vw solid transparent",
    paddingTop:
      ["white", "white2", "white3", "wood", "no-wood"].includes(matColor)
        ? isMobile
          ? "1.95rem"
          : "calc(1.5rem + 20px)"
        : isMobile
        ? "1.95rem"
        : "1.5rem",
    paddingBottom: isMobile ? ".5rem" : "1.5rem",
    paddingLeft:
      ["white", "white2", "white3", "wood", "no-wood"].includes(matColor)
        ? isMobile
          ? "1.95rem"
          : "calc(1.5rem + 20px)"
        : isMobile
        ? "1.95rem"
        : "1.5rem",
    paddingRight:
      ["white", "white2", "white3", "wood", "no-wood"].includes(matColor)
        ? isMobile
          ? "1.95rem"
          : "calc(1.5rem + 20px)"
        : isMobile
        ? "1.95rem"
        : "1.5rem",
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
    marginTop: 10,
  };

  // Cut edge styles - Engrained series gets bevel edge effect (light top/left, darker bottom/right)
  const cutEdge = isEngrained ? {
    padding: 0,
    background: "transparent",
    // Bevel effect: light highlight on top/left, subtle shadow on bottom/right
    boxShadow: "inset 2px 2px 0 rgba(255,255,255,0.35), inset -2px -2px 0 rgba(0,0,0,0.25)",
    border: "none",
  } : {
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
    (matColor === "no-wood" || matColor === "white3")
      ? "Click the color icons above to preview different display ideas. Contact us for additional details."
      : matColor === "wood"
      ? "For an unforgetable presentation, order a custom 5-layer UV printed Maple / Baltic-Birch Wood Print"
      : "Additional Finishing/Display Suggestions for your prints. *Matting not included.";

  const [displayContext, setDisplayContext] = useState(context);
  const [contextVisible, setContextVisible] = useState(true);
  const fadeDuration = 420;

  useEffect(() => {
    if (context !== displayContext) {
      setContextVisible(false);
      const t = setTimeout(() => {
        setDisplayContext(context);
        requestAnimationFrame(() => setContextVisible(true));
      }, fadeDuration);
      return () => clearTimeout(t);
    }
  }, [context, displayContext]);

  const creditColorMap = {
    white: { color: "#888888ff", opacity: 0.55 },
    white2: { color: "#505050ff", opacity: 0.55 },
    white3: { color: "#b1b1b1ff", opacity: 0.62 },
    gray: { color: "#f4f4f4", opacity: 0.6 },
    black: { color: "#f0f0f0", opacity: 0.62 },
    wood: { color: "#4d3c2dff", opacity: 0.55 },
    "no-wood": { color: "#888888ff", opacity: 0.5 },
  };
  const creditStyle = creditColorMap[matColor] || {
    color: "#2c2c2c",
    opacity: 0.5,
  };

  const longestContext =
    "Click the color icons above to preview different display ideas. Contact us for additional details.";
  const measureRef = useRef(null);
  const [reservedHeight, setReservedHeight] = useState(null);

  useLayoutEffect(() => {
    if (measureRef.current) {
      const h = measureRef.current.offsetHeight;
      if (!reservedHeight || Math.abs(h - reservedHeight) > 2) {
        setReservedHeight(h);
      }
    }
  }, [isMobile]);

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
          <div
            ref={frameRef}
            style={{
              ...frame,
              maxWidth: "calc(100vw - 2rem)",
              boxSizing: "border-box",
              position: "relative", // needed for lens positioning
            }}
          >
            <div style={{ ...cutEdge, position: 'relative' }}>
              {/* L image - shows immediately from cache, fades out when XL ready */}
              <img
                src={imageData.id ? getProxySrc(imageData.id, 'l') : imageData.src}
                alt={imageData.title}
                style={{
                  maxWidth: "100%",
                  maxHeight: maxImageHeight + "px",
                  objectFit: "contain",
                  display: "block",
                  border: isEngrained ? "none" : "1px solid #bbb",
                  borderTop: isEngrained ? "3px solid rgba(220,200,180,0.75)" : undefined,
                  borderLeft: isEngrained ? "3px solid rgba(220,200,180,0.75)" : undefined,
                  borderBottom: isEngrained ? "3px solid rgba(140,120,100,0.6)" : undefined,
                  borderRight: isEngrained ? "3px solid rgba(140,120,100,0.6)" : undefined,
                  opacity: xlLoaded ? 0 : 1,
                  transition: 'opacity 0.3s ease-out',
                }}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
              />
              {/* XL image - fades in when loaded */}
              <img
                src={imageData.id ? getProxySrc(imageData.id, 'xl') : imageData.src}
                alt={imageData.title}
                style={{
                  position: 'absolute',
                  top: isEngrained ? 0 : 6, // match cutEdge padding
                  left: isEngrained ? 0 : 6,
                  maxWidth: "100%",
                  maxHeight: maxImageHeight + "px",
                  objectFit: "contain",
                  display: "block",
                  border: isEngrained ? "none" : "1px solid #bbb",
                  borderTop: isEngrained ? "3px solid rgba(220,200,180,0.75)" : undefined,
                  borderLeft: isEngrained ? "3px solid rgba(220,200,180,0.75)" : undefined,
                  borderBottom: isEngrained ? "3px solid rgba(140,120,100,0.6)" : undefined,
                  borderRight: isEngrained ? "3px solid rgba(140,120,100,0.6)" : undefined,
                  opacity: xlLoaded ? 1 : 0,
                  transition: 'opacity 0.3s ease-in',
                }}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
              />
              {/* Magnifier lens */}
              <div
                ref={lensRef}
                style={{
                  opacity: 0,
                  transition: "opacity 0.2s ease",
                  position: "absolute",
                  border: "2px solid #000",
                  borderRadius: "50%",
                  width: "180px",
                  height: "180px",
                  background: `url(${imageData.id ? getProxySrc(imageData.id, 'xl') : imageData.src}) no-repeat`,
                  pointerEvents: "none",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.6)",
                  zIndex: 10,
                  filter: "contrast(1.14) brightness(1.04) url(#sharpen)", // SVG filter here
                }}
              />
            </div>
            {!isEngrained && (
            <div
              style={{
                marginTop: 8,
                marginRight: 12,
                fontSize: "0.75rem",
                textAlign: "right",
                fontFamily: "'Glegoo', serif",
                ...creditStyle,
                transition: "color .25s ease, opacity .25s ease",
              }}
            >
              © Wayne Heim
            </div>
            )}
          </div>

          {/* SWATCH ROW - For Engrained series, only show Exit button */}
          <div
            ref={bottomRef}
            style={{
              marginTop: 22,
              maxWidth: isMobile ? "88vw" : "60ch",
              marginLeft: "auto",
              marginRight: "auto",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div style={{ flex: 1, height: 1, backgroundColor: "#ccc", opacity: 0.5 }} />
            <div
              style={{
                display: "flex",
                gap: 14,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              {!isEngrained && (
                <>
                  <button
                    title="Paper"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMatColor("no-wood");
                    }}
                    style={{
                      width: 20,
                      height: 20,
                      border: matColor === "no-wood" ? "2px solid #b91c1c" : "1px solid #777",
                      borderRadius: 4,
                      backgroundImage: "url('/images/materials/White-w.jpg')",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      cursor: "pointer",
                      boxShadow: matColor === "no-wood" ? "0 0 0 2px rgba(185,28,28,0.35)" : "none",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {/* Diagonal slash to indicate "no mat" vs white mat circle */}
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        transform: "translate(-50%, -50%) rotate(-45deg)",
                        width: 18,
                        height: 1.5,
                        background: matColor === "no-wood" ? "#b91c1c" : "#777",
                        opacity: 0.8,
                        pointerEvents: "none",
                        borderRadius: 1,
                      }}
                    />
                  </button>
                  <button
                    title="Wood print"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMatColor("wood");
                    }}
                    style={{
                      width: 20,
                      height: 20,
                      border: matColor === "wood" ? "2px solid #b91c1c" : "1px solid #777",
                      borderRadius: 4,
                      backgroundImage: "url('/images/materials/Maple-w.jpg')",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      cursor: "pointer",
                      boxShadow: matColor === "wood" ? "0 0 0 2px rgba(185,28,28,0.35)" : "none",
                    }}
                  />
                  {[
                    ["white", "#ffffff"],
                    ["white2", "#9e9d9d"],
                    ["white3", "#000000"],
                  ].map(([key, bg]) => (
                    <button
                      key={key}
                      title={`${key} mat`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMatColor(key);
                      }}
                      style={{
                        width: 20,
                        height: 20,
                        border: matColor === key ? "2px solid #b91c1c" : "1px solid #777",
                        borderRadius: "50%",
                        background: bg,
                        cursor: "pointer",
                        boxShadow: matColor === key ? "0 0 0 2px rgba(185,28,28,0.35)" : "none",
                      }}
                    />
                  ))}
                </>
              )}
              <button
                onClick={onClose}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#e2e2e2";
                  e.currentTarget.style.borderColor = "#999";
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f5f5f5";
                  e.currentTarget.style.borderColor = "#ccc";
                  e.currentTarget.style.boxShadow = "none";
                }}
                style={{
                  padding: "0.005rem .5rem",
                  border: "1px solid #ccc",
                  marginTop: isEngrained ? 8 : -2,
                  borderRadius: 8,
                  fontFamily: "'Glegoo', serif",
                  background: "#f5f5f5",
                  fontSize: "0.8rem",
                  color: isEngrained ? "#888" : "inherit",
                  cursor: "pointer",
                  transition:
                    "background .18s ease, border-color .18s ease, box-shadow .18s ease",
                }}
              >
                {isEngrained ? "Close" : "Exit"}
              </button>
            </div>
            <div style={{ flex: 1, height: 1, backgroundColor: "#ccc", opacity: 0.5 }} />
          </div>

          {/* ENGRAINED FLOAT MOUNT INFO */}
          {isEngrained && (
            <div
              style={{
                marginTop: 20,
                marginBottom: 15,
                maxWidth: isMobile ? "88vw" : "52ch",
                marginLeft: "auto",
                marginRight: "auto",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: "0.8rem",
                  letterSpacing: "0.05em",
                  color: "#928176",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  marginBottom: 8,
                  fontFamily: "'Glegoo', serif",
                }}
              >
                Engrained Float Mount Display
              </p>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "#555",
                  opacity: 0.7,
                  fontFamily: "'Glegoo', serif",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                Each Engrained print arrives ready to hang with float mount hardware, 
                allowing it to hover ¾″ off the wall for a striking dimensional effect. 
                For a more classic presentation, a traditional frame may be added.
              </p>
            </div>
          )}

          {/* CONTEXT TEXT - Hidden for Engrained series */}
          {!isEngrained && (
          <div style={{ minHeight: reservedHeight || undefined }}>
            <div
              style={{
                marginTop: 18,
                fontSize: "0.9rem",
                color: "#555",
                opacity: contextVisible ? 0.5 : 0,
                transition: `opacity ${fadeDuration}ms ease`,
                fontFamily: "'Glegoo', serif",
                maxWidth: isMobile ? "88vw" : "60ch",
                marginLeft: "auto",
                marginRight: "auto",
                lineHeight: 1.35,
                overflowWrap: "break-word",
                wordBreak: "break-word",
                hyphens: "auto",
                willChange: "opacity",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: "0.8rem",
                  letterSpacing: "0.05em",
                  color: "#928176",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Explore Finishing Options
              </p>
              <p style={{ marginTop: 0 }}>{displayContext}</p>
            </div>
            <p
              ref={measureRef}
              aria-hidden="true"
              style={{
                position: "absolute",
                visibility: "hidden",
                pointerEvents: "none",
                marginTop: 18,
                fontSize: "0.9rem",
                fontFamily: "'Glegoo', serif",
                maxWidth: isMobile ? "88vw" : "60ch",
                lineHeight: 1.35,
                whiteSpace: "normal",
              }}
            >
              {longestContext}
            </p>
          </div>
          )}

          {!isEngrained && (
          <div style={{ marginTop: 10, marginBottom: 15 }}>
            <a
              href="mailto:info@k4studios.com?subject=Custom%20Order%20Inquiry"
              onClick={(e) => e.stopPropagation()}
              style={{
                fontFamily: "'Glegoo', serif",
                display: "inline-block",
                background: "#ffffff",
                color: "#ccc8c0ff",
                padding: "6px 14px",
                borderRadius: 29,
                fontSize: "0.75rem",
                textDecoration: "none",
                boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                letterSpacing: ".5px",
                transition: "background .25s ease",
                marginBottom: 10,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#a8a5a2ff")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
            >
              Contact Us
            </a>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
 
