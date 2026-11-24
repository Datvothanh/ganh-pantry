import { expect, test, type Locator, type Page } from "@playwright/test";

// Skip the session loader so the shell is interactive right away.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("ganh:intro", "1");
    } catch {}
  });
});

const header = (page: Page) => page.locator("header[data-site-header]");
const toggle = (page: Page) => page.locator("[data-menu-toggle]");
const cartButton = (page: Page) => page.locator("header [data-cart-button]");
const pill = (page: Page, l: string) => header(page).locator(`[data-lang-pill="${l}"]`);

/** Load a route and wait until the header has hydrated (the shell resets the scroll on mount). */
async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(header(page)).toHaveAttribute("data-ready", "1");
  await page.waitForTimeout(150);
}

/** Native scroll in small steps so every step fires a scroll event in a known direction. */
async function scrollToY(page: Page, y: number) {
  await page.evaluate(async (target) => {
    const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));
    const from = window.scrollY;
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
      window.scrollTo(0, from + ((target - from) * i) / steps);
      await frame();
    }
  }, y);
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeGreaterThan(y - 30);
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeLessThan(y + 30);
}

const sizes = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
] as const;

for (const size of sizes) {
  test.describe(`at ${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    for (const path of ["/products/mut-quat", "/pantry"]) {
      test(`${path}: bar hides scrolling down and returns scrolling up`, async ({ page }) => {
        await open(page, path);
        await expect(toggle(page)).toBeInViewport();
        await expect(cartButton(page)).toBeInViewport();
        await expect(pill(page, "en")).toBeInViewport();

        await scrollToY(page, 400);
        await expect(header(page)).toHaveAttribute("data-hidden", "1");
        await expect(toggle(page)).toBeHidden();
        await expect(cartButton(page)).toBeHidden();
        await expect(pill(page, "en")).toBeHidden();

        await scrollToY(page, 250);
        await expect(header(page)).not.toHaveAttribute("data-hidden", "1");
        await expect(toggle(page)).toBeInViewport();
        await expect(cartButton(page)).toBeInViewport();
        await expect(pill(page, "en")).toBeInViewport();
      });

      test(`${path}: the menu diamond keeps its 45deg turn, also on hover`, async ({ page }) => {
        await open(page, path);
        const diamond = toggle(page).locator("[data-menu-diamond]");
        const turned = async () => (await diamond.boundingBox())!.width;
        expect(await turned()).toBeGreaterThan(9);
        await toggle(page).hover();
        await page.waitForTimeout(600);
        expect(await turned()).toBeGreaterThan(9);
      });
    }

    test("header hit areas are at least 44px", async ({ page }) => {
      await open(page, "/products/mut-quat");
      const controls: Locator[] = [pill(page, "en"), pill(page, "vi"), toggle(page), cartButton(page)];
      for (const control of controls) {
        const box = (await control.boundingBox())!;
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        const hits = await control.evaluate(
          (el, [x, y]) =>
            [
              [x, y - 21.5],
              [x, y + 21.5],
              [x - 21.5, y],
              [x + 21.5, y],
            ].map(([px, py]) => {
              const hit = document.elementFromPoint(px, py);
              return !!hit && (hit === el || el.contains(hit));
            }),
          [cx, cy] as const,
        );
        expect(hits, `44px hit area of ${await control.evaluate((e) => e.outerHTML.slice(0, 60))}`).toEqual([
          true,
          true,
          true,
          true,
        ]);
      }
      for (const l of ["en", "vi"]) {
        const box = (await pill(page, l).boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    });
  });
}

test("never hides while the menu is open", async ({ page }) => {
  await open(page, "/products/mut-quat");
  await toggle(page).click();
  await expect(page.locator("[data-site-menu]")).toBeVisible();
  await scrollToY(page, 600);
  await expect(header(page)).not.toHaveAttribute("data-hidden", "1");
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-site-menu]")).toBeHidden();
  await expect(toggle(page)).toBeVisible();
  await expect(toggle(page)).toBeFocused();
});

test("never hides while the cart is open; EN/VI are not clickable under the scrim", async ({
  page,
}) => {
  await open(page, "/products/mut-quat");
  await cartButton(page).click();
  await expect(page.locator("[data-cart-drawer]")).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: test.info().outputPath("cart-open-header.png") });

  for (const l of ["en", "vi"]) {
    const covered = await pill(page, l).evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return !hit || !el.contains(hit);
    });
    expect(covered, `${l} pill is covered`).toBe(true);
    expect(await pill(page, l).evaluate((el) => !!el.closest("[inert]"))).toBe(true);
  }

  await scrollToY(page, 600);
  await expect(header(page)).not.toHaveAttribute("data-hidden", "1");
  await expect(cartButton(page)).toBeVisible();
});

test.describe("surface under the bar", () => {
  const placeSauces = async (page: Page, edge: "top" | "bottom", y: number) => {
    const target = await page.evaluate(
      ([e, at]) => {
        const r = document.getElementById("sauces")!.getBoundingClientRect();
        return Math.round((e === "top" ? r.top : r.bottom) + window.scrollY - (at as number));
      },
      [edge, y] as const,
    );
    await scrollToY(page, target);
    await page.waitForTimeout(250);
  };

  test("a thin dark sliver above the bar does not flip the header", async ({ page }) => {
    await open(page, "/pantry");
    await expect(page.locator("[data-pantry-nav][data-ready]")).toHaveCount(1);
    await placeSauces(page, "bottom", 12);
    await expect(header(page)).not.toHaveAttribute("data-tone", "dark");
    await placeSauces(page, "top", 10);
    await expect(header(page)).toHaveAttribute("data-tone", "dark");
  });

  test("cart button stays visible on a dark surface", async ({ page }) => {
    await open(page, "/pantry");
    await expect(page.locator("[data-pantry-nav][data-ready]")).toHaveCount(1);
    await placeSauces(page, "top", -200);
    await expect(header(page)).toHaveAttribute("data-tone", "dark");
    await scrollToY(page, (await page.evaluate(() => window.scrollY)) - 150);
    await expect(header(page)).toHaveAttribute("data-tone", "dark");
    await expect(cartButton(page)).toBeInViewport();
    await page.waitForTimeout(500);
    await expect(cartButton(page)).toHaveCSS("background-color", "rgb(255, 248, 238)");
    await header(page).screenshot({ path: test.info().outputPath("header-dark.png") });
  });
});
