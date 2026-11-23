"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import styles from "./RevealText.module.css";

interface Props {
  text: string;
  /** Bold lead-in rendered before the text, e.g. "Ingredients:". */
  lead?: string;
  className?: string;
}

/** Paragraph whose lines rise in one after another when it scrolls into view. */
export function RevealText({ text, lead, className }: Props) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const words = Array.from(el.querySelectorAll<HTMLElement>("[data-word]"));
    const measure = () => {
      let line = -1;
      let top = Number.NEGATIVE_INFINITY;
      for (const w of words) {
        if (w.offsetTop > top + 2) {
          line++;
          top = w.offsetTop;
        }
        w.style.setProperty("--l", String(line));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (typeof IntersectionObserver === "undefined") {
      el.dataset.in = "";
      return () => ro.disconnect();
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.dataset.in = "";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, [text, lead]);

  const words = (s: string, bold = false) =>
    s
      .split(/\s+/)
      .filter(Boolean)
      .map((w, i) => (
        <span key={`${bold ? "b" : "t"}${i}`}>
          {i > 0 || (!bold && lead) ? " " : null}
          <span
            className={`${styles.word}${bold ? ` ${styles.lead}` : ""}`}
            data-word=""
            style={{ "--l": 0 } as CSSProperties}
          >
            {w}
          </span>
        </span>
      ));

  return (
    <p
      ref={ref}
      className={`${styles.reveal} ${className ?? ""}`}
      data-reveal=""
    >
      {lead ? words(lead, true) : null}
      {words(text)}
    </p>
  );
}
