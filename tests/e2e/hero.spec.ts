import { expect, test, type Page } from "@playwright/test";

// Skip the session loader so the hero intro starts right away.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("ganh:intro", "1");
    } catch {}
  });
});

const items = (page: Page) => page.locator("[data-jar-slider-item]");

/** Centre of the most central visible item, in viewport coordinates. */
async function centreItem(page: Page) {
  return page.evaluate(() => {
    const cx = innerWidth / 2;
    let best: { x: number; y: number; href: string; d: number } | null = null;
    for (const el of document.querySelectorAll<HTMLAnchorElement>("[data-jar-slider-item]")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.right < 0 || r.left > innerWidth) continue;
      const x = r.left + r.width / 2;
      const d = Math.abs(x - cx);
      if (!best || d < best.d) best = { x, y: r.top + r.height * 0.55, href: el.getAttribute("href") || "", d };
    }
    return best;
  });
}

test("renders at least 8 jars with WebGL labels", async ({ page }) => {
  await page.goto("/");
  expect(await items(page).count()).toBeGreaterThanOrEqual(8);
  await expect(page.locator("[data-jar-slider]")).toHaveAttribute("data-jar-slider-ready", "true");
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          for (const c of document.querySelectorAll<HTMLCanvasElement>("[data-jar-slider-item] canvas")) {
            if (!c.width || !c.height) continue;
            const data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
            for (let i = 3; i < data.length; i += 16) if (data[i] > 0) return true;
          }
          return false;
        }),
      { timeout: 15_000 },
    )
    .toBe(true);
});

test("wheel moves the marquee and never scrolls the page", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-jar-slider]")).toHaveAttribute("data-jar-slider-ready", "true");
  await page.waitForTimeout(600);
  const before = await items(page).evaluateAll((els) => els.map((e) => (e as HTMLElement).style.transform));
  await page.mouse.move(720, 500);
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(500);
  const after = await items(page).evaluateAll((els) => els.map((e) => (e as HTMLElement).style.transform));
  expect(after).not.toEqual(before);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("hovering a jar shows the cursor label, clicking opens the product", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-jar-slider]")).toHaveAttribute("data-jar-slider-ready", "true");
  await page.waitForTimeout(1500);
  const target = await centreItem(page);
  expect(target).not.toBeNull();
  await page.mouse.move(target!.x - 40, target!.y);
  await page.mouse.move(target!.x, target!.y, { steps: 4 });
  await expect(page.locator("[data-cursor-label] [data-visible]")).toContainText("Discover the product");
  const handle = target!.href.split("/").pop();
  await page.mouse.click(target!.x, target!.y);
  await expect(page).toHaveURL(new RegExp(`/products/${handle}$`));
});

test("a slow press on an off-centre jar stays put and navigates", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-jar-slider]")).toHaveAttribute("data-jar-slider-ready", "true");
  await page.waitForTimeout(1500);
  const side = await page.evaluate(() => {
    let best: { x: number; y: number; href: string; d: number } | null = null;
    for (const el of document.querySelectorAll<HTMLAnchorElement>("[data-jar-slider-item]")) {
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2;
      if (r.left < 0 || r.right > innerWidth) continue;
      const d = Math.abs(x - innerWidth / 2);
      if (!best || d > best.d) best = { x, y: r.top + r.height * 0.55, href: el.getAttribute("href") || "", d };
    }
    return best;
  });
  expect(side!.d).toBeGreaterThan(200);
  const before = await items(page).first().evaluate((e) => (e as HTMLElement).style.transform);
  await page.mouse.move(side!.x, side!.y);
  await page.mouse.down();
  await page.waitForTimeout(600);
  const during = await items(page).first().evaluate((e) => (e as HTMLElement).style.transform);
  const tx = (s: string) => Number(/translate\((-?[\d.]+)px/.exec(s)?.[1] ?? 0);
  expect(Math.abs(tx(during) - tx(before))).toBeLessThan(20);
  await page.mouse.up();
  await expect(page).toHaveURL(new RegExp(`${side!.href}$`));
});

test("vi locale uses the Vietnamese cursor label", async ({ page }) => {
  await page.goto("/vi");
  await expect(page.locator("[data-jar-slider]")).toHaveAttribute("data-jar-slider-ready", "true");
  await page.waitForTimeout(1500);
  const target = await centreItem(page);
  await page.mouse.move(target!.x - 40, target!.y);
  await page.mouse.move(target!.x, target!.y, { steps: 4 });
  await expect(page.locator("[data-cursor-label] [data-visible]")).toContainText("Khám phá sản phẩm");
  expect(target!.href).toMatch(/^\/vi\/products\//);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("items are visible and clickable", async ({ page }) => {
    await page.goto("/");
    const first = items(page).first();
    await expect(first).toBeVisible();
    expect(Number(await first.evaluate((e) => getComputedStyle(e).opacity))).toBeGreaterThan(0.9);
    const href = await first.getAttribute("href");
    await first.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
  });
});
