"use client";

import { useLocale } from "@/components/shell/LocaleProvider";
import { cartCopy } from "./copy";
import { openCart, useCart } from "./store";
import styles from "./Cart.module.css";

/** Round header button with an item-count badge that bumps whenever something is added. */
export function CartButton() {
  const { cart, bump, open } = useCart();
  const t = cartCopy(useLocale());
  const count = cart?.totalQuantity ?? 0;

  return (
    <button
      type="button"
      className={styles.button}
      data-cart-button
      aria-label={t.open(count)}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls="cart-drawer"
      onClick={openCart}
    >
      <svg className={styles.bag} viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
        <path
          d="M4 7h12l-1 10H5L4 7Zm3 0V5.5a3 3 0 0 1 6 0V7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      {count > 0 && (
        <span key={bump} className={styles.badge} data-cart-count aria-hidden="true">
          {count}
        </span>
      )}
    </button>
  );
}
