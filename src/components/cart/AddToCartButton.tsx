"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/shell/LocaleProvider";
import type { Money } from "@/lib/commerce/types";
import { cartCopy } from "./copy";
import { addToCart } from "./store";
import styles from "./Cart.module.css";

interface Props {
  handle: string;
  variantId: string;
  quantity?: number;
  /** Unit price shown on the page; used for the optimistic cart line. */
  price?: Money;
  /** Sold out: the button is disabled and says so. */
  soldOut?: boolean;
  className?: string;
}

type Status = "idle" | "pending" | "added" | "error";

/** Red pill that adds one product variant to the cart: idle → pending → added (or error). */
export function AddToCartButton({ handle, variantId, quantity = 1, price, soldOut, className }: Props) {
  const t = cartCopy(useLocale());
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function onClick() {
    if (status === "pending" || soldOut) return;
    window.clearTimeout(timer.current);
    setStatus("pending");
    const ok = await addToCart(handle, variantId, quantity, price);
    setStatus(ok ? "added" : "error");
    timer.current = window.setTimeout(() => setStatus("idle"), ok ? 1800 : 4000);
  }

  const label = soldOut
    ? t.soldOut
    : status === "pending"
      ? t.adding
      : status === "added"
        ? t.added
        : status === "error"
          ? t.failed
          : t.add;

  return (
    <button
      type="button"
      className={`${styles.pill} ${styles.add} ${className ?? ""}`}
      data-add-to-cart={handle}
      data-variant={variantId}
      data-status={soldOut ? "sold-out" : status}
      aria-disabled={status === "pending" || undefined}
      disabled={soldOut}
      onClick={() => void onClick()}
    >
      <span aria-live="polite" role={status === "error" ? "alert" : undefined}>
        {label}
      </span>
    </button>
  );
}
