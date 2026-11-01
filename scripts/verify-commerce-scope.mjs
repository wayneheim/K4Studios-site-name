import { chromium } from "playwright";

const expeditionUrl = "https://www.k4studios.com/Other/Expeditions/echoes-of-the-west-2026";
const regularUrl = "https://www.k4studios.com/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color/i-kWVzc6g";

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
  for (const forbidden of ["$10.00", "$40.00", "$45.00", "$70.00"]) {
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

  console.log(JSON.stringify({ ok: true, expeditionProducts: 5, regularProducts: regularCount, previewHealth }, null, 2));
} finally {
  await browser.close();
}
