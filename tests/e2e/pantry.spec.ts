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


// ---------- QA ledger QT-1..QT-6, QC-2, QC-3 ----------

const hydrated = (page: Page) =>
  expect(page.locator("[data-pantry-nav][data-ready]")).toHaveCount(1);

const twoFrames = (page: Page) =>
  page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );

test("the pill bar hides once the spec table is in view", async ({ page }) => {
  await page.goto("/pantry");
  await hydrated(page);
  await scrollToSection(page, "honey");
  await expect(page.locator("[data-pantry-nav][data-shown]")).toHaveCount(1);
  await page.evaluate(() => {
    const table = document.querySelector("[data-spec-row]")!.closest("table")!;
    window.scrollTo(0, table.getBoundingClientRect().top + window.scrollY - 300);
  });
  await expect(page.locator("[data-pantry-nav][data-shown]")).toHaveCount(0);
  await expect(nav(page)).toBeHidden();
});

for (const size of [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 390, height: 844 },
]) {
  test(`the pill bar never covers a weights block at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto("/pantry");
    await hydrated(page);
    await expect(page.locator("[data-pantry-weights]")).toHaveCount(4);
    const max = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    );
    for (let y = 0; y < max; y += 100) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await twoFrames(page);
      const hit = await page.evaluate(() => {
        const nav = document.querySelector<HTMLElement>("[data-pantry-nav]")!;
        if (!nav.hasAttribute("data-shown")) return null;
        // Resting box of the shown bar (it slides in with a transform).
        const bottom = window.innerHeight - parseFloat(getComputedStyle(nav).bottom);
        const top = bottom - nav.offsetHeight;
        for (const w of document.querySelectorAll("[data-pantry-weights]")) {
          const r = w.getBoundingClientRect();
          if (r.top < bottom && top < r.bottom) return { y: window.scrollY, weights: r.top };
        }
        return null;
      });
      expect(hit, `scrollY ${y}`).toBeNull();
    }
  });
}

test("the active pill switches when a heading crosses the middle of the viewport", async ({
  page,
}) => {
  await page.goto("/pantry");
  await hydrated(page);
  const placeHeading = async (id: string, frac: number) => {
    await page.evaluate(
      ([sid, f]) => {
        const h = document.getElementById(`${sid}-title`)!;
        const top = h.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, top - window.innerHeight * Number(f));
      },
      [id, frac] as const,
    );
    await twoFrames(page);
  };
  await placeHeading("sauces", 0.6);
  await expect(pill(page, "preserves")).toHaveAttribute("aria-current", "true");
  await placeHeading("sauces", 0.4);
  await expect(pill(page, "sauces")).toHaveAttribute("aria-current", "true");
  await placeHeading("pickles", 0.6);
  await expect(pill(page, "sauces")).toHaveAttribute("aria-current", "true");
  await placeHeading("pickles", 0.4);
  await expect(pill(page, "pickles")).toHaveAttribute("aria-current", "true");
});

test("spec-table shelf life stays on one line at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/pantry", "/vi/pantry"]) {
    await page.goto(path);
    const cells = page.locator("[data-spec-shelf]");
    await expect(cells).toHaveCount(8);
    const lines = await cells.evaluateAll((els) =>
      els.map((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
      }),
    );
    expect(lines, path).toEqual(Array(8).fill(1));
    const fits = await page
      .locator("[data-spec-row]")
      .first()
      .evaluate((row) => row.closest("table")!.getBoundingClientRect().right <= window.innerWidth);
    expect(fits, path).toBe(true);
  }
});

test("every weight on /pantry uses the variant label", async ({ page }) => {
  await page.goto("/pantry");
  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(/\d(g|kg)\b/);
  const weights = await page.locator("[data-pantry-weights] li").allInnerTexts();
  expect(weights.length).toBeGreaterThan(0);
  for (const w of weights) expect(w.trim()).toMatch(/^\d+ g$/);
  await expect(page.locator("[data-spec-row]").first()).toContainText("220 g");
});

const heroBox = (page: Page) =>
  page.locator("[data-pantry-hero-media]").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { width: r.width, vw: document.documentElement.clientWidth };
  });

test("the hero photo grows to full width on scroll with a headline over it", async ({
  page,
}) => {
  await page.goto("/pantry");
  await hydrated(page);
  const start = await heroBox(page);
  expect(start.width).toBeLessThan(start.vw - 20);
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 0.6));
  await expect
    .poll(async () => {
      const b = await heroBox(page);
      return b.vw - b.width;
    })
    .toBeLessThanOrEqual(1);

  for (const [path, re] of [
    ["/pantry", /from our kitchens,\s*one jar at a time/i],
    ["/vi/pantry", /từ gian bếp việt,\s*từng hũ một/i],
  ] as const) {
    await page.goto(path);
    const line = page.locator("[data-pantry-hero-line]");
    await expect(line).toBeVisible();
    await expect(line).toHaveText(re);
    const inside = await line.evaluate((el) => {
      const l = el.getBoundingClientRect();
      const m = el.closest("[data-pantry-hero-media]")!.getBoundingClientRect();
      return l.top >= m.top && l.bottom <= m.bottom && l.left >= m.left && l.right <= m.right;
    });
    expect(inside, path).toBe(true);
  }
});

test("reduced motion shows the hero photo at full width", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:" + (process.env.E2E_PORT || 3100) + "/pantry");
  await hydrated(page);
  const b = await heroBox(page);
  expect(b.vw - b.width).toBeLessThanOrEqual(1);
  await ctx.close();
});

test("feature panels use the lifestyle jar photos", async ({ page }) => {
  await page.goto("/pantry");
  for (const id of ["preserves", "pickles", "honey"]) {
    const img = page.locator(`#${id} [data-pantry-feature] img`);
    await expect(img).toHaveCount(1);
    expect(await img.getAttribute("src")).toMatch(
      /^\/photos\/([a-z-]+)\/00-\1-jar-1\.webp$/,
    );
  }
});

