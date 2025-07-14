// src/utils/replaceLinks.ts
export function replaceLinks(str: string): string {
  return str
    .replace(/\[cw-color\]/g, `<a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War/Color">`)
    .replace(/\[cw-bw\]/g, `<a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War/Black-White">`)
    .replace(/\[civilwar\]/g, `<a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War">`)
    .replace(/\[cowboy-color\]/g, `<a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color">`)
    .replace(/\[cowboy-bw\]/g, `<a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White">`)
    .replace(/\[cowboy\]/g, `<a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits">`)
    .replace(/\[roaring20s\]/g, `<a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s">`)
    .replace(/\[wwii\]/g, `<a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII">`)
    .replace(/\[wwii-portraits\]/g, `<a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits">`)
    .replace(/\[wwii-machines\]/g, `<a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Men-Machines">`)
    .replace(/\[wwii-artofwar\]/g, `<a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Art-of-War">`)
    .replace(/\[facinghistory\]/g, `<a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History">`)
    .replace(/\[painterly\]/g, `<a href="/Galleries/Painterly-Fine-Art-Photography">`)
    .replace(/\[transportation\]/g, `<a href="/Galleries/Painterly-Fine-Art-Photography/Transportation">`)
    .replace(/\[engrained\]/g, `<a href="/Other/K4-Select-Series/Engrained">`)
    .replace(/\[landscapes\]/g, `<a href="/Galleries/Painterly-Fine-Art-Photography/Landscapes">`)
    .replace(/\[landscapes-west\]/g, `<a href="/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West">`)
    .replace(/\[landscapes-intl\]/g, `<a href="/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/International">`)
    .replace(/\[landscapes-mountains\]/g, `<a href="/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains">`)
    .replace(/\[landscapes-water\]/g, `<a href="/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water">`)
    .replace(/\[\/\]/g, `</a>`);
}
