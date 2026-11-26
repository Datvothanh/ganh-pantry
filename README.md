# GÁNH — Vietnamese Pantry

A concept storefront for a fictional Vietnamese pantry brand: candied fruit, chili sauces, pickles
and honey, sold one jar at a time. It is a portfolio piece built to show high-end motion design and a
real headless commerce flow in the same site.

> Concept project, not a real brand. Design & development by Eric. Motion inspired by
> [Agrumea Farm](https://agrumeafarm.it) by Studio K95. The reference was studied for its behaviour
> only; the code, brand, copy, labels and images here are our own.

**Live demo:** see the repository's website link. Checkout runs on a Shopify development store
(storefront password `ganh`, test payments only).

## What it shows

- **Jar slider home.** One screen, an endless marquee of jars driven by wheel and drag, eased on a
  curved path with blur and scale by distance from the centre, spring-based pointer lean and a label
  that turns with the jar. Each label is a texture on a three.js cylinder rendered once offscreen and
  blitted into the jar's own canvas, so eight jars share one WebGL context.
- **Shared-element page transition.** Clicking a jar flies it from the slider into the product
  hero, then hands over to the page's own jar without a jump.
- **Scroll-driven product page.** The title reveals letter by letter, the jar rises behind it and
  turns with scroll (GSAP ScrollTrigger + Lenis), then a photo row, an info row with weight chips, an
  Add to cart block with a sticky buy bar, and a draggable "other products" row whose cards pop
  cut-paper motifs on hover.
- **Pantry page.** A hero photo that grows to full bleed on scroll, one section per category with a
  sticky pill nav that tracks the active section, quick-add cards that name the weight and price
  they add, a spec table and an outro photo.
- **Real cart and checkout.** Shopify Storefront API cart (create, add, update, remove) with Shopify
  checkout; a mock adapter keeps every page working without a store.
- **Two languages.** English at `/`, Vietnamese at `/vi`, with fonts that carry Vietnamese glyphs
  (Commissioner with its flare and contrast axes for display, Source Sans 3 for text).
- **Accessibility.** `prefers-reduced-motion` turns off scroll-jacking and springs while keeping all
  content reachable; 44px hit areas; WCAG contrast on small text; keyboard and screen-reader labels.

## Stack

Next.js 16 (App Router, Cache Components), React 19, TypeScript, CSS Modules, three.js 0.187, GSAP
3.15, Lenis 1.3, Shopify Storefront API 2026-10. Tests: Vitest (unit) and Playwright (e2e on a
production build, 1440 to 2560 desktop and 390 mobile). Jar labels are rendered from code
(`npm run labels`); photos are AI-generated and composited with the rendered jars.

## How it was built

Design desktop-first at 1440 and checked at 1680, 1920 and 2560 with no dead zones; mobile at 390
works fully. Features and fixes were driven by Playwright tests on the production build, code
review rounds, and two independent UX audits against the reference's motion.

## Setup

```bash
npm install
cp .env.example .env.local   # optional, see "Shopify" below
npm run dev                  # http://localhost:3000
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server. |
| `npm run check` | Lint, typecheck, unit tests, then `npm run build:mock` (Turbopack, mock commerce). |
| `npm run check:lane` | Same checks with a mock `next build --webpack`. Use this one in lanes and CI-like runs. |
| `npm run build:mock` | `next build` with `GANH_COMMERCE=mock`, whatever the Shopify env says. |
| `npm run check:shopify` | Builds and starts the site against a local fake Storefront API and asserts that a product page shows the Shopify price, then builds against a failing Storefront and asserts the catalogue fallback. |
| `npm run e2e` | Playwright tests (`tests/e2e`). Needs a mock production build first (`npm run build:mock`, or `npm run check`); the global setup refuses a build rendered with real Shopify data. The config starts `next start` with `GANH_DEV_ROUTES=1` and `GANH_COMMERCE=mock`. Set `E2E_PORT` to change the port (default 3100). |
| `npm run labels` | Renders jar labels to `public/labels/<handle>.png` and motifs to `public/motifs/`. |
| `npm run composites` | Renders `public/products/<handle>.webp` (jar photo plus label) through the dev route `/dev/composite.html`. Uses `sharp`. |
| `python scripts/photos.py <stage_dir>` (photos) | Builds `public/photos/<handle>/` from staged photos plus a studio packshot. |

## Shopify

The site talks to the Shopify Storefront API when both of these are set (see `.env.example`):

- `SHOPIFY_STORE_DOMAIN`: for example `my-shop.myshopify.com`
- `SHOPIFY_STOREFRONT_TOKEN`: Storefront API access token
- `SHOPIFY_API_VERSION`: optional, defaults to `2026-10`
- `GANH_COMMERCE=mock`: optional, forces the mock catalogue and cart even when the two above are set

Product prices and availability are then read from Shopify, and the cart is a Shopify cart that
hands off to Shopify checkout. Verify a store with
`node scripts/shopify-smoke.mjs [handle]`.

If a Storefront read fails while rendering, the page keeps the last good cached price and
availability (a failed revalidation never overwrites it); only without a cached entry (a failed
build, or a cold cache) does the product fall back to the catalogue price and availability in
`src/content/products.ts`. The next revalidation (about a minute) retries.

The demo store `ganh-pantry.myshopify.com` is a Shopify development store. Its storefront password
is `ganh` (shown in the cart drawer next to Checkout); after entering it, click Checkout again.
Payments run in test mode.

If either of the first two variables is missing, the site uses the mock adapter: products and prices
from `src/content/products.ts` and an in-memory cart. Everything works without any account, which is
the default for local development and tests.

## Dev routes

`/dev/cart/harness.html` (cart e2e) and `/dev/composite.html` (`npm run composites`) return 404 in
production builds unless `GANH_DEV_ROUTES=1` is set in the environment of the running server. The
variable is read per request, not at build time.
