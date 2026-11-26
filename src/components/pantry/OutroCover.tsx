"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "@/lib/gsap";
import { COVER_MOTION, createCoverInset, useParallax } from "@/lib/parallax";
import styles from "./Pantry.module.css";

/**
 * Outro photo frame: inset by the page margin with rounded corners while it enters, full bleed
 * once it is centred in the viewport (`--cover-inset` 1 -> 0, scrubbed 'top bottom' ->
 * 'center center'); the media drifts -10 -> 10 yPercent across the whole pass.
 */
export function OutroCover({
  children,
  label,
}: {
  children: ReactNode;
  /** Accessible name when the media is a decorative composition rather than an <img>. */
  label?: string;
}) {
  const cover = useRef<HTMLDivElement>(null);
  const media = useRef<HTMLDivElement>(null);

  useParallax(media, cover, { start: "top bottom", end: "bottom top" });

  useEffect(() => {
    const el = cover.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add(COVER_MOTION, () => {
      createCoverInset(el, { trigger: el, start: "top bottom", end: "center center" });
    });
    return () => mm.revert();
  }, []);

  return (
    <div
      ref={cover}
      className={styles.outroCover}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <div ref={media} className={styles.pxMedia}>
        {children}
      </div>
    </div>
  );
}
