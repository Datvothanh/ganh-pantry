"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useLenis } from "@/components/motion/SmoothScroll";
import { useLocale } from "@/components/shell/LocaleProvider";
import { productByHandle } from "@/content/products";
import { site } from "@/content/site";
import { formatMoney } from "@/lib/commerce/format";
import { MAX_LINE_QUANTITY, type CartLine } from "@/lib/commerce/types";
import { href } from "@/lib/i18n";
import { isExternalCheckout } from "./checkout";
import { cartCopy } from "./copy";
import { closeCart, removeLine, setLineQuantity, useCart } from "./store";
import styles from "./Cart.module.css";

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
const noopSubscribe = () => () => {};

function Thumb({ line }: { line: CartLine }) {
  const product = productByHandle(line.handle);
  const [src, setSrc] = useState(`/products/${line.handle}.webp`);
  return (
    <div className={styles.thumb} style={{ background: product?.colors.card }}>
      <Image
        src={src}
        alt=""
        width={63}
        height={101}
        unoptimized
        onError={() => product && setSrc((s) => (s === product.jar ? s : product.jar))}
      />
    </div>
  );
}

/** Right-hand drawer over a dimmed backdrop: focus trap, Esc, scroll lock. */
export function CartDrawer() {
  const { cart, open, pending, error } = useCart();
  const locale = useLocale();
  const t = cartCopy(locale);
  const lenis = useLenis();
  const root = useRef<HTMLElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    lenis?.stop();
    closeBtn.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeCart();
        return;
      }
      if (e.key !== "Tab" || !root.current) return;
      const items = Array.from(root.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !root.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !root.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prevOverflow;
      lenis?.start();
      opener?.focus({ preventScroll: true });
    };
  }, [open, lenis]);

  if (!mounted) return null;

  const lines = cart?.lines ?? [];
  const checkoutUrl = cart?.checkoutUrl ?? "/checkout-demo";
  const internal = !isExternalCheckout(checkoutUrl);
  const alert = error ? (
    <p className={styles.error} role="alert" data-cart-error>
      {t.error}
    </p>
  ) : null;

  return createPortal(
    <div className={styles.root} data-cart-root data-state={open ? "open" : "closed"}>
      <div className={styles.backdrop} data-cart-backdrop onClick={closeCart} aria-hidden="true" />
      <aside
        ref={root}
        id="cart-drawer"
        className={styles.drawer}
        data-cart-drawer
        role="dialog"
        aria-modal="true"
        aria-label={t.cart}
        aria-busy={pending > 0}
        inert={!open}
        data-lenis-prevent
      >
        <header className={styles.head}>
          <h2 className={styles.title}>{t.cart}</h2>
          <button ref={closeBtn} type="button" className={styles.close} onClick={closeCart} aria-label={t.close}>
            <span className={styles.cross} aria-hidden="true" />
          </button>
        </header>

        {lines.length === 0 ? (
          <div className={styles.empty} data-cart-empty>
            <p className={styles.emptyTitle}>{t.empty}</p>
            <p>{t.emptyHint}</p>
            {alert}
            <Link href={href(locale, "/pantry")} className={styles.pill} onClick={closeCart}>
              {t.browse}
            </Link>
          </div>
        ) : (
          <>
            <ul className={styles.lines}>
              {lines.map((line) => (
                <li key={line.id} className={styles.line} data-cart-line={line.handle} data-variant={line.variantId}>
                  <Thumb line={line} />
                  <div className={styles.info}>
                    <p className={styles.name} lang="vi">
                      {line.title}
                    </p>
                    <p className={styles.weight}>{line.weight}</p>
                    <div className={styles.stepper} role="group" aria-label={`${t.quantity}: ${line.title}`}>
                      <button
                        type="button"
                        aria-label={t.decrease(line.title)}
                        data-cart-decrease
                        onClick={() => void setLineQuantity(line, line.quantity - 1)}
                      >
                        −
                      </button>
                      <output aria-live="polite" data-cart-qty>
                        {line.quantity}
                      </output>
                      <button
                        type="button"
                        aria-label={t.increase(line.title)}
                        data-cart-increase
                        disabled={line.quantity >= MAX_LINE_QUANTITY}
                        onClick={() => void setLineQuantity(line, line.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className={styles.side}>
                    <p className={styles.price}>{formatMoney(line.total, locale)}</p>
                    <button
                      type="button"
                      className={styles.remove}
                      aria-label={t.remove(line.title)}
                      data-cart-remove
                      onClick={() => void removeLine(line)}
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <footer className={styles.foot}>
              <p className={styles.subtotal}>
                <span>{t.subtotal}</span>
                <strong data-cart-subtotal>{cart ? formatMoney(cart.subtotal, locale) : ""}</strong>
              </p>
              <p className={styles.note}>{t.note}</p>
              {!internal && (
                <p className={styles.note} data-cart-store-password>
                  {t.storePassword(site.demoStorePassword)}
                </p>
              )}
              {alert}
              {internal ? (
                <Link href={href(locale, checkoutUrl)} className={styles.pill} data-cart-checkout onClick={closeCart}>
                  {t.checkout}
                </Link>
              ) : (
                <a href={checkoutUrl} className={styles.pill} data-cart-checkout>
                  {t.checkout}
                </a>
              )}
            </footer>
          </>
        )}
      </aside>
    </div>,
    document.body,
  );
}
