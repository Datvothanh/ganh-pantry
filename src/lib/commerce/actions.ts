"use server";

import { cookies } from "next/headers";
import { commerce } from "./index";
import { CartNotFoundError, MAX_LINE_QUANTITY, type ActionResult, type Cart } from "./types";

/** Cart server actions. The cart cookie holds the Shopify cart id (or the mock's encoded cart). */

const CART_COOKIE = "ganh_cart";

async function readCartId() {
  return (await cookies()).get(CART_COOKIE)?.value;
}

async function writeCartId(cart: Cart) {
  (await cookies()).set(CART_COOKIE, cart.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
}

async function run(fn: (cartId: string | undefined) => Promise<Cart>): Promise<ActionResult> {
  try {
    const cart = await fn(await readCartId());
    await writeCartId(cart);
    return { ok: true, cart };
  } catch (err) {
    if (err instanceof CartNotFoundError) {
      (await cookies()).delete(CART_COOKIE);
      return { ok: false, error: err.message, gone: true };
    }
    console.error("[commerce]", err);
    return { ok: false, error: err instanceof Error ? err.message : "Cart error" };
  }
}

const validQuantity = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= MAX_LINE_QUANTITY;

export async function getCartAction(): Promise<Cart | null> {
  const id = await readCartId();
  if (!id) return null;
  try {
    const cart = await commerce.getCart(id);
    if (!cart) (await cookies()).delete(CART_COOKIE);
    return cart;
  } catch (err) {
    console.error("[commerce]", err);
    return null;
  }
}

export async function addToCartAction(
  handle: string,
  variantId: string,
  quantity: number,
): Promise<ActionResult> {
  if (typeof handle !== "string" || typeof variantId !== "string" || !validQuantity(quantity) || quantity < 1) {
    return { ok: false, error: "Invalid cart request" };
  }
  return run((id) => commerce.addLine(id, { handle, variantId, quantity }));
}

export async function updateCartLineAction(lineId: string, quantity: number): Promise<ActionResult> {
  if (typeof lineId !== "string" || !validQuantity(quantity)) {
    return { ok: false, error: "Invalid cart request" };
  }
  return run(async (id) => {
    if (!id) throw new CartNotFoundError();
    return commerce.updateLine(id, lineId, quantity);
  });
}

export async function removeCartLineAction(lineId: string): Promise<ActionResult> {
  if (typeof lineId !== "string") return { ok: false, error: "Invalid cart request" };
  return run(async (id) => {
    if (!id) throw new CartNotFoundError();
    return commerce.removeLine(id, lineId);
  });
}
