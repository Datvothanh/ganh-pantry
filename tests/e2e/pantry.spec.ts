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
  // Q2-7: the bar no longer steps aside while a block passes; each block keeps room below it,
  // so once scrolled into that room the block sits fully above the shown bar.
  test(`a weights block scrolled into view rests clear of the pill bar at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto("/pantry");
    await hydrated(page);
    await expect(page.locator("[data-pantry-weights]")).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      await page.evaluate((k) => {
        const w = document.querySelectorAll("[data-pantry-weights]")[k];
        const r = w.getBoundingClientRect();
        const room = parseFloat(getComputedStyle(w).marginBottom);
        window.scrollTo(0, r.bottom + room + window.scrollY - window.innerHeight);
      }, i);
      await twoFrames(page);
      await expect(page.locator("[data-pantry-nav][data-shown]")).toHaveCount(1);
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
      expect(hit, `weights block ${i}`).toBeNull();
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

/** Scrubbed side inset of a cover frame (1 = inset card, 0 = full bleed), read from its CSS var. */
const coverInset = (page: Page, selector = "[data-pantry-hero-media]") =>
  page
    .locator(selector)
    .evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue("--cover-inset")));

const mediaTransform = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el) => getComputedStyle(el.parentElement!).transform);

test("the hero photo grows to full width on scroll with a headline over it", async ({
  page,
}) => {
  await page.goto("/pantry");
  await hydrated(page);
  expect(await coverInset(page)).toBeGreaterThan(0.9);
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 0.6));
  await expect.poll(() => coverInset(page)).toBeLessThanOrEqual(0.01);

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
  expect(await coverInset(page)).toBe(0);
  expect(await coverInset(page, "[data-pantry-outro] > div")).toBe(0);
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

// ---------- QA ledger Q2-7 ----------

test("at 390px the pill bar stays up through the four sections and hides at the spec table", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pantry");
  await hydrated(page);
  const { start, end } = await page.evaluate(() => {
    const first = document.querySelector("[data-pantry-section]")!;
    const table = document.querySelector("[data-pantry-end]")!;
    return {
      start: Math.ceil(first.getBoundingClientRect().top + window.scrollY),
      end: Math.floor(table.getBoundingClientRect().top + window.scrollY - window.innerHeight),
    };
  });
  const hidden: number[] = [];
  for (let y = start; y < end; y += 100) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await twoFrames(page);
    const state = await page.evaluate(() => ({
      shown: document.querySelector("[data-pantry-nav]")!.hasAttribute("data-shown"),
      // The spec table may move up as lazy content settles; only count positions before it.
      before:
        document.querySelector("[data-pantry-end]")!.getBoundingClientRect().top > window.innerHeight,
    }));
    if (state.before && !state.shown) hidden.push(y);
  }
  expect(hidden, "scroll positions where the bar was hidden").toEqual([]);
  await page.evaluate(() => {
    const table = document.querySelector("[data-pantry-end]")!;
    window.scrollTo(0, table.getBoundingClientRect().top + window.scrollY - window.innerHeight + 100);
  });
  await expect(page.locator("[data-pantry-nav][data-shown]")).toHaveCount(0);
});

test("titles and text rise in: the h1 on load, section copy once scrolled to", async ({ page }) => {
  await page.goto("/pantry");
  const h1 = page.locator("h1[data-text-reveal='chars']");
  await expect(h1).toHaveAttribute("data-tr", "played");
  await expect(h1).toHaveAttribute("aria-label", /pantry/i);
  const title = page.locator("#pantry-specs");
  await expect(title).toHaveAttribute("data-tr", "ready");
  await title.scrollIntoViewIfNeeded();
  await expect(title).toHaveAttribute("data-tr", "played");
  const lines = page.locator("[data-pantry-section] p[data-text-reveal='lines']");
  expect(await lines.count()).toBeGreaterThan(0);
  const first = lines.first();
  await first.scrollIntoViewIfNeeded();
  await expect(first).toHaveAttribute("data-tr", "played");
  await expect(first).toBeVisible();
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("the pantry text is never split or hidden", async ({ page }) => {
    await page.goto("/pantry");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("[data-text-reveal][data-tr]")).toHaveCount(0);
    await expect(page.locator("[data-text-reveal] [aria-hidden='true']")).toHaveCount(0);
  });
});

// ---------- image scroll motion ----------

const scrollTo = async (page: Page, y: number) => {
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await twoFrames(page);
};

test("the hero cover is an inset card at the top and full bleed after 150px of scroll", async ({
  page,
}) => {
  await page.goto("/pantry");
  await hydrated(page);
  const clip = await page
    .locator("[data-pantry-hero-media]")
    .evaluate((el) => getComputedStyle(el).clipPath);
  expect(clip).toMatch(/round/);
  expect(await coverInset(page)).toBeGreaterThan(0.99);
  await scrollTo(page, 50);
  await expect.poll(() => coverInset(page)).toBeGreaterThan(0.3);
  expect(await coverInset(page)).toBeLessThan(0.7);
  await scrollTo(page, 150);
  await expect.poll(() => coverInset(page)).toBe(0);
  await scrollTo(page, 0);
  await expect.poll(() => coverInset(page)).toBeGreaterThan(0.99);
});

test("a section cover photo moves with the scroll and never shows an edge", async ({ page }) => {
  await page.goto("/pantry");
  await hydrated(page);
  const media = "#preserves [data-pantry-feature] img";
  const place = async (fraction: number) => {
    await page.evaluate((f) => {
      const el = document.querySelector("#preserves [data-pantry-feature] figure")!;
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top - window.innerHeight * f);
    }, fraction);
    await twoFrames(page);
  };
  await place(0.9);
  const early = await mediaTransform(page, media);
  await place(0.1);
  await expect.poll(() => mediaTransform(page, media)).not.toBe(early);
  // The frame stays covered: the media box always overhangs both edges.
  for (const f of [0.9, 0.5, 0.1]) {
    await place(f);
    const covered = await page.locator(media).evaluate((img) => {
      const box = img.parentElement!.getBoundingClientRect();
      const frame = img.closest("figure")!.getBoundingClientRect();
      return box.top <= frame.top + 0.5 && box.bottom >= frame.bottom - 0.5;
    });
    expect(covered, `at ${f}`).toBe(true);
  }
});

test("the spec-table cover and the Sauces front jar move on scroll", async ({ page }) => {
  await page.goto("/pantry");
  await hydrated(page);
  const spec = "#pantry-specs ~ figure img";
  await expect(page.locator(spec)).toHaveCount(1);
  const jar = "[data-pantry-dark-stage] > div > div img";
  const centre = (selector: string, f: number) =>
    page.evaluate(
      ([sel, frac]) => {
        const el = document.querySelector(String(sel))!;
        const frame = (el.closest("figure") ?? el.closest("[data-pantry-dark-stage]"))!;
        window.scrollTo(0, frame.getBoundingClientRect().top + window.scrollY - window.innerHeight * Number(frac));
      },
      [selector, f] as const,
    );
  for (const selector of [spec, jar]) {
    await centre(selector, 0.8);
    await twoFrames(page);
    const a = await mediaTransform(page, selector);
    await centre(selector, 0.2);
    await twoFrames(page);
    await expect.poll(() => mediaTransform(page, selector)).not.toBe(a);
  }
});

test("the hero headline stays hidden until the cover reaches the top, then reverses", async ({
  page,
}) => {
  await page.goto("/pantry");
  await hydrated(page);
  const line = page.locator("[data-pantry-hero-line]");
  await expect(line).toHaveAttribute("data-tr", "ready");
  const unitShift = () =>
    line.evaluate((el) => {
      const unit = el.querySelector<HTMLElement>("[style*=\"--i\"]")!;
      return new DOMMatrixReadOnly(getComputedStyle(unit).transform).m42;
    });
  expect(await unitShift()).toBeGreaterThan(10);
  await page.evaluate(() => {
    const cover = document.querySelector("[data-pantry-hero-media]")!;
    window.scrollTo(0, cover.getBoundingClientRect().top + window.scrollY + 20);
  });
  await expect(line).toHaveAttribute("data-tr", "played");
  await expect.poll(unitShift).toBeLessThanOrEqual(0.5);
  await scrollTo(page, 0);
  await expect(line).toHaveAttribute("data-tr", "ready");
  await expect.poll(unitShift).toBeGreaterThan(10);
});

test("the hero headline reveals fully inside the viewport, below the header", async ({ page }) => {
  await page.goto("/pantry");
  await hydrated(page);
  const line = page.locator("[data-pantry-hero-line]");
  await expect(line).toHaveAttribute("data-tr", "ready");
  // Just past the reveal point: the cover's top a little above 25% of the viewport.
  await page.evaluate(() => {
    const cover = document.querySelector("[data-pantry-hero-media]")!;
    const top = cover.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top - window.innerHeight * 0.24);
  });
  await expect(line).toHaveAttribute("data-tr", "played");
  const header = (await page.locator("header").first().boundingBox())!;
  const box = (await line.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(header.y + header.height);
  expect(box.y + box.height).toBeLessThanOrEqual(900);
});

test("at 390px the covers have no inset animation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pantry");
  await hydrated(page);
  expect(await coverInset(page)).toBe(0);
  await scrollTo(page, 60);
  expect(await coverInset(page)).toBe(0);
});

test.describe("reduced motion media", () => {
  test.use({ reducedMotion: "reduce" });
  test("no parallax transform on any cover and the headline stays visible", async ({ page }) => {
    await page.goto("/pantry");
    await hydrated(page);
    await scrollTo(page, 600);
    const transforms = await page
      .locator("[data-pantry] img")
      .evaluateAll((imgs) =>
        imgs
          .filter((img) => img.closest("figure, [data-pantry-hero-media], [data-pantry-outro]"))
          .map((img) => getComputedStyle(img.parentElement!).transform),
      );
    expect(transforms.length).toBeGreaterThan(3);
    for (const t of transforms) expect(t).toBe("none");
    await expect(page.locator("[data-pantry-hero-line]")).not.toHaveAttribute("data-tr", /.*/);
    await expect(page.locator("[data-pantry-hero-line]")).toBeVisible();
  });
});
