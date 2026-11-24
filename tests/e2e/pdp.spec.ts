import { expect, test, type Page } from "@playwright/test";

// Skip the session loader so the hero intro starts right away; record the hero-ready event.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("ganh:intro", "1");
    } catch {}
    window.addEventListener("ganh:hero-ready", () => {
      (window as unknown as { __heroReady: boolean }).__heroReady = true;
    });
  });
});

const jar = (page: Page) => page.locator("[data-jar-target]");
const jarTransform = (page: Page) => jar(page).evaluate((e) => getComputedStyle(e).transform);
const cards = (page: Page) => page.locator("[data-product-card]");

/** Pixels by which the jar's bottom overlaps the first text block below the hero (<= 0: clear). */
const jarOverlap = (page: Page) =>
  page.evaluate(() => {
    const j = document.querySelector("[data-jar-target]")!.getBoundingClientRect();
    const t = document.querySelector("[data-reveal]")!.getBoundingClientRect();
    return j.bottom - t.top;
  });

test("title is revealed char by char", async ({ page }) => {
  await page.goto("/products/mut-gung");
  const h1 = page.locator("h1");
  await expect(h1).toHaveText("Mứt Gừng");
  const chars = h1.locator("[data-char]");
  await expect(chars).toHaveCount(7);
  await expect
    .poll(() => chars.last().evaluate((e) => Number(getComputedStyle(e).opacity)), { timeout: 5_000 })
    .toBeGreaterThan(0.99);
  await expect(page.getByText("Made in", { exact: false }).first()).toBeVisible();
});

test("scrolling moves the jar and fires hero-ready", async ({ page }) => {
  await page.goto("/products/mut-quat");
  await expect(jar(page)).toBeVisible();
  await expect.poll(() => page.evaluate(() => !!(window as unknown as { __heroReady?: boolean }).__heroReady)).toBe(true);
  await page.waitForTimeout(300);
  const before = await jarTransform(page);
  await page.mouse.move(720, 450);
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(60);
  }
  await expect.poll(() => jarTransform(page)).not.toBe(before);
  await expect(jar(page).locator("canvas")).toHaveCount(1);
});

test("photo row and other products render", async ({ page }) => {
  await page.goto("/products/mut-gung");
  const slides = page.locator("[data-photo-slide]");
  expect(await slides.count()).toBeGreaterThan(0);
  await expect(cards(page)).toHaveCount(7);
  const handles = await cards(page).evaluateAll((els) => els.map((e) => e.getAttribute("data-handle")));
  expect(handles).not.toContain("mut-gung");
  expect(new Set(handles).size).toBe(7);
  await expect(page.locator("[data-other-products] h2")).toContainText(/other/i);
});

test("vi locale shows Vietnamese strings", async ({ page }) => {
  await page.goto("/vi/products/mut-gung");
  await expect(page.locator("[data-other-products] h2")).toContainText("Sản phẩm");
  expect(await cards(page).first().locator("a").getAttribute("href")).toMatch(/^\/vi\/products\//);
});

test("hovering a card pops its motif, clicking navigates", async ({ page }) => {
  await page.goto("/products/mut-gung");
  const card = cards(page).first();
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const motif = card.locator("[data-motif]").first();
  expect(Number(await motif.evaluate((e) => getComputedStyle(e).opacity))).toBeLessThan(0.1);
  await card.hover();
  await expect
    .poll(() => motif.evaluate((e) => Number(getComputedStyle(e).opacity)), { timeout: 3_000 })
    .toBeGreaterThan(0.9);
  await expect(page.locator("[data-cursor-label] [data-visible]")).toContainText("Discover the product");
  const handle = await card.getAttribute("data-handle");
  await card.click();
  await expect(page).toHaveURL(new RegExp(`/products/${handle}$`));
});

test("other-products row can be dragged", async ({ page }) => {
  await page.goto("/products/mut-gung");
  const track = page.locator("[data-other-track]");
  await track.scrollIntoViewIfNeeded();
  const box = (await track.boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.7, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, y, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => track.evaluate((e) => e.scrollLeft)).toBeGreaterThan(50);
  await expect(page).toHaveURL(/\/products\/mut-gung$/);
});

for (const [width, height] of [
  [1536, 730],
  [1280, 600],
  [1440, 900],
]) {
  test(`settled jar clears the description at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/products/mut-gung");
    // Settled: hydrated (hero announced; the route-change scroll reset has run), fonts loaded.
    await expect(jar(page)).toHaveAttribute("data-hero-ready", "true", { timeout: 10_000 });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await page.evaluate(() => window.scrollTo(0, 700));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(700);
    // The scrub has reached its end pose (--ph = 1) and the layout has had a frame to apply it.
    await expect
      .poll(() =>
        page.evaluate(() =>
          getComputedStyle(document.querySelector("[data-product-hero] > div")!).getPropertyValue("--ph").trim(),
        ),
      )
      .toBe("1.0000");
    await page.evaluate(
      () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
    );
    expect(await jarOverlap(page)).toBeLessThanOrEqual(0);
  });
}

test("unknown handle is a 404", async ({ page }) => {
  const res = await page.goto("/products/nope");
  expect(res?.status()).toBe(404);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("everything is static and visible", async ({ page }) => {
    await page.goto("/products/mut-gung");
    const chars = page.locator("h1 [data-char]");
    expect(Number(await chars.last().evaluate((e) => getComputedStyle(e).opacity))).toBe(1);
    const before = await jarTransform(page);
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(300);
    expect(await jarTransform(page)).toBe(before);
    expect(await jarOverlap(page)).toBeLessThanOrEqual(0);
    const word = page.locator("[data-reveal] [data-word]").first();
    expect(Number(await word.evaluate((e) => getComputedStyle(e).opacity))).toBe(1);
    await expect(cards(page)).toHaveCount(7);
  });
});
