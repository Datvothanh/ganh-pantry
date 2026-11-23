import { createMockAdapter } from "./mock";
import { createShopifyAdapter, DEFAULT_API_VERSION } from "./shopify";
import type { CommerceAdapter } from "./types";

export * from "./types";
export { formatMoney } from "./format";

type Env = Record<string, string | undefined>;

/**
 * Shopify when `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_STOREFRONT_TOKEN` are set, otherwise the mock.
 * `GANH_COMMERCE=mock` forces the mock (the e2e server sets it so tests never touch a real store).
 */
export function createCommerce(env: Env): CommerceAdapter {
  if (env.GANH_COMMERCE?.trim() === "mock") return createMockAdapter();
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
