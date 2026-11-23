"use client";

import { useEffect, type ReactNode } from "react";
import { CartDrawer } from "./CartDrawer";
import { loadCart } from "./store";

/**
 * Loads the cart once and mounts the drawer. The state itself lives in `./store`, so
 * `AddToCartButton` and `useCart` work anywhere; the header slot renders this provider.
 */
export function CartProvider({ children }: { children?: ReactNode }) {
  useEffect(() => {
    void loadCart();
  }, []);
  return (
    <>
      {children}
      <CartDrawer />
    </>
  );
}
