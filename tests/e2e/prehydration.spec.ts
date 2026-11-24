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

const skipIntro = (page: Page) =>
  page.addInitScript(() => {
    try {
      sessionStorage.setItem("ganh:intro", "1");
    } catch {}
  });

const blockScripts = (page: Page) =>
  page.route("**/_next/static/**", (route) =>
    route.request().resourceType() === "script" ? route.abort() : route.continue(),
  );

/** Every sample point of the prompt's text box lies inside the dark back shape. */
const promptOnShape = (page: Page) =>
  page.evaluate(() => {
    const prompt = document.querySelector("[data-hero-prompt]")!;
    const range = document.createRange();
    range.selectNodeContents(prompt);
    const r = range.getBoundingClientRect();
    const path = document.querySelector<SVGPathElement>("[data-jar-slider] svg path")!;
    const inv = path.getScreenCTM()!.inverse();
    const misses: string[] = [];
    for (const x of [r.left + 2, r.left + r.width / 2, r.right - 2])
      for (const y of [r.top + 1, r.bottom - 1]) {
        const p = new DOMPoint(x, y).matrixTransform(inv);
        if (!path.isPointInFill(p)) misses.push(`${Math.round(x)},${Math.round(y)}`);
      }
    return misses;
  });

const rect = (l: Locator) => l.evaluate((el) => el.getBoundingClientRect().toJSON() as DOMRect);

async function expectStripAndPrompt(page: Page) {
  const strip = page.locator("footer[data-footer-strip]");
  const s = await rect(strip);
  const vh = await page.evaluate(() => innerHeight);
  expect(Math.abs(s.bottom - vh)).toBeLessThanOrEqual(1);
  // The strip never grows past the height the page reserves for it.
  const reserved = await page.evaluate(() =>
    Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--footer-strip-h")),
  );
  expect(s.height).toBeLessThanOrEqual(reserved + 1);
  expect(await onTop(strip.getByText(credit))).toBe(true);
  for (const name of ["Pantry", "Tiếng Việt"]) expect(await onTop(strip.getByRole("link", { name }))).toBe(true);

  const prompt = page.locator("[data-hero-prompt]");
  await expect.poll(() => paintedOpacity(prompt)).toBeGreaterThan(0.9);
  await expect.poll(() => paintedOpacity(page.locator("[data-jar-slider] svg").first())).toBeGreaterThan(0.9);
  const p = await rect(prompt);
  expect(p.top).toBeGreaterThanOrEqual(0);
  expect(p.bottom).toBeLessThanOrEqual(s.top - 8);
  expect(await prompt.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(255, 248, 238)");
  // Cream text needs the lacquer shape behind it, not the paper.
  await expect.poll(() => promptOnShape(page)).toEqual([]);
}

async function expectRowAboveStrip(page: Page) {
  const s = await rect(page.locator("footer[data-footer-strip]"));
  const wrap = await rect(page.locator("[data-jar-slider-wrap]"));
  expect(wrap.bottom).toBeLessThanOrEqual(s.top + 1);
  const jar = await rect(page.locator("[data-jar-slider-item]").first());
  expect(jar.bottom).toBeLessThanOrEqual(s.top);
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 360, height: 640 },
]) {
  test.describe(`phone ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    test("footer strip and prompt sit on the lacquer, above the strip", async ({ page }) => {
      await skipIntro(page);
      await page.goto("/");
      await expect(page.locator("[data-jar-slider]")).toHaveAttribute("data-intro", "done");
      await expectStripAndPrompt(page);
    });

    test.describe("reduced motion", () => {
      test.use({ reducedMotion: "reduce" });

      test("static row ends above the strip, prompt stays readable", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator("[data-jar-slider]")).toHaveAttribute("data-jar-slider-ready", "true");
        await expectRowAboveStrip(page);
        await expectStripAndPrompt(page);
      });

      test("static row ends above the strip before hydration", async ({ page }) => {
        await blockScripts(page);
        await page.goto("/");
        await expectRowAboveStrip(page);
        await expectStripAndPrompt(page);
      });
    });
  });
}

for (const width of [760, 860, 960]) {
  for (const path of ["/", "/vi"]) {
    test(`static row ends above the strip at ${width}px on ${path}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await expect(page.locator("[data-jar-slider]")).toHaveAttribute("data-jar-slider-ready", "true");
      await expectRowAboveStrip(page);
    });
  }
}

test.describe("hydration", () => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    test(`reduced motion: jar size holds across hydration at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      let release!: () => void;
      const gate = new Promise<void>((r) => (release = r));
      await page.route("**/_next/static/**", async (route) => {
        if (route.request().resourceType() === "script") await gate;
        await route.continue();
      });
      await page.goto("/", { waitUntil: "commit" });
      const stage = page.locator("[data-jar-slider]");
      const track = page.locator("[data-jar-slider-track]");
      await expect(track).toHaveCSS("display", "flex");
      await expect(stage).toHaveAttribute("data-jar-slider-ready", "false");
      const first = page.locator("[data-jar-slider-item]").first();
      const before = await rect(first);
      release();
      await expect(stage).toHaveAttribute("data-jar-slider-ready", "true");
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const after = await rect(first);
      expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(2);
      expect(Math.abs(after.top - before.top)).toBeLessThanOrEqual(2);
    });
  }

  test("slider wrap leaves vertical swipes to the page", async ({ page }) => {
    await skipIntro(page);
    await page.goto("/");
    await expect(page.locator("[data-jar-slider]")).toHaveAttribute("data-jar-slider-ready", "true");
    await expect(page.locator("[data-jar-slider-wrap]")).toHaveCSS("touch-action", "pan-y");
  });
});
