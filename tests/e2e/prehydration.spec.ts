import { expect, test, type Locator, type Page } from "@playwright/test";

/** Opacity as painted: the product of the element's and all its ancestors' computed opacity. */
const paintedOpacity = (l: Locator) =>
  l.evaluate((el) => {
    let o = 1;
    for (let n: Element | null = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
    return o;
  });

/** True when the element's centre is in the viewport and not covered by another layer. */
const onTop = (l: Locator) =>
  l.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2));
    const y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
    if (r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) return false;
    const hit = document.elementFromPoint(x, y);
    return !!hit && (el === hit || el.contains(hit) || hit.contains(el));
  });

async function expectHomeVisible(page: Page) {
  const jars = page.locator("[data-jar-slider-item]");
  expect(await jars.count()).toBeGreaterThanOrEqual(8);
  const xs: number[] = [];
  for (let i = 0; i < 3; i++) {
    const jar = jars.nth(i);
    expect(await paintedOpacity(jar)).toBeGreaterThan(0.9);
    const box = await jar.boundingBox();
    expect(box && box.width > 20 && box.height > 20).toBe(true);
    xs.push(Math.round(box!.x));
  }
  // Laid out in a row, not stacked on top of each other.
  expect(new Set(xs).size).toBe(3);
  expect(await onTop(jars.first())).toBe(true);
  expect(await paintedOpacity(page.locator("[data-hero-badge]"))).toBeGreaterThan(0.9);
  const prompt = page.locator("[data-hero-prompt]");
  expect(await paintedOpacity(prompt)).toBeGreaterThan(0.9);
  await expect(prompt).toBeInViewport();
}

async function expectPhotoRowVisible(page: Page) {
  const slides = page.locator("[data-photo-slide]");
  expect(await slides.count()).toBeGreaterThan(0);
  const first = slides.first();
  await first.scrollIntoViewIfNeeded();
  expect(await paintedOpacity(first)).toBeGreaterThan(0.9);
  await expect(first).toBeInViewport();
}

const credit = /Concept project — not a real brand\./;

for (const [name, setup] of [
  ["without JavaScript", { javaScriptEnabled: false, reducedMotion: "reduce" as const }],
  ["without JavaScript, full motion", { javaScriptEnabled: false, reducedMotion: "no-preference" as const }],
] as const) {
  test.describe(name, () => {
    test.use(setup);

    test("home jars, badge and prompt are visible", async ({ page }) => {
      await page.goto("/");
      await expectHomeVisible(page);
    });

    test("home shows the credit line inside the first screen", async ({ page }) => {
      await page.goto("/");
      const footer = page.locator("footer[data-site-footer]");
      await expect(footer).toContainText(credit);
      await expect(footer).toBeInViewport();
      expect(await onTop(footer.getByText(credit))).toBe(true);
    });

    test("PDP photo-row slides are visible", async ({ page }) => {
      await page.goto("/products/mut-gung");
      await expectPhotoRowVisible(page);
    });
  });
}

test.describe("reduced motion before hydration", () => {
  test.use({ reducedMotion: "reduce" });

  // Inline scripts run, but the app bundles never load: the server HTML must stand on its own.
  test.beforeEach(async ({ page }) => {
    // Block scripts only: Turbopack builds also serve CSS from /_next/static/chunks.
    await page.route("**/_next/static/**", (route) =>
      route.request().resourceType() === "script" ? route.abort() : route.continue(),
    );
  });

  test("home jars, badge and prompt are visible", async ({ page }) => {
    await page.goto("/");
    await expectHomeVisible(page);
  });

  test("PDP photo-row slides are visible", async ({ page }) => {
    await page.goto("/products/mut-gung");
    await expectPhotoRowVisible(page);
  });
});

test.describe("footer and tagline", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem("ganh:intro", "1");
      } catch {}
    });
  });

  test("home has a compact footer with credit, Pantry and language links", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer[data-site-footer]");
    await expect(footer).toHaveCount(1);
    await expect(footer).toBeInViewport();
    await expect(footer).toContainText(credit);
    await expect(footer.getByRole("link", { name: "Pantry" })).toHaveAttribute("href", "/pantry");
    await expect(footer.getByRole("link", { name: "Tiếng Việt" })).toHaveAttribute("href", "/vi");
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
  });

  test("other pages keep the full footer", async ({ page }) => {
    await page.goto("/pantry");
    const footer = page.locator("footer[data-site-footer]");
    await expect(footer).toHaveCount(1);
    await expect(footer).toContainText(credit);
    await expect(footer.locator("address")).toHaveCount(1);
  });

  test("logo tagline follows the locale", async ({ page }) => {
    await page.goto("/vi");
    await expect(page.locator("header[data-site-header]")).toContainText("Đặc sản Việt");
    await expect(page.locator("header[data-site-header]")).not.toContainText("Vietnamese Pantry");
    await page.goto("/");
    await expect(page.locator("header[data-site-header]")).toContainText("Vietnamese Pantry");
  });

  test("loader logo uses the locale tagline", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto("/vi");
    await expect(page.locator("[data-loader]")).toContainText("Đặc sản Việt");
    await ctx.close();
  });
});
