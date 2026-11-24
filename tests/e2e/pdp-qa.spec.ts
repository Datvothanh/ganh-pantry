import { expect, test, type Page } from "@playwright/test";

// QA ledger rows QP-1..QP-3, QP-5 (PDP). Skip the session loader so the hero starts right away.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("ganh:intro", "1");
    } catch {}
  });
});

const frames = (page: Page) =>
  page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );

/** Hydrated, hero announced, fonts loaded, layout settled. */
async function settle(page: Page) {
  await expect(page.locator('[data-jar-target][data-hero-ready="true"]')).toHaveCount(1, { timeout: 10_000 });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await frames(page);
}

async function scrollTo(page: Page, y: number) {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(Math.round(y));
  await frames(page);
}

// ---- QP-1: sticky buy bar window ----

// Rule: past the first half screen, shown whenever the buy block is off screen (before or after
// it); hidden while the block is on screen, while the bar's band (its height + 24px at the bottom
// of the viewport) would cover the other-products heading, and while a footer is on screen.
for (const size of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  test(`QP-1 sticky bar shows whenever the buy block is off screen, never over the other-products heading at ${size.width}x${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto("/products/mut-quat");
    await settle(page);
    const bar = page.locator("[data-sticky-buy]");
    const geo = await page.evaluate(() => {
      const y = (s: string) => document.querySelector(s)!.getBoundingClientRect();
      const footers = Array.from(document.querySelectorAll("[data-site-footer]")).map(
        (f) => f.getBoundingClientRect().top + scrollY,
      );
      return {
        blockTop: y("[data-buy-block]").top + scrollY,
        blockBottom: y("[data-buy-block]").bottom + scrollY,
        headTop: y("[data-other-products] h2").top + scrollY,
        headBottom: y("[data-other-products] h2").bottom + scrollY,
        barH: (document.querySelector("[data-sticky-buy]") as HTMLElement).offsetHeight,
        footerTop: Math.min(...footers),
        max: document.documentElement.scrollHeight - innerHeight,
      };
    });
    const vh = size.height;
    const bandTop = vh - geo.barH - 24;
    // Hidden on the hero.
    await scrollTo(page, 0);
    await expect(bar, "y=0 (hero)").not.toHaveAttribute("data-visible", "");
    // Before the block: from half a screen down until the block enters, sampled every 40px.
    let before = 0;
    for (let y = Math.ceil(vh / 2) + 8; y <= Math.floor(geo.blockTop - vh) - 8; y += 40) {
      await scrollTo(page, y);
      await expect(bar, `y=${y} (before the block)`).toHaveAttribute("data-visible", "");
      before += 40;
    }
    expect(before, "scroll distance with the bar shown before the buy block").toBeGreaterThanOrEqual(200);
    // Block on screen.
    for (const y of [Math.round(geo.blockTop - vh / 2), Math.round(geo.blockBottom - vh / 2)]) {
      await scrollTo(page, Math.max(0, Math.min(y, geo.max)));
      await expect(bar, `y=${y} (block on screen)`).not.toHaveAttribute("data-visible", "");
    }
    // After: from the block leaving until a footer enters, sampled every 20px. Positions within
    // 6px of a boundary are skipped (sub-pixel rounding).
    const from = Math.ceil(geo.blockBottom) + 2;
    const to = Math.floor(geo.footerTop - vh) - 2;
    expect(to, "page has room after the buy block before the footer").toBeGreaterThanOrEqual(from);
    for (let y = from; y <= to; y += 20) {
      const headTop = geo.headTop - y;
      const headBottom = geo.headBottom - y;
      const near = [headTop - vh, headBottom - bandTop].some((d) => Math.abs(d) < 6);
      if (near) continue;
      const covers = headTop < vh && headBottom > bandTop;
      await scrollTo(page, y);
      if (covers) {
        await expect(bar, `y=${y} (over the heading)`).not.toHaveAttribute("data-visible", "");
      } else {
        await expect(bar, `y=${y}`).toHaveAttribute("data-visible", "");
      }
    }
    // Footer on screen.
    for (const y of [geo.footerTop - vh + 40, geo.max]) {
      await scrollTo(page, Math.min(Math.round(y), geo.max));
      await expect(bar, `y=${y} (footer)`).not.toHaveAttribute("data-visible", "");
    }
  });
}

// ---- QP-2: photo-row images load before they are seen ----

test("QP-2 photo-row images in or near the viewport are loaded", async ({ page }) => {
  await page.goto("/products/mut-quat");
  await settle(page);
  const row = page.locator("[data-photo-row]");
  await row.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 100));
  await frames(page);
  for (let step = 0; step < 4; step++) {
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const vw = innerWidth;
            const bad: string[] = [];
            for (const fig of Array.from(document.querySelectorAll<HTMLElement>("[data-photo-slide]"))) {
              const r = fig.getBoundingClientRect();
              if (r.right < -r.width || r.left > vw + r.width) continue;
              const img = fig.querySelector("img")!;
              if (!img.complete || !img.naturalWidth) bad.push(`${Math.round(r.left)}:${img.src}`);
            }
            return bad;
          }),
        { timeout: 3_000 },
      )
      .toEqual([]);
    // Move the row along by a card with the keyboard and check again.
    await page.locator("[data-photo-row] [role=group]").focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(400);
  }
});

// ---- QP-5: photo-row card sizes ----

test("QP-5 photo row shows 2.5+ cards at 1440 and never upscales", async ({ page }) => {
  await page.goto("/products/mut-quat");
  await settle(page);
  const row = page.locator("[data-photo-row]");
  await row.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 100));
  await expect
    .poll(() =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLImageElement>("[data-photo-slide] img")).every(
          (i) => i.complete && i.naturalWidth > 0,
        ),
      ),
    )
    .toBe(true);
  const info = await page.evaluate(() => {
    const vw = innerWidth;
    let visible = 0;
    const over: string[] = [];
    const widths = new Set<number>();
    for (const fig of Array.from(document.querySelectorAll<HTMLElement>("[data-photo-slide]"))) {
      const r = fig.getBoundingClientRect();
      widths.add(Math.round(r.width));
      visible += Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0)) / r.width;
      const img = fig.querySelector("img")!;
      if (r.width > img.naturalWidth) over.push(`${Math.round(r.width)}>${img.naturalWidth}`);
    }
    return { visible, over, widths: widths.size };
  });
  expect(info.visible).toBeGreaterThanOrEqual(2.5);
  expect(info.over).toEqual([]);
  expect(info.widths, "card widths vary").toBeGreaterThan(1);
});

// ---- QP-3: jar rests under the title and never reaches the header ----

for (const size of [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 390, height: 844 },
]) {
  for (const handle of ["mut-quat", "ca-phao", "mat-ong-ca-phe"]) {
    test(`QP-3 jar rests under the title at ${size.width}x${size.height} (${handle})`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto(`/products/${handle}`);
      await settle(page);
      const gap = await page.evaluate(() => {
        const t = document.querySelector("h1")!.getBoundingClientRect();
        const j = document.querySelector("[data-jar-target]")!.getBoundingClientRect();
        return j.top - t.bottom;
      });
      expect(gap).toBeGreaterThanOrEqual(0);
      expect(gap).toBeLessThanOrEqual(120);

      // Through the scroll scrub the jar stays below the header bar (pills and buttons).
      const band = await page.evaluate(() => {
        const els = document.querySelectorAll("[data-site-header] a, [data-site-header] button");
        let b = 0;
        for (const e of Array.from(els)) {
          const r = e.getBoundingClientRect();
          if (r.height && r.height <= 60 && r.top < 120) b = Math.max(b, r.bottom);
        }
        return b;
      });
      const end = Math.round(size.height * 0.4);
      for (let y = 0; y <= end; y += Math.round(end / 6)) {
        await scrollTo(page, y);
        const top = await page.evaluate(() => document.querySelector("[data-jar-target]")!.getBoundingClientRect().top);
        expect(top, `y=${y}`).toBeGreaterThanOrEqual(band);
      }
    });
  }
}

// ---- Q2-1: title starts at the same place for 1- and 2-line titles; jar right under it ----

for (const size of [
  { width: 1440, height: 900 },
  { width: 2560, height: 1440 },
  { width: 390, height: 844 },
]) {
  test(`Q2-1 title top is the same for 1- and 2-line titles, jar under its last line at ${size.width}x${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    const tops: Record<string, number> = {};
    for (const handle of ["mut-quat", "ca-phao", "mat-ong-ca-phe"]) {
      await page.goto(`/products/${handle}`);
      await settle(page);
      const g = await page.evaluate(() => {
        const h1 = document.querySelector("h1")!;
        // Word boxes are laid out lines (the letters inside animate, the words do not).
        const words = Array.from(h1.querySelectorAll<HTMLElement>("[data-char]")).map(
          (c) => c.parentElement!.getBoundingClientRect(),
        );
        let headerBottom = 0;
        for (const e of Array.from(
          document.querySelectorAll("[data-site-header] a, [data-site-header] button, [data-site-header] svg, [data-site-header] img"),
        )) {
          const r = e.getBoundingClientRect();
          if (r.height && r.top < 200 && getComputedStyle(e).visibility !== "hidden") headerBottom = Math.max(headerBottom, r.bottom);
        }
        return {
          top: Math.min(...words.map((r) => r.top)),
          lastLine: Math.max(...words.map((r) => r.bottom)),
          lines: new Set(words.map((r) => Math.round(r.top))).size,
          jarTop: document.querySelector("[data-jar-target]")!.getBoundingClientRect().top,
          headerBottom,
        };
      });
      tops[`${handle} (${g.lines} lines)`] = Math.round(g.top);
      const gap = g.jarTop - g.lastLine;
      expect(gap, `${handle}: jar top - title last line`).toBeGreaterThanOrEqual(0);
      expect(gap, `${handle}: jar top - title last line`).toBeLessThanOrEqual(40);
      if (size.width === 1440)
        expect(g.top - g.headerBottom, `${handle}: empty band under the header`).toBeLessThanOrEqual(260);
    }
    const values = Object.values(tops);
    expect(Math.max(...values) - Math.min(...values), JSON.stringify(tops)).toBeLessThanOrEqual(40);
  });
}

