"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { useCursorLabel } from "@/components/cursor";
import { MotifSvg } from "@/components/motifs";
import { prefersReducedMotion } from "@/components/motion/useReducedMotion";
import type { Motif } from "@/content/products";
import { openCart, addToCart } from "@/components/cart/store";
import styles from "./OtherProducts.module.css";

export interface OtherCard {
  handle: string;
  href: string;
  name: string;
  sub: string;
  image: string;
  card: string;
  accent: string;
  motif: Motif;
  /** Quick-add "+" button: the variant it adds and its accessible label. */
  quickAdd?: { variantId: string; label: string };
}

interface Props {
  title: string[];
  cards: OtherCard[];
  discover: string;
}

/** Motif pops behind the jar on hover: position (% of tile), size, rotation, stagger. */
const POPS = [
  { x: 24, y: 26, s: 0.95, r: -18, d: 0 },
  { x: 78, y: 20, s: 0.7, r: 24, d: 0.05 },
  { x: 84, y: 62, s: 0.9, r: -32, d: 0.1 },
  { x: 16, y: 70, s: 0.75, r: 40, d: 0.08 },
  { x: 52, y: 88, s: 0.6, r: 12, d: 0.14 },
  { x: 50, y: 10, s: 0.5, r: -50, d: 0.12 },
];

const DRAG_LOCK = 8;
const EASE = 0.075;
const FRICTION = 0.92;
const FLING = 18;

