import { c as createComponent, d as createAstro, i as renderComponent, r as renderTemplate } from '../../../../../../chunks/astro/server_DU4U1nxe.mjs';
import 'kleur/colors';
import { e as entranceData, $ as $$GalleryShellCivilWarColor } from '../../../../../../chunks/ColorEntranceData_B1f-ZQM8.mjs';
import { g as galleryData } from '../../../../../../chunks/Color_B0tZ5rnE.mjs';
export { renderers } from '../../../../../../renderers.mjs';

const $$Astro = createAstro();
async function getStaticPaths() {
  return galleryData.map((img) => ({
    params: { id: img.id }
  }));
}
const $$id = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$id;
  const { id } = Astro2.params;
  const isValidId = galleryData.some((img) => img.id === id);
  if (!isValidId) throw new Error(`Image with id ${id} not found.`);
  return renderTemplate`${renderComponent($$result, "GalleryShell", $$GalleryShellCivilWarColor, { "breadcrumb": entranceData.breadcrumb, "entranceData": entranceData, "initialImageId": id })}`;
}, "C:/Users/Wayne/Documents/GitHub/K4-Studios/src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War/Color/[id].astro", void 0);

const $$file = "C:/Users/Wayne/Documents/GitHub/K4-Studios/src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War/Color/[id].astro";
const $$url = "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War/Color/[id]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$id,
  file: $$file,
  getStaticPaths,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
