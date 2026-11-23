#!/usr/bin/env node
// Smoke test for the Shopify Storefront connection:
//   SHOPIFY_STORE_DOMAIN=… SHOPIFY_STOREFRONT_TOKEN=… node scripts/shopify-smoke.mjs [handle]
// Fetches one product and creates a cart. Exits non-zero on any failure.

const domain = process.env.SHOPIFY_STORE_DOMAIN?.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
const token = process.env.SHOPIFY_STOREFRONT_TOKEN?.trim();
const version = process.env.SHOPIFY_API_VERSION?.trim() || "2026-10";
const handle = process.argv[2] || "mut-gung";

if (!domain || !token) {
  console.error("Set SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN to run the smoke test.");
  process.exit(1);
}

const endpoint = `https://${domain}/api/${version}/graphql.json`;

async function gql(query, variables) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${endpoint}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  return json.data;
}

try {
  const { product } = await gql(
    `query ($handle: String!) {
      product(handle: $handle) {
        handle title
        variants(first: 20) { edges { node { id availableForSale selectedOptions { name value } price { amount currencyCode } } } }
      }
    }`,
    { handle },
  );
  if (!product) throw new Error(`Product "${handle}" not found`);
  const variants = product.variants.edges.map((e) => e.node);
  const variant = variants.find((v) => v.availableForSale) ?? variants[0];
  if (!variant) throw new Error(`Product "${handle}" has no variants`);
  const weight = variant.selectedOptions.find((o) => o.name.toLowerCase() === "weight")?.value;
  console.log(`product: ${product.title} (${variants.length} variants)`);
  console.log(`variant: ${weight ?? "?"} ${variant.price.amount} ${variant.price.currencyCode}`);

  const { cartCreate } = await gql(
    `mutation ($lines: [CartLineInput!]) {
      cartCreate(input: { lines: $lines }) {
        cart { id checkoutUrl totalQuantity }
        userErrors { message }
      }
    }`,
    { lines: [{ merchandiseId: variant.id, quantity: 1 }] },
  );
  if (cartCreate.userErrors?.length) {
    throw new Error(cartCreate.userErrors.map((e) => e.message).join("; "));
  }
  if (!cartCreate.cart?.checkoutUrl) throw new Error("cartCreate returned no cart");
  console.log(`cart: ${cartCreate.cart.id}`);
  console.log(`checkout: ${cartCreate.cart.checkoutUrl}`);
  console.log("OK");
} catch (err) {
  console.error(`Smoke test failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
