import { expect, test, type Page } from "@playwright/test";

// Skip the session loader so the shell is interactive right away.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("ganh:intro", "1");
    } catch {}
  });
});

const gung = (page: Page) => page.locator('[data-add-to-cart="mut-gung"]');
const quat = (page: Page) => page.locator('[data-add-to-cart="mut-quat"]');
const count = (page: Page) => page.locator("[data-cart-count]");
const drawer = (page: Page) => page.locator("[data-cart-drawer]");

test("add, change quantity, remove and check out", async ({ page }) => {
  await page.goto("/dev/cart/harness.html");
  await expect(page.locator("[data-cart-button]")).toBeVisible();
  await expect(count(page)).toHaveCount(0);

  await gung(page).click();
  await expect(count(page)).toHaveText("1");
  await expect(gung(page)).toHaveAttribute("data-status", "added");
  await quat(page).click();
  await expect(count(page)).toHaveText("2");
  await expect(quat(page)).toHaveAttribute("data-status", "added");

  await page.locator("[data-cart-button]").click();
  await expect(drawer(page)).toBeVisible();
  await expect(drawer(page).locator("[data-cart-line]")).toHaveCount(2);
  const first = drawer(page).locator('[data-cart-line="mut-gung"]');
  const second = drawer(page).locator('[data-cart-line="mut-quat"]');
  await expect(first).toContainText("Mứt Gừng");
  await expect(first).toContainText("220 g");
  await expect(second).toContainText("314 g");
  await expect(first.locator("img")).toHaveAttribute("src", /\/products\/mut-gung\.webp/);
  await expect(drawer(page).locator("[data-cart-subtotal]")).toHaveText("$22");
  // The demo checkout is in-site, so the Shopify store-password note stays hidden.
  await expect(drawer(page).locator("[data-cart-store-password]")).toHaveCount(0);

  // Quantity stepper updates the subtotal ($9 × 2 + $13).
  await first.locator("[data-cart-increase]").click();
  await expect(first.locator("[data-cart-qty]")).toHaveText("2");
  await expect(drawer(page).locator("[data-cart-subtotal]")).toHaveText("$31");
  await expect(count(page)).toHaveText("3");

  // The cart persists across a reload (cookie).
  await page.reload();
  await expect(count(page)).toHaveText("3");
  await page.locator("[data-cart-button]").click();
  await expect(drawer(page).locator("[data-cart-line]")).toHaveCount(2);

  // Esc closes the drawer.
  await page.keyboard.press("Escape");
  await expect(drawer(page)).toBeHidden();
  await page.locator("[data-cart-button]").click();

  // Remove both lines → empty state with a link to the pantry.
  await drawer(page).locator('[data-cart-line="mut-gung"] [data-cart-remove]').click();
  await expect(drawer(page).locator("[data-cart-line]")).toHaveCount(1);
  await expect(drawer(page).locator("[data-cart-subtotal]")).toHaveText("$13");
  await drawer(page).locator("[data-cart-remove]").click();
  await expect(drawer(page).locator("[data-cart-empty]")).toBeVisible();
  await expect(drawer(page).getByRole("link", { name: /pantry/i })).toHaveAttribute("href", "/pantry");
  await expect(count(page)).toHaveCount(0);

  // Add again and go to checkout.
  await page.keyboard.press("Escape");
  await gung(page).click();
  await expect(count(page)).toHaveText("1");
  await page.locator("[data-cart-button]").click();
  await drawer(page).locator("[data-cart-checkout]").click();
  await expect(page).toHaveURL(/\/checkout-demo$/);
  const demo = page.locator("[data-checkout-demo]");
  await expect(demo).toContainText(/portfolio demo/i);
  await expect(demo.locator('[data-checkout-line="mut-gung"]')).toBeVisible();
  await expect(demo.locator("[data-checkout-subtotal]")).toHaveText("$9");
});

test("drawer traps focus and closes from the backdrop", async ({ page }) => {
  await page.goto("/dev/cart/harness.html");
  await page.locator("[data-cart-button]").click();
  await expect(drawer(page)).toBeVisible();
  await expect(drawer(page).locator("[data-cart-empty]")).toBeVisible();
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement?.closest("[data-cart-drawer]"))).toBe(true);
  }
  await page.mouse.click(40, 450);
  await expect(drawer(page)).toBeHidden();
});

test("checkout from a real locale page closes the drawer and unlocks scroll", async ({ page }) => {
  // Fill the cart through the harness; the cookie carries over to the locale pages.
  await page.goto("/dev/cart/harness.html");
  await gung(page).click();
  await expect(count(page)).toHaveText("1");
  // The count is optimistic; wait for the server to confirm (and set the cookie) before leaving.
  await expect(gung(page)).toHaveAttribute("data-status", "added");

  await page.goto("/vi/pantry");
  await expect(count(page)).toHaveText("1");
  await page.locator("[data-cart-button]").click();
  await expect(drawer(page)).toBeVisible();
  await drawer(page).locator("[data-cart-checkout]").click();
  await expect(page).toHaveURL(/\/vi\/checkout-demo$/);
  await expect(page.locator("[data-checkout-line='mut-gung']")).toBeVisible();
  await expect(drawer(page)).toBeHidden();
  await expect(page.locator("[data-cart-root]")).toHaveAttribute("data-state", "closed");
  expect(await page.evaluate(() => document.documentElement.style.overflow)).not.toBe("hidden");
});
