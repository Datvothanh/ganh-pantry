"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Menu } from "@/components/menu/Menu";
import { getDict } from "@/content/dict";
import { href, type Locale } from "@/lib/i18n";
import { HeaderCartSlot } from "./HeaderCartSlot";
import { LangSwitch } from "./LangSwitch";
import styles from "./Header.module.css";

export function Header({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const [menuOpen, setMenuOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const [dark, setDark] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      // Hide the centre logo while reading down; bring it back when scrolling up or near the top.
      setCondensed(y > 120 && y > last);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Switch to light-on-dark while a `[data-header-dark]` section sits under the header strip.
  useEffect(() => {
    let io: IntersectionObserver | null = null;
    const under = new Set<Element>();
    const observe = () => {
      io?.disconnect();
      under.clear();
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) under.add(e.target);
            else under.delete(e.target);
          }
          setDark(under.size > 0);
        },
        { rootMargin: `0px 0px -${Math.max(0, window.innerHeight - 70)}px 0px` },
      );
      document.querySelectorAll("[data-header-dark]").forEach((el) => io?.observe(el));
    };
    observe();
    // Pages mount their own dark sections; re-scan when the DOM changes shape.
    let pending = 0;
    const mo = new MutationObserver(() => {
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        observe();
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", observe);
    return () => {
      io?.disconnect();
      mo.disconnect();
      cancelAnimationFrame(pending);
      window.removeEventListener("resize", observe);
    };
  }, []);

  const open = useCallback(() => setMenuOpen(true), []);
  const close = useCallback(() => setMenuOpen(false), []);

  return (
    <>
      <header className={styles.header} data-site-header data-condensed={condensed ? "1" : undefined}
        data-tone={dark ? "dark" : undefined}
      >
        <div className={styles.left}>
          <LangSwitch locale={locale} label={t.header.languages} tone={dark ? "dark" : "light"} />
        </div>
        <Link href={href(locale, "/")} className={styles.logo} aria-label={t.header.home}>
          <Logo />
        </Link>
        <div className={styles.right}>
          <button
            ref={toggleRef}
            type="button"
            className={styles.menuPill}
            data-menu-toggle
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={open}
          >
            {t.menu.open}
          </button>
          <button
            type="button"
            className={styles.round}
            aria-label={t.menu.openLabel}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={open}
          >
            <span className={styles.diamond} />
          </button>
          <HeaderCartSlot />
        </div>
      </header>
      <Menu open={menuOpen} onClose={close} locale={locale} returnFocus={toggleRef} />
    </>
  );
}
