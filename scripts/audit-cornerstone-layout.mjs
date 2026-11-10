import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const navigation = fs.readFileSync('src/components/blog/WesternDefinitions.astro', 'utf8');
const routes = [...navigation.matchAll(/href: "(\/Blog\/[^\"]+)"/g)].map(match => match[1]);
const requiredContent = {
  '/Blog/what-is-western-fine-art-photography': { inlineImages: 3, faqs: 5 },
};
let server;
let base = process.argv[2];
if (!base) {
  const root = path.resolve(process.env.K4_BUILD_OUT_DIR || 'dist');
  const imageCache = new Map();
  const cacheRoot = path.resolve('tmp/cornerstone-audit/artwork-cache');
  fs.mkdirSync(cacheRoot, { recursive: true });
  let queue = Promise.resolve();
  let lastImageRequest = 0;
  const download = pathname => {
    const file = path.join(cacheRoot, createHash('sha256').update(pathname).digest('hex') + '.jpg');
    if (fs.existsSync(file)) return Promise.resolve({ status: 200, type: 'image/jpeg', bytes: fs.readFileSync(file) });
    const pending = queue.then(async () => {
      const delay = Math.max(0, 2000 - (Date.now() - lastImageRequest));
      if (delay) await new Promise(resolve => setTimeout(resolve, delay));
      lastImageRequest = Date.now();
      let image = await fetch('https://www.k4studios.com' + pathname);
      if (image.status === 429) {
        console.log('Image rate limit: honoring a 60-second cooldown.');
        await image.arrayBuffer();
        await new Promise(resolve => setTimeout(resolve, 60000));
        lastImageRequest = Date.now();
        image = await fetch('https://www.k4studios.com' + pathname);
      }
      const result = { status: image.status, type: image.headers.get('content-type') || '', bytes: Buffer.from(await image.arrayBuffer()) };
      if (result.status === 200 && result.type.startsWith('image/')) fs.writeFileSync(file, result.bytes);
      else console.log('Artwork response:', pathname, result.status, result.type);
      return result;
    });
    queue = pending.catch(() => {});
    return pending;
  };
  server = http.createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname.startsWith('/img/')) {
      try {
        if (!imageCache.has(pathname)) imageCache.set(pathname, download(pathname));
        const image = await imageCache.get(pathname);
        response.writeHead(image.status, { 'Content-Type': image.type });
        return response.end(image.bytes);
      } catch { response.writeHead(502); return response.end(); }
    }
    let file = path.resolve(root, '.' + decodeURIComponent(pathname));
    if (!file.startsWith(root + path.sep)) { response.writeHead(403); return response.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { response.writeHead(404); return response.end(); }
    const type = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.woff2':'font/woff2' }[path.extname(file)];
    if (type) response.setHeader('Content-Type', type);
    fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}
