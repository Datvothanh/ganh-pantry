"use client";

import { useSyncExternalStore } from "react";
import { prefersReducedMotion } from "@/components/motion/useReducedMotion";
import { INTRO_STORAGE_KEY } from "./boot";

export const INTRO_EVENT = "ganh:intro-done";

export const isIntroDone = () =>
  typeof document !== "undefined" &&
  (document.documentElement.dataset.introDone === "1" || prefersReducedMotion());

export function markIntroDone() {
  document.documentElement.dataset.introDone = "1";
  try {
    sessionStorage.setItem(INTRO_STORAGE_KEY, "1");
  } catch {}
  window.dispatchEvent(new Event(INTRO_EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(INTRO_EVENT, cb);
  return () => window.removeEventListener(INTRO_EVENT, cb);
}

/** True once the loader intro has finished (immediately if it already ran or under reduced motion). */
export function useIntroDone(): boolean {
  return useSyncExternalStore(subscribe, isIntroDone, () => false);
}
