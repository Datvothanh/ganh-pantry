import { expect, test, type Page } from "@playwright/test";

// Skip the session loader so the page is interactive right away.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("ganh:intro", "1");
    } catch {}
  });
});

const block = (page: Page) => page.locator("[data-buy-block]");
const price = (page: Page) => block(page).locator("[data-buy-price]");
const drawer = (page: Page) => page.locator("[data-cart-drawer]");
const bar = (page: Page) => page.locator("[data-sticky-buy]");

test("choosing a weight updates the price; add to cart opens the drawer with that variant", async ({
  page,
}) => {
  await page.goto("/products/mut-gung");
  await block(page).scrollIntoViewIfNeeded();
  await expect(price(page)).toHaveText("$9");
  const pills = page.locator("[data-weight]");
  await expect(pills).toHaveCount(2);
  await expect(page.locator('[data-weight="220g"]')).toHaveAttribute(
    "aria-checked",
    "true",
  );

  await page.locator('[data-weight="314g"]').click();
  await expect(page.locator('[data-weight="314g"]')).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(price(page)).toHaveText("$12");

  await block(page).locator("[data-qty-increase]").click();
  await expect(block(page).locator("[data-qty]")).toHaveText("2");

  await block(page).locator("[data-add-to-cart]").click();
  await expect(drawer(page)).toBeVisible();
  const line = drawer(page).locator('[data-cart-line="mut-gung"]');
  await expect(line).toHaveAttribute("data-variant", "314g");
  await expect(line).toContainText("314 g");
  await expect(line.locator("[data-cart-qty]")).toHaveText("2");
  await expect(drawer(page).locator("[data-cart-subtotal]")).toHaveText("$24");
});

test("quick-add on an other-products card adds that product", async ({
  page,
}) => {
  await page.goto("/products/mut-gung");
  const card = page.locator("[data-product-card]").first();
  await card.scrollIntoViewIfNeeded();
  const handle = (await card.getAttribute("data-handle"))!;
  await card.hover();
  const quick = card.locator("[data-quick-add]");
  await expect(quick).toBeVisible();
  await quick.click();
  await expect(page).toHaveURL(/\/products\/mut-gung$/);
  await expect(drawer(page)).toBeVisible();
  await expect(
    drawer(page).locator(`[data-cart-line="${handle}"]`),
  ).toHaveCount(1);
  await expect(page.locator("[data-cart-count]")).toHaveText("1");
});

test("sticky buy bar shows after the buy block scrolls away and hides near the footer", async ({
  page,
}) => {
  await page.goto("/products/mut-gung");
  await expect(bar(page)).toBeHidden();
  // Scroll only once the page has hydrated: on mount the shell jumps to the top
  // (ScrollTopOnRouteChange), which would undo an earlier scroll under parallel load.
  await expect(page.locator('[data-jar-target][data-hero-ready="true"]')).toHaveCount(1);
  await page.locator("[data-other-products]").scrollIntoViewIfNeeded();
  await expect(bar(page)).toBeVisible();
  await expect(bar(page).locator("[data-sticky-price]")).toHaveText("$9");

  // Selecting a weight updates the bar too, and its button adds the selected variant.
  await page.evaluate(() =>
    window.scrollTo(
      0,
      document.querySelector("[data-buy-block]")!.getBoundingClientRect().top +
        window.scrollY -
        300,
    ),
  );
  await expect(bar(page)).toBeHidden();
  await page.locator('[data-weight="314g"]').click();
  await page.locator("[data-other-products]").scrollIntoViewIfNeeded();
  await expect(bar(page).locator("[data-sticky-price]")).toHaveText("$12");
  await bar(page).locator("[data-add-to-cart]").click();
  await expect(
    drawer(page).locator('[data-cart-line="mut-gung"]'),
  ).toHaveAttribute("data-variant", "314g");
  await page.keyboard.press("Escape");

  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await expect(bar(page)).toBeHidden();
});

/** Mock-adapter cart cookie: base64url JSON of [handle, variantId, quantity][]. */
const cartCookie = (rows: [string, string, number][]) => ({
  name: "ganh_cart",
  value: Buffer.from(JSON.stringify(rows), "utf8").toString("base64url"),
  domain: "127.0.0.1",
  path: "/",
});

test("a failed add shows an error the shopper sees, even with an empty cart", async ({
  page,
}) => {
  await page.goto("/products/mut-gung");
  await block(page).scrollIntoViewIfNeeded();
  // Every server action from now on fails at the network.
  await page.route("**/*", (route) =>
    route.request().method() === "POST" && route.request().headers()["next-action"]
      ? route.abort()
      : route.continue(),
  );
  const add = block(page).locator("[data-add-to-cart]");
  await add.click();
  await expect(drawer(page)).toBeVisible();
  await expect(drawer(page).locator("[data-cart-empty]")).toBeVisible();
  await expect(drawer(page).locator("[data-cart-error]")).toBeVisible();
  await expect(add).toHaveAttribute("data-status", "error");
  await expect(drawer(page).locator("[data-cart-line]")).toHaveCount(0);
});

test("the drawer + is disabled at the maximum quantity", async ({ page, context }) => {
  await context.addCookies([cartCookie([["mut-gung", "220g", 99]])]);
  await page.goto("/products/mut-gung");
  await expect(page.locator("[data-cart-count]")).toHaveText("99");
  await page.locator("[data-cart-button]").click();
  const line = drawer(page).locator('[data-cart-line="mut-gung"]');
  await expect(line.locator("[data-cart-qty]")).toHaveText("99");
  await expect(line.locator("[data-cart-increase]")).toBeDisabled();
  await expect(line.locator("[data-cart-decrease]")).toBeEnabled();
});

test("a cart that is gone on the server resets the drawer, which then recovers", async ({
  page,
  context,
}) => {
  await context.addCookies([cartCookie([["mut-gung", "220g", 2]])]);
  await page.goto("/products/mut-gung");
  await expect(page.locator("[data-cart-count]")).toHaveText("2");
  await page.locator("[data-cart-button]").click();
  const line = drawer(page).locator('[data-cart-line="mut-gung"]');
  await expect(line).toBeVisible();

  // The cart expires server-side (cookie gone) while the drawer still shows it.
  await context.clearCookies();
  await line.locator("[data-cart-increase]").click();
  await expect(drawer(page).locator("[data-cart-empty]")).toBeVisible();
  await expect(drawer(page).locator("[data-cart-error]")).toBeVisible();
  await expect(page.locator("[data-cart-count]")).toHaveCount(0);

  // Adding again starts a fresh cart.
  await page.keyboard.press("Escape");
  await block(page).scrollIntoViewIfNeeded();
  await block(page).locator("[data-add-to-cart]").click();
  await expect(line.locator("[data-cart-qty]")).toHaveText("1");
  await expect(page.locator("[data-cart-count]")).toHaveText("1");
  await expect(drawer(page).locator("[data-cart-error]")).toHaveCount(0);
});
