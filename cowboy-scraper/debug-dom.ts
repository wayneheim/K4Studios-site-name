import puppeteer from "puppeteer-core";

/**
 * DOM DEBUG - Just dump what we can see on the page
 */

async function main() {
  console.log("🔍 DOM DEBUG\n");

  const browser = await puppeteer.connect({ browserURL: "http://localhost:9222" });
  const pages = await browser.pages();
  
  let page = pages[pages.length - 1];
  for (const p of pages) {
    if (p.url().includes("smugmug.com")) {
      page = p;
      break;
    }
  }

  console.log(`Page: ${page.url()}\n`);

  const debug = await page.evaluate(() => {
    const info: any = {
      allImgs: [],
      dataImageKeys: [],
      backgroundImages: [],
      anchorsWithId: [],
    };

    // All img tags
    document.querySelectorAll('img').forEach((img, i) => {
      if (i < 20) {
        info.allImgs.push({
          src: (img as HTMLImageElement).src?.slice(0, 120),
          alt: (img as HTMLImageElement).alt?.slice(0, 50),
          className: img.className?.slice(0, 50),
        });
      }
    });

    // All data-imagekey elements
    document.querySelectorAll('[data-imagekey]').forEach((el, i) => {
      if (i < 20) {
        const key = el.getAttribute('data-imagekey');
        info.dataImageKeys.push({
          key,
          tagName: el.tagName,
          className: (el as HTMLElement).className?.slice(0, 50),
          innerHTML: el.innerHTML?.slice(0, 100),
        });
      }
    });

    // Elements with background-image
    document.querySelectorAll('*').forEach((el, i) => {
      const bg = (el as HTMLElement).style?.backgroundImage;
      if (bg && bg.includes('smugmug') && info.backgroundImages.length < 10) {
        info.backgroundImages.push({
          tagName: el.tagName,
          className: (el as HTMLElement).className?.slice(0, 50),
          bg: bg.slice(0, 120),
        });
      }
    });

    // Anchors with /i- pattern
    document.querySelectorAll('a[href*="/i-"]').forEach((a, i) => {
      if (i < 10) {
        const href = a.getAttribute('href');
        const img = a.querySelector('img');
        info.anchorsWithId.push({
          href: href?.slice(0, 80),
          hasImg: !!img,
          imgSrc: (img as HTMLImageElement)?.src?.slice(0, 100),
        });
      }
    });

    return info;
  });

  console.log("=== ALL IMG TAGS (first 20) ===");
  debug.allImgs.forEach((img: any, i: number) => {
    console.log(`[${i}] src: ${img.src}`);
    console.log(`    alt: ${img.alt}`);
    console.log(`    class: ${img.className}`);
  });

  console.log("\n=== DATA-IMAGEKEY ELEMENTS (first 20) ===");
  debug.dataImageKeys.forEach((el: any, i: number) => {
    console.log(`[${i}] key: ${el.key}, tag: ${el.tagName}, class: ${el.className}`);
  });

  console.log("\n=== BACKGROUND IMAGES (first 10) ===");
  debug.backgroundImages.forEach((el: any, i: number) => {
    console.log(`[${i}] tag: ${el.tagName}, class: ${el.className}`);
    console.log(`    bg: ${el.bg}`);
  });

  console.log("\n=== ANCHORS WITH /i- (first 10) ===");
  debug.anchorsWithId.forEach((a: any, i: number) => {
    console.log(`[${i}] href: ${a.href}`);
    console.log(`    hasImg: ${a.hasImg}, imgSrc: ${a.imgSrc}`);
  });
}

main().catch(console.error);
