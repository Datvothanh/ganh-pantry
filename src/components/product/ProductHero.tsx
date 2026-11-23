"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import { claimHeroTarget } from "@/components/flight";
import { useIntroDone } from "@/components/loader";
import { useReducedMotion } from "@/components/motion/useReducedMotion";
import { ScrollTrigger } from "@/lib/gsap";
import {
  FRONT_OFFSET,
  getJarLabelRenderer,
  LABEL_SUPERSAMPLE,
  labelPixelRatio,
  type LabelMaterial,
} from "@/lib/jar-label";
import styles from "./ProductHero.module.css";

/** Window event fired once the hero jar is painted; `detail.rect` is the `[data-jar-target]` rect. */
export const HERO_READY_EVENT = "ganh:hero-ready";

/** Scroll distance (fraction of the viewport height) that scrubs `--ph` from 0 to 1. */
const SCRUB_VH = 0.4;
/** Gap between the header and the title, and between the title and the jar (px). */
const TITLE_GAP_TOP = 16;
const TITLE_GAP_JAR = 24;
/** Space between the title and the meta row once the scrub ends (px). */
const META_GAP = 60;
/** Minimum space between the lowest hero element and the content below (px). */
const CLEAR_GAP = 56;
/** Fallback before announcing the hero when the label is slow or WebGL is missing (ms). */
const READY_TIMEOUT = 1500;

interface Props {
  handle: string;
  title: string;
  category: string;
  categoryHref: string;
  madeIn: string[];
  jar: string;
  label: string;
  jarAlt: string;
}

