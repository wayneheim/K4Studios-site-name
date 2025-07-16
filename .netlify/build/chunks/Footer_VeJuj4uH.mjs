import { c as createComponent, d as createAstro, l as renderHead, k as renderSlot, r as renderTemplate, m as maybeRenderHead, f as addAttribute } from './astro/server_DU4U1nxe.mjs';
import 'kleur/colors';
import 'clsx';
/* empty css                        */
import { jsxs, jsx } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';

const $$Astro = createAstro();
const $$BaseLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$BaseLayout;
  const { title = "Gallery" } = Astro2.props;
  return renderTemplate`<html lang="en" data-astro-cid-37fxchfa> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title><link href="https://fonts.googleapis.com/css2?family=Glegoo&display=swap" rel="stylesheet"><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">${renderHead()}</head> <body data-astro-cid-37fxchfa> <div class="page-container" data-astro-cid-37fxchfa> ${renderSlot($$result, $$slots["default"])} </div> <div id="overlay-root" data-astro-cid-37fxchfa></div> </body></html>`;
}, "C:/Users/Wayne/Documents/GitHub/K4-Studios/src/layouts/BaseLayout.astro", void 0);

const siteNav = [
  {
    "label": "Painterly",
    "href": "/Galleries/Painterly-Fine-Art-Photography",
    "children": [
      {
        "label": "Facing History",
        "href": "/Galleries/Painterly-Fine-Art-Photography/Facing-History",
        "children": [
          {
            "label": "Civil War",
            "href": "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War",
            "children": [
              {
                "label": "Color",
                "href": "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War/Color",
                "code": "P-S1-Ss1-Sss1",
                "slug": "color",
                "type": "gallery-source"
              },
              {
                "label": "Black & White",
                "href": "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War/Black-White",
                "code": "P-S1-Ss1-Sss2",
                "slug": "black--white",
                "type": "gallery-source"
              }
            ],
            "code": "P-S1-Ss1",
            "slug": "civil-war",
            "type": "collection"
          },
          {
            "label": "Western Cowboy Portraits",
            "href": "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits",
            "children": [
              {
                "label": "Color",
                "href": "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color",
                "code": "P-S1-Ss2-Sss1",
                "slug": "color",
                "type": "gallery-source"
              },
              {
                "label": "Black & White",
                "href": "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White",
                "code": "P-S1-Ss2-Sss2",
                "slug": "black--white",
                "type": "gallery-source"
              }
            ],
            "code": "P-S1-Ss2",
            "slug": "western-cowboy-portraits",
            "type": "collection"
          },
          {
            "label": "Roaring 20s Portraits",
            "href": "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits",
            "children": [
              {
                "label": "Color",
                "href": "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color",
                "code": "P-S1-Ss3-Sss1",
                "slug": "color",
                "type": "gallery-source"
              },
              {
                "label": "Black & White",
                "href": "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White",
                "code": "P-S1-Ss3-Sss2",
                "slug": "black--white",
                "type": "gallery-source"
              }
            ],
            "code": "P-S1-Ss3",
            "slug": "roaring-20s-portraits",
            "type": "collection"
          },
          {
            "label": "WWII",
            "href": "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII",
            "children": [
              {
                "label": "Art of War",
                "href": "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War",
                "children": [
                  {
                    "label": "Color",
                    "href": "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Color",
                    "code": "P-S1-Ss4-Sss1-Ssss1",
                    "slug": "color",
                    "type": "gallery-source"
                  },
                  {
                    "label": "Black & White",
                    "href": "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Black-White",
                    "code": "P-S1-Ss4-Sss1-Ssss2",
                    "slug": "black--white",
                    "type": "gallery-source"
                  }
                ],
                "code": "P-S1-Ss4-Sss1",
                "slug": "art-of-war",
                "type": "collection"
              },
              {
                "label": "Men & Machines",
                "href": "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines",
                "children": [
                  {
                    "label": "Color",
                    "href": "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color",
                    "code": "P-S1-Ss4-Sss2-Ssss1",
                    "slug": "color",
                    "type": "gallery-source"
                  },
                  {
                    "label": "Black & White",
                    "href": "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White",
                    "code": "P-S1-Ss4-Sss2-Ssss2",
                    "slug": "black--white",
                    "type": "gallery-source"
                  }
                ],
                "code": "P-S1-Ss4-Sss2",
                "slug": "men--machines",
                "type": "collection"
              },
              {
                "label": "Portraits",
                "href": "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits",
                "children": [
                  {
                    "label": "Color",
                    "href": "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color",
                    "code": "P-S1-Ss4-Sss3-Ssss1",
                    "slug": "color",
                    "type": "gallery-source"
                  },
                  {
                    "label": "Black & White",
                    "href": "/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White",
                    "code": "P-S1-Ss4-Sss3-Ssss2",
                    "slug": "black--white",
                    "type": "gallery-source"
                  }
                ],
                "code": "P-S1-Ss4-Sss3",
                "slug": "portraits",
                "type": "collection"
              }
            ],
            "code": "P-S1-Ss4",
            "slug": "wwii",
            "type": "collection"
          }
        ],
        "code": "P-S1",
        "slug": "facing-history",
        "type": "collection"
      },
      {
        "label": "Landscapes",
        "href": "/Galleries/Painterly-Fine-Art-Photography/Landscapes",
        "children": [
          {
            "label": "By Location",
            "children": [
              {
                "label": "International",
                "href": "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/International",
                "children": [
                  {
                    "label": "Gallery",
                    "href": "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/International/Gallery",
                    "code": "P-S2-Ss1-Sss1-Ssss1",
                    "slug": "gallery",
                    "type": "gallery-source"
                  }
                ],
                "code": "P-S2-Ss1-Sss1",
                "slug": "international",
                "type": "collection"
              },
              {
                "label": "Midwest",
                "href": "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Midwest",
                "children": [
                  {
                    "label": "Gallery",
                    "href": "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Midwest/Gallery",
                    "code": "P-S2-Ss1-Sss2-Ssss1",
                    "slug": "gallery",
                    "type": "gallery-source"
                  }
                ],
                "code": "P-S2-Ss1-Sss2",
                "slug": "midwest",
                "type": "collection"
              },
              {
                "label": "Northeast",
                "href": "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Northeast",
                "children": [
                  {
                    "label": "Gallery",
                    "href": "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Northeast/Gallery",
                    "code": "P-S2-Ss1-Sss3-Ssss1",
                    "slug": "gallery",
                    "type": "gallery-source"
                  }
                ],
                "code": "P-S2-Ss1-Sss3",
                "slug": "northeast",
                "type": "collection"
              },
              {
                "label": "South",
                "href": "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/South",
                "children": [
                  {
                    "label": "Gallery",
                    "href": "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/South/Gallery",
                    "code": "P-S2-Ss1-Sss4-Ssss1",
                    "slug": "gallery",
                    "type": "gallery-source"
                  }
                ],
                "code": "P-S2-Ss1-Sss4",
                "slug": "south",
                "type": "collection"
              },
              {
                "label": "West",
                "href": "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West",
                "children": [
                  {
                    "label": "Gallery",
                    "href": "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery",
                    "code": "P-S2-Ss1-Sss5-Ssss1",
                    "slug": "gallery",
                    "type": "gallery-source"
                  }
                ],
                "code": "P-S2-Ss1-Sss5",
                "slug": "west",
                "type": "collection"
              }
            ],
            "code": "P-S2-Ss1",
            "slug": "by-location",
            "type": "collection"
          },
          {
            "label": "By Theme",
            "children": [
              {
                "label": "Mountains",
                "href": "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains",
                "code": "P-S2-Ss2-Sss1",
                "slug": "mountains",
                "type": "gallery-source"
              },
              {
                "label": "Water & Waterfalls",
                "href": "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water",
                "code": "P-S2-Ss2-Sss2",
                "slug": "water--waterfalls",
                "type": "gallery-source"
              },
              {
                "label": "Sunsets",
                "href": "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Sunsets",
                "code": "P-S2-Ss2-Sss3",
                "slug": "sunsets",
                "type": "gallery-source"
              }
            ],
            "code": "P-S2-Ss2",
            "slug": "by-theme",
            "type": "collection"
          }
        ],
        "code": "P-S2",
        "slug": "landscapes",
        "type": "collection"
      },
      {
        "label": "Transportation",
        "href": "/Galleries/Painterly-Fine-Art-Photography/Transportation",
        "children": [
          {
            "label": "Trains (Color)",
            "href": "/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Color",
            "code": "P-S3-Ss1",
            "slug": "trains-color",
            "type": "gallery-source"
          },
          {
            "label": "Trains (B&W)",
            "href": "/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Black-White",
            "code": "P-S3-Ss2",
            "slug": "trains-bw",
            "type": "gallery-source"
          },
          {
            "label": "Cars",
            "href": "/Galleries/Painterly-Fine-Art-Photography/Transportation/Cars",
            "code": "P-S3-Ss3",
            "slug": "cars",
            "type": "gallery-source"
          },
          {
            "label": "Boats",
            "href": "/Galleries/Painterly-Fine-Art-Photography/Transportation/Boats",
            "code": "P-S3-Ss4",
            "slug": "boats",
            "type": "gallery-source"
          }
        ],
        "code": "P-S3",
        "slug": "transportation",
        "type": "collection"
      },
      {
        "label": "Miscellaneous",
        "href": "/Galleries/Painterly-Fine-Art-Photography/Miscellaneous",
        "children": [
          {
            "label": "Portraits",
            "href": "/Galleries/Painterly-Fine-Art-Photography/Miscellaneous/Portraits",
            "code": "P-S4-Ss1",
            "slug": "portraits",
            "type": "gallery-source"
          }
        ],
        "code": "P-S4",
        "slug": "miscellaneous",
        "type": "collection"
      },
      {
        "label": "Engrained Series",
        "href": "/Other/K4-Select-Series/Engrained",
        "code": "P-S5",
        "slug": "engrained-series",
        "type": "gallery-source"
      }
    ],
    "code": "P",
    "type": "collection",
    "slug": "painterly"
  },
  {
    "label": "Traditional",
    "href": "/Galleries/Fine-Art-Photography",
    "children": [
      {
        "label": "Landscapes",
        "href": "/Galleries/Fine-Art-Photography/Landscapes",
        "children": [
          {
            "label": "By Location",
            "children": [
              {
                "label": "International",
                "href": "/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/Gallery",
                "code": "T-S1-Ss1-Sss1",
                "slug": "international",
                "type": "gallery-source"
              },
              {
                "label": "Midwest",
                "href": "/Galleries/Fine-Art-Photography/Landscapes/By-Location/Midwest/Gallery",
                "code": "T-S1-Ss1-Sss2",
                "slug": "midwest",
                "type": "gallery-source"
              },
              {
                "label": "Northeast",
                "href": "/Galleries/Fine-Art-Photography/Landscapes/By-Location/Northeast/Gallery",
                "code": "T-S1-Ss1-Sss3",
                "slug": "northeast",
                "type": "gallery-source"
              },
              {
                "label": "South",
                "href": "/Galleries/Fine-Art-Photography/Landscapes/By-Location/South/Gallery",
                "code": "T-S1-Ss1-Sss4",
                "slug": "south",
                "type": "gallery-source"
              },
              {
                "label": "West",
                "href": "/Galleries/Fine-Art-Photography/Landscapes/By-Location/West/Gallery",
                "code": "T-S1-Ss1-Sss5",
                "slug": "west",
                "type": "gallery-source"
              }
            ],
            "code": "T-S1-Ss1",
            "slug": "by-location",
            "type": "collection"
          },
          {
            "label": "By Theme",
            "children": [
              {
                "label": "Mountains",
                "href": "/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Mountains",
                "code": "T-S1-Ss2-Sss1",
                "slug": "mountains",
                "type": "gallery-source"
              },
              {
                "label": "Water & Waterfalls",
                "href": "/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Water",
                "code": "T-S1-Ss2-Sss2",
                "slug": "water--waterfalls",
                "type": "gallery-source"
              },
              {
                "label": "Sunsets",
                "href": "/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Sunsets",
                "code": "T-S1-Ss2-Sss3",
                "slug": "sunsets",
                "type": "gallery-source"
              }
            ],
            "code": "T-S1-Ss2",
            "slug": "by-theme",
            "type": "collection"
          }
        ],
        "code": "T-S1",
        "slug": "landscapes",
        "type": "gallery-source"
      },
      {
        "label": "Portraits",
        "href": "/Galleries/Fine-Art-Photography/Portraits",
        "children": [
          {
            "label": "Color",
            "href": "/Galleries/Fine-Art-Photography/Portraits/Color",
            "code": "T-S2-Ss1",
            "slug": "color",
            "type": "gallery-source"
          },
          {
            "label": "Black & White",
            "href": "/Galleries/Fine-Art-Photography/Portraits/Black-White",
            "code": "T-S2-Ss2",
            "slug": "black--white",
            "type": "gallery-source"
          },
          {
            "label": "Reenactors",
            "href": "/Galleries/Fine-Art-Photography/Portraits/Reenactors",
            "code": "T-S2-Ss3",
            "slug": "reenactors",
            "type": "gallery-source"
          }
        ],
        "code": "T-S2",
        "slug": "portraits",
        "type": "collection"
      },
      {
        "label": "Architecture",
        "href": "/Galleries/Fine-Art-Photography/Architecture/Gallery",
        "code": "T-S3",
        "slug": "architecture",
        "type": "gallery-source"
      },
      {
        "label": "Miscellaneous",
        "children": [
          {
            "label": "Reenactments",
            "href": "/Galleries/Fine-Art-Photography/Miscellaneous/Reenactments",
            "code": "T-S4-Ss1",
            "slug": "reenactments",
            "type": "gallery-source"
          },
          {
            "label": "Wildlife",
            "href": "/Galleries/Fine-Art-Photography/Miscellaneous/Wildlife",
            "code": "T-S4-Ss2",
            "slug": "wildlife",
            "type": "gallery-source"
          },
          {
            "label": "Pets",
            "href": "/Galleries/Fine-Art-Photography/Miscellaneous/Pets",
            "code": "T-S4-Ss3",
            "slug": "pets",
            "type": "gallery-source"
          },
          {
            "label": "Kids",
            "href": "/Galleries/Fine-Art-Photography/Miscellaneous/Kids",
            "code": "T-S4-Ss4",
            "slug": "kids",
            "type": "gallery-source"
          },
          {
            "label": "Lights",
            "href": "/Galleries/Fine-Art-Photography/Miscellaneous/Lights",
            "code": "T-S4-Ss5",
            "slug": "lights",
            "type": "gallery-source"
          }
        ],
        "code": "T-S4",
        "slug": "miscellaneous",
        "type": "collection"
      }
    ],
    "code": "T",
    "type": "collection",
    "slug": "traditional"
  },
  {
    "label": "Other",
    "href": "/Other",
    "children": [
      {
        "label": "News & Awards",
        "href": "/News-Awards",
        "code": "O-S1",
        "slug": "news--awards",
        "type": "gallery-source"
      },
      {
        "label": "Print Options",
        "href": "/Other/Print-Options",
        "code": "O-S2",
        "slug": "print-options",
        "type": "gallery-source"
      },
      {
        "label": "Photo Shoots",
        "href": "/Other/Photo-Shoots",
        "code": "O-S3",
        "slug": "photo-shoots",
        "type": "gallery-source"
      },
      {
        "label": "K4 Select Series",
        "href": "/Other/K4-Select-Series",
        "code": "O-S4",
        "slug": "k4-select-series",
        "type": "collection",
        "children": [
          {
            "label": "Engrained",
            "href": "/Other/K4-Select-Series/Engrained",
            "code": "O-S4-Ss1",
            "slug": "engrained",
            "type": "collection",
            "children": [
              {
                "label": "Engrained Series",
                "href": "/Other/K4-Select-Series/Engrained/Engrained-Series",
                "code": "O-S4-Ss1-Sss1",
                "slug": "engrained-series",
                "type": "gallery-source"
              }
            ]
          },
          {
            "label": "5x7 Prints",
            "href": "/Other/K4-Select-Series/5x7-prints",
            "code": "O-S4-Ss2",
            "slug": "5x7-prints",
            "type": "gallery-source"
          }
        ]
      }
    ],
    "code": "O",
    "type": "collection",
    "slug": "other"
  },
  {
    "label": "Bio",
    "href": "/Other/Bio",
    "code": "O",
    "type": "collection",
    "slug": "bio"
  },
  {
    "label": "Contact",
    "href": "/Other/Contact",
    "code": "O",
    "type": "collection",
    "slug": "contact"
  }
];

