"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { useParallax, type ParallaxOptions } from "@/lib/parallax";
import styles from "./Pantry.module.css";

type FrameProps = ParallaxOptions & {
  as?: "div" | "figure";
  className?: string;
  style?: CSSProperties;
  role?: string;
  "aria-label"?: string;
  children: ReactNode;
};

/**
 * Overflow-hidden frame whose media box (inset -14% 0, taller than the frame) drifts
 * -10 -> 10 yPercent as the frame crosses the viewport. The frame keeps its own aspect
 * ratio, so nothing shifts; reduced motion leaves the media static.
 */
export function ParallaxFrame({
  as: Tag = "div",
  className,
  style,
  children,
  from,
  to,
  start,
  end,
  clamp,
  ...aria
}: FrameProps) {
  const frame = useRef<HTMLElement>(null);
  const media = useRef<HTMLDivElement>(null);
  useParallax(media, frame, { from, to, start, end, clamp });
  return (
    <Tag
      ref={frame as never}
      className={`${styles.pxFrame}${className ? ` ${className}` : ""}`}
      style={style}
      {...aria}
    >
      <div ref={media} className={styles.pxMedia}>
        {children}
      </div>
    </Tag>
  );
}

/**
 * A cut-out (e.g. the front jar) that drifts while the ancestor matching `frame` crosses the
 * viewport. No box of its own: it is moved directly and not clamped.
 */
export function ParallaxItem({
  frame,
  className,
  children,
  from,
  to,
}: ParallaxOptions & { frame: string; className?: string; children: ReactNode }) {
  const item = useRef<HTMLDivElement>(null);
  useParallax(item, frame, { from, to, clamp: false });
  return (
    <div ref={item} className={className}>
      {children}
    </div>
  );
}
