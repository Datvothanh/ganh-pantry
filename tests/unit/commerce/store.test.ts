import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionResult, Cart } from "@/lib/commerce/types";

const actions = {
  getCartAction: vi.fn<() => Promise<Cart | null>>(),
  addToCartAction: vi.fn<(...a: unknown[]) => Promise<ActionResult>>(),
  updateCartLineAction: vi.fn<(...a: unknown[]) => Promise<ActionResult>>(),
  removeCartLineAction: vi.fn<(...a: unknown[]) => Promise<ActionResult>>(),
};
vi.mock("@/lib/commerce/actions", () => actions);

const cart = (qty: number): Cart => ({
  id: "c1",
  checkoutUrl: "/checkout-demo",
  totalQuantity: qty,
  subtotal: { amount: 9 * qty, currencyCode: "USD" },
  lines: [
    {
      id: "l1",
      quantity: qty,
      handle: "mut-gung",
      title: "Mứt Gừng",
      variantId: "220g",
      weight: "220 g",
      unitPrice: { amount: 9, currencyCode: "USD" },
      total: { amount: 9 * qty, currencyCode: "USD" },
    },
  ],
});

async function freshStore() {
  vi.resetModules();
  return import("@/components/cart/store");
}

beforeEach(() => vi.clearAllMocks());

describe("cart store", () => {
  it("resets to an empty cart when the server says the cart is gone", async () => {
    const store = await freshStore();
    actions.getCartAction.mockResolvedValue(cart(2));
    await store.loadCart();
    expect(store.getCartSnapshot().cart?.totalQuantity).toBe(2);

    actions.updateCartLineAction.mockResolvedValue({ ok: false, error: "Cart not found", gone: true });
    const line = store.getCartSnapshot().cart!.lines[0];
    expect(await store.setLineQuantity(line, 3)).toBe(false);
    expect(store.getCartSnapshot().cart).toBeNull();
    expect(store.getCartSnapshot().error).toBeTruthy();
  });

  it("keeps an error visible after a failed add on an empty cart", async () => {
    const store = await freshStore();
    actions.getCartAction.mockResolvedValue(null);
    await store.loadCart();
    actions.addToCartAction.mockResolvedValue({ ok: false, error: "sold out" });
    expect(await store.addToCart("mut-gung", "220g", 1)).toBe(false);
    expect(store.getCartSnapshot().cart).toBeNull();
    expect(store.getCartSnapshot().error).toBe("sold out");
  });

  it("shows the given unit price optimistically", async () => {
    const store = await freshStore();
    actions.getCartAction.mockResolvedValue(null);
    await store.loadCart();
    let settle!: (r: ActionResult) => void;
    actions.addToCartAction.mockReturnValue(new Promise((r) => (settle = r)));
    const done = store.addToCart("mut-gung", "220g", 2, { amount: 13.5, currencyCode: "USD" });
    expect(store.getCartSnapshot().cart?.subtotal).toEqual({ amount: 27, currencyCode: "USD" });
    settle({ ok: true, cart: cart(2) });
    await done;
  });

  it("clears a stale error when the drawer is closed or reopened", async () => {
    const store = await freshStore();
    actions.getCartAction.mockResolvedValue(null);
    await store.loadCart();
    actions.addToCartAction.mockResolvedValue({ ok: false, error: "sold out" });
    await store.addToCart("mut-gung", "220g", 1);
    store.openCart();
    expect(store.getCartSnapshot().error).toBeNull();

    await store.addToCart("mut-gung", "220g", 1);
    expect(store.getCartSnapshot().error).toBe("sold out");
    store.closeCart();
    expect(store.getCartSnapshot().error).toBeNull();
  });
});
