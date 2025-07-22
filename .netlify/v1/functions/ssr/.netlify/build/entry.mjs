import { renderers } from './renderers.mjs';
import { s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_CvSoi7hX.mjs';
import { manifest } from './manifest_uKtR5w2Z.mjs';
import { createExports } from '@astrojs/netlify/ssr-function.js';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/galleries/painterly-fine-art-photography/facing-history/civil-war-portraits/black-white/_id_.astro.mjs');
const _page2 = () => import('./pages/galleries/painterly-fine-art-photography/facing-history/civil-war-portraits/black-white.astro.mjs');
const _page3 = () => import('./pages/galleries/painterly-fine-art-photography/facing-history/civil-war-portraits/color/_id_.astro.mjs');
const _page4 = () => import('./pages/galleries/painterly-fine-art-photography/facing-history/civil-war-portraits/color.astro.mjs');
const _page5 = () => import('./pages/galleries/painterly-fine-art-photography/facing-history/civil-war-portraits.astro.mjs');
const _page6 = () => import('./pages/galleries/painterly-fine-art-photography/facing-history/roaring-20s-portraits/black-white/_id_.astro.mjs');
const _page7 = () => import('./pages/galleries/painterly-fine-art-photography/facing-history/roaring-20s-portraits/black-white.astro.mjs');
const _page8 = () => import('./pages/galleries/painterly-fine-art-photography/facing-history/roaring-20s-portraits/color/_id_.astro.mjs');
const _page9 = () => import('./pages/galleries/painterly-fine-art-photography/facing-history/roaring-20s-portraits/color.astro.mjs');
const _page10 = () => import('./pages/galleries/painterly-fine-art-photography/facing-history/roaring-20s-portraits.astro.mjs');
const _page11 = () => import('./pages/galleries/painterly-fine-art-photography/facing-history/western-cowboy-portraits/black-white/_id_.astro.mjs');
const _page12 = () => import('./pages/galleries/painterly-fine-art-photography/facing-history/western-cowboy-portraits/black-white.astro.mjs');
const _page13 = () => import('./pages/galleries/painterly-fine-art-photography/facing-history/western-cowboy-portraits/color/_id_.astro.mjs');
const _page14 = () => import('./pages/galleries/painterly-fine-art-photography/facing-history/western-cowboy-portraits/color.astro.mjs');
const _page15 = () => import('./pages/galleries/painterly-fine-art-photography/facing-history/western-cowboy-portraits.astro.mjs');
const _page16 = () => import('./pages/galleries/painterly-fine-art-photography/facing-history/wwii.astro.mjs');
const _page17 = () => import('./pages/galleries/painterly-fine-art-photography/facing-history.astro.mjs');
const _page18 = () => import('./pages/galleries/painterly-fine-art-photography/landscapes.astro.mjs');
const _page19 = () => import('./pages/galleries/painterly-fine-art-photography/miscellaneous.astro.mjs');
const _page20 = () => import('./pages/galleries/painterly-fine-art-photography/transportation.astro.mjs');
const _page21 = () => import('./pages/galleries/painterly-fine-art-photography.astro.mjs');
const _page22 = () => import('./pages/other/k4-select-series/engrained.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Black-White/[id].astro", _page1],
    ["src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Black-White/index.astro", _page2],
    ["src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color/[id].astro", _page3],
    ["src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color/index.astro", _page4],
    ["src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits.astro", _page5],
    ["src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White/[id].astro", _page6],
    ["src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White/index.astro", _page7],
    ["src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color/[id].astro", _page8],
    ["src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color/index.astro", _page9],
    ["src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits.astro", _page10],
    ["src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White/[id].astro", _page11],
    ["src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White/index.astro", _page12],
    ["src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/[id].astro", _page13],
    ["src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/index.astro", _page14],
    ["src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits.astro", _page15],
    ["src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII.astro", _page16],
    ["src/pages/Galleries/Painterly-Fine-Art-Photography/Facing-History.astro", _page17],
    ["src/pages/Galleries/Painterly-Fine-Art-Photography/Landscapes.astro", _page18],
    ["src/pages/Galleries/Painterly-Fine-Art-Photography/Miscellaneous.astro", _page19],
    ["src/pages/Galleries/Painterly-Fine-Art-Photography/Transportation.astro", _page20],
    ["src/pages/Galleries/Painterly-Fine-Art-Photography.astro", _page21],
    ["src/pages/Other/K4-Select-Series/Engrained.astro", _page22]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./_noop-actions.mjs'),
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "middlewareSecret": "38946660-ef71-4e3a-99b2-7a64ef617816"
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (_start in serverEntrypointModule) {
	serverEntrypointModule[_start](_manifest, _args);
}

export { __astrojsSsrVirtualEntry as default, pageMap };
