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

const bgAlpha = (el: Element) => {
  const c = getComputedStyle(el).backgroundColor;
  if (c === "transparent") return 0;
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return 0;
  const parts = m[1].split(/[\s,/]+/).filter(Boolean);
  return parts.length > 3 ? Number(parts[3]) : 1;
};

test("Q2-8: the MENU pill has an opaque fill on light and dark surfaces", async ({ page }) => {
  await open(page, "/pantry");
  await expect(page.locator("[data-pantry-nav][data-ready]")).toHaveCount(1);
  const menuPill = toggle(page).locator("[data-menu-pill]");
  await expect(header(page)).not.toHaveAttribute("data-tone", "dark");
  await page.waitForTimeout(400);
  expect(await menuPill.evaluate(bgAlpha)).toBe(1);
  const target = await page.evaluate(() => {
    const r = document.getElementById("sauces")!.getBoundingClientRect();
    return Math.round(r.top + window.scrollY + 200);
  });
  await scrollToY(page, target);
  await scrollToY(page, target - 150);
  await expect(header(page)).toHaveAttribute("data-tone", "dark");
  await page.waitForTimeout(400);
  expect(await menuPill.evaluate(bgAlpha)).toBe(1);
});

for (const width of [360, 390, 430]) {
  for (const path of ["/products/mut-quat", "/vi/pantry", "/", "/vi"]) {
    test(`Q2-9: logo keeps 8px from the menu button at ${width} on ${path}`, async ({ page }) => {
      const heights: Record<number, number> = { 360: 740, 390: 844, 430: 932 };
      await page.setViewportSize({ width, height: heights[width] });
      await open(page, path);
      const logo = (await header(page).locator("a").filter({ has: page.locator("svg") }).first().boundingBox())!;
      const btn = (await toggle(page).boundingBox())!;
      const dx = Math.max(btn.x - (logo.x + logo.width), logo.x - (btn.x + btn.width));
      const dy = Math.max(btn.y - (logo.y + logo.height), logo.y - (btn.y + btn.height));
      expect(Math.max(dx, dy)).toBeGreaterThanOrEqual(8);
    });
  }
}

test("Q2-10: scrolling up inside the footer reveals the header", async ({ page }) => {
  await open(page, "/products/mut-quat");
  const bottom = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  await scrollToY(page, bottom);
  await page.waitForTimeout(300);
  await expect(header(page)).toHaveAttribute("data-hidden", "1");
  await scrollToY(page, bottom - 150);
  await expect(header(page)).not.toHaveAttribute("data-hidden", "1");
  await expect(toggle(page)).toBeInViewport();
  await expect(cartButton(page)).toBeInViewport();
});

test("Q2-10: wheel up at the bottom of the page reveals the header", async ({ page }) => {
  await open(page, "/products/mut-quat");
  const bottom = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  await scrollToY(page, bottom);
  await page.waitForTimeout(300);
  await expect(header(page)).toHaveAttribute("data-hidden", "1");
  await page.mouse.move(720, 600);
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, -50);
    await page.waitForTimeout(60);
  }
  await expect(header(page)).not.toHaveAttribute("data-hidden", "1");
  await expect(toggle(page)).toBeInViewport();
});

test("Q2-11: menu jar thumbnails are loaded within 450 ms of opening", async ({ page }) => {
  await open(page, "/products/mut-quat");
  await toggle(page).click();
  await page.waitForTimeout(450);
  const imgs = await page
    .locator("[data-site-menu] img")
    .evaluateAll((els) => els.map((el) => [(el as HTMLImageElement).complete, (el as HTMLImageElement).naturalWidth]));
  expect(imgs.length).toBeGreaterThanOrEqual(8);
  for (const [complete, w] of imgs) {
    expect(complete).toBe(true);
    expect(w as number).toBeGreaterThan(0);
  }
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
