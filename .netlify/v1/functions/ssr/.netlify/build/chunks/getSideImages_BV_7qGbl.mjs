import { _ as __vite_glob_0_26, a as __vite_glob_0_25, b as __vite_glob_0_24, c as __vite_glob_0_23, d as __vite_glob_0_22, e as __vite_glob_0_21, f as __vite_glob_0_20, g as __vite_glob_0_19, h as __vite_glob_0_18, i as __vite_glob_0_17, j as __vite_glob_0_16, k as __vite_glob_0_15, l as __vite_glob_0_12, m as __vite_glob_0_11, n as __vite_glob_0_10, o as __vite_glob_0_9, p as __vite_glob_0_8, q as __vite_glob_0_7, r as __vite_glob_0_2, s as __vite_glob_0_1, t as __vite_glob_0_0 } from './K4-Sem_DXtEsQNi.mjs';
import { _ as __vite_glob_0_3 } from './Black-White_KdVP8gLQ.mjs';
import { _ as __vite_glob_0_4 } from './Color_B0tZ5rnE.mjs';
import { _ as __vite_glob_0_5 } from './Black-White_CacyG34n.mjs';
import { _ as __vite_glob_0_6 } from './Color_D9UJrp0k.mjs';
import { _ as __vite_glob_0_13 } from './Black-White_BdpB_JkH.mjs';
import { _ as __vite_glob_0_14 } from './Color_CB1i983B.mjs';
import { s as siteNav } from './Footer_VeJuj4uH.mjs';

