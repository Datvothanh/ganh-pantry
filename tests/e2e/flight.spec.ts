import { expect, test, type Page } from "@playwright/test";

// Skip the session loader so the hero intro starts right away.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("ganh:intro", "1");
    } catch {}
    // Record every flight clone that ever appears.
    type Box = { x: number; y: number; w: number; h: number };
    const box = (r: DOMRect): Box => ({ x: r.x, y: r.y, w: r.width, h: r.height });
    const seen = { clones: 0, source: null as Box | null, launch: null as Box | null };
    (window as unknown as { __flight: typeof seen }).__flight = seen;
    // Source jar's on-screen box at the moment of the click (capture runs before the flight hides it).
    window.addEventListener(
      "click",
      (e) => {
        const item = (e.target as Element | null)?.closest?.("[data-jar-slider-item]");
        if (item) seen.source = box(item.getBoundingClientRect());
      },
      true,
    );
    new MutationObserver((records) => {
      for (const r of records)
        for (const n of r.addedNodes)
          if (n instanceof HTMLElement && n.matches("[data-jar-flight-clone]")) {
            seen.clones++;
            seen.launch = box(n.getBoundingClientRect());
          }
    }).observe(document, { childList: true, subtree: true });
  });
});

const clones = (page: Page) => page.evaluate(() => (window as unknown as { __flight: { clones: number } }).__flight.clones);

/** Centre of the most central visible slider item. */
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

async function ready(page: Page, path = "/") {
  await page.goto(path);
  await expect(page.locator("[data-jar-slider]")).toHaveAttribute("data-jar-slider-ready", "true");
  await expect(page.locator("[data-jar-flight-layer]")).toHaveCount(1);
  await page.waitForTimeout(1500);
  const target = await centreItem(page);
  expect(target).not.toBeNull();
  return target!;
}

test("clicking a jar flies it into the product hero", async ({ page }) => {
  const target = await ready(page);
  await page.mouse.click(target.x, target.y);
  await expect(page.locator("[data-jar-flight-clone]")).toHaveCount(1);
  // The clone launches exactly over the clicked jar (same visual box, so same rotation and scale).
  const { source, launch } = await page.evaluate(() => (window as unknown as { __flight: { source: unknown; launch: unknown } }).__flight);
  const s = source as { x: number; y: number; w: number; h: number };
  const l = launch as typeof s;
  expect(s).not.toBeNull();
  for (const k of ["x", "y", "w", "h"] as const) expect(Math.abs(l[k] - s[k])).toBeLessThan(3);
  await expect(page).toHaveURL(new RegExp(`${target.href}$`));
  await expect(page.locator("[data-jar-flight-clone]")).toHaveCount(0, { timeout: 6_000 });
  expect(await clones(page)).toBe(1);
  const jar = page.locator("[data-jar-target]");
  await expect(jar).toBeVisible();
  expect(await jar.evaluate((e) => getComputedStyle(e).visibility)).toBe("visible");
  expect(Number(await jar.locator("[data-jar-rise]").evaluate((e) => getComputedStyle(e).opacity))).toBe(1);
});

test("browser back restores the slider", async ({ page }) => {
  const target = await ready(page);
  await page.mouse.click(target.x, target.y);
  await expect(page).toHaveURL(new RegExp(`${target.href}$`));
  await expect(page.locator("[data-jar-flight-clone]")).toHaveCount(0, { timeout: 6_000 });
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("[data-jar-slider]")).toHaveAttribute("data-jar-slider-ready", "true");
  const hidden = await page
    .locator("[data-jar-slider-item]")
    .evaluateAll((els) => els.filter((e) => getComputedStyle(e).visibility === "hidden").length);
  expect(hidden).toBe(0);
});

test("ctrl+click opens no flight", async ({ page, context }) => {
  const target = await ready(page);
  const popup = context.waitForEvent("page", { timeout: 5_000 }).catch(() => null);
  await page.keyboard.down("Control");
  await page.mouse.click(target.x, target.y);
  await page.keyboard.up("Control");
  await popup;
  await page.waitForTimeout(300);
  expect(await clones(page)).toBe(0);
  await expect(page).toHaveURL(/\/$/);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("navigates without a flight", async ({ page }) => {
    await page.goto("/");
    const first = page.locator("[data-jar-slider-item]").first();
    const href = await first.getAttribute("href");
    await first.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    expect(await clones(page)).toBe(0);
    await expect(page.locator("[data-jar-target]")).toBeVisible();
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("the clone launches over the tapped jar", async ({ page }) => {
    const target = await ready(page);
    await page.mouse.click(target.x, target.y);
    await expect(page.locator("[data-jar-flight-clone]")).toHaveCount(1);
    const { source, launch } = await page.evaluate(
      () => (window as unknown as { __flight: { source: Record<string, number>; launch: Record<string, number> } }).__flight,
    );
    expect(source).not.toBeNull();
    for (const k of ["x", "y", "w", "h"]) expect(Math.abs(launch[k] - source[k])).toBeLessThan(3);
    await expect(page).toHaveURL(new RegExp(`${target.href}$`));
  });
});
