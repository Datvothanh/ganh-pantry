import { productByHandle } from "@/content/products";
import {
  CartNotFoundError,
  MAX_LINE_QUANTITY,
  type AddLineInput,
  type Cart,
  type CartLine,
  type CommerceAdapter,
  type CommerceProduct,
  type Money,
} from "./types";

/**
 * Shopify Storefront API adapter (GraphQL over fetch).
 *
 * ADAPT, not adopt: the shape follows vercel/commerce `lib/shopify` (a thin `shopifyFetch`
 * that POSTs to `/api/<version>/graphql.json`, GraphQL fragments for product and cart, and a
 * `reshape*` layer that flattens `edges/node` into plain objects). The code was written
 * from the current Storefront API cart reference (`cartCreate`, `cartLinesAdd`,
 * `cartLinesUpdate`, `cartLinesRemove`, `cart(id:)`, `Cart.checkoutUrl`) rather than copied:
 * we have no tags/collections/menus, products are looked up by handle only, and variants are
 * addressed by the "Weight" option value which equals our `Variant.id`.
 */

export const DEFAULT_API_VERSION = "2026-10";
const WEIGHT_OPTION = "Weight";

export interface ShopifyConfig {
  domain: string;
  token: string;
  version?: string;
  fetch?: typeof fetch;
}

// ---- GraphQL documents ---------------------------------------------------------------

const MONEY = `price { amount currencyCode }`;

const CART_FRAGMENT = /* GraphQL */ `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      subtotalAmount { amount currencyCode }
    }
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          cost {
            totalAmount { amount currencyCode }
          }
          merchandise {
            ... on ProductVariant {
              id
              selectedOptions { name value }
              ${MONEY}
              product { handle title }
            }
          }
        }
      }
    }
  }
`;

const PRODUCT_QUERY = /* GraphQL */ `
  query ProductByHandle($handle: String!) {
    product(handle: $handle) {
      handle
      title
      variants(first: 50) {
        edges {
          node {
            id
            title
            availableForSale
            selectedOptions { name value }
            ${MONEY}
          }
        }
      }
    }
  }
`;

const CART_QUERY = /* GraphQL */ `
  ${CART_FRAGMENT}
  query GetCart($cartId: ID!) {
    cart(id: $cartId) { ...CartFields }
  }
`;

const CART_CREATE = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartCreate($lines: [CartLineInput!]) {
    cartCreate(input: { lines: $lines }) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`;

const CART_LINES_ADD = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`;

const CART_LINES_UPDATE = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`;

const CART_LINES_REMOVE = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
`;

// ---- Raw response shapes (only what we read) -----------------------------------------

interface RawMoney {
  amount: string;
  currencyCode: string;
}
interface RawOption {
  name: string;
  value: string;
}
interface RawCart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { subtotalAmount: RawMoney };
  lines: {
    edges: {
      node: {
        id: string;
        quantity: number;
        cost: { totalAmount: RawMoney };
        merchandise: {
          id?: string;
          selectedOptions?: RawOption[];
          price?: RawMoney;
          product?: { handle: string; title: string };
        } | null;
      };
    }[];
  };
}
interface RawProduct {
  handle: string;
  title: string;
  variants: {
    edges: {
      node: {
        id: string;
        title: string;
        availableForSale: boolean;
        selectedOptions: RawOption[];
        price: RawMoney;
      };
    }[];
  };
}
interface UserError {
  field?: string[] | null;
  message: string;
}
interface CartPayload {
  cart: RawCart | null;
  userErrors?: UserError[];
}

// ---- Mapping (exported for tests) ----------------------------------------------------

const toMoney = (m: RawMoney): Money => ({ amount: Number(m.amount), currencyCode: m.currencyCode });

const optionValue = (options: RawOption[] | undefined) =>
  options?.find((o) => o.name.toLowerCase() === WEIGHT_OPTION.toLowerCase())?.value;

export function mapProduct(raw: RawProduct | null): CommerceProduct | null {
  if (!raw) return null;
  const local = productByHandle(raw.handle);
  const variants = raw.variants.edges.flatMap(({ node }) => {
    const id = optionValue(node.selectedOptions);
    if (!id) return [];
    return [
      {
        id,
        merchandiseId: node.id,
        weight: local?.variants.find((v) => v.id === id)?.weight ?? id,
        price: toMoney(node.price),
        availableForSale: node.availableForSale,
      },
    ];
  });
  return { handle: raw.handle, title: raw.title, variants };
}

export function mapCart(raw: RawCart): Cart {
  const lines: CartLine[] = [];
  for (const { node } of raw.lines.edges) {
    const m = node.merchandise;
    if (!m?.product || !m.price) continue;
    const variantId = optionValue(m.selectedOptions) ?? m.id ?? node.id;
    const local = productByHandle(m.product.handle);
    lines.push({
      id: node.id,
      quantity: node.quantity,
      handle: m.product.handle,
      title: m.product.title,
      variantId,
      weight: local?.variants.find((v) => v.id === variantId)?.weight ?? variantId,
      unitPrice: toMoney(m.price),
      total: toMoney(node.cost.totalAmount),
    });
  }
  return {
    id: raw.id,
    checkoutUrl: raw.checkoutUrl,
    lines,
    totalQuantity: raw.totalQuantity,
    subtotal: toMoney(raw.cost.subtotalAmount),
  };
}

