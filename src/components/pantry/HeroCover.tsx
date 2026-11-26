"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useIntroDone } from "@/components/loader/intro";
import { TextReveal } from "@/components/reveal";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { COVER_MOTION, MOTION_OK, createCoverInset, useParallax } from "@/lib/parallax";
import styles from "./Pantry.module.css";

/** Scroll distance (px) over which the cover goes from inset card to full bleed. */
const INSET_OVER = 100;

/**
 * Hero cover. It starts inset by the page margin with rounded corners and is full bleed after
 * the first 100 px of scroll (`--cover-inset` 1 -> 0, scrubbed). The photo drifts -10 -> 10
 * yPercent while the cover leaves the viewport and settles from 1.18 to 1 once the intro is
 * done. The headline over it stays hidden and reveals char by char when the cover's top passes
 * a quarter of the viewport, then sinks back when the page scrolls above that point again.
 */
export function HeroCover({ children, line }: { children: ReactNode; line: readonly string[] }) {
  const cover = useRef<HTMLDivElement>(null);
  const media = useRef<HTMLDivElement>(null);
  const [play, setPlay] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const intro = useIntroDone();

  useParallax(media, cover, { start: "top top", end: "bottom top" });

  useEffect(() => {
    if (!intro) return;
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setRevealed(true));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [intro]);

  useEffect(() => {
    const el = cover.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      // Active once the cover's top is a quarter of the way down the viewport: the headline
      // (20% into the cover) then reveals around mid-screen instead of at the top edge.
      ScrollTrigger.create({
        trigger: el,
        start: "top 25%",
        end: "max",
        onToggle: (self) => setPlay(self.isActive),
        onRefresh: (self) => setPlay(self.isActive),
      });
    });
    mm.add(COVER_MOTION, () => {
      createCoverInset(el, { start: 0, end: INSET_OVER });
    });
    return () => mm.revert();
  }, []);

  return (
    <div
      ref={cover}
      className={styles.heroCover}
      data-pantry-hero-media=""
      data-revealed={revealed ? "" : undefined}
    >
      <div ref={media} className={styles.pxMedia}>
        {children}
      </div>
      <TextReveal
        as="p"
        mode="chars"
        trigger="manual"
        play={play}
        text={line}
        className={styles.heroLine}
        style={{ "--tr-from": 135 } as CSSProperties}
        data={{ "data-pantry-hero-line": "" }}
      />
    </div>
  );
}