function SiteNavMenu({ forceMobile = false }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const closeMobileMenu = () => {
    setMobileOpen(false);
    document.body.classList.remove("mobile-open");
    document.body.style.overflow = "";
  };
  useEffect(() => {
    if (typeof window === "undefined") return;
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    document.body.classList.toggle("mobile-open", mobileOpen);
    if (!mobileOpen) setResetSignal((n) => n + 1);
  }, [mobileOpen]);
  useEffect(() => {
    if (typeof window === "undefined" || forceMobile) return;
    const nav = document.querySelector(".nav-bar");
    if (!nav) return;
    const parents = nav.querySelectorAll(".has-dropdown");
    const onEnter = (e) => {
      const panel = e.currentTarget.querySelector(
        ":scope > .submenu, :scope > .dropdown-panel"
      );
      if (!panel) return;
      panel.classList.remove("open-left", "open-right");
      const { style } = panel;
      const v = style.visibility;
      const d = style.display;
      style.visibility = "hidden";
      style.display = "block";
      requestAnimationFrame(() => {
        const rect = panel.getBoundingClientRect();
        style.visibility = v;
        style.display = d;
        const overR = rect.right > window.innerWidth;
        const overL = rect.left < 0;
        if (overR && !overL) panel.classList.add("open-left");
        else if (overL && !overR) panel.classList.add("open-right");
        else panel.classList.add("open-right");
      });
    };
    parents.forEach((p) => p.addEventListener("mouseenter", onEnter));
    return () => parents.forEach((p) => p.removeEventListener("mouseenter", onEnter));
  }, [forceMobile]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      if (window.innerWidth > 768) closeMobileMenu();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  function MenuBranch({ node, depth = 0, delay = 0, reset, forceMobile: forceMobile2 = false }) {
    const [expanded, setExpanded] = useState(false);
    const hasKids = node.children?.length > 0;
    useEffect(() => setExpanded(false), [reset]);
    const isMobileView = () => forceMobile2 || typeof window !== "undefined" && window.innerWidth <= 768 || mobileOpen;
    const handleToggle = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setExpanded((x) => !x);
    };
    return /* @__PURE__ */ jsxs(
      "div",
      {
        className: `nav-item${hasKids ? " has-dropdown" : ""}${expanded ? " expanded" : ""}`,
        style: { animationDelay: `${0.1 + delay}s` },
        children: [
          /* @__PURE__ */ jsxs("div", { className: "menu-row", style: { display: "flex", alignItems: "center" }, children: [
            hasKids && isMobileView() && /* @__PURE__ */ jsxs(
              "button",
              {
                className: `mini-ham-icon hover-collapse mobile-only${expanded ? " rotated" : ""}`,
                onClick: handleToggle,
                "aria-label": "Toggle Submenu",
                style: { marginRight: "0.5rem" },
                children: [
                  /* @__PURE__ */ jsx("span", { className: "bar top" }),
                  /* @__PURE__ */ jsx("span", { className: "bar mid" }),
                  /* @__PURE__ */ jsx("span", { className: "bar bot" })
                ]
              }
            ),
            /* @__PURE__ */ jsx(
              "a",
              {
                href: node.href || "#",
                className: depth ? "menu-link has-expand" : "nav-link has-expand",
                children: !hasKids ? /* @__PURE__ */ jsxs("span", { className: "leaf-label", children: [
                  /* @__PURE__ */ jsx("span", { className: "leaf-prefix", style: { marginRight: "0.3rem" }, children: "○" }),
                  node.label
                ] }) : node.label
              }
            )
          ] }),
          hasKids && /* @__PURE__ */ jsx(
            "div",
            {
              className: depth === 0 ? "dropdown-panel" : "submenu",
              "data-depth": depth,
              style: { zIndex: 1e3 + depth * 5 },
              children: node.children.map((kid) => /* @__PURE__ */ jsx(
                MenuBranch,
                {
                  node: kid,
                  depth: depth + 1,
                  delay,
                  reset,
                  forceMobile: forceMobile2
                },
                kid.label
              ))
            }
          )
        ]
      }
    );
  }
  return /* @__PURE__ */ jsxs("header", { className: "nav-wrapper", children: [
    mobileOpen && /* @__PURE__ */ jsx("div", { className: "nav-backdrop", onClick: closeMobileMenu }),
    /* @__PURE__ */ jsxs("div", { className: "topbar-inner", children: [
      !mobileOpen && /* @__PURE__ */ jsxs(
        "button",
        {
          className: "hamburger-circle",
          "aria-label": "Open menu",
          onClick: () => setMobileOpen(true),
          children: [
            /* @__PURE__ */ jsx("span", { className: "bar" }),
            /* @__PURE__ */ jsx("span", { className: "bar" }),
            /* @__PURE__ */ jsx("span", { className: "bar" })
          ]
        }
      ),
      /* @__PURE__ */ jsx("nav", { className: `nav-bar ${mobileOpen ? "open" : ""}`, children: mobileOpen ? /* @__PURE__ */ jsxs("div", { className: "drawer-container", children: [
        /* @__PURE__ */ jsx("div", { className: "drawer-header", children: /* @__PURE__ */ jsxs("button", { className: "hamburger-close", onClick: closeMobileMenu, children: [
          /* @__PURE__ */ jsx("span", { className: "line line-1" }),
          /* @__PURE__ */ jsx("span", { className: "line line-2" }),
          /* @__PURE__ */ jsx("span", { className: "line line-3" })
        ] }) }),
        /* @__PURE__ */ jsx("div", { className: "drawer-body", children: siteNav.map((root, i) => /* @__PURE__ */ jsx(
          MenuBranch,
          {
            node: root,
            delay: i * 0.1,
            reset: resetSignal,
            forceMobile
          },
          root.label
        )) }),
        /* @__PURE__ */ jsx(
          "img",
          {
            src: "/images/K4Logo-web-c.png",
            alt: "K4 Studios Logo",
            className: "k4-watermark",
            style: { opacity: 0.25 }
          }
        )
      ] }) : siteNav.map((root, i) => /* @__PURE__ */ jsx(
        MenuBranch,
        {
          node: root,
          delay: i * 0.1,
          reset: resetSignal,
          forceMobile
        },
        root.label
      )) })
    ] })
  ] });
}