// ---- Adapter -------------------------------------------------------------------------

export class ShopifyError extends Error {}

function isLocalHost(domain: string): boolean {
  try {
    const { hostname } = new URL(`http://${domain}`);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function createShopifyAdapter(config: ShopifyConfig): CommerceAdapter {
  // An explicit `http://` is kept only for a local host (fake storefront in
  // scripts/check-shopify-build.mjs); the token never travels over plain http elsewhere.
  const raw = config.domain.trim();
  const domain = raw.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  const scheme = /^http:\/\//i.test(raw) && isLocalHost(domain) ? "http" : "https";
  const endpoint = `${scheme}://${domain}/api/${config.version || DEFAULT_API_VERSION}/graphql.json`;
  const doFetch = config.fetch ?? fetch;

  /**
   * Cart reads and mutations pass `cache: "no-store"` explicitly. Product reads pass nothing and
   * leave fetch caching to the caller (`getLiveProduct` wraps them in `use cache`).
   */
  async function gql<T>(query: string, variables: Record<string, unknown>, cache?: RequestCache): Promise<T> {
    const res = await doFetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": config.token,
      },
      body: JSON.stringify({ query, variables }),
      ...(cache ? { cache } : {}),
    });
    if (!res.ok) throw new ShopifyError(`Shopify Storefront API responded ${res.status}`);
    const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
    if (json.errors?.length) {
      throw new ShopifyError(json.errors.map((e) => e.message).join("; "));
    }
    if (!json.data) throw new ShopifyError("Shopify Storefront API returned no data");
    return json.data;
  }

  /** Unwraps a cart mutation payload; returns null when Shopify reports no cart. */
  function unwrap(payload: CartPayload): Cart | null {
    if (payload.cart) {
      if (payload.userErrors?.length) {
        throw new ShopifyError(payload.userErrors.map((e) => e.message).join("; "));
      }
      return mapCart(payload.cart);
    }
    // No cart: an expired or completed cart answers null (often with a userError on cartId).
    const errors = payload.userErrors ?? [];
    const gone =
      errors.length === 0 ||
      errors.some((e) => e.field?.includes("cartId") || /cart.*(not exist|not found)/i.test(e.message));
    if (gone) return null;
    throw new ShopifyError(errors.map((e) => e.message).join("; "));
  }

  async function getProduct(handle: string, cache?: RequestCache) {
    const data = await gql<{ product: RawProduct | null }>(PRODUCT_QUERY, { handle }, cache);
    return mapProduct(data.product);
  }

  async function lineFor({ handle, variantId, quantity }: AddLineInput) {
    // Fresh availability for the cart, never a cached read.
    const product = await getProduct(handle, "no-store");
    const variant = product?.variants.find((v) => v.id === variantId);
    if (!variant) throw new ShopifyError(`Unknown product or variant: ${handle}/${variantId}`);
    if (!variant.availableForSale) throw new ShopifyError(`${handle}/${variantId} is sold out`);
    return { merchandiseId: variant.merchandiseId, quantity };
  }

  async function create(line: { merchandiseId: string; quantity: number }) {
    const data = await gql<{ cartCreate: CartPayload }>(CART_CREATE, { lines: [line] }, "no-store");
    const cart = unwrap(data.cartCreate);
    if (!cart) throw new ShopifyError("Shopify did not return a cart");
    return cart;
  }

  async function mutate(
    query: string,
    key: "cartLinesUpdate" | "cartLinesRemove",
    variables: Record<string, unknown>,
  ) {
    const data = await gql<Record<string, CartPayload>>(query, variables, "no-store");
    const cart = unwrap(data[key]);
    if (!cart) throw new CartNotFoundError();
    return cart;
  }

  const adapter: CommerceAdapter = {
    kind: "shopify",
    getProduct: (handle) => getProduct(handle),
    async getCart(cartId) {
      const data = await gql<{ cart: RawCart | null }>(CART_QUERY, { cartId }, "no-store");
      return data.cart ? mapCart(data.cart) : null;
    },
    async addLine(cartId, input) {
      const line = await lineFor({ ...input, quantity: Math.min(input.quantity, MAX_LINE_QUANTITY) });
      if (!cartId) return create(line);
      const data = await gql<{ cartLinesAdd: CartPayload }>(
        CART_LINES_ADD,
        { cartId, lines: [line] },
        "no-store",
      );
      // An expired or completed cart comes back as null: start a fresh one.
      return unwrap(data.cartLinesAdd) ?? create(line);
    },
    updateLine(cartId, lineId, quantity) {
      if (quantity <= 0) return adapter.removeLine(cartId, lineId);
      return mutate(CART_LINES_UPDATE, "cartLinesUpdate", {
        cartId,
        lines: [{ id: lineId, quantity: Math.min(quantity, MAX_LINE_QUANTITY) }],
      });
    },
    removeLine(cartId, lineId) {
      return mutate(CART_LINES_REMOVE, "cartLinesRemove", { cartId, lineIds: [lineId] });
    },
  };
  return adapter;
}