export function ProductHero({
  handle,
  title,
  category,
  categoryHref,
  madeIn,
  jar,
  label,
  jarAlt,
}: Props) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const meta = useRef<HTMLDivElement>(null);
  const jarRef = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const introDone = useIntroDone();
  const reduced = useReducedMotion();

  // An incoming jar flight keeps this jar hidden until the clone lands on it.
  useLayoutEffect(
    () =>
      jarRef.current ? claimHeroTarget(jarRef.current, handle) : undefined,
    [handle],
  );

  // Label canvas + hero-ready announcement.
  const spin = useRef(0);
  const redraw = useRef<() => void>(() => {});
  useEffect(() => {
    const el = jarRef.current;
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!el || !cv || !ctx) return;
    let alive = true;
    let announced = false;
    let material: LabelMaterial | null = null;
    let raf = 0;
    let draw: () => void = () => {};

    const announce = () => {
      if (announced || !alive) return;
      announced = true;
      el.dataset.heroReady = "true";
      const r = el.getBoundingClientRect();
      window.dispatchEvent(
        new CustomEvent(HERO_READY_EVENT, {
          detail: {
            handle,
            rect: { x: r.x, y: r.y, width: r.width, height: r.height },
          },
        }),
      );
    };
    const timer = window.setTimeout(announce, READY_TIMEOUT);
    const img = el.querySelector("img");
    const imgReady = img ? img.decode().catch(() => {}) : Promise.resolve();

    const size = () => {
      const w = cv.offsetWidth;
      const h = cv.offsetHeight;
      if (!w || !h) return;
      const ratio = labelPixelRatio(w, h, LABEL_SUPERSAMPLE, 1);
      const pw = Math.round(w * ratio);
      const ph = Math.round(h * ratio);
      if (cv.width !== pw || cv.height !== ph) {
        cv.width = pw;
        cv.height = ph;
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(() => ((raf = 0), draw()));
    };
    redraw.current = schedule;
    const ro = new ResizeObserver(() => {
      size();
      schedule();
    });
    ro.observe(cv);

    getJarLabelRenderer().then(
      (renderer) => {
        if (!alive) return;
        material = renderer.createMaterial(label);
        draw = () => {
          if (!material || !cv.width) return;
          renderer.resize(cv.width, cv.height);
          renderer.render(material, FRONT_OFFSET - spin.current);
          renderer.blit(ctx);
        };
        material.ready.then(
          () => {
            if (!alive) return;
            size();
            draw();
            imgReady.then(announce);
          },
          () => imgReady.then(announce),
        );
      },
      () => imgReady.then(announce),
    );

    return () => {
      alive = false;
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
      ro.disconnect();
      material?.dispose();
      redraw.current = () => {};
    };
  }, [handle, label]);

  // Title fit + scroll scrub positions, measured from the layout.
  useEffect(() => {
    const st = stage.current;
    const t = titleRef.current;
    const m = meta.current;
    const j = jarRef.current;
    if (!st || !t || !m || !j) return;

    const layout = () => {
      m.style.top = "";
      st.style.removeProperty("--ph-title-rest-y");
      root.current?.style.removeProperty("--ph-title-fit");
      const narrow = window.matchMedia("(max-width: 1024px)").matches;
      const header = document.querySelector("[data-site-header]");
      const headerBottom = Math.min(
        header?.getBoundingClientRect().bottom ?? 0,
        st.clientHeight * 0.3,
      );
      const top =
        headerBottom +
        TITLE_GAP_TOP +
        (narrow ? m.offsetHeight + TITLE_GAP_TOP : 0);
      const jarTop = j.offsetTop;
      const bottom = jarTop - TITLE_GAP_JAR;
      if (t.offsetHeight > bottom - top)
        root.current?.style.setProperty(
          "--ph-title-fit",
          `${Math.max(0.3, (bottom - top) / t.offsetHeight)}`,
        );
      const s = t.offsetHeight;
      const restY = Math.max(
        top + s / 2,
        Math.min((top + bottom) / 2, bottom - s / 2),
      );
      st.style.setProperty("--ph-title-rest-y", `${restY}px`);
      const cs = getComputedStyle(st);
      const riseRaw = cs.getPropertyValue("--ph-jar-rise").trim();
      const rise = riseRaw.endsWith("vh")
        ? (parseFloat(riseRaw) * window.innerHeight) / 100
        : parseFloat(riseRaw) || 0;
      const jw = j.offsetWidth;
      const jh = j.offsetHeight;
      const jarCentre = jarTop + jh / 2 + rise;
      let metaShift = 0;
      if (narrow) {
        st.style.setProperty("--ph-title-fall", "0px");
        m.style.top = `${restY - s / 2 - TITLE_GAP_TOP - m.offsetHeight}px`;
      } else {
        metaShift = jarCentre + s / 2 + META_GAP - m.offsetTop;
        st.style.setProperty("--ph-title-fall", `${jarCentre - restY}px`);
      }
      st.style.setProperty("--ph-meta-shift", `${metaShift}px`);

      // Lowest point the hero content reaches (rest pose without the scrub, end pose with it),
      // so the content below can clear it on any viewport.
      let lowest: number;
      if (reduced) {
        lowest = jarTop + jh;
        if (!narrow) lowest = Math.max(lowest, m.offsetTop + m.offsetHeight);
      } else {
        const rot =
          ((parseFloat(cs.getPropertyValue("--ph-jar-rotate")) || 0) *
            Math.PI) /
          180;
        const scale = parseFloat(cs.getPropertyValue("--ph-jar-scale-to")) || 1;
        const halfH =
          (scale *
            (jh * Math.abs(Math.cos(rot)) + jw * Math.abs(Math.sin(rot)))) /
          2;
        // The scrub ends before the content below scrolls into view, so the end pose is what must clear it.
        lowest = jarCentre + halfH;
        if (!narrow)
          lowest = Math.max(lowest, m.offsetTop + m.offsetHeight + metaShift);
      }
      const clear = Math.max(
        0,
        Math.ceil(lowest - st.clientHeight + CLEAR_GAP),
      );
      root.current?.parentElement?.style.setProperty(
        "--hero-clear",
        `${clear}px`,
      );
    };

    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(st);
    document.fonts?.ready.then(layout).catch(() => {});
    return () => ro.disconnect();
  }, [reduced]);

  // Scrubbed scroll: --ph 0→1 lifts and tilts the jar while the label spins.
  useEffect(() => {
    const r = root.current;
    const st = stage.current;
    if (!r || !st || reduced) return;
    const trigger = ScrollTrigger.create({
      trigger: r,
      start: "top top",
      end: () => `+=${window.innerHeight * SCRUB_VH}`,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        st.style.setProperty("--ph", self.progress.toFixed(4));
        spin.current = self.progress;
        redraw.current();
      },
    });
    return () => {
      trigger.kill();
      st.style.setProperty("--ph", "0");
      spin.current = 0;
      redraw.current();
    };
  }, [reduced]);

  let charIndex = 0;
  const words = title.normalize("NFC").split(/\s+/).filter(Boolean);

  return (
    <section ref={root} className={styles.hero} data-product-hero="">
      <div
        ref={stage}
        className={styles.stage}
        data-play={introDone ? "" : undefined}
      >
        <h1
          ref={titleRef}
          className={styles.title}
          aria-label={title}
          lang="vi"
        >
          {words.map((word, wi) => (
            <span key={wi}>
              {wi > 0 ? " " : null}
              <span className={styles.word} aria-hidden="true">
                {Array.from(word).map((ch, ci) => (
                  <span
                    key={ci}
                    className={styles.char}
                    data-char=""
                    style={{ "--i": charIndex++ } as CSSProperties}
                  >
                    {ch}
                  </span>
                ))}
              </span>
            </span>
          ))}
        </h1>
        <div ref={meta} className={styles.meta}>
          <Link
            href={categoryHref}
            className={`${styles.metaItem} ${styles.metaLeft}`}
          >
            {category}
          </Link>
          <p className={`${styles.metaItem} ${styles.metaRight}`}>
            {madeIn[0]}
            <br />
            {madeIn[1]}
          </p>
        </div>
        <div
          ref={jarRef}
          className={styles.jar}
          data-jar-target=""
          data-handle={handle}
        >
          <div className={styles.jarInner} data-jar-rise="">
            {/* eslint-disable-next-line @next/next/no-img-element -- cut-out jar photo under a WebGL label canvas */}
            <img
              className={styles.jarImg}
              src={jar}
              alt={jarAlt}
              width={630}
              height={1013}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              draggable={false}
            />
            <canvas
              ref={canvas}
              className={styles.jarLabel}
              aria-hidden="true"
              data-jar-canvas=""
            />
          </div>
        </div>
      </div>
      <div className={styles.reserve} aria-hidden="true">
        <div className={styles.reserveBase} />
        {/* Same word/char boxes as the title so it wraps exactly like it. */}
        <div className={styles.probe} data-hero-probe="" lang="vi">
          {words.map((word, wi) => (
            <span key={wi}>
              {wi > 0 ? " " : null}
              <span className={styles.word}>
                {Array.from(word).map((ch, ci) => (
                  <span key={ci} className={styles.probeChar}>
                    {ch}
                  </span>
                ))}
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
