"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Wrapper that sets `data-in` once it scrolls into view (CSS does the rest). */
export function Reveal({
  className,
  children,
  threshold = 0.15,
  ...rest
}: {
  className?: string;
  children: ReactNode;
  threshold?: number;
} & Record<`data-${string}`, string>) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.dataset.in = "";
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.dataset.in = "";
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return (
    <div ref={ref} className={className} {...rest}>
      {children}
    </div>
  );
}
