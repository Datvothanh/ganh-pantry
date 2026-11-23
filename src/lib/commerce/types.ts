export interface Money {
  /** Decimal amount in the currency's major unit. */
  amount: number;
  currencyCode: string;
}

export interface CommerceVariant {
  /** Our `Variant.id` (the Shopify "Weight" option value), e.g. "220g". */
  id: string;
  /** Opaque adapter id (Shopify ProductVariant gid; `handle:id` for the mock). */
  merchandiseId: string;
  weight: string;
  price: Money;
  availableForSale: boolean;
}

export interface CommerceProduct {
  handle: string;
  title: string;
  variants: CommerceVariant[];
}

export interface CartLine {
  id: string;
  quantity: number;
  handle: string;
  title: string;
  /** Our `Variant.id`. */
  variantId: string;
  weight: string;
  unitPrice: Money;
  total: Money;
}

export interface Cart {
  id: string;
  checkoutUrl: string;
  lines: CartLine[];
  totalQuantity: number;
  subtotal: Money;
}

export interface AddLineInput {
  handle: string;
  variantId: string;
  quantity: number;
}

export interface CommerceAdapter {
  readonly kind: "shopify" | "mock";
  getProduct(handle: string): Promise<CommerceProduct | null>;
  /** Null when the id is unknown or expired. */
  getCart(cartId: string): Promise<Cart | null>;
  /** Creates the cart when `cartId` is missing or no longer valid. */
  addLine(cartId: string | undefined, input: AddLineInput): Promise<Cart>;
  /** Quantity 0 removes the line. */
  updateLine(cartId: string, lineId: string, quantity: number): Promise<Cart>;
  removeLine(cartId: string, lineId: string): Promise<Cart>;
}

export type ActionResult = { ok: true; cart: Cart } | { ok: false; error: string };

export const MAX_LINE_QUANTITY = 99;

/** The stored cart id no longer exists (expired or checked out); callers should drop the cookie. */
export class CartNotFoundError extends Error {
  constructor() {
    super("Cart not found");
  }
}
