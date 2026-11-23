"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { useCursorLabel } from "@/components/cursor";
import { launchJarFlight } from "@/components/flight";
import { useIntroDone } from "@/components/loader";
import { useReducedMotion } from "@/components/motion/useReducedMotion";
import { BackShape, Badge } from "./HeroBack";
import styles from "./JarSlider.module.css";
import { createSliderEngine, type SliderEngine } from "./sliderEngine";

export interface JarSliderItem {
  key: string;
  handle: string;
  href: string;
  jar: string;
  label: string;
  alt: string;
}

interface Props {
  items: JarSliderItem[];
  headline: string;
  prompt: string;
  badge: string;
  discover: string;
}

/** Full-viewport endless marquee of jars with WebGL-wrapped labels. */
export function JarSlider({ items, headline, prompt, badge, discover }: Props) {
  const root = useRef<HTMLElement>(null);
  const engine = useRef<SliderEngine | null>(null);
  const [ready, setReady] = useState(false);
  const introDone = useIntroDone();
  const reduced = useReducedMotion();
  const cursor = useCursorLabel();
  const router = useRouter();

  useEffect(() => {
    if (!root.current) return;
    const e = createSliderEngine(root.current, reduced);
    engine.current = e;
    setReady(!!e);
    return () => {
      e?.destroy();
      engine.current = null;
      setReady(false);
    };
  }, [reduced]);

  useEffect(() => {
    if (ready && introDone) engine.current?.start();
  }, [ready, introDone]);

  useEffect(() => cursor.hide, [cursor.hide]);

  const showCursor = (e: PointerEvent) => {
    if (e.pointerType === "mouse" || e.pointerType === "pen") cursor.show(discover);
  };

  // Plain clicks fly the jar into the product hero; modified clicks keep the browser default.
  const fly = (e: MouseEvent<HTMLAnchorElement>, item: JarSliderItem) => {
    if (reduced || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!launchJarFlight(e.currentTarget, item.handle)) return;
    e.preventDefault();
    cursor.hide();
    router.push(item.href);
  };

  return (
    <section
      ref={root}
      className={styles.stage}
      data-jar-slider=""
      data-jar-slider-ready={ready ? "true" : "false"}
      data-static={reduced ? "" : undefined}
      data-intro={introDone ? "done" : undefined}
    >
      <h1 className={styles.hidden}>{headline}</h1>
      <div className={styles.shapeLayer} aria-hidden="true">
        <BackShape />
        <Badge text={badge} />
      </div>
      <p className={styles.prompt} data-hero-prompt="">{prompt}</p>
      <div className={styles.wrap} data-jar-slider-wrap="" data-lenis-prevent="">
        <div className={styles.marquee}>
          <div className={styles.track} data-jar-slider-track="">
            {items.map((item, i) => (
              <Link
                key={item.key}
                href={item.href}
                className={styles.item}
                aria-label={item.alt}
                draggable={false}
                data-jar-slider-item=""
                data-handle={item.handle}
                data-label={item.label}
                onPointerEnter={showCursor}
                onPointerLeave={cursor.hide}
                onClick={(e) => fly(e, item)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- cut-out jar photo sized by the engine */}
                <img
                  className={styles.jar}
                  src={item.jar}
                  alt=""
                  width={630}
                  height={1013}
                  draggable={false}
                  loading={i < 6 ? "eager" : "lazy"}
                  decoding="async"
                />
                <canvas className={styles.label} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
