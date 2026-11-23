"use client";

import { useLocale } from "@/components/shell/LocaleProvider";
import { BuyAdd } from "./BuyAdd";
import { useBuy } from "./BuyProvider";
import { buyCopy } from "./copy";
import { Quantity } from "./Quantity";
import styles from "./buy.module.css";

/** Price, quantity stepper and the red Add to cart pill for the selected weight. */
export function BuyBlock() {
  const { variant, variants } = useBuy();
  const t = buyCopy[useLocale()];
  return (
    <section className={styles.block} data-buy-block="" aria-label={t.price}>
      <div className={styles.blockInner}>
        <div className={styles.priceCol}>
          <p className={styles.label}>{t.price}</p>
          <p
            className={styles.price}
            data-buy-price=""
            data-variant={variant.id}
          >
            {variant.price}
          </p>
          {variants.length > 1 ? (
            <p className={styles.weightNote}>{variant.weight}</p>
          ) : null}
        </div>
        <Quantity />
        <BuyAdd />
      </div>
    </section>
  );
}
