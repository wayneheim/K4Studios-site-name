import { chromium } from "playwright";

const baseUrl = process.argv[2] || process.env.SMUGMUG_POC_URL ||
  "http://localhost:4321/Other/Expeditions/echoes-of-the-west-2026";
const apiKey = process.env.SMUGMUG_API_KEY?.trim();
const apiSecret = process.env.SMUGMUG_API_SECRET?.trim();
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", (error) => console.error("Browser page error:", error));
  await page.route("**/.netlify/functions/image-like", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, emailSent: false, test: true }),
    });
  });
  const response = await page.goto(baseUrl, { waitUntil: "networkidle" });

  if (!response?.ok()) throw new Error(`Test page returned HTTP ${response?.status()}.`);

  await page.evaluate(() => {
    window.__expeditionAnalytics = [];
    window.k4track = (eventName, context) => {
      window.__expeditionAnalytics.push({ eventName, context });
    };
  });

  const pageBackground = await page.locator(".poc-page").evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  if (pageBackground !== "rgb(255, 255, 255)") {
    throw new Error(`The page does not use the site's white background: ${pageBackground}`);
  }
  const breadcrumbLinks = await page.locator(".breadcrumb-text a").evaluateAll(
    (links) => links.map((link) => link.getAttribute("href")),
  );
  if (breadcrumbLinks.join("|") !== "/Other|/Other/Expeditions") {
    throw new Error(`The breadcrumb links are incomplete: ${breadcrumbLinks.join(" | ")}`);
  }

  const cardCount = await page.locator(".image-card").count();
  if (cardCount !== 24) throw new Error(`Expected 24 image cards, found ${cardCount}.`);
  if (await page.locator(".pagination").count() !== 2) {
    throw new Error("The gallery pagination is not shown above and below the image grid.");
  }
  const orderNotes = await page.locator(".gallery-order-note").allTextContents();
  if (orderNotes.length !== 2 || orderNotes.some((note) => !note.includes("newest photographs first"))) {
    throw new Error(`The upload-order reference is missing: ${orderNotes.join(" | ")}`);
  }
  const paginationHrefs = await page.locator(".pagination a[href]").evaluateAll(
    (links) => links.map((link) => link.getAttribute("href")),
  );
  if (paginationHrefs.some((href) => !href?.endsWith("#expedition-grid"))) {
    throw new Error(`Pagination links do not target the grid anchor: ${paginationHrefs.join(" | ")}`);
  }
  const exploreLinks = await page.locator(".expedition-explore a").evaluateAll(
    (links) => links.map((link) => link.getAttribute("href")),
  );
  if (
    exploreLinks.length !== 4 ||
    exploreLinks[0] !== "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West" ||
    exploreLinks.slice(1).some((href) => !href?.startsWith("/"))
  ) {
    throw new Error(`The More to Explore links are incomplete: ${exploreLinks.join(" | ")}`);
  }
  if (await page.locator("[data-lightbox-caption], .lightbox-caption, [data-caption]").count()) {
    throw new Error("Provisional SmugMug captions are still exposed in the gallery UI.");
  }
  const gridImageFit = await page.locator(".image-frame img").first().evaluate(
    (image) => getComputedStyle(image).objectFit,
  );
  if (gridImageFit !== "cover") {
    throw new Error(`Grid images are not consistently cropped: object-fit is ${gridImageFit}.`);
  }
  const releaseNote = (await page.locator(".release-note").textContent())?.replace(/\s+/g, " ");
  if (!releaseNote?.includes("Selected for release?") || !releaseNote.includes("pre-release pricing ends")) {
    throw new Error("The emphasized pricing-transition note is missing.");
  }
  const gridLabels = await page.locator(".preview-label").allTextContents();
  const gridNumbers = gridLabels.map((label) => Number(label.match(/Image (\d+)/)?.[1]));
  if (
    gridNumbers.some((number) => !Number.isInteger(number) || number < 1) ||
    gridNumbers.some((number, index) => index > 0 && number !== gridNumbers[index - 1] - 1)
  ) {
    throw new Error(`The grid does not use descending stable image numbers: ${gridLabels.join(" | ")}`);
  }
  const priceGridBackground = await page.locator(".price-grid").evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  if (priceGridBackground !== "rgba(0, 0, 0, 0)") {
    throw new Error(`Size gaps do not reveal the pricing-area background: ${priceGridBackground}`);
  }
  const priceRows = page.locator(".price-grid li");
  const priceRowCount = await priceRows.count();
  const displayedPrices = await priceRows.allTextContents();
  if (
    priceRowCount !== 5 ||
    !displayedPrices.some((row) => row.includes("5 × 7") && /\$\d/.test(row))
  ) {
    throw new Error(`Gallery pricing did not render correctly: ${displayedPrices.join(" | ")}`);
  }
  const sizeBreakCount = await page.locator(".price-tier-start").count();
  if (sizeBreakCount !== 2) {
    throw new Error(`Expected two visual size breaks, found ${sizeBreakCount}.`);
  }
  const tierCounts = await Promise.all([
    page.locator(".price-tier-1").count(),
    page.locator(".price-tier-2").count(),
    page.locator(".price-tier-3").count(),
  ]);
  if (tierCounts.join(",") !== "1,2,2") {
    throw new Error(`Print-size color tiers are incorrect: ${tierCounts.join(",")}`);
  }
  const redundantGalleryLinkCount = await page
    .getByText("Open the complete gallery on SmugMug", { exact: false })
    .count();
  if (redundantGalleryLinkCount !== 0) {
    throw new Error("The redundant full SmugMug gallery link is still present.");
  }

  const fontFamilies = await page.locator(".poc-header h1, .image-button, .lightbox").evaluateAll(
    (elements) => elements.map((element) => getComputedStyle(element).fontFamily),
  );
  if (fontFamilies.some((fontFamily) => !fontFamily.toLowerCase().includes("glegoo"))) {
    throw new Error(`The POC is not consistently using Glegoo: ${fontFamilies.join(", ")}`);
  }

  const html = await page.content();
  if (apiKey && html.includes(apiKey)) throw new Error("The API key leaked into the rendered HTML.");
  if (apiSecret && html.includes(apiSecret)) throw new Error("The API secret leaked into the rendered HTML.");

  await page.locator("[data-lightbox-open]").first().click();
  const dialogOpen = await page.locator("[data-lightbox]").evaluate(
    (dialog) => dialog instanceof HTMLDialogElement && dialog.open,
  );
  const previewSrc = await page.locator("[data-lightbox-image]").getAttribute("src");
  const orderUrl = await page.locator("[data-lightbox-order]").getAttribute("href");
  const orderRel = await page.locator("[data-lightbox-order]").getAttribute("rel");

  if (!dialogOpen) throw new Error("The image-preview dialog did not open.");
  const imageReference = (await page.locator("[data-lightbox-title]").textContent())?.trim();
  if (imageReference !== gridLabels[0]?.trim()) {
    throw new Error(`The lightbox image reference is missing or unstable: ${imageReference}`);
  }
  const lightboxGalleryName = (await page.locator(".lightbox-details > .eyebrow").textContent())?.trim();
  if (!lightboxGalleryName || lightboxGalleryName === "Expedition Preview") {
    throw new Error("The lightbox does not identify its Expedition gallery.");
  }
  const copyrightNotice = await page.locator(".copyright-notice").textContent();
  if (!copyrightNotice?.includes("Wayne Heim") || !copyrightNotice.includes("All rights reserved")) {
    throw new Error("The large-preview copyright notice is missing.");
  }
  if (!previewSrc?.startsWith("https://photos.smugmug.com/")) {
    throw new Error("The preview did not receive a SmugMug image URL.");
  }
  if (!/\/L\/[^/]+-L\.[a-z0-9]+(?:\?|$)/i.test(previewSrc)) {
    throw new Error("The preview did not use SmugMug's Large (srcL) rendition.");
  }
  if (!orderUrl?.includes("wayne-heim.smugmug.com/") || !orderUrl.endsWith("/buy")) {
    throw new Error("The ordering link did not point to the SmugMug purchase page.");
  }
  if (!orderRel?.split(/\s+/).includes("nofollow")) {
    throw new Error(`The SmugMug ordering link is missing nofollow: ${orderRel}`);
  }
  const orderCta = (await page.locator("[data-lightbox-order]").textContent())?.replace(/\s+/g, " ").trim();
  if (!orderCta?.startsWith("Order Prints") || orderCta.includes("SmugMug")) {
    throw new Error(`The ordering CTA was not simplified: ${orderCta}`);
  }

  await page.locator("[data-lightbox-order]").evaluate((link) => {
    link.addEventListener("click", (event) => event.preventDefault(), { once: true });
    link.click();
  });

  const expectedLikeImageId = await page.locator("[data-lightbox-open]").first().getAttribute("data-image-id");
  const likeRequestPromise = page.waitForRequest((request) =>
    request.url().includes("/.netlify/functions/image-like") && request.method() === "POST"
  );
  await page.locator("[data-expedition-like] button").click();
  const likeRequest = await likeRequestPromise;
  const likePayload = likeRequest.postDataJSON();
  if (
    likePayload.imageId !== `i-${expectedLikeImageId}` ||
    !/^i-[A-Za-z0-9-]+$/.test(likePayload.imageId) ||
    !String(likePayload.title).endsWith(`— ${gridLabels[0]?.trim()}`)
  ) {
    throw new Error(`The lightbox like referenced the wrong image: ${JSON.stringify(likePayload)}`);
  }
  if ((await page.locator("[data-expedition-like] button").getAttribute("aria-label")) !== "Unlike this image") {
    throw new Error("The lightbox like control did not retain its liked state.");
  }
  const actionPositions = await page.evaluate(() => {
    const panel = document.querySelector(".lightbox-details")?.getBoundingClientRect();
    const likeRow = document.querySelector(".lightbox-like-inline")?.getBoundingClientRect();
    const controls = document.querySelector(".lightbox-controls")?.getBoundingClientRect();
    const order = document.querySelector("[data-lightbox-order]")?.getBoundingClientRect();
    const like = document.querySelector("[data-expedition-like]")?.getBoundingClientRect();
    return panel && likeRow && controls && order && like ? {
      panelLeft: panel.left,
      panelCenter: panel.left + panel.width / 2,
      likeRowLeft: likeRow.left,
      controlsTop: controls.top,
      orderCenter: order.left + order.width / 2,
      likeLeft: like.left,
      likeTop: like.top,
      likeBottom: like.bottom,
    } : null;
  });
  if (
    !actionPositions ||
    Math.abs(actionPositions.panelCenter - actionPositions.orderCenter) > 2 ||
    Math.abs(actionPositions.likeRowLeft - actionPositions.likeLeft) > 2 ||
    actionPositions.likeLeft <= actionPositions.panelLeft ||
    actionPositions.likeBottom >= actionPositions.controlsTop
  ) {
    throw new Error(`The lightbox like control is not left-aligned above the divider: ${JSON.stringify(actionPositions)}`);
  }

  const contextMenuPrevented = await page.locator("[data-lightbox-image]").evaluate((image) => {
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    image.dispatchEvent(event);
    return event.defaultPrevented;
  });
  if (!contextMenuPrevented) throw new Error("Right-click protection is not active on the preview image.");
  if (!(await page.locator("[data-image-protection]").evaluate((element) => element.classList.contains("visible")))) {
    throw new Error("The copyright-protection message did not appear.");
  }

  await page.locator("[data-lightbox-next]").click();
  await page.waitForFunction(
    (startingSrc) => document.querySelector("[data-lightbox-image]")?.getAttribute("src") !== startingSrc,
    previewSrc,
  );
  const expectedNextLikeImageId = await page.locator("[data-lightbox-open]").nth(1).getAttribute("data-image-id");
  await page.waitForFunction(
    (imageId) => document.querySelector("[data-expedition-like]")?.getAttribute("data-image-id") === imageId,
    `i-${expectedNextLikeImageId}`,
  );
  await page.waitForFunction(
    () => document.querySelector("[data-expedition-like] button")?.getAttribute("aria-label") === "Like this image",
  );
  const storedLikedImages = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("k4-liked-images") || "[]")
  );
  if (storedLikedImages.length !== 1 || storedLikedImages[0] !== `i-${expectedLikeImageId}`) {
    throw new Error(`The like state leaked to other gallery images: ${JSON.stringify(storedLikedImages)}`);
  }
  const nextPreviewSrc = await page.locator("[data-lightbox-image]").getAttribute("src");
  const nextCounter = await page.locator("[data-image-counter]").textContent();
  if (nextPreviewSrc === previewSrc || nextCounter?.trim() !== "2 of 24") {
    throw new Error("The next-image control did not advance the preview.");
  }

  await page.keyboard.press("ArrowLeft");
  await page.waitForFunction(
    (startingSrc) => document.querySelector("[data-lightbox-image]")?.getAttribute("src") !== startingSrc,
    nextPreviewSrc,
  );
  const previousPreviewSrc = await page.locator("[data-lightbox-image]").getAttribute("src");
  if (previousPreviewSrc !== previewSrc) {
    throw new Error("Previous/keyboard navigation did not restore the first preview.");
  }

  await page.locator("[data-slideshow-toggle]").click();
  if ((await page.locator("[data-slideshow-toggle]").textContent())?.trim() !== "Exit slideshow") {
    throw new Error("The slideshow did not start.");
  }
  const slideshowDialog = page.locator("[data-lightbox]");
  if (!(await slideshowDialog.evaluate((element) => element.classList.contains("is-slideshow")))) {
    throw new Error("The information panel did not enter its dimmed slideshow state.");
  }
  const slideshowHint = page.locator("[data-slideshow-hint]");
  if (!(await slideshowHint.evaluate((element) => element.classList.contains("visible")))) {
    throw new Error("The first-run slideshow paging hint did not appear.");
  }
  if (!(await page.evaluate(() => sessionStorage.getItem("k4-expedition-slideshow-hint-seen")))) {
    throw new Error("The slideshow paging hint was not recorded for this session.");
  }
  await page.waitForTimeout(450);
  const slideshowPanelColor = await page.locator(".lightbox-details").evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  if (slideshowPanelColor !== "rgb(95, 93, 89)") {
    throw new Error(`The slideshow information panel did not gray down: ${slideshowPanelColor}`);
  }
  const slideshowStartingSrc = await page.locator("[data-lightbox-image]").getAttribute("src");
  await page.waitForTimeout(3800);
  const slideshowAdvancedSrc = await page.locator("[data-lightbox-image]").getAttribute("src");
  if (slideshowAdvancedSrc === slideshowStartingSrc) {
    throw new Error("The slideshow did not advance automatically at the faster interval.");
  }
  await page.waitForTimeout(1700);
  if (await slideshowHint.evaluate((element) => element.classList.contains("visible"))) {
    throw new Error("The slideshow paging hint did not fade after five seconds.");
  }
  await page.locator("[data-slideshow-toggle]").click();
  if ((await page.locator("[data-slideshow-toggle]").textContent())?.trim() !== "Start slideshow") {
    throw new Error("The slideshow did not pause.");
  }
  if (await slideshowDialog.evaluate((element) => element.classList.contains("is-slideshow"))) {
    throw new Error("The information panel remained dimmed after pausing the slideshow.");
  }
  await page.locator("[data-slideshow-toggle]").click();
  if (await slideshowHint.evaluate((element) => element.classList.contains("visible"))) {
    throw new Error("The slideshow paging hint repeated during the same session.");
  }
  await page.locator("[data-slideshow-toggle]").click();

  await page.locator(".pagination-region-top .page-arrow[href]").last().evaluate((link) => {
    link.addEventListener("click", (event) => event.preventDefault(), { once: true });
    link.click();
  });

  const analyticsEvents = await page.evaluate(() => window.__expeditionAnalytics || []);
  const eventNames = analyticsEvents.map((entry) => entry.eventName);
  const requiredEvents = [
    "grid_image_click",
    "chapter_view",
    "nav_next",
    "nav_prev",
    "slideshow_start",
    "slideshow_nav_next",
    "order_smugmug_clicked",
    "grid_show_more",
  ];
  const missingEvents = requiredEvents.filter((eventName) => !eventNames.includes(eventName));
  if (missingEvents.length) {
    throw new Error(`Expedition analytics events are missing: ${missingEvents.join(", ")}`);
  }
  const trackedContexts = analyticsEvents.filter((entry) =>
    ["grid_image_click", "chapter_view", "nav_next", "nav_prev", "slideshow_nav_next", "order_smugmug_clicked"]
      .includes(entry.eventName)
  );
  if (trackedContexts.some((entry) =>
    !String(entry.context?.galleryId || "").startsWith("/Other/Expeditions/") ||
    !/^i-[A-Za-z0-9-]+$/.test(String(entry.context?.imageId || ""))
  )) {
    throw new Error(`Expedition analytics lost its gallery or image context: ${JSON.stringify(trackedContexts)}`);
  }

  await page.goto(`${baseUrl}?page=2#expedition-grid`, { waitUntil: "networkidle" });
  const secondPageCount = await page.locator(".image-card").count();
  const currentPage = await page.locator(".page-number.current").first().textContent();
  const anchorTop = await page.locator("#expedition-grid").evaluate(
    (element) => Math.round(element.getBoundingClientRect().top),
  );

  if (
    secondPageCount < 1 ||
    secondPageCount > 24 ||
    currentPage?.trim() !== "2" ||
    anchorTop < 0 ||
    anchorTop > 100
  ) {
    throw new Error("Gallery pagination did not render page 2 correctly.");
  }

  const mobilePage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await mobilePage.goto(baseUrl, { waitUntil: "networkidle" });

  const mobileLayout = await mobilePage.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    gridColumns: getComputedStyle(document.querySelector(".image-grid")).gridTemplateColumns.split(" ").length,
    priceColumns: getComputedStyle(document.querySelector(".price-grid")).gridTemplateColumns.split(" ").length,
  }));
  if (mobileLayout.documentWidth > mobileLayout.viewportWidth) {
    throw new Error(`The mobile page overflows horizontally: ${JSON.stringify(mobileLayout)}`);
  }
  if (mobileLayout.gridColumns !== 1 || mobileLayout.priceColumns !== 2) {
    throw new Error(`The mobile grids did not collapse correctly: ${JSON.stringify(mobileLayout)}`);
  }

  await mobilePage.locator("[data-lightbox-open]").first().click();
  const mobileDialogBox = await mobilePage.locator("[data-lightbox]").boundingBox();
  if (!mobileDialogBox || mobileDialogBox.x < 0 || mobileDialogBox.width > mobileLayout.viewportWidth) {
    throw new Error(`The mobile lightbox exceeds the viewport: ${JSON.stringify(mobileDialogBox)}`);
  }
  await mobilePage.locator("[data-lightbox-order]").scrollIntoViewIfNeeded();
  if (!(await mobilePage.locator("[data-lightbox-order]").isVisible())) {
    throw new Error("The Order Prints CTA is not reachable in the mobile lightbox.");
  }
  if (!(await mobilePage.locator("[data-lightbox-prev]").isVisible()) || !(await mobilePage.locator("[data-lightbox-next]").isVisible())) {
    throw new Error("The mobile lightbox navigation controls are not visible.");
  }
  await mobilePage.close();

  console.log("SmugMug POC verified: desktop and mobile layouts, analytics, protected images, fading slideshow, ordering link, pagination, and no credential leakage.");
} finally {
  await browser.close();
}
