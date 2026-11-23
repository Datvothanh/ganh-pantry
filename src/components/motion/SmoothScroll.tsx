"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "./useReducedMotion";

// One Lenis instance for the whole site, exposed through a tiny external store.
let current: Lenis | null = null;
const listeners = new Set<() => void>();
function setCurrent(next: Lenis | null) {
  current = next;
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** The active Lenis instance, or null (SSR, reduced motion, not yet mounted). */
export function useLenis(): Lenis | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    const onScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onScroll);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    setCurrent(lenis);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      if (current === lenis) setCurrent(null);
    };
  }, [reduced]);

  return (
    <>
      {children}
      <Suspense fallback={null}>
        <ScrollTopOnRouteChange />
      </Suspense>
    </>
  );
}

/** Jumps to the top whenever the pathname changes (unless navigating to a hash). */
function ScrollTopOnRouteChange() {
  const pathname = usePathname();
  useEffect(() => {
    if (window.location.hash) return;
    if (current) current.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
