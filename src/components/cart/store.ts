"use client";

import { useSyncExternalStore } from "react";
import {
  addToCartAction,
  getCartAction,
  removeCartLineAction,
  updateCartLineAction,
} from "@/lib/commerce/actions";
import { optimisticAdd, optimisticSet } from "@/lib/commerce/optimistic";
import type { ActionResult, Cart, CartLine, Money } from "@/lib/commerce/types";

/**
 * Client cart store with optimistic updates.
 * A module-level store (not React context) so `AddToCartButton` works anywhere on the site
 * while the header slot owns the drawer. `CartProvider` loads the cart and mounts the drawer.
 */

export interface CartState {
  cart: Cart | null;
  loaded: boolean;
  open: boolean;
  /** Mutations in flight. */
  pending: number;
  /** Increments on every add; keys the badge bump animation. */
  bump: number;
  error: string | null;
}

const INITIAL: CartState = { cart: null, loaded: false, open: false, pending: 0, bump: 0, error: null };

let state: CartState = INITIAL;
let confirmed: Cart | null = null;
let inflight = 0;
let loading: Promise<void> | null = null;
/** Mutations run one after another so line ids can be resolved against the confirmed cart. */
let chain: Promise<unknown> = Promise.resolve();
const listeners = new Set<() => void>();

function set(patch: Partial<CartState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Loads the cart from the server once; later calls reuse the first request. */
export function loadCart(): Promise<void> {
  if (state.loaded) return Promise.resolve();
  loading ??= getCartAction()
    .then((cart) => {
      confirmed = cart;
      // A mutation may already be showing an optimistic cart; it settles to `confirmed` itself.
      if (inflight === 0) set({ cart, loaded: true });
      else set({ loaded: true });
    })
    .catch(() => set({ loaded: true }))
    .finally(() => {
      loading = null;
    });
  return loading;
}

async function mutate(
  optimistic: (cart: Cart | null) => Cart | null,
  call: () => Promise<ActionResult>,
): Promise<boolean> {
  inflight++;
  set({ cart: optimistic(state.cart), pending: inflight, error: null });
  let ok = false;
  let error: string | null = null;
  try {
    const run = chain.then(call);
    chain = run.catch(() => undefined);
    const result = await run;
    if (result.ok) {
      confirmed = result.cart;
      ok = true;
    } else {
      error = result.error;
      // The server dropped a cart that no longer exists: start over from an empty cart.
      if (result.gone) confirmed = null;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Cart error";
  }
  inflight--;
  // While other mutations are in flight keep the optimistic view; the last one settles it.
  set(inflight === 0 ? { cart: confirmed, pending: 0, error } : { pending: inflight, error });
  return ok;
}

/** `price`: the unit price shown to the shopper, used for the optimistic line. */
export function addToCart(handle: string, variantId: string, quantity = 1, price?: Money): Promise<boolean> {
  set({ bump: state.bump + 1 });
  return mutate(
    (cart) => optimisticAdd(cart, handle, variantId, quantity, price),
    () => addToCartAction(handle, variantId, quantity),
  );
}

/** Real line id: optimistic lines are matched to the confirmed cart by product and variant. */
function realId(line: CartLine): string {
  const match = confirmed?.lines.find((l) => l.handle === line.handle && l.variantId === line.variantId);
  return match?.id ?? line.id;
}

export function setLineQuantity(line: CartLine, quantity: number): Promise<boolean> {
  return mutate(
    (cart) => optimisticSet(cart, line.id, quantity),
    () => updateCartLineAction(realId(line), quantity),
  );
}

export function removeLine(line: CartLine): Promise<boolean> {
  return mutate(
    (cart) => optimisticSet(cart, line.id, 0),
    () => removeCartLineAction(realId(line)),
  );
}

/** Current state outside React (tests, event handlers). */
export const getCartSnapshot = (): CartState => state;

export const openCart = () => set({ open: true });
export const closeCart = () => set({ open: false });

export function useCart(): CartState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => INITIAL,
  );
}
