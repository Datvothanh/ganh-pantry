"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import { LangSwitch } from "@/components/header/LangSwitch";
import { useLenis } from "@/components/motion/SmoothScroll";
import { getDict } from "@/content/dict";
import { categories, products } from "@/content/products";
import { site } from "@/content/site";
import { href, type Locale } from "@/lib/i18n";
import styles from "./Menu.module.css";

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface MenuProps {
  open: boolean;
  onClose: () => void;
  locale: Locale;
  returnFocus?: RefObject<HTMLElement | null>;
}

/** Full-page overlay nav: curtain (clip-path) in, staggered display links, Esc + focus trap. */
export function Menu({ open, onClose, locale, returnFocus }: MenuProps) {
  const t = getDict(locale);
  const lenis = useLenis();
  const root = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  // `shown` keeps the overlay mounted while the closing curtain plays.
  const [shown, setShown] = useState(open);
  if (open && !shown) setShown(true);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    lenis?.stop();
    closeBtn.current?.focus({ preventScroll: true });
    const focusBack = returnFocus?.current;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
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
      focusBack?.focus({ preventScroll: true });
    };
  }, [open, onClose, lenis, returnFocus]);

  // Fallback in case animationend never fires (e.g. tab hidden while closing).
  useEffect(() => {
    if (open || !shown) return;
    const id = window.setTimeout(() => setShown(false), 900);
    return () => window.clearTimeout(id);
  }, [open, shown]);

  const visible = open || shown;
  let i = 0;

  return (
    <div
      ref={root}
      id="site-menu"
      className={styles.menu}
      data-site-menu
      data-state={open ? "open" : "closing"}
      role="dialog"
      aria-modal="true"
      aria-label={t.menu.title}
      hidden={!visible}
      data-lenis-prevent
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget && !open) setShown(false);
      }}
    >
      {visible && (
        <div className={styles.inner}>
          <div className={styles.top}>
            <LangSwitch locale={locale} label={t.menu.language} tone="dark" />
            <button
              ref={closeBtn}
              type="button"
              className={styles.close}
              onClick={onClose}
              aria-label={t.menu.closeLabel}
            >
              <span>{t.menu.close}</span>
              <span className={styles.closeRound} aria-hidden="true">
                <span className={styles.cross} />
              </span>
            </button>
          </div>

          <div className={styles.body}>
            <nav className={styles.primary} aria-label={t.menu.title}>
              {(
                [
                  ["/", t.nav.home],
                  ["/pantry", t.nav.pantry],
                ] as const
              ).map(([p, label]) => (
                <span key={p} className={styles.line}>
                  <Link
                    href={href(locale, p)}
                    className={styles.big}
                    style={{ "--i": i++ } as React.CSSProperties}
                    onClick={onClose}
                  >
                    {label}
                  </Link>
                </span>
              ))}
            </nav>

            <div className={styles.products} aria-label={t.menu.products} role="group">
              {categories.map((c) => (
                <div key={c.id} className={styles.group} style={{ "--i": i++ } as React.CSSProperties}>
                  <p className={styles.groupTitle}>{c.name[locale]}</p>
                  <ul>
                    {products
                      .filter((p) => p.category === c.id)
                      .map((p) => (
                        <li key={p.handle}>
                          <Link
                            href={href(locale, `/products/${p.handle}`)}
                            className={styles.product}
                            onClick={onClose}
                            style={{ "--tint": p.colors.card } as React.CSSProperties}
                          >
                            <span className={styles.thumb}>
                              <Image src={p.jar} alt="" width={30} height={48} />
                            </span>
                            <span className={styles.names}>
                              <span className={styles.vi} lang="vi">
                                {p.nameVi}
                              </span>
                              <span className={styles.en}>{locale === "en" ? p.nameEn : p.subtitle.vi}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <p className={styles.credit}>{site.credit[locale]}</p>
        </div>
      )}
    </div>
  );
}