function findGallerySourcesRecursive(node) {
  let out = [];
  if (Array.isArray(node)) {
    for (const n of node) out = out.concat(findGallerySourcesRecursive(n));
    return out;
  }
  if (node.type === "gallery-source") return [node];
  if (node.children) return findGallerySourcesRecursive(node.children);
  return [];
}
function getAllGallerySources(sectionPath) {
  function findNode(tree) {
    for (const node2 of tree) {
      if (node2.href === sectionPath) return node2;
      if (node2.children) {
        const found = findNode(node2.children);
        if (found) return found;
      }
    }
    return null;
  }
  const node = findNode(siteNav);
  if (!node) return [];
  return findGallerySourcesRecursive(node);
}
function shuffle(arr) {
  let a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function getSmartFeatheredImages({
  galleryChildren,
  sectionPath,
  headingCount,
  excludeIds = /* @__PURE__ */ new Set()
}) {
  const allGalleryData = /* #__PURE__ */ Object.assign({"../../data/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Mountains/Mountains.mjs": __vite_glob_0_0,"../../data/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Sunsets/Sunsets.mjs": __vite_glob_0_1,"../../data/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Water/Water.mjs": __vite_glob_0_2,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War/Black-White.mjs": __vite_glob_0_3,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War/Color.mjs": __vite_glob_0_4,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White.mjs": __vite_glob_0_5,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color.mjs": __vite_glob_0_6,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White.mjs": __vite_glob_0_7,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color.mjs": __vite_glob_0_8,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White.mjs": __vite_glob_0_9,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color.mjs": __vite_glob_0_10,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Black-White.mjs": __vite_glob_0_11,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Color.mjs": __vite_glob_0_12,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs": __vite_glob_0_13,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs": __vite_glob_0_14,"../../data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/International/Gallery.mjs": __vite_glob_0_15,"../../data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Midwest/Gallery.mjs": __vite_glob_0_16,"../../data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Northeast/Gallery.mjs": __vite_glob_0_17,"../../data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery.mjs": __vite_glob_0_18,"../../data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains/Mountains.mjs": __vite_glob_0_19,"../../data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water/Water.mjs": __vite_glob_0_20,"../../data/Galleries/Painterly-Fine-Art-Photography/Miscellaneous/Portraits.mjs": __vite_glob_0_21,"../../data/Galleries/Painterly-Fine-Art-Photography/Transportation/Cars.mjs": __vite_glob_0_22,"../../data/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Black-White.mjs": __vite_glob_0_23,"../../data/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Color.mjs": __vite_glob_0_24,"../../data/Galleries/zPainterly-Western-Cowboy-Portraits/BlackWhite.mjs": __vite_glob_0_25,"../../data/Galleries/zPainterly-Western-Cowboy-Portraits/Color.mjs": __vite_glob_0_26});
  const grouped = {};
  for (const gallery of galleryChildren) {
    const split = gallery.href.split("/");
    const parent = split.slice(0, -1).join("/") || "root";
    if (!grouped[parent]) grouped[parent] = [];
    grouped[parent].push(gallery);
  }
  const groupArrs = shuffle(Object.values(grouped).map((gals) => shuffle(gals)));
  const galleriesWithImages = groupArrs.map(
    (group) => group.map((child) => {
      const filePath = "../../data" + child.href + ".mjs";
      const mod = allGalleryData[filePath];
      const allImages = (mod?.galleryData || mod?.default || []).filter(
        (img) => img.id && img.id !== "i-k4studios" && !excludeIds.has(img.id)
      );
      const highRated = allImages.filter((img) => (img.rating ?? 0) >= 4);
      const lowRated = allImages.filter((img) => (img.rating ?? 0) < 4);
      return { high: shuffle(highRated), low: shuffle(lowRated) };
    })
  );
  const chosen = [];
  let idx = 0, inner = 0;
  while (chosen.length < headingCount && groupArrs.length && idx < headingCount * 20) {
    for (let g = 0; g < groupArrs.length && chosen.length < headingCount; g++) {
      const group = galleriesWithImages[g];
      if (!group.length) continue;
      const gallery = group[inner % group.length];
      let img;
      if (gallery.high.length) img = gallery.high.shift();
      else if (gallery.low.length) img = gallery.low.shift();
      if (img && !excludeIds.has(img.id)) {
        chosen.push(img);
        excludeIds.add(img.id);
      }
    }
    inner++;
    idx++;
  }
  return chosen.map((img) => ({
    ...img,
    href: `${sectionPath}/${img.id}`
  }));
}
function getClassicFeatheredImages({
  galleryChildren,
  sectionPath,
  headingCount,
  excludeIds = /* @__PURE__ */ new Set()
}) {
  const allGalleryData = /* #__PURE__ */ Object.assign({"../../data/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Mountains/Mountains.mjs": __vite_glob_0_0,"../../data/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Sunsets/Sunsets.mjs": __vite_glob_0_1,"../../data/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Water/Water.mjs": __vite_glob_0_2,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War/Black-White.mjs": __vite_glob_0_3,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War/Color.mjs": __vite_glob_0_4,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White.mjs": __vite_glob_0_5,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color.mjs": __vite_glob_0_6,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White.mjs": __vite_glob_0_7,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color.mjs": __vite_glob_0_8,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White.mjs": __vite_glob_0_9,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color.mjs": __vite_glob_0_10,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Black-White.mjs": __vite_glob_0_11,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Color.mjs": __vite_glob_0_12,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs": __vite_glob_0_13,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs": __vite_glob_0_14,"../../data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/International/Gallery.mjs": __vite_glob_0_15,"../../data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Midwest/Gallery.mjs": __vite_glob_0_16,"../../data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Northeast/Gallery.mjs": __vite_glob_0_17,"../../data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery.mjs": __vite_glob_0_18,"../../data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains/Mountains.mjs": __vite_glob_0_19,"../../data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water/Water.mjs": __vite_glob_0_20,"../../data/Galleries/Painterly-Fine-Art-Photography/Miscellaneous/Portraits.mjs": __vite_glob_0_21,"../../data/Galleries/Painterly-Fine-Art-Photography/Transportation/Cars.mjs": __vite_glob_0_22,"../../data/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Black-White.mjs": __vite_glob_0_23,"../../data/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Color.mjs": __vite_glob_0_24,"../../data/Galleries/zPainterly-Western-Cowboy-Portraits/BlackWhite.mjs": __vite_glob_0_25,"../../data/Galleries/zPainterly-Western-Cowboy-Portraits/Color.mjs": __vite_glob_0_26});
  const galleriesWithImages = shuffle(galleryChildren).map((child) => {
    const filePath = "../../data" + child.href + ".mjs";
    const mod = allGalleryData[filePath];
    const allImages = (mod?.galleryData || mod?.default || []).filter(
      (img) => img.id && img.id !== "i-k4studios" && !excludeIds.has(img.id)
    );
    const highRated = allImages.filter((img) => (img.rating ?? 0) >= 4);
    const lowRated = allImages.filter((img) => (img.rating ?? 0) < 4);
    return { high: shuffle(highRated), low: shuffle(lowRated) };
  });
  const chosen = [];
  let idx = 0;
  while (chosen.length < headingCount && galleriesWithImages.some((g) => g.high.length || g.low.length)) {
    const gallery = galleriesWithImages[idx % galleriesWithImages.length];
    let img;
    if (gallery.high.length) img = gallery.high.shift();
    else if (gallery.low.length) img = gallery.low.shift();
    if (img && !excludeIds.has(img.id)) {
      chosen.push(img);
      excludeIds.add(img.id);
    }
    idx++;
    if (idx > headingCount * 10) break;
  }
  return chosen.map((img) => ({
    ...img,
    href: `${sectionPath}/${img.id}`
  }));
}
function getSideImages({
  sectionPath,
  headingCount,
  excludeIds = /* @__PURE__ */ new Set()
}) {
  const galleryChildren = getAllGallerySources(sectionPath);
  if (!galleryChildren.length) return [];
  let featheredImages = [];
  let slotsLeft = headingCount;
  const isPainterlyOrFacing = sectionPath === "/Galleries/Painterly-Fine-Art-Photography" || sectionPath === "/Galleries/Painterly-Fine-Art-Photography/Facing-History";
  const wcpGalleries = galleryChildren.filter(
    (child) => child.href.includes("/Western-Cowboy-Portraits/")
  );
  if (isPainterlyOrFacing && wcpGalleries.length) {
    const allGalleryData = /* #__PURE__ */ Object.assign({"../../data/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Mountains/Mountains.mjs": __vite_glob_0_0,"../../data/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Sunsets/Sunsets.mjs": __vite_glob_0_1,"../../data/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Water/Water.mjs": __vite_glob_0_2,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War/Black-White.mjs": __vite_glob_0_3,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War/Color.mjs": __vite_glob_0_4,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White.mjs": __vite_glob_0_5,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color.mjs": __vite_glob_0_6,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White.mjs": __vite_glob_0_7,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color.mjs": __vite_glob_0_8,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White.mjs": __vite_glob_0_9,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color.mjs": __vite_glob_0_10,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Black-White.mjs": __vite_glob_0_11,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Color.mjs": __vite_glob_0_12,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs": __vite_glob_0_13,"../../data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs": __vite_glob_0_14,"../../data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/International/Gallery.mjs": __vite_glob_0_15,"../../data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Midwest/Gallery.mjs": __vite_glob_0_16,"../../data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/Northeast/Gallery.mjs": __vite_glob_0_17,"../../data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery.mjs": __vite_glob_0_18,"../../data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains/Mountains.mjs": __vite_glob_0_19,"../../data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water/Water.mjs": __vite_glob_0_20,"../../data/Galleries/Painterly-Fine-Art-Photography/Miscellaneous/Portraits.mjs": __vite_glob_0_21,"../../data/Galleries/Painterly-Fine-Art-Photography/Transportation/Cars.mjs": __vite_glob_0_22,"../../data/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Black-White.mjs": __vite_glob_0_23,"../../data/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Color.mjs": __vite_glob_0_24,"../../data/Galleries/zPainterly-Western-Cowboy-Portraits/BlackWhite.mjs": __vite_glob_0_25,"../../data/Galleries/zPainterly-Western-Cowboy-Portraits/Color.mjs": __vite_glob_0_26});
    const wcpImages = wcpGalleries.flatMap((child) => {
      const filePath = "../../data" + child.href + ".mjs";
      const mod = allGalleryData[filePath];
      return (mod?.galleryData || mod?.default || []).filter(
        (img) => img.id && img.id !== "i-k4studios" && !excludeIds.has(img.id)
      );
    });
    if (wcpImages.length) {
      const highRated = wcpImages.filter((img) => (img.rating ?? 0) >= 4);
      const pick = shuffle(highRated).pop() || shuffle(wcpImages).pop();
      if (pick) {
        featheredImages.push(pick);
        excludeIds.add(pick.id);
        slotsLeft--;
      }
    }
  }
  const galleryChildrenNoWCP = galleryChildren.filter(
    (child) => !child.href.includes("/Western-Cowboy-Portraits/")
  );
  try {
    const moreImages = galleryChildrenNoWCP.length > 7 ? getSmartFeatheredImages({
      galleryChildren: galleryChildrenNoWCP,
      sectionPath,
      headingCount: slotsLeft,
      excludeIds
    }) : getClassicFeatheredImages({
      galleryChildren: galleryChildrenNoWCP,
      sectionPath,
      headingCount: slotsLeft,
      excludeIds
    });
    return [...featheredImages, ...moreImages];
  } catch (err) {
    const moreImages = getClassicFeatheredImages({
      galleryChildren: galleryChildrenNoWCP,
      sectionPath,
      headingCount: slotsLeft,
      excludeIds
    });
    return [...featheredImages, ...moreImages];
  }
}

export { getSideImages as g };