/** "The other products": draggable row of pastel cards whose motif pops on hover. */
export function OtherProducts({ title, cards, discover }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const cursor = useCursorLabel();
  const drag = useRef<{
    down: (e: PointerEvent) => void;
    move: (e: PointerEvent) => void;
    up: (e: PointerEvent) => void;
    swallow: () => boolean;
  } | null>(null);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const reduced = prefersReducedMotion();
    const s = {
      id: -1,
      startX: 0,
      startY: 0,
      start: 0,
      lastX: 0,
      lastT: 0,
      vel: 0,
      dist: 0,
      axis: "",
      current: 0,
      target: 0,
      momentum: 0,
      raf: 0,
    };
    let suppress = false;
    const max = () => Math.max(0, el.scrollWidth - el.clientWidth);
    const clamp = (v: number) => Math.max(0, Math.min(max(), v));

    const tick = () => {
      s.raf = 0;
      if (s.id === -1 && s.momentum) {
        const next = clamp(s.target + s.momentum);
        if (Math.abs(next - s.target) < 0.05) s.momentum = 0;
        else {
          s.target = next;
          s.momentum *= FRICTION;
          if (Math.abs(s.momentum) < 0.05) s.momentum = 0;
        }
      }
      s.current = reduced
        ? s.target
        : s.current + (s.target - s.current) * EASE;
      if (Math.abs(s.target - s.current) < 0.5) s.current = s.target;
      el.scrollLeft = s.current;
      if (s.axis === "x" || s.current !== s.target || s.momentum)
        s.raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!s.raf) s.raf = requestAnimationFrame(tick);
    };

    drag.current = {
      down: (e) => {
        if (e.pointerType !== "mouse" || e.button !== 0 || max() <= 0) return;
        cancelAnimationFrame(s.raf);
        s.raf = 0;
        s.id = e.pointerId;
        s.startX = s.lastX = e.clientX;
        s.startY = e.clientY;
        s.start = s.current = s.target = el.scrollLeft;
        s.lastT = e.timeStamp || performance.now();
        s.vel = 0;
        s.dist = 0;
        s.momentum = 0;
        s.axis = "";
      },
      move: (e) => {
        if (s.id === -1 || e.pointerId !== s.id) return;
        const dx = e.clientX - s.startX;
        if (!s.axis) {
          const dy = Math.abs(e.clientY - s.startY);
          if (Math.abs(dx) <= DRAG_LOCK && dy <= DRAG_LOCK) return;
          if (dy > Math.abs(dx)) {
            s.id = -1;
            return;
          }
          s.axis = "x";
          el.setPointerCapture(e.pointerId);
          setDragging(true);
          cursor.hide();
        }
        const now = e.timeStamp || performance.now();
        s.vel =
          s.vel * 0.76 +
          ((e.clientX - s.lastX) / Math.max(1, now - s.lastT)) * 0.24;
        s.lastX = e.clientX;
        s.lastT = now;
        s.dist = Math.max(s.dist, Math.abs(dx));
        s.target = clamp(s.start - dx);
        kick();
      },
      up: (e) => {
        if (s.id === -1 || e.pointerId !== s.id) return;
        const wasDrag = s.axis === "x";
        s.id = -1;
        s.axis = "";
        if (!wasDrag) return;
        el.releasePointerCapture?.(e.pointerId);
        setDragging(false);
        if (!reduced) s.momentum = -s.vel * FLING;
        suppress = true;
        window.setTimeout(() => (suppress = false), 0);
        kick();
      },
      swallow: () => suppress,
    };
    const sync = () => {
      if (s.id === -1 && !s.raf) s.current = s.target = el.scrollLeft;
    };
    el.addEventListener("scroll", sync, { passive: true });
    return () => {
      cancelAnimationFrame(s.raf);
      el.removeEventListener("scroll", sync);
      drag.current = null;
    };
  }, [cursor]);

  useEffect(() => cursor.hide, [cursor.hide]);

  return (
    <section className={styles.section} data-other-products="">
      <h2 className={styles.title}>
        <span>{title[0]}</span> <span>{title[1]}</span>
      </h2>
      <div
        ref={track}
        className={styles.track}
        data-other-track=""
        data-dragging={dragging ? "" : undefined}
        data-lenis-prevent-touch=""
        onPointerDown={(e) => drag.current?.down(e)}
        onPointerMove={(e) => drag.current?.move(e)}
        onPointerUp={(e) => drag.current?.up(e)}
        onPointerCancel={(e) => drag.current?.up(e)}
        onClickCapture={(e) => {
          if (drag.current?.swallow()) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onDragStart={(e) => e.preventDefault()}
      >
        {cards.map((c, i) => (
          <Link
            key={c.handle}
            href={c.href}
            className={styles.card}
            data-product-card=""
            data-handle={c.handle}
            draggable={false}
            style={
              { "--card-bg": c.card, "--accent": c.accent } as CSSProperties
            }
            onPointerEnter={(e) => {
              if (
                !dragging &&
                (e.pointerType === "mouse" || e.pointerType === "pen")
              )
                cursor.show(discover);
            }}
            onPointerLeave={cursor.hide}
            onClick={cursor.hide}
          >
            <span className={styles.stage} aria-hidden="true">
              {POPS.map((p, k) => (
                <span
                  key={k}
                  className={styles.pop}
                  data-motif=""
                  style={
                    {
                      "--x": `${p.x}%`,
                      "--y": `${p.y}%`,
                      "--s": p.s,
                      "--r": `${p.r}deg`,
                      "--d": `${p.d}s`,
                    } as CSSProperties
                  }
                >
                  <MotifSvg motif={c.motif} className={styles.motif} />
                </span>
              ))}
            </span>
            <span className={styles.jar}>
              {/* eslint-disable-next-line @next/next/no-img-element -- static composite, sized by CSS */}
              <img
                src={c.image}
                alt=""
                width={1260}
                height={2026}
                loading={i < 4 ? "eager" : "lazy"}
                decoding="async"
                draggable={false}
              />
            </span>
            {c.quickAdd ? (
              <button
                type="button"
                className={styles.quick}
                data-quick-add={c.handle}
                aria-label={c.quickAdd.label}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openCart();
                  void addToCart(c.handle, c.quickAdd!.variantId, 1);
                }}
              >
                <span aria-hidden="true">+</span>
              </button>
            ) : null}
            <span className={styles.caption}>
              <span className={styles.name} lang="vi">
                {c.name}
              </span>
              <span className={styles.sub}>{c.sub}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
