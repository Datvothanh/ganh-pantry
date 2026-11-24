"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useLenis } from "@/components/motion";
import { prefersReducedMotion } from "@/components/motion/useReducedMotion";
import styles from "./Pantry.module.css";

interface Item {
  id: string;
  label: string;
}

/** Line (fraction of the viewport height) a section heading must cross to become active. */
const ACTIVE_LINE = 0.5;

/**
 * Sticky pill nav of the categories: shows once the first section reaches the
 * viewport, highlights the section in view and scrolls to a section on click.
 */
export function PantryNav({ items, label }: { items: Item[]; label: string }) {
  const lenis = useLenis();
  const [active, setActive] = useState(items[0]?.id ?? "");
  const [shown, setShown] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const els = items
        .map((i) => document.getElementById(i.id))
        .filter((e): e is HTMLElement => !!e);
      if (!els.length) return;
      let current = els[0].id;
      for (const el of els) {
        const heading = document.getElementById(`${el.id}-title`) ?? el;
        if (heading.getBoundingClientRect().top <= vh * ACTIVE_LINE) current = el.id;
      }
      setActive(current);
      const first = els[0].getBoundingClientRect().top;
      // Hidden once the spec table (end of the categories) comes into view.
      const end = document.querySelector("[data-pantry-end]");
      const endTop = end ? end.getBoundingClientRect().top : Infinity;
      // Stays up through every section (weights blocks keep room for it below them).
      setShown(first < vh * 0.8 && endTop > vh);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    // Hydrated and tracking: lets tests (and CSS) know the nav is live.
    if (navRef.current) navRef.current.dataset.ready = "";
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items]);

  const go = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    setActive(id);
    if (lenis && !prefersReducedMotion()) {
      lenis.scrollTo(el, { duration: 1.4 });
    } else {
      el.scrollIntoView({ block: "start" });
    }
    history.replaceState(history.state, "", `#${id}`);
  };

  return (
    <nav
      ref={navRef}
      className={styles.nav}
      aria-label={label}
      data-pantry-nav=""
      data-shown={shown ? "" : undefined}
    >
      <ul className={styles.navList}>
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              className={styles.pill}
              data-pantry-pill={i.id}
              aria-current={active === i.id ? "true" : undefined}
              tabIndex={shown ? undefined : -1}
              onClick={(e) => go(e, i.id)}
            >
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
