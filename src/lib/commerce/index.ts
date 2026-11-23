import { createMockAdapter } from "./mock";
import { createShopifyAdapter, DEFAULT_API_VERSION } from "./shopify";
import type { CommerceAdapter } from "./types";

export * from "./types";
export { formatMoney } from "./format";

type Env = Record<string, string | undefined>;

/** Shopify when `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_STOREFRONT_TOKEN` are set, otherwise the mock. */
export function createCommerce(env: Env): CommerceAdapter {
  const domain = env.SHOPIFY_STORE_DOMAIN?.trim();
  const token = env.SHOPIFY_STOREFRONT_TOKEN?.trim();
  if (domain && token) {
    return createShopifyAdapter({
      domain,
      token,
      version: env.SHOPIFY_API_VERSION?.trim() || DEFAULT_API_VERSION,
    });
  }
  return createMockAdapter();
}

export const commerce: CommerceAdapter = createCommerce(process.env);
