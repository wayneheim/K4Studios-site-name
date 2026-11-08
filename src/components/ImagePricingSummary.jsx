const SIGNED_SERIES = new Set(["chronicle", "legend"]);

const sizeArea = (value) => {
  const dimensions = String(value || "").match(/([\d.]+)\D+([\d.]+)/);
  return dimensions ? Number(dimensions[1]) * Number(dimensions[2]) : Number.POSITIVE_INFINITY;
};

const formatSize = (value) => String(value || "").replace(/\s*x\s*/i, " × ");
const formatPrice = (value) => `$${Number(value).toLocaleString("en-US")}`;

function lowestOffer(tiers) {
  return (tiers || [])
    .flatMap((tier) => (tier.pricing || []).map((offer) => ({ ...offer, seriesKey: tier.key })))
    .filter((offer) => Number.isFinite(Number(offer.price)))
    .sort((a, b) => Number(a.price) - Number(b.price) || sizeArea(a.size) - sizeArea(b.size))[0] || null;
}

export default function ImagePricingSummary({
  commerce,
  collectionLabel,
  onOrder,
  compact = false,
  showLimited = true,
}) {
  if (!commerce || commerce.mode !== "standard") return null;

  const openOffer = lowestOffer(commerce.tiers?.filter((tier) => tier.key === "sketch"));
  const limitedOffer = lowestOffer(showLimited
    ? commerce.tiers?.filter((tier) => SIGNED_SERIES.has(tier.key))
    : []);

  if (!openOffer && !limitedOffer) return null;

  const rowStyle = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: "1rem",
    alignItems: "start",
    padding: compact ? "0.38rem 0" : "0.48rem 0",
    textAlign: "left",
  };

  return (
    <section
      className="image-pricing-summary"
      aria-label={`Sizes and pricing for ${commerce.imageTitle || "this artwork"}`}
      style={{
        width: "100%",
        maxWidth: compact ? "34rem" : "30rem",
        margin: compact ? "1.25rem auto 1.75rem" : "1rem auto 0",
        paddingTop: compact ? 0 : "0.85rem",
        borderTop: compact ? "none" : "1px dashed rgba(200, 190, 180, 0.55)",
        color: "#756d68",
        fontFamily: "'Glegoo', serif",
        boxSizing: "border-box",
      }}
    >
      <h3 style={{
        margin: 0,
        color: "#8b817a",
        fontSize: compact ? "1rem" : "0.95rem",
        fontWeight: 400,
        letterSpacing: "0.18em",
        textAlign: "center",
        textTransform: "uppercase",
      }}>
        Sizes &amp; Pricing
      </h3>
      {collectionLabel && (
        <p style={{
          margin: "0.15rem 0 0.45rem",
          paddingBottom: "0.45rem",
          borderBottom: "1px dashed rgba(200, 190, 180, 0.55)",
          color: "#8f8985",
          fontSize: "0.78rem",
          lineHeight: 1.35,
          textAlign: "center",
        }}>
          {collectionLabel}
        </p>
      )}

      {openOffer && (
        <div style={rowStyle}>
          <div style={{ textAlign: "left" }}>
            <div style={{ color: "#716964", fontSize: "0.9rem", lineHeight: 1.25 }}>Open Edition</div>
            <div style={{ color: "#9a928d", fontSize: "0.72rem", lineHeight: 1.35 }}>
              Sizes from {formatSize(openOffer.size)}
            </div>
          </div>
          <div style={{ color: "#716964", fontSize: "0.86rem", whiteSpace: "nowrap", textAlign: "right" }}>
            from {formatPrice(openOffer.price)}
          </div>
        </div>
      )}

      {limitedOffer && (
        <div style={rowStyle}>
          <div style={{ textAlign: "left" }}>
            <div style={{ color: "#716964", fontSize: "0.9rem", lineHeight: 1.25 }}>
              Limited Edition · Signed
            </div>
            <div style={{ color: "#9a928d", fontSize: "0.72rem", lineHeight: 1.35 }}>
              Numbered · Sizes from {formatSize(limitedOffer.size)}
            </div>
          </div>
          <div style={{ color: "#716964", fontSize: "0.86rem", whiteSpace: "nowrap", textAlign: "right" }}>
            from {formatPrice(limitedOffer.price)}
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", margin: compact ? "0.8rem 0 0.9rem" : "0.85rem 0 0.8rem" }}>
        <button type="button" onClick={onOrder} style={{
          border: "1px solid rgba(150, 140, 132, 0.18)",
          borderRadius: "999px",
          padding: "0.42rem 0.85rem",
          background: "#eeeae5",
          color: "#8a817b",
          cursor: "pointer",
          fontFamily: "'Glegoo', serif",
          fontSize: "0.78rem",
          lineHeight: 1.2,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}>
          See full pricing &amp; order
        </button>
      </div>
    </section>
  );
}
