"use client";

import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { openCart } from "@/components/cart/store";
import { useBuy } from "./BuyProvider";
import styles from "./buy.module.css";

/**
 * Add to cart for the selected weight and quantity; opens the drawer to show the result
 * (or its error). Disabled when the selected weight is sold out.
 */
export function BuyAdd() {
  const { handle, variant, quantity } = useBuy();
  return (
    // `display: contents` wrapper: the click bubbles here after the button starts the add.
    <span
      className={styles.addWrap}
      onClick={() => variant.available && openCart()}
    >
      <AddToCartButton
        handle={handle}
        variantId={variant.id}
        quantity={quantity}
        price={variant.unitPrice}
        soldOut={!variant.available}
        className={styles.add}
      />
    </span>
  );
}
