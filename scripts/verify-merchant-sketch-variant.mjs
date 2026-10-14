import { chromium } from 'playwright';

const baseUrl = 'https://www.k4studios.com/Galleries/Fine-Art-Photography/Transportation/Cars/i-zwNxLnH';
const urls = [baseUrl, `${baseUrl}-sketch`];

const browser = await chromium.launch({ headless: true });

try {
  for (const url of urls) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.waitForSelector('[data-cart-btn]', { state: 'visible', timeout: 30_000 });

    const imageBox = await page.locator('[data-zoom-btn]').boundingBox();
    const pricingBox = await page.locator('[data-cart-btn]').boundingBox();
    const isMerchantVariant = url.endsWith('-sketch');
    const source = await page.content();
    const contentChecks = {
      status: response?.status(),
      merchantHeader: response?.headers()['x-k4-merchant-variant'] || null,
      licenseSchema: (source.match(/data-k4-schema="artwork-license"/g) || []).length,
      productSchema: (source.match(/data-k4-schema="sketch-product"/g) || []).length,
      moreAbout: await page.locator('details.more-about-image').count(),
      collectorNotes: await page.getByText('Collector Notes:', { exact: true }).count(),
      relatedNavigation: await page.locator('nav.image-journey-footer').count(),
    };

    await page.locator('[data-cart-btn]').click();
    await page.waitForTimeout(1_500);
    const orderVisible = await page.locator('h2').filter({ hasText: 'Order Options' }).evaluateAll(
      (elements) => elements.some((element) => Boolean(element.offsetParent))
    );

    await page.reload({ waitUntil: 'networkidle', timeout: 120_000 });
    await page.locator('[data-zoom-btn]').click();
    await page.waitForTimeout(1_000);
    const zoomOpen = await page.locator('body').evaluate((element) => element.classList.contains('zoom-open'));

    if (isMerchantVariant) {
      if (contentChecks.status !== 200 || contentChecks.licenseSchema !== 0 || contentChecks.productSchema !== 1) {
        throw new Error(`Merchant schema check failed: ${JSON.stringify(contentChecks)}`);
      }
      if (contentChecks.moreAbout !== 1 || contentChecks.collectorNotes !== 0 || contentChecks.relatedNavigation !== 0) {
        throw new Error(`Merchant editorial check failed: ${JSON.stringify(contentChecks)}`);
      }
    }
    if (!imageBox || !pricingBox || !orderVisible || !zoomOpen || pageErrors.length) {
      throw new Error(`Interactive page check failed: ${JSON.stringify({ imageBox, pricingBox, orderVisible, zoomOpen, pageErrors })}`);
    }

    console.log(JSON.stringify({ url, finalUrl: page.url(), contentChecks, imageBox, pricingBox, orderVisible, zoomOpen, pageErrors }));
    await page.close();
  }

  const misplacedUrl = 'https://www.k4studios.com/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White/i-zwNxLnH-sketch';
  const expectedCanonicalUrl = `${baseUrl}-sketch`;
  const redirectPage = await browser.newPage();
  const redirectResponse = await redirectPage.goto(misplacedUrl, { waitUntil: 'networkidle', timeout: 120_000 });
  if (redirectPage.url() !== expectedCanonicalUrl) {
    throw new Error(`Merchant smart-404 failed: expected ${expectedCanonicalUrl}, got ${redirectPage.url()}`);
  }
  console.log(JSON.stringify({
    misplacedUrl,
    finalUrl: redirectPage.url(),
    finalStatus: redirectResponse?.status(),
    redirected: redirectResponse?.request().redirectedFrom() !== null,
  }));
  await redirectPage.close();
} finally {
  await browser.close();
}
