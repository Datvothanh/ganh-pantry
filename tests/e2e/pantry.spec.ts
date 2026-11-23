import { expect, test, type Page } from "@playwright/test";

// Skip the session loader so the page is interactive right away.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("ganh:intro", "1");
    } catch {}
  });
});

const sections = (page: Page) => page.locator("[data-pantry-section]");
const nav = (page: Page) => page.locator("[data-pantry-nav]");
const pill = (page: Page, id: string) =>
  nav(page).locator(`[data-pantry-pill="${id}"]`);

// Wait for hydration first: the shell resets the scroll to the top on mount.
const scrollToSection = async (page: Page, id: string) => {
  await expect(page.locator("[data-pantry-nav][data-ready]")).toHaveCount(1);
  await page.evaluate((sid) => {
    const el = document.getElementById(sid)!;
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + 40);
  }, id);
};

test("renders the title, four category sections, the spec table and both locales", async ({
  page,
}) => {
  await page.goto("/pantry");
  await expect(page.locator("h1")).toHaveText(/pantry/i);
  await expect(sections(page)).toHaveCount(4);
  await expect(sections(page).nth(0)).toHaveAttribute("id", "preserves");
  await expect(page.locator("#sauces")).toHaveAttribute("data-dark", "");
  await expect(page.locator("[data-product-card]")).toHaveCount(8);
  await expect(page.locator("[data-spec-row]")).toHaveCount(8);

  await page.goto("/vi/pantry");
  await expect(page.locator("h1")).toHaveText(/gian bếp/i);
  await expect(sections(page)).toHaveCount(4);
});

test("the dark Sauces title fits in both locales and the header turns light over it", async ({
  page,
}) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/pantry", "/vi/pantry"]) {
      await page.goto(path);
      const fits = await page
        .locator("#sauces-title")
        .evaluate((el) => el.scrollWidth <= el.clientWidth);
      expect(fits, `${path} at ${width}px`).toBe(true);
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await scrollToSection(page, "sauces");
  await expect(page.locator("header[data-site-header]")).toHaveAttribute(
    "data-tone",
    "dark",
  );
});

test("pills track the section in view and a pill click scrolls there", async ({
  page,
}) => {
  await page.goto("/pantry");
  await expect(pill(page, "preserves")).toHaveCount(1);

  await scrollToSection(page, "pickles");
  await expect(nav(page)).toBeVisible();
  await expect(pill(page, "pickles")).toHaveAttribute("aria-current", "true");
  await expect(pill(page, "preserves")).not.toHaveAttribute(
    "aria-current",
    "true",
  );

  await scrollToSection(page, "preserves");
  await expect(pill(page, "preserves")).toHaveAttribute(
    "aria-current",
    "true",
  );

  await pill(page, "honey").click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Math.round(document.getElementById("honey")!.getBoundingClientRect().top),
      ),
    )
    .toBeLessThan(120);
  await expect(pill(page, "honey")).toHaveAttribute("aria-current", "true");
});

test("quick-add on a card adds it to the cart", async ({ page }) => {
  await page.goto("/pantry");
  const card = page.locator('#pickles [data-product-card]').first();
  await card.scrollIntoViewIfNeeded();
  const handle = (await card.getAttribute("data-handle"))!;
  await card.hover();
  const quick = card.locator("[data-quick-add]");
  await expect(quick).toBeVisible();
  await quick.click();
  await expect(page).toHaveURL(/\/pantry$/);
  const drawer = page.locator("[data-cart-drawer]");
  await expect(drawer).toBeVisible();
  await expect(drawer.locator(`[data-cart-line="${handle}"]`)).toHaveCount(1);
  await expect(page.locator("[data-cart-count]")).toHaveText("1");
});

test("card click opens the product", async ({ page }) => {
  await page.goto("/pantry");
  const card = page.locator('#preserves [data-product-card][data-handle="mut-quat"]');
  await card.scrollIntoViewIfNeeded();
  await card.click({ position: { x: 30, y: 60 } });
  await expect(page).toHaveURL(/\/products\/mut-quat$/);
});

test("reduced motion keeps everything reachable", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:" + (process.env.E2E_PORT || 3100) + "/pantry");
  await expect(sections(page)).toHaveCount(4);
  await scrollToSection(page, "preserves");
  await pill(page, "sauces").click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Math.round(document.getElementById("sauces")!.getBoundingClientRect().top),
      ),
    )
    .toBeLessThan(120);
  await ctx.close();
});
