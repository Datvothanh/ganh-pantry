"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { useCursorLabel } from "@/components/cursor";
import { prefersReducedMotion } from "@/components/motion/useReducedMotion";
import styles from "./PhotoRow.module.css";

export interface PhotoSlide {
  src: string;
  alt: string;
  /** Composite jar on a colour tile instead of a full-bleed photo. */
  tile?: string;
}

interface Props {
  slides: PhotoSlide[];
  label: string;
  hint: string;
  drag: string;
}

const EASE = 0.09;
const FRICTION = 0.92;
const FLING = 16;
const CLICK_SLOP = 8;
/** Share of the page scroll that also moves the row. */
const SCROLL_COUPLING = 0.45;
/** Image parallax inside each slide (px of bleed used at the edges). */
const PARALLAX_REACH = 0.78;
const PARALLAX_CURVE = 0.84;
const MIN_SLIDES = 6;

/** Endless horizontal row of large rounded photos; drag, wheel-x, keys and page scroll move it. */
export function PhotoRow({ slides, label, hint, drag }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const cursor = useCursorLabel();
  const copies = Math.max(
    1,
    Math.ceil(MIN_SLIDES / Math.max(1, slides.length)),
  );
  const all = Array.from({ length: copies }, () => slides).flat();

  const api = useRef<{
    down: (e: PointerEvent) => void;
    move: (e: PointerEvent) => void;
    up: (e: PointerEvent) => void;
    key: (dir: number) => void;
    swallowClick: () => boolean;
  } | null>(null);

  // Layout effect: the first JS placement and `data-ready` land in the same frame as the
  // CSS fallback layout they replace.
  useLayoutEffect(() => {
    const el = track.current;
    if (!el) return;
    const reduced = prefersReducedMotion();
    let items: HTMLElement[] = [];
    let imgs: (HTMLElement | null)[] = [];
    let bleed: number[] = [];
    const m = { slideW: 0, step: 0, total: 0, half: 0, containerW: 0 };
    const s = {
      current: 0,
      target: 0,
      momentum: 0,
      raf: 0,
      held: false,
      id: -1,
      startX: 0,
      startT: 0,
      lastX: 0,
      lastT: 0,
      vel: 0,
      dist: 0,
    };
    let suppress = false;

    const place = (x: number) => {
      if (!m.total) return;
      const origin = m.containerW / 2 - m.slideW / 2;
      const reach = ((m.containerW + m.slideW) / 2) * PARALLAX_REACH;
      for (let i = 0; i < items.length; i++) {
        let u = (((i * m.step - x) % m.total) + m.total) % m.total;
        if (u > m.half) u -= m.total;
        items[i].style.transform =
          `translate3d(${(origin + u).toFixed(2)}px, 0, 0)`;
        const img = imgs[i];
        if (img && bleed[i] && !reduced) {
          const k = Math.max(-1, Math.min(1, -u / reach));
          const p =
            Math.sign(k) * Math.pow(Math.abs(k), PARALLAX_CURVE) * bleed[i];
          img.style.transform = `translate3d(calc(-50% + ${p.toFixed(2)}px), 0, 0)`;
        }
      }
    };

    const tick = () => {
      s.raf = 0;
      if (!s.held && s.momentum) {
        s.target += s.momentum;
        s.momentum *= FRICTION;
        if (Math.abs(s.momentum) < 0.05) s.momentum = 0;
      }
      s.current = reduced
        ? s.target
        : s.current + (s.target - s.current) * EASE;
      if (Math.abs(s.target - s.current) < 0.4 && !s.momentum)
        s.current = s.target;
      place(s.current);
      if (s.held || s.momentum || s.current !== s.target)
        s.raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!s.raf) s.raf = requestAnimationFrame(tick);
    };

    const measure = () => {
      items = Array.from(
        el.querySelectorAll<HTMLElement>("[data-photo-slide]"),
      );
      imgs = items.map((it) =>
        it.querySelector<HTMLElement>("[data-parallax]"),
      );
      m.containerW = el.clientWidth;
      m.slideW = items[0]?.offsetWidth ?? 0;
      const gap =
        parseFloat(getComputedStyle(el).getPropertyValue("--photo-gap")) || 40;
      m.step = m.slideW + gap;
      m.total = items.length * m.step;
      m.half = m.total / 2;
      bleed = imgs.map((img) =>
        img ? Math.max(0, (img.offsetWidth - m.slideW) / 2) : 0,
      );
      place(s.current);
      setReady(true);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const d = y - lastY;
      lastY = y;
      if (reduced || s.held) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > window.innerHeight + 200) return;
      s.target += d * SCROLL_COUPLING;
      kick();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      s.momentum = 0;
      s.target += e.deltaX;
      kick();
    };
    el.addEventListener("wheel", onWheel, { passive: false });

    api.current = {
      down: (e) => {
        if (e.button !== 0 || !items.length) return;
        s.held = true;
        s.id = e.pointerId;
        s.startX = s.lastX = e.clientX;
        s.startT = s.target;
        s.lastT = e.timeStamp || performance.now();
        s.vel = 0;
        s.dist = 0;
        s.momentum = 0;
        el.setPointerCapture(e.pointerId);
        setDragging(true);
        kick();
      },
      move: (e) => {
        if (!s.held || e.pointerId !== s.id) return;
        const now = e.timeStamp || performance.now();
        const dt = Math.max(1, now - s.lastT);
        s.vel = s.vel * 0.76 + ((e.clientX - s.lastX) / dt) * 0.24;
        s.lastX = e.clientX;
        s.lastT = now;
        const dx = e.clientX - s.startX;
        s.dist = Math.max(s.dist, Math.abs(dx));
        s.target = s.startT - dx;
        kick();
      },
      up: (e) => {
        if (!s.held || (s.id !== -1 && e.pointerId !== s.id)) return;
        s.held = false;
        s.id = -1;
        el.releasePointerCapture?.(e.pointerId);
        setDragging(false);
        if (!reduced) s.momentum = -s.vel * FLING;
        if (s.dist > CLICK_SLOP) {
          suppress = true;
          window.setTimeout(() => (suppress = false), 0);
        }
        kick();
      },
      key: (dir) => {
        s.momentum = 0;
        s.target += dir * m.step;
        kick();
      },
      swallowClick: () => suppress,
    };

    return () => {
      cancelAnimationFrame(s.raf);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onWheel);
      api.current = null;
    };
  }, [all.length]);

  useEffect(() => cursor.hide, [cursor.hide]);

  const onKey = (e: KeyboardEvent) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    api.current?.key(dir);
  };

  return (
    <section
      className={styles.row}
      data-photo-row=""
      data-ready={ready ? "" : undefined}
      data-dragging={dragging ? "" : undefined}
    >
      <p className={styles.hint}>{hint}</p>
      <div
        ref={track}
        className={styles.track}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label={label}
        data-lenis-prevent-touch=""
        onPointerDown={(e) => api.current?.down(e)}
        onPointerMove={(e) => api.current?.move(e)}
        onPointerUp={(e) => api.current?.up(e)}
        onPointerCancel={(e) => api.current?.up(e)}
        onClickCapture={(e) => {
          if (api.current?.swallowClick()) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onKeyDown={onKey}
        onDragStart={(e) => e.preventDefault()}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse" || e.pointerType === "pen")
            cursor.show(drag);
        }}
        onPointerLeave={cursor.hide}
      >
        {all.map((slide, i) => (
          <figure
            key={i}
            className={styles.slide}
            data-photo-slide=""
            aria-hidden={i >= slides.length ? true : undefined}
            style={
              {
                "--i": i,
                ...(slide.tile ? { "--tile": slide.tile } : null),
              } as CSSProperties
            }
            data-tile={slide.tile ? "" : undefined}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- slides are positioned and parallaxed by hand */}
            <img
              className={slide.tile ? styles.jar : styles.img}
              src={slide.src}
              alt={i < slides.length ? slide.alt : ""}
              loading="lazy"
              decoding="async"
              draggable={false}
              data-parallax={slide.tile ? undefined : ""}
            />
          </figure>
        ))}
      </div>
    </section>
  );
}
