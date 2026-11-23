"use client";

import { CartButton } from "@/components/cart/CartButton";
import { CartProvider } from "@/components/cart/CartProvider";

/** Header mount point: the round cart button with its count badge; the provider owns the drawer. */
export function HeaderCartSlot() {
  return (
    <CartProvider>
      <CartButton />
    </CartProvider>
  );
}

export default HeaderCartSlot;
