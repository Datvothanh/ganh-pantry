import { useEffect, type RefObject } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

/** Media query under which scroll motion runs at all (reduced motion gets static, unscrubbed media). */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

export interface ParallaxOptions {
  /** yPercent at the start of the range (percent of the media box height). */
  from?: number;
  /** yPercent at the end of the range. */
  to?: number;
  /** ScrollTrigger start / end, relative to the frame. */
  start?: string;
  end?: string;
  /** Keep the media inside the frame so no edge shows (default). Turn off for transparent cut-outs. */
  clamp?: boolean;
}

/**
 * Turns a wanted yPercent into one that keeps `media` covering `frame`: the media box is taller
 * than the frame (inset -14% 0), so it may travel down by its top overhang and up by its bottom
 * overhang and no further. `media` must be absolutely positioned inside the positioned `frame`.
 */
export function clampYPercent(media: HTMLElement, frame: HTMLElement, percent: number): number {
  const height = media.offsetHeight;
  if (!height) return 0;
  const down = Math.max(0, -media.offsetTop);
  const up = Math.max(0, media.offsetTop + height - frame.clientHeight);
  const px = Math.min(down, Math.max(-up, (height * percent) / 100));
  return (px / height) * 100;
}

/**
 * Scrubbed parallax: `media` slides from `from` to `to` yPercent while `frame` crosses the
 * viewport. Values are recomputed on every refresh so they follow resizes. Returns the tween.
 */
export function createParallax(
  media: HTMLElement,
  frame: HTMLElement,
  { from = -10, to = 10, start = "top bottom", end = "bottom top", clamp = true }: ParallaxOptions = {},
) {
  const y = (p: number) => () => (clamp ? clampYPercent(media, frame, p) : p);
  return gsap.fromTo(
    media,
    { yPercent: y(from) },
    {
      yPercent: y(to),
      ease: "none",
      scrollTrigger: { trigger: frame, start, end, scrub: true, invalidateOnRefresh: true },
    },
  );
}

let refreshTimer: ReturnType<typeof setTimeout> | undefined;

/** One debounced ScrollTrigger.refresh for however many images finish loading together. */
function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 120);
}

/** Refreshes ScrollTrigger whenever an image inside `root` finishes loading; returns the remover. */
export function refreshOnImageLoad(root: HTMLElement): () => void {
  const onLoad = (e: Event) => {
    if (e.target instanceof HTMLImageElement) scheduleRefresh();
  };
  // `load` does not bubble: listen in the capture phase.
  root.addEventListener("load", onLoad, true);
  return () => root.removeEventListener("load", onLoad, true);
}

/**
 * Parallax for `media` inside `frame` (a ref, or a selector for an ancestor of the media).
 * Nothing is created under prefers-reduced-motion; everything is killed on unmount.
 */
export function useParallax(
  media: RefObject<HTMLElement | null>,
  frame: RefObject<HTMLElement | null> | string,
  { from, to, start, end, clamp }: ParallaxOptions = {},
) {
  useEffect(() => {
    const m = media.current;
    const f = typeof frame === "string" ? m?.closest<HTMLElement>(frame) : frame.current;
    if (!m || !f) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      createParallax(m, f, { from, to, start, end, clamp });
    });
    const stop = refreshOnImageLoad(f);
    return () => {
      stop();
      mm.revert();
    };
  }, [media, frame, from, to, start, end, clamp]);
}

/** Cover frames start inset (`--cover-inset: 1`) and go full bleed (0) over a scroll range. */
export const COVER_MOTION = "(min-width: 481px) and (prefers-reduced-motion: no-preference)";

/**
 * Scrubs the frame's `--cover-inset` CSS variable 1 -> 0; the stylesheet turns it into a
 * clip-path inset (page margin) and corner radius. Numbers are scroll px, strings are
 * ScrollTrigger positions relative to `trigger`.
 */
export function createCoverInset(
  cover: HTMLElement,
  range: { trigger?: HTMLElement; start: string | number; end: string | number },
) {
  return gsap.fromTo(
    cover,
    { "--cover-inset": 1 },
    {
      "--cover-inset": 0,
      ease: "none",
      scrollTrigger: {
        trigger: range.trigger,
        start: range.start,
        end: range.end,
        scrub: true,
        invalidateOnRefresh: true,
      },
    },
  );
}
