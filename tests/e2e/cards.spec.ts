import { expect, test, type Locator } from "@playwright/test";

// Skip the session loader so the page is interactive right away.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("ganh:intro", "1");
    } catch {}
  });
});

for (const path of ["/products/mut-gung", "/pantry"]) {
  test(`no interactive element is nested inside a link on ${path}`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(page.locator("[data-product-card]").first()).toBeAttached();
    expect(await page.locator("a button").count()).toBe(0);
    expect(await page.locator("a a").count()).toBe(0);
    // Each card keeps its link and quick-add as siblings.
    const cards = page.locator("[data-product-card]");
    const n = await cards.count();
    for (let i = 0; i < n; i++) {
      await expect(cards.nth(i).locator("a")).toHaveCount(1);
      await expect(cards.nth(i).locator("button[data-quick-add]")).toHaveCount(
        1,
      );
    }
  });
}

/** Highest motif opacity in a card. */
const motifOpacity = (card: Locator) =>
  card
    .locator("[data-motif]")
    .evaluateAll((els) => Math.max(...els.map((e) => Number(getComputedStyle(e).opacity))));

for (const path of ["/products/mut-gung", "/pantry"]) {
  test(`no motif stays popped after a quick-add click on ${path}`, async ({ page }) => {
    await page.goto(path);
    const card = page.locator("[data-product-card]").filter({ has: page.locator("button[data-quick-add]") }).first();
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await card.locator("button[data-quick-add]").click();
    // Close the cart with the pointer: focus returns to the quick-add button, but not as keyboard focus.
    await expect(page.locator("[data-cart-root]")).toHaveAttribute("data-state", "open");
    await page.locator("[data-cart-drawer] header button").click();
    await expect(page.locator("[data-cart-root]")).toHaveAttribute("data-state", "closed");
    await page.mouse.move(5, 5);
    await page.waitForTimeout(1000);
    expect(await motifOpacity(card)).toBe(0);
  });

  test(`keyboard focus on a card link pops its motifs on ${path}`, async ({ page }) => {
    await page.goto(path);
    const card = page.locator("[data-product-card]").first();
    await card.scrollIntoViewIfNeeded();
    await page.mouse.move(5, 5);
    await card.locator("a").focus();
    // Programmatic focus after a keypress counts as keyboard focus.
    await page.keyboard.press("Shift");
    await card.locator("a").focus();
    await expect.poll(() => motifOpacity(card)).toBe(1);
  });
}

for (const width of [1440, 1920, 2560, 390]) {
  test(`pantry grids leave no dead zone at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/pantry");
    const grids = page.locator("[data-pantry-grid]");
    await expect(grids).toHaveCount(4);
    const rows = await grids.evaluateAll((els) =>
      els.map((g) => {
        const gr = g.getBoundingClientRect();
        const cs = [...g.querySelectorAll("[data-product-card]")].map((c) =>
          c.getBoundingClientRect(),
        );
        const first = cs[0];
        const last = cs[cs.length - 1];
        return {
          width: gr.width,
          lastReach: (last.right - gr.left) / gr.width,
          // Row centred: the first/last cards (or an orphan on its own row) sit symmetrically.
          leftGap: first.left - gr.left,
          rightGap: gr.right - last.right,
          lastLeftGap: last.left - gr.left,
          count: cs.length,
        };
      }),
    );
    expect(rows.map((r) => r.count)).toEqual([3, 2, 2, 1]);
    for (const r of rows) {
      const filled = r.lastReach >= 0.85;
      const centred =
        Math.abs(r.leftGap - r.rightGap) <= 2 ||
        Math.abs(r.lastLeftGap - r.rightGap) <= 2;
      expect(filled || centred, JSON.stringify(r)).toBe(true);
    }
  });
}
