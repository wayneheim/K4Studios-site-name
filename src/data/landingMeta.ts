// src/data/landingMeta.ts

export const landingMetaDB = {
  "/Galleries/Painterly-Fine-Art-Photography": {
    ogTitle: "Painterly Fine Art Photography by Wayne Heim",
    ogDescription: "Experience painterly fine art photography by award-winning artist Wayne Heim—blending Western history, Americana, and painterly landscapes. Printed on museum-grade paper or artisan wood panels.",
    ogImage: "https://k4studios.com/og/painterly.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Painterly Fine Art Photography by Wayne Heim",
    twitterDescription: "Award-winning painterly photography—Western, historical, and landscape art by Wayne Heim.",
    twitterImage: "https://k4studios.com/og/painterly.jpg"
  },
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History": {
    ogTitle: "Facing History: Painterly Western, Cowboy, and Americana Portraits",
    ogDescription: "Explore the 'Facing History' collection—painterly portraits and stories from the Old West, Civil War, Roaring 20s, and Greatest Generation, created by fine art photographer Wayne Heim.",
    ogImage: "https://k4studios.com/og/facing-history.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Facing History by Wayne Heim – Painterly Portrait Art",
    twitterDescription: "Western, Civil War, and Americana painterly portrait photography by Wayne Heim.",
    twitterImage: "https://k4studios.com/og/facing-history.jpg"
  },
  "/Galleries/Painterly-Fine-Art-Photography/Landscapes": {
    ogTitle: "Painterly Landscapes – Fine Art Nature Photography by Wayne Heim",
    ogDescription: "Discover painterly landscape photography of the American West, mountains, coastlines, and natural wonders—artfully captured by Wayne Heim and available as fine art prints and wood panels.",
    ogImage: "https://k4studios.com/og/landscapes.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Painterly Landscape Photography – Wayne Heim",
    twitterDescription: "Fine art landscape and nature photography in a painterly style by Wayne Heim.",
    twitterImage: "https://k4studios.com/og/landscapes.jpg"
  },
  "/Galleries/Painterly-Fine-Art-Photography/Transportation": {
    ogTitle: "Painterly Transportation Art: Trains, Cars & Boats",
    ogDescription: "Celebrate iconic American transportation—vintage trains, classic cars, and boats—through painterly photography by Wayne Heim. Prints available on paper or Baltic birch wood.",
    ogImage: "https://k4studios.com/og/transportation.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Transportation Art – Trains, Cars & Boats by Wayne Heim",
    twitterDescription: "Painterly fine art photography of classic cars, trains, and boats by Wayne Heim.",
    twitterImage: "https://k4studios.com/og/transportation.jpg"
  },
  "/Galleries/Painterly-Fine-Art-Photography/Miscellaneous": {
    ogTitle: "Miscellaneous Painterly Photography – Wayne Heim",
    ogDescription: "A curated collection of unique painterly fine art photographs by Wayne Heim—portraits, candids, and moments that defy easy categorization.",
    ogImage: "https://k4studios.com/og/misc.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Miscellaneous Fine Art Photography – Wayne Heim",
    twitterDescription: "Painterly and fine art photography: portraits, candid moments, and more.",
    twitterImage: "https://k4studios.com/og/misc.jpg"
  },
  "/Other/K4-Select-Series/Engrained": {
    ogTitle: "Engrained Series – Fine Art Wood Prints by Wayne Heim",
    ogDescription: "The Engrained Series by Wayne Heim features painterly photography—printed with archival UV inks on Baltic birch wood panels. Each piece is a unique blend of fine art, history, and the warmth of natural wood grain.",
    ogImage: "https://k4studios.com/og/engrained.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Engrained Wood Art Photography – Wayne Heim",
    twitterDescription: "Fine art photography on wood—discover the Engrained Series by Wayne Heim.",
    twitterImage: "https://k4studios.com/og/engrained.jpg"
  },
  "/Galleries/Fine-Art-Photography": {
    ogTitle: "Traditional Fine Art Photography by Wayne Heim",
    ogDescription: "Explore traditional fine art photography by Wayne Heim—landscapes, portraits, architecture, and more. Museum-quality prints for collectors and art lovers.",
    ogImage: "https://k4studios.com/og/traditional.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Traditional Fine Art Photography – Wayne Heim",
    twitterDescription: "Museum-quality fine art photography: landscapes, portraits, and more.",
    twitterImage: "https://k4studios.com/og/traditional.jpg"
  },
  // --- Optional fallback for other paths
  "default": {
    ogTitle: "Wayne Heim Fine Art Photography",
    ogDescription: "Painterly and fine art photography—Western, historical, landscape, and portraiture by Wayne Heim. Limited editions available as prints on paper or wood.",
    ogImage: "https://k4studios.com/og/default.jpg",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Wayne Heim Fine Art Photography",
    twitterDescription: "Award-winning painterly and fine art photography by Wayne Heim.",
    twitterImage: "https://k4studios.com/og/default.jpg"
  }
};

// Helper to retrieve meta for a given pathname (can be imported in Astro files)
export function getLandingMeta(pathname: string) {
  // Remove trailing slash for consistency
  const clean = pathname.replace(/\/$/, "");
  const meta =
    landingMetaDB[pathname] ||
    landingMetaDB[clean] ||
    landingMetaDB["default"] ||
    {};
  const url = `https://k4studios.com${clean}`;
  return {
    ...meta,
    ogUrl: url,
    twitterUrl: url,
  };
}
