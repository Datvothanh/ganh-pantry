# Ganh

Ganh is a small storefront for Vietnamese jams and preserves, built with Next.js (App Router, Cache
Components) in English and Vietnamese. It has a 3D hero, product pages with a buy bar, and a cart
drawer. Products and the cart come from a commerce adapter: Shopify when configured, a local mock
otherwise.

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
| `npm run check` | Lint, typecheck, unit tests, then `next build` (Turbopack). |
| `npm run check:lane` | Same checks with `next build --webpack`. Use this one in lanes and CI-like runs. |
| `npm run check:shopify` | Builds and starts the site against a local fake Storefront API and asserts that a product page shows the Shopify price. |
| `npm run e2e` | Playwright tests (`tests/e2e`). Needs a production build first (`npm run build`); the config starts `next start` with `GANH_DEV_ROUTES=1`. Set `E2E_PORT` to change the port (default 3100). |
| `npm run labels` | Renders jar labels to `public/labels/<handle>.png` and motifs to `public/motifs/`. |
| `npm run composites` | Renders `public/products/<handle>.webp` (jar photo plus label) through the dev route `/dev/composite.html`. Uses `sharp`. |
| `python scripts/photos.py <stage_dir>` (photos) | Builds `public/photos/<handle>/` from staged photos plus a studio packshot. |

## Shopify

The site talks to the Shopify Storefront API when both of these are set (see `.env.example`):

- `SHOPIFY_STORE_DOMAIN`: for example `my-shop.myshopify.com`
- `SHOPIFY_STOREFRONT_TOKEN`: Storefront API access token
- `SHOPIFY_API_VERSION`: optional, defaults to `2026-10`

Product prices and availability are then read from Shopify, and the cart is a Shopify cart that
hands off to Shopify checkout. Verify a store with
`node scripts/shopify-smoke.mjs [handle]`.

If either of the first two variables is missing, the site uses the mock adapter: products and prices
from `src/content/products.ts` and an in-memory cart. Everything works without any account, which is
the default for local development and tests.

## Dev routes

`/dev/cart/harness.html` (cart e2e) and `/dev/composite.html` (`npm run composites`) return 404 in
production builds unless `GANH_DEV_ROUTES=1` is set in the environment of the running server. The
variable is read per request, not at build time.
