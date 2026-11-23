"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/shell/LocaleProvider";
import { cartCopy } from "./copy";
import { addToCart } from "./store";
import styles from "./Cart.module.css";

interface Props {
  handle: string;
  variantId: string;
  quantity?: number;
  className?: string;
}

/** Red pill that adds one product variant to the cart: idle → pending → added. */
export function AddToCartButton({ handle, variantId, quantity = 1, className }: Props) {
  const t = cartCopy(useLocale());
  const [status, setStatus] = useState<"idle" | "pending" | "added">("idle");
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function onClick() {
    if (status === "pending") return;
    window.clearTimeout(timer.current);
    setStatus("pending");
    const ok = await addToCart(handle, variantId, quantity);
    setStatus(ok ? "added" : "idle");
    if (ok) timer.current = window.setTimeout(() => setStatus("idle"), 1800);
  }

  return (
    <button
      type="button"
      className={`${styles.pill} ${styles.add} ${className ?? ""}`}
      data-add-to-cart={handle}
      data-variant={variantId}
      data-status={status}
      aria-disabled={status === "pending"}
      onClick={() => void onClick()}
    >
      <span aria-live="polite">{status === "pending" ? t.adding : status === "added" ? t.added : t.add}</span>
    </button>
  );
}
