import { chromium } from "playwright";

const url = process.argv[2] || "https://www.k4studios.com/Other/Expeditions/echoes-of-the-west-2026";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.locator("[data-lightbox-open]").first().click();
  await page.locator("[data-lightbox-order]").click();
  await page.getByRole("heading", { name: "Expedition Print Options" }).waitFor();

  const options = await page.locator("button", { hasText: "Add to Cart" }).count();
  if (options !== 5) throw new Error(`Expected 5 Expedition products; found ${options}.`);
  await page.locator("button", { hasText: "Add to Cart" }).first().click();
  await page.goto(new URL("/cart", url).href, { waitUntil: "networkidle", timeout: 60000 });
  await page.getByText("Expedition Sketch Print", { exact: true }).waitFor();
  await page.getByText("$10.00", { exact: true }).first().waitFor();

  const cart = await page.evaluate(() => JSON.parse(localStorage.getItem("k4-native-cart-v1") || "{}"));
  const item = cart?.items?.[0];
  if (item?.catalogScope !== "expedition") throw new Error("Cart item is missing Expedition scope.");
  if (item?.unitPrice !== 10) throw new Error(`Expected $10 Expedition price; found ${item?.unitPrice}.`);

  console.log(JSON.stringify({ ok: true, url, optionCount: options, productKey: item.productKey, unitPrice: item.unitPrice }, null, 2));
} finally {
  await browser.close();
}
