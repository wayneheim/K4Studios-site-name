import { chromium } from "playwright";

const expeditionUrl = "https://www.k4studios.com/Other/Expeditions/echoes-of-the-west-2026";
const regularUrl = "https://www.k4studios.com/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color/i-kWVzc6g";
const engrainedUrl = "https://www.k4studios.com/Other/K4-Select-Series/Engrained/Engrained-Series/i-Lk9XZKB";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(expeditionUrl, { waitUntil: "networkidle", timeout: 60000 });
  await page.locator("[data-lightbox-open]").first().click();
  await page.locator("[data-lightbox-order]").click();
  await page.getByRole("heading", { name: "Expedition Print Options" }).waitFor();
  const expeditionButtons = page.getByRole("button", { name: /Add to Cart/i });
  if (await expeditionButtons.count() !== 5) throw new Error("Expedition modal does not contain exactly five products.");
  await expeditionButtons.nth(2).click();

  await page.goto(regularUrl, { waitUntil: "networkidle", timeout: 60000 });
  await page.getByRole("button", { name: "Order", exact: true }).click();
  await page.getByRole("heading", { name: "Fine Art Print Options" }).waitFor();

  const regularButtons = page.getByRole("button", { name: /Add to Cart/i });
  await regularButtons.first().waitFor({ timeout: 15000 });
  const regularCount = await regularButtons.count();
  if (regularCount !== 3) throw new Error(`Expected three standard products on the test image; found ${regularCount}.`);
  const modalText = await page.getByRole("heading", { name: "Fine Art Print Options" }).locator("xpath=ancestor::section").innerText();
  for (const forbidden of ["$10", "$40", "$45", "$70"]) {
    if (modalText.includes(forbidden)) throw new Error(`Regular modal leaked Expedition price ${forbidden}.`);
  }

  await regularButtons.first().click();
  const cartButton = page.getByRole("button").filter({ hasText: "Cart" }).first();
  await cartButton.waitFor();
  await cartButton.click();
  await page.getByRole("heading", { name: "Your Cart" }).waitFor();
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll("[role='dialog'] img")];
    return images.length >= 2 && images.every((image) => image.complete && image.naturalWidth > 0);
  }, null, { timeout: 15000 });
  const previewHealth = await page.locator("section[aria-label='Cart'] img, [role='dialog'] img").evaluateAll((images) => images.map((image) => ({
    src: image.currentSrc || image.src,
    complete: image.complete,
    naturalWidth: image.naturalWidth,
  })));
  if (previewHealth.length < 2 || previewHealth.some((image) => !image.complete || image.naturalWidth < 1)) {
    throw new Error(`Mixed-cart preview failed: ${JSON.stringify(previewHealth)}`);
  }

  await page.goto(engrainedUrl, { waitUntil: "networkidle", timeout: 60000 });
  await page.getByRole("button", { name: "Order", exact: true }).click();
  const engrainedModal = page.locator("[data-k4-native-collection-cart]");
  await engrainedModal.waitFor({ timeout: 15000 });
  const engrainedText = await engrainedModal.innerText();
  if (!engrainedText.includes('16" x 24"') || !engrainedText.includes("$1,650")) {
    throw new Error("Direct Engrained modal did not preserve the artwork-specific size and price.");
  }
  if (engrainedText.includes("Contact Us to Order") || await engrainedModal.locator('a[href^="mailto:"]').count()) {
    throw new Error("Direct Engrained modal still exposes the legacy email-to-order flow.");
  }
  if (engrainedText.includes("Also Available in the Engrained Series")) {
    throw new Error("Dedicated Engrained page incorrectly labels its primary product as a cross-listing.");
  }
  if (!engrainedText.includes("Engrained Series")) {
    throw new Error("Dedicated Engrained page is missing its primary series label.");
  }
  if (await engrainedModal.locator(`a[href="${engrainedUrl}"]`).count()) {
    throw new Error("Dedicated Engrained modal links back to its current page.");
  }
  await engrainedModal.getByText("Similar work is available as part of the", { exact: false }).waitFor({ timeout: 15000 });
  const otherSeriesText = await engrainedModal.getByText("Similar work is available as part of the", { exact: false }).innerText();
  for (const seriesName of ["Sketch", "Foundation", "Chronicle"]) {
    if (!otherSeriesText.includes(seriesName)) throw new Error(`Engrained reverse cross-link omitted ${seriesName}.`);
  }
  await engrainedModal.getByRole("link", { name: "Explore Other Series" }).waitFor();
  const increaseEngrained = engrainedModal.getByRole("button", { name: /Increase .* quantity/i });
  if (await increaseEngrained.isDisabled()) {
    throw new Error("Direct Engrained quantity control is still capped at one.");
  }
  await increaseEngrained.click();
  const engrainedButtons = engrainedModal.getByRole("button", { name: /Add to Cart/i });
  if (await engrainedButtons.count() !== 1) {
    throw new Error(`Expected one direct Engrained product; found ${await engrainedButtons.count()}.`);
  }
  await engrainedButtons.click();

  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobilePage.goto(regularUrl, { waitUntil: "networkidle", timeout: 60000 });
  await mobilePage.getByRole("button", { name: "Order", exact: true }).click();
  const mobileModal = mobilePage.locator("[data-k4-native-collection-cart]");
  await mobileModal.waitFor({ timeout: 15000 });
  const mobileRows = await mobileModal.locator("[data-k4-product-option]").evaluateAll((rows) => rows.map((row) => {
    const size = row.querySelector("[data-k4-option-size]")?.getBoundingClientRect();
    const price = row.querySelector("[data-k4-option-price]")?.getBoundingClientRect();
    return {
      rowWidth: row.getBoundingClientRect().width,
      scrollWidth: row.scrollWidth,
      sizeRight: size?.right || 0,
      priceLeft: price?.left || 0,
    };
  }));
  if (!mobileRows.length || mobileRows.some((row) => row.scrollWidth > row.rowWidth + 1 || row.sizeRight > row.priceLeft)) {
    throw new Error(`Mobile product options overlap or overflow: ${JSON.stringify(mobileRows)}`);
  }
  await mobilePage.close();

  console.log(JSON.stringify({
    ok: true,
    expeditionProducts: 5,
    regularProducts: regularCount,
    engrainedProducts: 1,
    engrainedSize: '16" x 24"',
    engrainedPrice: "$1,650",
    mobileRows,
    previewHealth,
  }, null, 2));
} finally {
  await browser.close();
}