// ---- Q2-4: at rest positions the sticky bar covers no text ----

// A rest position: a column scrolled up until its box (with its bottom padding) ends at the
// viewport bottom, i.e. the reader has reached its end. The bar shows there and must sit over
// that padding, not over the column's text.
for (const size of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`Q2-4 sticky bar never covers description, spec or card captions at rest at ${size.width}x${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto("/products/mut-quat");
    await settle(page);
    const columns = {
      description: "section:has(> [data-reveal])",
      spec: "section:has([data-weight])",
      "other-products track": "[data-other-track]",
    };
    for (const [name, sel] of Object.entries(columns)) {
      const bottom = await page
        .locator(sel)
        .first()
        .evaluate((el) => el.getBoundingClientRect().bottom + scrollY);
      const y = Math.round(bottom - size.height) - 2;
      // The bar only shows past the first half screen (QP-1); nothing to cover before that.
      if (y <= size.height / 2 + 8) continue;
      await scrollTo(page, y);
      await expect(page.locator("[data-sticky-buy]"), `${name} rest y=${y}`).toHaveAttribute("data-visible", "");
      // Let the slide-in transition finish.
      await page.waitForTimeout(700);
      const covered = await page.locator(sel).first().evaluate((col) => {
        const bar = document.querySelector("[data-sticky-buy] > div")!.getBoundingClientRect();
        const hits: string[] = [];
        const walker = document.createTreeWalker(col, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (!n.textContent?.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(n);
          for (const r of Array.from(range.getClientRects())) {
            if (r.width && r.bottom > bar.top + 1 && r.top < bar.bottom - 1 && r.right > bar.left && r.left < bar.right)
              hits.push(`${n.textContent.trim().slice(0, 24)}@${Math.round(r.top)}`);
          }
        }
        return hits;
      });
      expect(covered, `${name}: text under the bar (bar top ${size.height})`).toEqual([]);
    }
  });
}

// ---- Q2-5: sticky bar price uses the drawer's money style ----

test("Q2-5 sticky bar price has the drawer subtotal's font family", async ({ page }) => {
  await page.goto("/products/mut-quat");
  await settle(page);
  await page.locator("[data-buy-block] [data-add-to-cart]").click();
  const subtotal = page.locator("[data-cart-drawer] [data-cart-subtotal]");
  await expect(subtotal).not.toHaveText("");
  const family = (el: Element) => getComputedStyle(el).fontFamily;
  expect(await page.locator("[data-sticky-price]").evaluate(family)).toBe(await subtotal.evaluate(family));
});

// ---- Q2-6: photo-row images never upscaled at 2560 ----

test("Q2-6 photo-row images render no wider than their source at 2560x1440", async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.goto("/products/mut-quat");
  await settle(page);
  const row = page.locator("[data-photo-row]");
  await row.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 100));
  await expect
    .poll(() =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLImageElement>("[data-photo-slide] img")).every(
          (i) => i.complete && i.naturalWidth > 0,
        ),
      ),
    )
    .toBe(true);
  const over = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLImageElement>("[data-photo-slide] img"))
      .filter((i) => i.offsetWidth > i.naturalWidth + 0.5 || i.offsetHeight > i.naturalHeight + 0.5)
      .map((i) => `${i.offsetWidth}x${i.offsetHeight} > ${i.naturalWidth}x${i.naturalHeight}`),
  );
  expect(over).toEqual([]);
});
