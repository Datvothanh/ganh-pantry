"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Picks the footer for the active page of the locale layout: the home page (no child
 * segment) is a single screen and gets the compact strip, every other page the full footer.
 * Uses the route segment rather than the URL, so the proxy rewrite of "/" to "/en" cannot
 * cause a hydration mismatch.
 */
export function FooterSwitch({ home, full }: { home: ReactNode; full: ReactNode }) {
  return useSelectedLayoutSegment() === null ? home : full;
}
