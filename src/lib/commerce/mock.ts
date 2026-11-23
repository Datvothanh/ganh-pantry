import { productByHandle, type Product } from "@/content/products";
import { money } from "./format";
import {
  MAX_LINE_QUANTITY,
  type AddLineInput,
  type Cart,
  type CartLine,
  type CommerceAdapter,
  type CommerceProduct,
} from "./types";

/**
 * Mock adapter used when the Shopify env is missing.
 * The cart lives entirely in the cart cookie: the cart id *is* the encoded line list
 * (base64url JSON of [handle, variantId, quantity][]), so every mutation returns a new id
 * and the caller stores it. Prices come from `src/content/products.ts`.
 */

export const MOCK_CHECKOUT_URL = "/checkout-demo";
const CURRENCY = "USD";

type Stored = [handle: string, variantId: string, quantity: number][];

export const mockLineId = (handle: string, variantId: string) => `${handle}:${variantId}`;

function toProduct(p: Product): CommerceProduct {
  return {
    handle: p.handle,
    title: p.nameVi,
    variants: p.variants.map((v) => ({
      id: v.id,
      merchandiseId: mockLineId(p.handle, v.id),
      weight: v.weight,
      price: money(v.price, CURRENCY),
      availableForSale: true,
    })),
  };
}

function decode(id: string): Stored | null {
  try {
    const raw: unknown = JSON.parse(Buffer.from(id, "base64url").toString("utf8"));
    if (!Array.isArray(raw)) return null;
    const out: Stored = [];
    for (const row of raw) {
      if (!Array.isArray(row) || row.length !== 3) return null;
      const [handle, variantId, quantity] = row;
      if (typeof handle !== "string" || typeof variantId !== "string") return null;
      if (!Number.isInteger(quantity) || quantity < 1) return null;
      const product = productByHandle(handle);
      if (!product?.variants.some((v) => v.id === variantId)) continue; // drop unknown items
      out.push([handle, variantId, Math.min(quantity, MAX_LINE_QUANTITY)]);
    }
    return out;
  } catch {
    return null;
  }
}

const encode = (rows: Stored) => Buffer.from(JSON.stringify(rows), "utf8").toString("base64url");

function build(rows: Stored): Cart {
  const lines: CartLine[] = [];
  for (const [handle, variantId, quantity] of rows) {
    const product = productByHandle(handle);
    const variant = product?.variants.find((v) => v.id === variantId);
    if (!product || !variant) continue;
    lines.push({
      id: mockLineId(handle, variantId),
      quantity,
      handle,
      title: product.nameVi,
      variantId,
      weight: variant.weight,
      unitPrice: money(variant.price, CURRENCY),
      total: money(variant.price * quantity, CURRENCY),
    });
  }
  return {
    id: encode(rows),
    checkoutUrl: MOCK_CHECKOUT_URL,
    lines,
    totalQuantity: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: money(
      lines.reduce((sum, l) => sum + l.total.amount, 0),
      CURRENCY,
    ),
  };
}

function rowsOf(cartId: string | undefined): Stored {
  return (cartId ? decode(cartId) : null) ?? [];
}

export function createMockAdapter(): CommerceAdapter {
  return {
    kind: "mock",
    async getProduct(handle) {
      const p = productByHandle(handle);
      return p ? toProduct(p) : null;
    },
    async getCart(cartId) {
      const rows = decode(cartId);
      return rows ? build(rows) : null;
    },
    async addLine(cartId, { handle, variantId, quantity }: AddLineInput) {
      const product = productByHandle(handle);
      if (!product?.variants.some((v) => v.id === variantId)) {
        throw new Error(`Unknown product or variant: ${handle}/${variantId}`);
      }
      const rows = rowsOf(cartId);
      const row = rows.find((r) => r[0] === handle && r[1] === variantId);
      if (row) row[2] = Math.min(row[2] + quantity, MAX_LINE_QUANTITY);
      else rows.push([handle, variantId, Math.min(quantity, MAX_LINE_QUANTITY)]);
      return build(rows);
    },
    async updateLine(cartId, lineId, quantity) {
      const rows = rowsOf(cartId);
      const next: Stored = [];
      for (const row of rows) {
        if (mockLineId(row[0], row[1]) !== lineId) next.push(row);
        else if (quantity > 0) next.push([row[0], row[1], Math.min(quantity, MAX_LINE_QUANTITY)]);
      }
      return build(next);
    },
    async removeLine(cartId, lineId) {
      return build(rowsOf(cartId).filter((r) => mockLineId(r[0], r[1]) !== lineId));
    },
  };
}
