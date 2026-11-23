import { productByHandle } from "@/content/products";
import { money } from "./format";
import { MAX_LINE_QUANTITY, type Cart, type CartLine } from "./types";

/** Pure cart transforms used for optimistic UI before the server action confirms. */

function withLines(cart: Cart | null, lines: CartLine[]): Cart {
  const currency = lines[0]?.unitPrice.currencyCode ?? cart?.subtotal.currencyCode ?? "USD";
  return {
    id: cart?.id ?? "",
    checkoutUrl: cart?.checkoutUrl ?? "/checkout-demo",
    lines,
    totalQuantity: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: money(
      lines.reduce((sum, l) => sum + l.total.amount, 0),
      currency,
    ),
  };
}

const clamp = (q: number) => Math.min(Math.max(q, 0), MAX_LINE_QUANTITY);

export function optimisticAdd(
  cart: Cart | null,
  handle: string,
  variantId: string,
  quantity: number,
): Cart | null {
  const lines = (cart?.lines ?? []).map((l) => ({ ...l }));
  const existing = lines.find((l) => l.handle === handle && l.variantId === variantId);
  if (existing) {
    existing.quantity = clamp(existing.quantity + quantity);
    existing.total = money(existing.unitPrice.amount * existing.quantity, existing.unitPrice.currencyCode);
    return withLines(cart, lines);
  }
  const product = productByHandle(handle);
  const variant = product?.variants.find((v) => v.id === variantId);
  if (!product || !variant) return cart;
  const unitPrice = money(variant.price, cart?.subtotal.currencyCode ?? "USD");
  lines.push({
    id: `${handle}:${variantId}`,
    quantity: clamp(quantity),
    handle,
    title: product.nameVi,
    variantId,
    weight: variant.weight,
    unitPrice,
    total: money(unitPrice.amount * clamp(quantity), unitPrice.currencyCode),
  });
  return withLines(cart, lines);
}

export function optimisticSet(cart: Cart | null, lineId: string, quantity: number): Cart | null {
  if (!cart) return cart;
  const q = clamp(quantity);
  const lines = cart.lines.flatMap((l) =>
    l.id !== lineId
      ? [l]
      : q === 0
        ? []
        : [{ ...l, quantity: q, total: money(l.unitPrice.amount * q, l.unitPrice.currencyCode) }],
  );
  return withLines(cart, lines);
}
