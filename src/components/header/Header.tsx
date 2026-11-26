"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { useCart } from "@/components/cart/store";
import { Menu } from "@/components/menu/Menu";
import { getDict } from "@/content/dict";
import { href, type Locale } from "@/lib/i18n";
import { HeaderCartSlot } from "./HeaderCartSlot";
import { LangSwitch } from "./LangSwitch";
import styles from "./Header.module.css";

/** Scroll depth (px) below which the bar always shows. */
const HIDE_AFTER = 100;
/** The logo only sits over the page top; past this depth big titles would run under it. */
const LOGO_UNTIL = 24;

export function Header({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const [menuOpen, setMenuOpen] = useState(false);
  const [down, setDown] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const [dark, setDark] = useState(false);
  const { open: cartOpen } = useCart();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Hide the bar while reading down; bring it back when scrolling up or near the top.
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setAtTop(y <= LOGO_UNTIL);
      if (y <= HIDE_AFTER) setDown(false);
      else if (Math.abs(y - last) >= 2) setDown(y > last);
      else return;
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // Hydrated: tests and tools wait for this before scrolling.
    headerRef.current?.setAttribute("data-ready", "1");
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Light-on-dark while a `[data-header-dark]` section covers the middle of the bar band
  // (not y=0, so a thin dark sliver at the very top does not flip it).
  useEffect(() => {
    let pending = 0;
    const sample = () => {
      pending = 0;
      const bar = barRef.current;
      const mid = bar ? bar.offsetTop + bar.offsetHeight / 2 : 49;
      let under = false;
      document.querySelectorAll("[data-header-dark]").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top <= mid && r.bottom >= mid && r.height > 0) under = true;
      });
      setDark(under);
    };
    const schedule = () => {
      if (!pending) pending = requestAnimationFrame(sample);
    };
    sample();
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      mo.disconnect();
      ro.disconnect();
      cancelAnimationFrame(pending);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  const open = useCallback(() => setMenuOpen(true), []);
  const close = useCallback(() => setMenuOpen(false), []);
  const hidden = down && !menuOpen && !cartOpen;

  return (
    <>
      <header
        className={styles.header}
        data-site-header
        ref={headerRef}
        data-condensed={down || !atTop ? "1" : undefined}
        data-hidden={hidden ? "1" : undefined}
        data-tone={dark ? "dark" : undefined}
        // Keyboard focus landing in the bar (e.g. focus returning from the menu) shows it.
        onFocus={() => setDown(false)}
      >
        <div className={styles.left} inert={cartOpen}>
          <LangSwitch locale={locale} label={t.header.languages} tone={dark ? "dark" : "light"} />
        </div>
        <Link href={href(locale, "/")} className={styles.logo} aria-label={t.header.home} inert={cartOpen}>
          <Logo locale={locale} />
        </Link>
        <div ref={barRef} className={styles.right}>
          <button
            ref={toggleRef}
            type="button"
            className={styles.menuToggle}
            data-menu-toggle
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            inert={cartOpen}
            onClick={open}
          >
            <span className={styles.menuPill} data-menu-pill>{t.menu.open}</span>
            <span className={styles.round} aria-hidden="true">
              <span className={styles.diamond} data-menu-diamond />
            </span>
          </button>
          <HeaderCartSlot />
        </div>
      </header>
      <Menu open={menuOpen} onClose={close} locale={locale} returnFocus={toggleRef} />
    </>
  );
}
