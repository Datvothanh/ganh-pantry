import { expect, test, type Page } from "@playwright/test";

const skipIntro = (page: Page) =>
  page.addInitScript(() => {
    try {
      sessionStorage.setItem("ganh:intro", "1");
    } catch {}
  });

const scrollLeft = (page: Page) => page.locator("[data-jar-slider-wrap]").evaluate((el) => el.scrollLeft);

test.describe("reduced motion static row (1440x900)", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-jar-slider]")).toHaveAttribute("data-jar-slider-ready", "true");
  });

  test("every jar image loads", async ({ page }) => {
    const imgs = page.locator("[data-jar-slider-item] img");
    expect(await imgs.count()).toBeGreaterThanOrEqual(8);
    await expect
      .poll(() => imgs.evaluateAll((els) => els.filter((e) => (e as HTMLImageElement).naturalWidth === 0).length), {
        timeout: 3_000,
      })
      .toBe(0);
  });

  test("a vertical wheel scrolls the row horizontally", async ({ page }) => {
    expect(await scrollLeft(page)).toBe(0);
    await page.mouse.move(720, 450);
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(50);
    }
    await expect.poll(() => scrollLeft(page)).toBeGreaterThan(100);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test("pointer drag scrolls the row and does not open a product", async ({ page }) => {
    expect(await scrollLeft(page)).toBe(0);
    const box = (await page.locator("[data-jar-slider-item]").nth(3).boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 300, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    await expect.poll(() => scrollLeft(page)).toBeGreaterThan(200);
    await page.waitForTimeout(300);
    expect(new URL(page.url()).pathname).toBe("/");
  });
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
]) {
  test(`badge text stays on the hill, above the strip at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await skipIntro(page);
    await page.goto("/");
    const stage = page.locator("[data-jar-slider]");
    await expect(stage).toHaveAttribute("data-intro", "done");
    await expect
      .poll(() => stage.evaluate((el) => Number.parseFloat(el.style.getPropertyValue("--jar-intro") || "0")))
      .toBe(1);
    const result = await page.evaluate(() => {
      const text = document.querySelector<SVGTextElement>("[data-hero-badge] text")!;
      const hill = document.querySelector<SVGPathElement>("[data-jar-slider] svg path")!;
      const strip = document.querySelector("footer[data-footer-strip]")!.getBoundingClientRect();
      const toHill = hill.getScreenCTM()!.inverse();
      const ctm = text.getScreenCTM()!;
      const misses: string[] = [];
      let left = Infinity;
      let right = -Infinity;
      let top = Infinity;
      let bottom = -Infinity;
      const n = text.getNumberOfChars();
      for (let i = 0; i < n; i++) {
        let e: DOMRect;
        try {
          e = text.getExtentOfChar(i);
        } catch {
          continue;
        }
        if (!e.width && !e.height) continue;
        for (const [x, y] of [
          [e.x, e.y],
          [e.x + e.width, e.y],
          [e.x, e.y + e.height],
          [e.x + e.width, e.y + e.height],
        ]) {
          const s = new DOMPoint(x, y).matrixTransform(ctm);
          left = Math.min(left, s.x);
          right = Math.max(right, s.x);
          top = Math.min(top, s.y);
          bottom = Math.max(bottom, s.y);
          const inFill = hill.isPointInFill(s.matrixTransform(toHill));
          if (!inFill || s.y > strip.top) misses.push(`${i}:${Math.round(s.x)},${Math.round(s.y)}`);
        }
      }
      const box = text.getBoundingClientRect();
      return { n, misses, glyphs: { left, right, top, bottom }, box: box.toJSON() as DOMRect, stripTop: strip.top };
    });
    expect(result.n).toBeGreaterThan(20);
    // The glyph corners really are in screen space: they span the text's own box.
    expect(Math.abs(result.glyphs.left - result.box.left)).toBeLessThan(result.box.width * 0.1);
    expect(Math.abs(result.glyphs.bottom - result.box.bottom)).toBeLessThan(result.box.height * 0.1);
    expect(result.box.bottom).toBeLessThanOrEqual(result.stripTop);
    expect(result.misses).toEqual([]);
  });
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  test(`product page footer fits the viewport at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await skipIntro(page);
    await page.goto("/products/mut-quat");
    const footer = page.locator("footer[data-site-footer]");
    await expect(footer).toHaveCount(1);
    const h = await footer.evaluate((el) => el.getBoundingClientRect().height);
    expect(h).toBeLessThanOrEqual(viewport.height);
  });
}

test("cursor label hides within 100 ms of a jar click", async ({ page }) => {
  await skipIntro(page);
  await page.goto("/");
  await expect(page.locator("[data-jar-slider]")).toHaveAttribute("data-jar-slider-ready", "true");
  await page.waitForTimeout(1500);
  const target = await page.evaluate(() => {
    const cx = innerWidth / 2;
    let best: { x: number; y: number; d: number } | null = null;
    for (const el of document.querySelectorAll("[data-jar-slider-item]")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.right < 0 || r.left > innerWidth) continue;
      const x = r.left + r.width / 2;
      const d = Math.abs(x - cx);
      if (!best || d < best.d) best = { x, y: r.top + r.height * 0.55, d };
    }
    return best!;
  });
  await page.mouse.move(target.x - 40, target.y);
  await page.mouse.move(target.x, target.y, { steps: 4 });
  await expect(page.locator("[data-cursor-label] [data-visible]")).toBeVisible();
  await page.evaluate(() => {
    const pill = document.querySelector<HTMLElement>("[data-cursor-label] > span")!;
    (window as unknown as { __hidden: Promise<number> }).__hidden = new Promise((resolve) => {
      window.addEventListener(
        "click",
        () => {
          const t0 = performance.now();
          const tick = () => {
            const dt = performance.now() - t0;
            if (Number(getComputedStyle(pill).opacity) < 0.05 || dt > 1000) resolve(dt);
            else requestAnimationFrame(tick);
          };
          tick();
        },
        { capture: true, once: true },
      );
    });
  });
  await page.mouse.click(target.x, target.y);
  const ms = await page.evaluate(() => (window as unknown as { __hidden: Promise<number> }).__hidden);
  expect(ms).toBeLessThan(100);
});
