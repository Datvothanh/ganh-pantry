"use client";

import { useEffect, useRef, useState } from "react";
import { BuyAdd } from "./BuyAdd";
import { useBuy } from "./BuyProvider";
import styles from "./buy.module.css";

/**
 * Compact buy bar fixed to the bottom. Shown once the buy block has scrolled out of view
 * (above the viewport) and hidden again when the footer comes close.
 */
export function StickyBuyBar() {
  const { variant, name } = useBuy();
  const [visible, setVisible] = useState(false);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const block = document.querySelector("[data-buy-block]");
      const footer = document.querySelector("[data-site-footer]");
      if (!block) return;
      const pastBlock = block.getBoundingClientRect().bottom < 0;
      const barH = bar.current?.offsetHeight ?? 80;
      const nearFooter = footer
        ? footer.getBoundingClientRect().top < window.innerHeight - barH * 0.5
        : false;
      setVisible(pastBlock && !nearFooter);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // Layout shifts (hero clearance, images, fonts) move the block and the footer without a
    // scroll event; re-measure when they cross the viewport or the page height changes.
    const io = new IntersectionObserver(schedule, { threshold: [0, 1] });
    const ro = new ResizeObserver(schedule);
    for (const sel of ["[data-buy-block]", "[data-site-footer]"]) {
      const el = document.querySelector(sel);
      if (el) io.observe(el);
    }
    ro.observe(document.body);
    return () => {
      io.disconnect();
      ro.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div
      ref={bar}
      className={styles.bar}
      data-sticky-buy=""
      data-visible={visible ? "" : undefined}
      aria-hidden={!visible}
      inert={!visible}
    >
      <div className={styles.barInner}>
        <p className={styles.barName} lang="vi">
          {name}
          <span className={styles.barWeight}>{variant.weight}</span>
        </p>
        <p className={styles.barPrice} data-sticky-price="">
          {variant.price}
        </p>
        <BuyAdd />
      </div>
    </div>
  );
}
