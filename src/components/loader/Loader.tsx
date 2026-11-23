"use client";

import { useEffect, useRef } from "react";
import { Logo } from "@/components/brand/Logo";
import { products } from "@/content/products";
import { gsap } from "@/lib/gsap";
import { markIntroDone, useIntroDone } from "./intro";
import styles from "./Loader.module.css";

/** Smooth closed blob through `n` points with per-point radius wobble (deterministic). */
function blobPath(seed: number, n = 7): string {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const wobble = 0.55 + 0.45 * Math.abs(Math.sin(seed * 12.9898 + i * 78.233));
    pts.push([50 + Math.cos(a) * 46 * wobble, 50 + Math.sin(a) * 46 * wobble]);
  }
  const mid = (p: [number, number], q: [number, number]) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const start = mid(pts[n - 1], pts[0]);
  let d = `M${start[0].toFixed(1)} ${start[1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % n]);
    d += `Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
  }
  return `${d}Z`;
}

// Eight cut-paper shapes around the logo, one per product colour.
const SHAPES = products.map((p, i) => {
  const angle = (i / products.length) * Math.PI * 2 - Math.PI / 2 + 0.3;
  const r = i % 2 ? 30 : 24;
  return {
    key: p.handle,
    d: blobPath(i + 1, 5 + (i % 3)),
    leaf: blobPath(i + 11, 5),
    fill: i % 3 === 2 ? p.colors.accent : p.colors.label,
    leafFill: i % 3 === 2 ? p.colors.label : p.colors.accent,
    x: Math.cos(angle) * r * 1.35,
    y: Math.sin(angle) * r,
    size: 9 + ((i * 5) % 7),
    rot: (i * 47) % 360,
  };
});

export function Loader({ label }: { label: string }) {
  const done = useIntroDone();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (done || !root.current) return;
    const el = root.current;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: markIntroDone });
      tl.from("[data-loader-logo]", { scale: 0.85, opacity: 0, duration: 0.5, ease: "power3.out" }, 0)
        .from(
          "[data-loader-shape]",
          {
            scale: 0,
            rotate: -40,
            duration: 0.55,
            ease: "back.out(2.2)",
            stagger: 0.07,
          },
          0.12,
        )
        .to("[data-loader-shape]", { yPercent: -60, duration: 0.6, ease: "power2.in", stagger: 0.02 }, 1.0)
        .to(el, { clipPath: "inset(0% 0% 100% 0%)", duration: 0.6, ease: "power3.inOut" }, 1.0);
    }, el);
    return () => ctx.revert();
  }, [done]);

  if (done) return null;

  return (
    <div ref={root} className={styles.loader} data-loader role="status" aria-label={label}>
      <div className={styles.stage}>
        {SHAPES.map((s) => (
          <svg
            key={s.key}
            className={styles.shape}
            data-loader-shape
            viewBox="0 0 100 100"
            aria-hidden="true"
            style={{
              left: `calc(50% + ${s.x}vmin)`,
              top: `calc(50% + ${s.y}vmin)`,
              width: `${s.size}vmin`,
              height: `${s.size}vmin`,
              rotate: `${s.rot}deg`,
            }}
          >
            <path d={s.d} fill={s.fill} />
            <path d={s.leaf} fill={s.leafFill} transform="translate(46 -6) scale(0.42)" />
          </svg>
        ))}
        <div className={styles.logo} data-loader-logo>
          <Logo />
        </div>
      </div>
    </div>
  );
}
