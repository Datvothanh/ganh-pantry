"use client";

import { useLocale } from "@/components/shell/LocaleProvider";
import { useBuy } from "./BuyProvider";
import { buyCopy } from "./copy";
import styles from "./buy.module.css";

/** Selectable weight pills; the choice drives the price, the buy block and the sticky bar. */
export function WeightPills({ className }: { className?: string }) {
  const { variants, variant, setVariantId } = useBuy();
  const t = buyCopy[useLocale()];
  return (
    <div
      className={`${styles.weights} ${className ?? ""}`}
      role="radiogroup"
      aria-label={t.weight}
      data-weights=""
    >
      {variants.map((v) => (
        <button
          key={v.id}
          type="button"
          role="radio"
          aria-checked={v.id === variant.id}
          className={styles.weight}
          data-weight={v.id}
          data-selected={v.id === variant.id ? "" : undefined}
          disabled={!v.available}
          title={v.available ? undefined : t.soldOut}
          onClick={() => setVariantId(v.id)}
        >
          {v.weight}
        </button>
      ))}
    </div>
  );
}
