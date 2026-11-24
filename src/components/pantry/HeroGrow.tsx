"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { prefersReducedMotion } from "@/components/motion/useReducedMotion";
import styles from "./Pantry.module.css";

/** Scroll distance (fraction of the viewport height) over which the photo reaches full bleed. */
const GROW_OVER = 0.45;

/**
 * Hero photo frame that grows from an inset card to the full viewport width as
 * the page scrolls (`--grow` 0 → 1). Reduced motion: CSS keeps it at full width.
 */
export function HeroGrow({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const p = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * GROW_OVER)));
      el.style.setProperty("--grow", p.toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div ref={ref} className={styles.heroMedia}>
      <div className={styles.heroFrame} data-pantry-hero-media="">
        {children}
      </div>
    </div>
  );
}