for (const width of [1440, 390]) {
  test(`pantry card motifs stay out of the caption on hover at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/pantry");
    const cards = page.locator("[data-pantry-grid] [data-product-card]");
    await expect(cards).toHaveCount(8);
    for (let i = 0; i < 8; i++) {
      const card = cards.nth(i);
      await card.scrollIntoViewIfNeeded();
      await card.hover();
      await expect
        .poll(() =>
          card
            .locator("[data-motif]")
            .evaluateAll((els) => Math.min(...els.map((e) => Number(getComputedStyle(e).opacity)))),
        )
        .toBe(1);
      // Let the pop springs and the card tilt settle, then compare boxes.
      await page.waitForTimeout(900);
      const hits = await card.evaluate((el) => {
        const cap = el.querySelector("a")!.parentElement!.getBoundingClientRect();
        return [...el.querySelectorAll("[data-motif]")]
          .map((m) => m.getBoundingClientRect())
          .filter(
            (r) =>
              r.bottom > cap.top + 1 &&
              r.top < cap.bottom - 1 &&
              r.right > cap.left + 1 &&
              r.left < cap.right - 1,
          ).length;
      });
      expect(hits, `card ${i}`).toBe(0);
    }
  });
}

test("quick-add shows the weight and price and names them", async ({ page }) => {
  for (const [path, word] of [
    ["/pantry", /^Add /],
    ["/vi/pantry", /^Thêm /],
  ] as const) {
    await page.goto(path);
    const card = page.locator('[data-product-card][data-handle="chanh-muoi"]');
    await expect(card.locator("[data-quick-meta]")).toHaveText(/314 g.*\b9\b/);
    const label = (await card.locator("[data-quick-add]").getAttribute("aria-label"))!;
    expect(label, path).toMatch(word);
    expect(label, path).toContain("Chanh Muối");
    expect(label, path).toContain("314 g");
    expect(label, path).toMatch(/\b9\b/);
  }
});
