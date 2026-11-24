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

// ---------- QA ledger Q2-2, Q2-12 ----------

/** Q2-2: on small grids (two columns on phones, three on tablets) the jar image ends above the card's name and sub line. */
for (const { width, height } of [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 700, height: 1000 },
  { width: 768, height: 1024 },
]) {
  for (const prefix of ["", "/vi"]) {
    test(`pantry jar images stay above the name and sub at ${width}px (${prefix || "/en"})`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(prefix + "/pantry");
      await page.mouse.move(1, 1);
      const cards = page.locator("[data-pantry-grid] [data-product-card]");
      await expect(cards).toHaveCount(8);
      // Images are lazy: bring each card into view and wait until its jar has really loaded,
      // so no unloaded 0x0 box passes trivially.
      for (let i = 0; i < 8; i++) {
        const img = cards.nth(i).locator("img");
        await img.scrollIntoViewIfNeeded();
        await expect
          .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
          .toBe(true);
      }
      await page.mouse.move(1, 1);
      const boxes = await cards.evaluateAll((els) =>
        els.map((el) => {
          const img = el.querySelector("img")!.getBoundingClientRect();
          const link = el.querySelector("a")!;
          const name = link.querySelector("[lang='vi']")!.getBoundingClientRect();
          const sub = link.lastElementChild!.getBoundingClientRect();
          return {
            handle: el.getAttribute("data-handle"),
            imgHeight: img.height,
            imgBottom: img.bottom,
            imgLeft: img.left,
            imgRight: img.right,
            nameTop: name.top,
            subTop: sub.top,
          };
        }),
      );
      for (const b of boxes) {
        expect(b.imgHeight, JSON.stringify(b)).toBeGreaterThan(40);
        expect(b.imgBottom, JSON.stringify(b)).toBeLessThanOrEqual(Math.min(b.nameTop, b.subTop) + 0.5);
      }
    });
  }
}

/** Q2-12: the quick-add hit area is at least 44x44, also while it is hidden or scaling in. */
for (const path of ["/pantry", "/products/mut-gung"]) {
  for (const { width, height } of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    test(`quick-add hit area is at least 44px on ${path} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(path);
      await page.mouse.move(1, 1);
      const cards = cardsOn(page, path);
      const n = await cards.count();
      expect(n).toBeGreaterThan(0);
      for (let i = 0; i < n; i++) {
        const button = cards.nth(i).locator("button[data-quick-add]");
        await button.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center" }));
        await page.waitForTimeout(150);
        const misses = await button.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          return [
            [cx - 21, cy],
            [cx + 21, cy],
            [cx, cy - 21],
            [cx, cy + 21],
          ]
            .filter(([x, y]) => {
              const hit = document.elementFromPoint(x, y);
              return !hit || !el.contains(hit);
            })
            .map(([x, y]) => `${Math.round(x)},${Math.round(y)}`);
        });
        expect(misses, `card ${i}`).toEqual([]);
      }
    });
  }
}

/** Q2-12: where the button is already full size (touch, no hover), its hit area is not widened past it. */
test.describe("quick-add on touch", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  for (const path of ["/pantry", "/products/mut-gung"]) {
    test(`a tap 30px from the quick-add centre does not hit it on ${path}`, async ({ page }) => {
      await page.goto(path);
      const button = cardsOn(page, path).first().locator("button[data-quick-add]");
      await button.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center" }));
      await page.waitForTimeout(150);
      const hits = await button.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        return [
          [cx - 30, cy],
          [cx, cy + 30],
        ].map(([x, y]) => {
          const hit = document.elementFromPoint(x, y);
          return !!hit && (hit === el || el.contains(hit));
        });
      });
      expect(hits).toEqual([false, false]);
    });
  }
});
