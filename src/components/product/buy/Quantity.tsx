"use client";

import { useLocale } from "@/components/shell/LocaleProvider";
import { MAX_QUANTITY, useBuy } from "./BuyProvider";
import { buyCopy } from "./copy";
import styles from "./buy.module.css";

export function Quantity() {
  const { quantity, setQuantity } = useBuy();
  const t = buyCopy[useLocale()];
  return (
    <div className={styles.qty} role="group" aria-label={t.quantity}>
      <button
        type="button"
        aria-label={t.decrease}
        data-qty-decrease=""
        disabled={quantity <= 1}
        onClick={() => setQuantity(quantity - 1)}
      >
        −
      </button>
      <output aria-live="polite" data-qty="">
        {quantity}
      </output>
      <button
        type="button"
        aria-label={t.increase}
        data-qty-increase=""
        disabled={quantity >= MAX_QUANTITY}
        onClick={() => setQuantity(quantity + 1)}
      >
        +
      </button>
    </div>
  );
}
