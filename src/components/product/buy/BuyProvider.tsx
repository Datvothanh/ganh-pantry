"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Money } from "@/lib/commerce/types";

export interface BuyVariant {
  id: string;
  weight: string;
  /** Formatted unit price. */
  price: string;
  /** Unit price as money, for the optimistic cart line. */
  unitPrice: Money;
  available: boolean;
}

interface BuyState {
  handle: string;
  name: string;
  variants: BuyVariant[];
  variant: BuyVariant;
  setVariantId: (id: string) => void;
  quantity: number;
  setQuantity: (n: number) => void;
}

const Ctx = createContext<BuyState | null>(null);

export const MAX_QUANTITY = 99;

/** Shares the selected weight and quantity between the pills, the buy block and the sticky bar. */
export function BuyProvider({
  handle,
  name,
  variants,
  children,
}: {
  handle: string;
  name: string;
  variants: BuyVariant[];
  children: ReactNode;
}) {
  // First weight that can be bought; a sold-out first weight is skipped.
  const [variantId, setVariantId] = useState(
    () => (variants.find((v) => v.available) ?? variants[0]).id,
  );
  const [quantity, setQuantity] = useState(1);
  const value = useMemo<BuyState>(
    () => ({
      handle,
      name,
      variants,
      variant: variants.find((v) => v.id === variantId) ?? variants[0],
      setVariantId,
      quantity,
      setQuantity: (n) => setQuantity(Math.max(1, Math.min(MAX_QUANTITY, n))),
    }),
    [handle, name, variants, variantId, quantity],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBuy(): BuyState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useBuy must be used inside BuyProvider");
  return v;
}
