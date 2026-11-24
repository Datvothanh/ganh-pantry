"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { prefersReducedMotion } from "@/components/motion/useReducedMotion";
import styles from "./CursorLabel.module.css";

interface CursorApi {
  show: (text: string) => void;
  hide: () => void;
  /** Hide at once, skipping the fade (e.g. when the hovered target is clicked). */
  dismiss: () => void;
}

const noop: CursorApi = { show: () => {}, hide: () => {}, dismiss: () => {} };
const CursorContext = createContext<CursorApi>(noop);

/** `show(text)` / `hide()` for the pointer-following pill label. */
export const useCursorLabel = (): CursorApi => useContext(CursorContext);

export function CursorProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState("");
  const [visible, setVisible] = useState(false);
  const [instant, setInstant] = useState(false);
  const el = useRef<HTMLDivElement>(null);
  const pillEl = useRef<HTMLSpanElement>(null);
  const fine = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    fine.current = mq.matches;
    const target = { x: -200, y: -200 };
    const pos = { x: -200, y: -200 };
    let raf = 0;
    let seen = false;

    const loop = () => {
      // Exponential easing toward the pointer; instant under reduced motion.
      const k = prefersReducedMotion() ? 1 : 0.2;
      pos.x += (target.x - pos.x) * k;
      pos.y += (target.y - pos.y) * k;
      if (el.current) el.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      if (Math.abs(target.x - pos.x) > 0.1 || Math.abs(target.y - pos.y) > 0.1) {
        raf = requestAnimationFrame(loop);
      } else raf = 0;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      target.x = e.clientX;
      target.y = e.clientY;
      if (!seen) {
        seen = true;
        pos.x = target.x;
        pos.y = target.y;
      }
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onChange = () => (fine.current = mq.matches);
    window.addEventListener("pointermove", onMove, { passive: true });
    mq.addEventListener("change", onChange);
    return () => {
      window.removeEventListener("pointermove", onMove);
      mq.removeEventListener("change", onChange);
      cancelAnimationFrame(raf);
    };
  }, []);

  const show = useCallback((t: string) => {
    if (!fine.current) return;
    setText(t);
    setInstant(false);
    setVisible(true);
  }, []);
  const hide = useCallback(() => setVisible(false), []);
  const dismiss = useCallback(() => {
    // Drop the pill in this frame, before React re-renders.
    const pill = pillEl.current;
    if (pill) {
      pill.dataset.instant = "1";
      delete pill.dataset.visible;
    }
    setInstant(true);
    setVisible(false);
  }, []);
  const api = useMemo(() => ({ show, hide, dismiss }), [show, hide, dismiss]);

  return (
    <CursorContext.Provider value={api}>
      {children}
      <div ref={el} className={styles.root} aria-hidden="true" data-cursor-label>
        <span ref={pillEl} className={styles.pill} data-visible={visible ? "1" : undefined} data-instant={instant ? "1" : undefined}>
          <span className={styles.dot} />
          {text}
        </span>
      </div>
    </CursorContext.Provider>
  );
}