const browser = await chromium.launch();
let failures = 0;
const report = [];
fs.mkdirSync('tmp/cornerstone-audit', { recursive: true });
try {
  for (const [index, route] of routes.entries()) {
    const page = await browser.newPage();
    // Reuse artwork already validated during the paced local audit when checking
    // deployed HTML/CSS, rather than downloading the same images a second time.
    if (!server) await page.route('**/img/**', async request => {
      const pathname = new URL(request.request().url()).pathname;
      const file = path.resolve('tmp/cornerstone-audit/artwork-cache', createHash('sha256').update(pathname).digest('hex') + '.jpg');
      if (fs.existsSync(file)) await request.fulfill({ status: 200, contentType: 'image/jpeg', body: fs.readFileSync(file) });
      else await request.continue();
    });
    for (const width of [1100, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base + route + (base.includes('127.0.0.1') ? '' : '/'), { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.locator('article.cornerstone-standard').waitFor();
      // DOM readiness can precede stylesheet completion on a cold request.
      await page.waitForFunction(() => [...document.querySelectorAll('link[rel="stylesheet"]')]
        .filter(link => new URL(link.href).origin === location.origin)
        .every(link => Boolean(link.sheet)));
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      // Load the complete article, including artwork below the viewport.
      await page.locator('article img').evaluateAll(async images => {
        await Promise.all(images.map(async image => { image.loading = 'eager'; await image.decode().catch(() => {}); }));
      });
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(() => {
        const article = document.querySelector('article.cornerstone-standard');
        if (!article) return { errors: ['standard article missing'] };
        const errors = [];
        const main = document.querySelector('main');
        const bridge = document.querySelector('section.cornerstone-bridge');
        const firstSample = bridge?.querySelector('img');
        const beforeCard = document.createRange();
        if (firstSample) { beforeCard.setStart(main, 0); beforeCard.setEndBefore(firstSample); }
        const wordCount = value => (value.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || []).length;
        const bodyText = fragment => {
          fragment.querySelectorAll('script, style, template, .drawer-mode, .western-series, .collection-dock, footer').forEach(node => node.remove());
          return fragment.textContent;
        };
        // Measure body words, excluding hydration code and site navigation.
        const firstCardFraction = firstSample ? wordCount(bodyText(beforeCard.cloneContents())) / wordCount(bodyText(main.cloneNode(true))) : 1;
        if (firstCardFraction > .15) errors.push('first sample card is later than 15% of the body');
        const hero = document.querySelector('.hero-image-wrap');
        const header = document.querySelector('.landing-header');
        if (Math.abs(hero.getBoundingClientRect().width / header.getBoundingClientRect().width - .8) > .01) errors.push('hero width is not 80% of header');
        if (parseFloat(getComputedStyle(hero).borderTopLeftRadius) !== (innerWidth > 760 ? 18 : 14)) errors.push('hero corners do not match card treatment');
        if (hero.getBoundingClientRect().height < (innerWidth > 760 ? 480 : 320)) errors.push('hero is too short');
        if (parseFloat(getComputedStyle(hero).marginTop) < 16 || parseFloat(getComputedStyle(hero).marginBottom) < 16) errors.push('hero breathing room missing');
        if (!article.querySelector('.cs-body .cs-art img')) errors.push('in-copy illustrations missing');
        const brokenImages = [...article.querySelectorAll('img')].filter(image => !image.naturalWidth).length;
        if (brokenImages) errors.push(`${brokenImages} artwork images failed to load`);
        for (const image of article.querySelectorAll('img')) {
          const id = image.src.match(/\/(i-[A-Za-z0-9]+)\//)?.[1];
          if (!id || !image.closest('a')?.getAttribute('href')?.endsWith('/' + id)) errors.push('essay sample does not link to its piece');
        }
        const rect = article.getBoundingClientRect();
        const pageImages = [...document.querySelectorAll('main img')].filter(image => article.contains(image) || (image.compareDocumentPosition(article) & Node.DOCUMENT_POSITION_FOLLOWING));
        const ids = pageImages.map(image => image.src.match(/\/(i-[A-Za-z0-9]+)\//)?.[1]).filter(Boolean);
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
        if (duplicates.length) errors.push('duplicate artwork: ' + [...new Set(duplicates)].join(', '));
        if (document.documentElement.scrollWidth > innerWidth + 1) errors.push('horizontal overflow');
        for (const gallery of article.querySelectorAll('.example-images, .early-examples-grid')) {
          if (!gallery.querySelector('img') && gallery.getBoundingClientRect().height > 0) errors.push('empty image gallery still visible');
        }
        for (const element of article.querySelectorAll('.cs-art, details')) {
          const r = element.getBoundingClientRect();
          if (r.width && (r.left < rect.left - 1 || r.right > rect.right + 1)) errors.push('element outside article');
        }
        for (const gallery of article.querySelectorAll('.cs-portrait-gallery')) {
          const pictures = [...gallery.querySelectorAll('img')];
          if (innerWidth > 760 && Math.max(...pictures.map(i=>i.getBoundingClientRect().height)) - Math.min(...pictures.map(i=>i.getBoundingClientRect().height)) > 1) errors.push('uneven three-image sample row');
        }
        if (location.pathname.includes('what-is-visual-storytelling-in-photography')) {
          const picture = article.querySelector('.cs-portrait-gallery img');
          if (!picture || picture.naturalWidth >= picture.naturalHeight) errors.push('visual storytelling sample is not a vertical photograph');
        }
        if (location.pathname.includes('what-is-cinematic-western-art') && article.querySelector(':scope > .cs-section:first-child .cs-sample-gallery')) errors.push('unwanted cinematic opening image pair remains');
        let besideLines = 0;
        let underneathLines = 0;
        let closingStarted = false;
        let closingSamples = 0;
        for (const section of article.querySelectorAll('.cs-section')) {
          const title = section.querySelector(':scope > .cs-heading :is(h2, h3)')?.textContent.trim() || '';
          if (/faq|frequently asked/i.test(title) || /^(explore|related|continue|further reading|next steps)\b/i.test(title)) closingStarted = true;
          if (closingStarted) closingSamples += section.querySelectorAll('img, .cs-art').length;
          if (section.querySelectorAll(':scope > .cs-body > .cs-art img').length > 1) errors.push('stacked inline illustrations');
          const proseWords = [...section.querySelectorAll('p, li')].filter(element => !element.closest('.cs-art')).map(element => element.textContent).join(' ').split(/\s+/).filter(Boolean).length;
          if (!closingStarted && /closer look|looks like in practice|visual demonstration/i.test(title) && !section.querySelector('img') && proseWords < 40) errors.push('empty visual demonstration');
          if (title === 'A line, not a place' && !section.querySelector('img')?.src.includes('/i-xqZwcZh/')) errors.push('requested frontier image placement missing');
        }
        if (closingSamples) errors.push('artwork remains in FAQ or closing link sections');
        let gapWords = 0;
        let longestImageFreeWords = 0;
        const visit = node => {
          if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'IMG') { longestImageFreeWords = Math.max(longestImageFreeWords, gapWords); gapWords = 0; }
          if (node.nodeType === Node.TEXT_NODE && !node.parentElement.closest('.cs-art, figcaption, script, style')) gapWords += (node.textContent.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || []).length;
          for (const child of node.childNodes) visit(child);
        };
        for (const section of article.querySelectorAll(':scope > .cs-section')) {
          if (section.classList.contains('cs-closing')) break;
          visit(section);
        }
        longestImageFreeWords = Math.max(longestImageFreeWords, gapWords);
        if (longestImageFreeWords > 350) errors.push(`main essay image gap ${longestImageFreeWords} words exceeds 350`);
        for (const body of article.querySelectorAll('.cs-body')) {
          const image = body.querySelector('.cs-art');
          const art = image.getBoundingClientRect();
          const br = body.getBoundingClientRect();
          if (!image.querySelector('img')) errors.push('text callout incorrectly treated as an illustration');
          const prose = [...body.querySelectorAll('p, li')].filter(element => !image.contains(element)).map(element => element.textContent).join(' ').trim();
          if (!prose) errors.push('orphan illustration without wrapping prose');
          const desktop = innerWidth > 760;
          if (getComputedStyle(image).float !== (desktop ? 'right' : 'none')) errors.push('wrong inline-image float');
          if (getComputedStyle(body).display === 'grid' || body.querySelector('.cs-copy')) errors.push('fixed text column remains');
          const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const node = walker.currentNode;
            if (image.contains(node) || !node.textContent.trim() || !node.parentElement.closest('p, li')) continue;
            const range = document.createRange(); range.selectNodeContents(node);
            for (const line of range.getClientRects()) {
              if (!line.width) continue;
              const alongside = line.top < art.bottom && line.bottom > art.top;
              if (alongside && desktop) {
                besideLines++;
                if (line.right > art.left - 1) errors.push('text overlaps image');
                if (art.left - br.left < 300) errors.push('squeezed prose beside image');
              }
              if (desktop && line.top >= art.bottom && line.right > art.left + 20) underneathLines++;
            }
          }
        }
        const flatten = data => Array.isArray(data) ? data.flatMap(flatten) : data?.['@graph'] ? data['@graph'].flatMap(flatten) : [data];
        const schema = [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(script => flatten(JSON.parse(script.textContent)));
        const entities = schema.filter(node => node?.['@type'] === 'FAQPage').flatMap(node => node.mainEntity || []);
        const details = [...article.querySelectorAll('details')];
        if (!details.length) errors.push('FAQ section missing');
        if (entities.length !== details.length) errors.push(`FAQ mismatch: schema ${entities.length}, visible ${details.length}`);
        const normalize = value => value.replace(/\s+/g, ' ').trim();
        for (const entity of entities) {
          const detail = details.find(detail => normalize(detail.querySelector('summary').textContent) === normalize(entity.name));
          if (!detail) { errors.push('schema question missing from accordion'); continue; }
          const clone = detail.cloneNode(true); clone.querySelector('summary').remove();
          if (normalize(clone.textContent) !== normalize(entity.acceptedAnswer.text.replace(/<[^>]*>/g, ' '))) errors.push('FAQ answer differs from schema');
        }
        return { errors: [...new Set(errors)], width: Math.round(rect.width), faq: details.length, illustratedSections: article.querySelectorAll('.cs-body').length, firstCardFraction, besideLines, underneathLines, longestImageFreeWords, closingSamples, duplicates: [...new Set(duplicates)] };
      });
      const required = requiredContent[route];
      if (required && result.illustratedSections < required.inlineImages) result.errors.push('required in-copy illustrations missing');
      if (required && result.faq !== required.faqs) result.errors.push('required FAQ section missing or incomplete');
      if (result.errors.length) failures++;
      console.log(`${result.errors.length ? 'FAIL' : 'PASS'} ${index + 1} ${width}px ${route} ${JSON.stringify(result)}`);
      report.push({ number: index + 1, route, viewport: width, ...result });
      if (width === 1100) await page.locator('.hero-image-wrap').screenshot({path:`tmp/cornerstone-audit/hero-${index + 1}.png`});
      if (width === 1100 && index === 7) await page.locator('.cornerstone-bridge').screenshot({path:'tmp/cornerstone-audit/cowboy-bridge-crops.png'});
      if (width === 1100 && [0, 11, 19].includes(index)) await page.screenshot({ path: `tmp/cornerstone-audit/template-preview-${index + 1}.png` });
      await page.screenshot({ path: `tmp/cornerstone-audit/${index + 1}-${width}.png`, fullPage: true });
      const proofSections = {
        3: 'What Defines Western Fine Art Photography',
        6: 'The Real Beginnings of the Cowboy',
        9: 'Black and White Cowboy Portraits',
        11: 'Why the Distinction Matters',
        12: 'Landscape as Emotional Environment — The Land as Participant',
        13: 'What This Looks Like in Practice',
        15: 'What This Looks Like in Practice',
        16: 'What This Looks Like in Practice',
        20: 'A line, not a place',
      };
      if (width === 1100 && proofSections[index + 1]) {
        await page.locator('.cs-section').filter({ has: page.getByRole('heading', { name: proofSections[index + 1], exact: true }) }).screenshot({ path: `tmp/cornerstone-audit/proof-${index + 1}.png` });
      }
      if (width === 1100 && index === 3) await page.locator('.cs-faq-section').screenshot({ path: 'tmp/cornerstone-audit/proof-4-faq.png' });
      if (width === 1100 && index === 0) {
        await page.locator('.cs-faq-section').screenshot({ path: 'tmp/cornerstone-audit/western-art-faq.png' });
        await page.locator('.cs-section').filter({ has: page.getByRole('heading', { name: 'Explore Western Themes in Practice', exact: true }) }).screenshot({ path: 'tmp/cornerstone-audit/western-art-links.png' });
      }
      if (width === 1100 && index === 19) {
        const section = page.locator('.cs-section').filter({ has: page.getByRole('heading', { name: '1890, and what Turner said', exact: true }) });
        await section.screenshot({ path: 'tmp/cornerstone-audit/frontier-wrapping.png' });
      }
      if (result.faq) {
        const detail = page.locator('article details').first();
        await detail.locator('summary').click();
        if (!await detail.evaluate(element => element.open)) { failures++; console.log('FAIL accordion does not open'); }
      }
    }
    await page.close();
  }
} finally { await browser.close(); server?.close(); }
console.log(`Checked ${routes.length} pages at desktop and phone widths; ${failures} failures.`);
fs.writeFileSync('tmp/cornerstone-audit/results.json', JSON.stringify({ base, failures, pages: report }, null, 2));
const rows = routes.map((route, index) => {
  const desktop = report.find(page => page.number === index + 1 && page.viewport === 1100);
  const phone = report.find(page => page.number === index + 1 && page.viewport === 390);
  const passed = desktop && phone && !desktop.errors.length && !phone.errors.length;
  return `| ${index + 1} | [${route.split('/').pop()}](${base}${route}) | ${passed ? 'PASS' : 'FAIL'} | ${desktop?.duplicates.length ?? '?'} | ${desktop?.closingSamples ?? '?'} | ${desktop?.longestImageFreeWords ?? '?'} | ${desktop?.besideLines ?? 0} / ${desktop?.underneathLines ?? 0} | ${desktop?.faq ?? '?'} | [Desktop](${index + 1}-1100.png) · [Phone](${index + 1}-390.png) |`;
});
fs.writeFileSync('tmp/cornerstone-audit/report.md', [
  '# Cornerstone Series 1–20: layout audit', '',
  `Checked: ${base}. Desktop: 1100px. Phone: 390px. Failures: ${failures}.`, '',
  'Checks: every article has in-copy illustrations and FAQs; main-essay image-free spans are at most 350 prose words; no orphan illustrations or empty demonstrations; editorial samples stop before the first FAQ or closing Explore/related-links section; inline images float within main prose and text can return to full width beneath them; no duplicate artwork; no horizontal overflow; visible FAQ answers match schema and controls open.', '',
  'Text-line counts measure actual rendered prose beside / underneath inline artwork. Zero means the page has no applicable lines (for example, a standalone sample gallery), not a fixed column.', '',
  '| # | Article | Desktop + phone | Duplicate artwork | Samples in closing sections | Max image gap (words) | Beside / underneath lines | FAQs | Screenshots |',
  '|---|---|---|---|---|---|---|---|---|', ...rows, '',
  'First-card position is measured by body words before the first bridge image, excluding hydration scripts and site navigation. Every page must be within 15%. Per-page values are in results.json.',
].join('\n'));
process.exitCode = failures ? 1 : 0;
