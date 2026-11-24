import type { Product } from "@/content/products";
import { money } from "./format";
import type { CommerceProduct, Money } from "./types";

export interface LiveVariant {
  id: string;
  weight: string;
  price: Money;
  available: boolean;
}

/**
 * Catalogue variants merged with commerce data: commerce price and availability win.
 * Without commerce data (fetch failed) the catalogue price is shown and the variant stays
 * buyable; a variant commerce does not know is unavailable.
 */
export function liveVariants(product: Product, live: CommerceProduct | null): LiveVariant[] {
  return product.variants.map((v) => {
    const found = live?.variants.find((x) => x.id === v.id);
    return {
      id: v.id,
      weight: v.weight,
      price: found?.price ?? money(v.price),
      available: live ? (found?.availableForSale ?? false) : true,
    };
  });
}

/** First variant that can be bought; undefined when everything is sold out. */
export function firstAvailableVariantId(product: Product, live: CommerceProduct | null): string | undefined {
  return liveVariants(product, live).find((v) => v.available)?.id;
}

/** Quick-add target: the first buyable variant with its weight label and live unit price (shown on the card, and for the optimistic line). */
export function quickAddTarget(
  product: Product,
  live: CommerceProduct | null,
): { variantId: string; weight: string; price: Money } | undefined {
  const v = liveVariants(product, live).find((x) => x.available);
  return v ? { variantId: v.id, weight: v.weight, price: v.price } : undefined;
}
