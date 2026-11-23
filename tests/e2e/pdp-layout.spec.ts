import { expect, test, type Browser } from "@playwright/test";

/** Document y of the first revealed paragraph: where the intro starts below the hero. */
async function firstRevealY(
  browser: Browser,
  baseURL: string | undefined,
  path: string,
  opts: { width: number; height: number; js: boolean; reduced: boolean },
) {
  const ctx = await browser.newContext({
    baseURL,
    viewport: { width: opts.width, height: opts.height },
    javaScriptEnabled: opts.js,
    reducedMotion: opts.reduced ? "reduce" : "no-preference",
  });
  try {
    const page = await ctx.newPage();
    if (opts.js)
      await page.addInitScript(() => {
        try {
          sessionStorage.setItem("ganh:intro", "1");
        } catch {}
      });
    await page.goto(path);
    if (opts.js) {
      // Hydrated: the hero's effects ran and announced the jar; then let the font-load relayout settle.
      await expect(page.locator("[data-jar-target]")).toHaveAttribute("data-hero-ready", "true", { timeout: 10_000 });
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await page.evaluate(
        () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
      );
    }
    return await page.locator("[data-reveal]").first().evaluate((el) => el.getBoundingClientRect().top + scrollY);
  } finally {
    await ctx.close();
  }
}

const sizes = [
  { width: 1536, height: 730 },
  { width: 1440, height: 900 },
  // Narrow desktops: wrapped titles make the meta row, not the jar, set the clearance.
  { width: 1025, height: 700 },
  { width: 1100, height: 700 },
  { width: 1280, height: 720 },
];
const handles = ["mut-gung", "mat-ong-ca-phe", "ca-phao"];
// Short desktops with long titles: the meta row's end pose sets the clearance.
const shortSizes = [
  { width: 1093, height: 560 },
  { width: 1100, height: 600 },
];
const longHandles = ["ca-phao", "mat-ong-ca-phe", "tuong-ot-toi"];
const cases = [
  ...sizes.flatMap((size) => handles.map((handle) => ({ size, handle }))),
  ...shortSizes.flatMap((size) => longHandles.map((handle) => ({ size, handle }))),
];

for (const reduced of [false, true]) {
  test.describe(reduced ? "reduced motion" : "full motion", () => {
    for (const { size, handle } of cases) {
      test(`PDP intro does not jump after hydration at ${size.width}x${size.height} (${handle})`, async ({
        browser,
        baseURL,
      }) => {
        const path = `/products/${handle}`;
        const off = await firstRevealY(browser, baseURL, path, { ...size, js: false, reduced });
        const on = await firstRevealY(browser, baseURL, path, { ...size, js: true, reduced });
        expect(Math.abs(on - off), `no-JS y=${off}, JS y=${on}`).toBeLessThanOrEqual(8);
      });
    }
  });
}
