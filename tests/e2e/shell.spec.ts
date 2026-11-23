import { expect, test } from "@playwright/test";

// Skip the session loader so the shell is interactive right away.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("ganh:intro", "1");
    } catch {}
  });
});

const credit = {
  en: "Concept project — not a real brand.",
  vi: "Dự án concept — không phải thương hiệu thật.",
};

for (const [path, lang] of [
  ["/", "en"],
  ["/vi", "vi"],
] as const) {
  test(`${path} renders the shell in ${lang}`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    const header = page.locator("header[data-site-header]");
    await expect(header).toBeVisible();
    await expect(header.getByRole("link", { name: /GÁNH/ })).toBeVisible();
    await expect(header.getByRole("button", { name: /menu/i }).first()).toBeVisible();
    await expect(page.locator("footer[data-site-footer]")).toContainText(credit[lang]);
    await expect(header.locator(`[data-lang-pill="${lang}"]`)).toHaveAttribute("aria-current", "true");
  });
}

test("menu opens and closes with Escape", async ({ page }) => {
  await page.goto("/");
  const menu = page.locator("[data-site-menu]");
  await expect(menu).toBeHidden();
  await page.locator("[data-menu-toggle]").click();
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("link", { name: "Pantry" })).toBeVisible();
  await expect(menu.getByRole("link", { name: /Mứt Gừng/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
});

test("product routes: known handle 200, unknown 404", async ({ page }) => {
  const ok = await page.goto("/products/mut-gung");
  expect(ok?.status()).toBe(200);
  const vi = await page.goto("/vi/products/mut-gung");
  expect(vi?.status()).toBe(200);
  const nope = await page.goto("/products/nope");
  expect(nope?.status()).toBe(404);
  const pantry = await page.goto("/pantry");
  expect(pantry?.status()).toBe(200);
});

test("language pill switches to /vi keeping the path and back", async ({ page }) => {
  await page.goto("/products/mut-gung");
  await page.locator('[data-lang-pill="vi"]').click();
  await expect(page).toHaveURL(/\/vi\/products\/mut-gung$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await page.locator('[data-lang-pill="en"]').click();
  await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/products\/mut-gung$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("loader plays on first visit and marks intro done", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-intro-done", "1", { timeout: 6000 });
  await expect(page.locator("[data-loader]")).toHaveCount(0);
  await ctx.close();
});
