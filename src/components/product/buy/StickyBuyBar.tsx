"use client";

import { useEffect, useRef, useState } from "react";
import { BuyAdd } from "./BuyAdd";
import { useBuy } from "./BuyProvider";
import styles from "./buy.module.css";

/** Space kept between the bar's top edge and the other-products heading (px). */
const HEADING_CLEAR = 24;

/**
 * Compact buy bar fixed to the bottom. Past the first half screen it shows whenever the buy block
 * is off screen (before or after it); hidden while the block is on screen, while it would cover
 * the other-products heading and while a footer is on screen.
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
      if (!block) return;
      const vh = window.innerHeight;
      const onScreen = (el: Element | null) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.top < vh && r.bottom > 0;
      };
      // The bar band: the bottom strip of the viewport the bar occupies, plus a little air.
      const bandTop = vh - (bar.current?.offsetHeight ?? 80) - HEADING_CLEAR;
      const heading =
        document.querySelector("[data-other-products] h2") ??
        document.querySelector("[data-other-products]");
      const h = heading?.getBoundingClientRect();
      const coversHeading = h ? h.top < vh && h.bottom > bandTop : false;
      const footerOn = Array.from(
        document.querySelectorAll("[data-site-footer]"),
      ).some(onScreen);
      setVisible(
        window.scrollY > vh / 2 && !onScreen(block) && !coversHeading && !footerOn,
      );
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
    for (const sel of [
      "[data-buy-block]",
      "[data-other-products]",
      "[data-site-footer]",
    ]) {
      document.querySelectorAll(sel).forEach((el) => io.observe(el));
    }
    ro.observe(document.body);
    // Publish the bar's real height so the text columns reserve enough room under them.
    const root = document.documentElement;
    const barRo = new ResizeObserver(() => {
      if (bar.current) root.style.setProperty("--sticky-bar-h", `${bar.current.offsetHeight}px`);
    });
    if (bar.current) barRo.observe(bar.current);
    return () => {
      barRo.disconnect();
      root.style.removeProperty("--sticky-bar-h");
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
