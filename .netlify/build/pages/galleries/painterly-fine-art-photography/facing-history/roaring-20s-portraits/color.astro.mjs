import { c as createComponent, d as createAstro, i as renderComponent, r as renderTemplate } from '../../../../../chunks/astro/server_DU4U1nxe.mjs';
import 'kleur/colors';
import { e as entranceData, $ as $$GalleryShellRoaring20SColor } from '../../../../../chunks/ColorEntranceData_C9Xf0qVb.mjs';
export { renderers } from '../../../../../renderers.mjs';

const $$Astro = createAstro();
const $$Index = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  const match = Astro2.url.pathname.match(/\/(i-[a-zA-Z0-9]+)/);
  const initialImageId = match ? match[1] : "i-k4studios";
  console.log("\u{1F525} initialImageId:", initialImageId);
  return renderTemplate`${renderComponent($$result, "GalleryShell", $$GalleryShellRoaring20SColor, { "breadcrumb": entranceData.breadcrumb, "entranceData": entranceData, "initialImageId": initialImageId })}`;
}, "C:/Users/Wayne/Documents/GitHub/K4-Studios/src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color/index.astro", void 0);

const $$file = "C:/Users/Wayne/Documents/GitHub/K4-Studios/src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color/index.astro";
const $$url = "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
