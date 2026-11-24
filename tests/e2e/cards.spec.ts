import { expect, test, type Locator, type Page } from "@playwright/test";

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
    // Clicking may scroll the track; park the pointer outside the card, wait until it is not hovered.
    const box = (await card.boundingBox())!;
    const vp = page.viewportSize()!;
    await page.mouse.move(box.x > vp.width / 2 ? 5 : vp.width - 5, box.y > vp.height / 2 ? 5 : vp.height - 5);
    await expect.poll(() => card.evaluate((el) => el.matches(":hover"))).toBe(false);
    await expect.poll(() => motifOpacity(card)).toBe(0);
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

/** Every product card on the page: the PDP "other products" row, or the pantry grids. */
const cardsOn = (page: Page, path: string) =>
  page.locator(path.endsWith("/pantry") ? "[data-product-card]" : "[data-other-products] [data-product-card]");

/** Each motif, forced fully popped, stays above the caption box (and inside the card). */
for (const path of ["/products/mut-gung", "/pantry"]) {
  for (const { width, height } of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    test(`hover motifs stay out of the caption box on ${path} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(path);
      const cards = cardsOn(page, path);
      const n = await cards.count();
      expect(n).toBeGreaterThan(0);
      for (let i = 0; i < n; i++) {
        const card = cards.nth(i);
        await card.scrollIntoViewIfNeeded();
        // Keyboard focus on the link pops the motifs without depending on the pointer.
        await page.mouse.move(5, 5);
        await card.locator("a").focus();
        await page.keyboard.press("Shift");
        await card.locator("a").focus();
        await expect.poll(() => motifOpacity(card)).toBe(1);
        // Wait out the spring so the boxes are final.
        await page.waitForTimeout(1100);
        const r = await card.evaluate((el) => {
          const caption = el.querySelector("[class*='caption']")!.getBoundingClientRect();
          const c = el.getBoundingClientRect();
          return {
            captionTop: caption.top,
            cardTop: c.top,
            pops: [...el.querySelectorAll("[data-motif]")].map((m) => {
              const b = m.getBoundingClientRect();
              return { top: b.top, bottom: b.bottom };
            }),
          };
        });
        for (const p of r.pops) {
          expect(p.bottom, `card ${i}: motif bottom ${p.bottom} vs caption top ${r.captionTop}`).toBeLessThanOrEqual(r.captionTop + 0.5);
          expect(p.top, `card ${i}: motif above the card`).toBeGreaterThanOrEqual(r.cardTop - 0.5);
        }
      }
    });
  }
}

for (const path of ["/products/mut-gung", "/pantry"]) {
  for (const [locale, prefix, add] of [
    ["en", "", "Add"],
    ["vi", "/vi", "Thêm"],
  ] as const) {
    test(`quick-add shows the variant weight and price and names them on ${path} (${locale})`, async ({ page }) => {
      await page.goto(prefix + path);
      const cards = cardsOn(page, path);
      const n = await cards.count();
      expect(n).toBeGreaterThan(0);
      for (let i = 0; i < n; i++) {
        const card = cards.nth(i);
        const meta = (await card.locator("[data-quick-meta]").innerText()).replace(/\s+/g, " ");
        const weight = meta.match(/\d+ g/)?.[0];
        expect(weight, meta).toBeTruthy();
        expect(meta).toContain("$");
        const name = (await card.locator("a").locator("[lang='vi']").innerText()).trim();
        const label = (await card.locator("button[data-quick-add]").getAttribute("aria-label"))!;
        expect(label.startsWith(`${add} ${name} ${weight}, `), label).toBe(true);
        expect(label).toMatch(/, \d+(\.\d+)? USD$/);
      }
    });
  }
}