const $$Footer = createComponent(($$result, $$props, $$slots) => {
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  return renderTemplate`${maybeRenderHead()}<footer class="bg-[#fff] font-serif text-center w-full" style="font-family: 'Glegoo', serif;" aria-label="Site footer" itemscope itemtype="https://schema.org/Organization" data-astro-cid-sz7xmlte> <div class="mx-auto max-w-xl px-4 pt-8 pb-6" data-astro-cid-sz7xmlte> <div class="flex justify-center gap-5 mb-3 opacity-40" data-astro-cid-sz7xmlte> <a href="https://www.facebook.com/wayne.heim" target="_blank" rel="noopener noreferrer" data-astro-cid-sz7xmlte> <img class="social-icon" src="https://cdn.simpleicons.org/facebook/444444" alt="Facebook" width="20" height="20" itemprop="sameAs" data-astro-cid-sz7xmlte> </a> <a href="https://www.instagram.com/wayneheim" target="_blank" rel="noopener noreferrer" data-astro-cid-sz7xmlte> <img class="social-icon" src="https://cdn.simpleicons.org/instagram/444444" alt="Instagram" width="20" height="20" itemprop="sameAs" data-astro-cid-sz7xmlte> </a> <a href="https://www.threads.net/@wayneheim" target="_blank" rel="noopener noreferrer" data-astro-cid-sz7xmlte> <img class="social-icon" src="https://cdn.simpleicons.org/threads/444444" alt="Threads" width="20" height="20" itemprop="sameAs" data-astro-cid-sz7xmlte> </a> <a href="https://www.pinterest.com/wayneheim" target="_blank" rel="noopener noreferrer" data-astro-cid-sz7xmlte> <img class="social-icon" src="https://cdn.simpleicons.org/pinterest/444444" alt="Pinterest" width="20" height="20" itemprop="sameAs" data-astro-cid-sz7xmlte> </a> <a href="https://500px.com/wayneheim" target="_blank" rel="noopener noreferrer" data-astro-cid-sz7xmlte> <img class="social-icon" src="https://cdn.simpleicons.org/500px/444444" alt="500px" width="20" height="20" itemprop="sameAs" data-astro-cid-sz7xmlte> </a> <a href="/Contact" data-astro-cid-sz7xmlte> <img class="social-icon" src="https://cdn.simpleicons.org/gmail/444444" alt="Email" width="20" height="20" itemprop="sameAs" data-astro-cid-sz7xmlte> </a> </div> <div class="text-xs text-[#2c2c2c] opacity-70" itemprop="name" data-astro-cid-sz7xmlte> <time${addAttribute(currentYear, "datetime")} data-astro-cid-sz7xmlte>© ${currentYear}</time> Wayne Heim / <em data-astro-cid-sz7xmlte>K4 Studios</em>. All rights reserved.
</div> </div> <div class="h-10" data-astro-cid-sz7xmlte></div>  </footer>`;
}, "C:/Users/Wayne/Documents/GitHub/K4-Studios/src/components/Footer.astro", void 0);

export { $$Footer as $, SiteNavMenu as S, $$BaseLayout as a, siteNav as s };
