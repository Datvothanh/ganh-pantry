"use client";

import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ElementType,
} from "react";
import { INTRO_EVENT, isIntroDone } from "@/components/loader/intro";
import { prefersReducedMotion } from "@/components/motion/useReducedMotion";
import { ScrollTrigger } from "@/lib/gsap";
import {
  REVEAL,
  groupLines,
  plainText,
  splitGraphemes,
  toBlocks,
  type RevealMode,
  type RevealWord,
} from "@/lib/text-reveal";
import styles from "./TextReveal.module.css";

export interface TextRevealProps {
  /** Text to reveal. An array renders each entry as its own block (e.g. a two-line title). */
  text: string | readonly string[];
  /** Bold lead-in rendered before the text, e.g. "Ingredients:". */
  lead?: string;
  as?: "p" | "h1" | "h2" | "h3" | "div" | "span";
  /** 'chars' rises letter by letter, 'lines' rises visual lines. */
  mode?: RevealMode;
  /**
   * 'scroll' plays once when the top crosses 91% of the viewport; 'load' plays after the intro;
   * 'manual' follows the `play` prop and runs backwards when it turns false again.
   */
  trigger?: "scroll" | "load" | "manual";
  /** Manual mode only: true reveals the text, false hides it again (the units sink back). */
  play?: boolean;
  /** Extra delay in seconds before the first unit starts. */
  delay?: number;
  id?: string;
  className?: string;
  style?: CSSProperties;
  /** Extra data-* attributes for the root element (hooks for tests / scripts). */
  data?: Record<`data-${string}`, string>;
}

/** Calls `cb` once the loader intro is done (right away if it already ran); returns a canceller. */
function whenIntroDone(cb: () => void): () => void {
  if (isIntroDone()) {
    cb();
    return () => {};
  }
  const on = () => cb();
  window.addEventListener(INTRO_EVENT, on, { once: true });
  return () => window.removeEventListener(INTRO_EVENT, on);
}

/** Layout effect in the browser (split before paint, no flash); plain effect where there is no DOM. */
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const span = (className?: string): HTMLSpanElement => {
  const e = document.createElement("span");
  if (className) e.className = className;
  return e;
};

/** A word's text; the bold lead-in words get their own span. */
function appendWord(parent: Node, w: RevealWord) {
  if (w.bold) {
    const b = span(styles.lead);
    b.textContent = w.text;
    parent.appendChild(b);
  } else {
    parent.appendChild(document.createTextNode(w.text));
  }
}

/** One char: a clipping mask around the moving unit. */
function charMask(g: string, index: number): HTMLSpanElement {
  const mask = span(styles.mask);
  const unit = span(styles.unit);
  unit.style.setProperty("--i", String(index));
  unit.textContent = g;
  mask.appendChild(unit);
  return mask;
}

/** Builds the split DOM into `inner`. */
function build(inner: HTMLElement, blocks: RevealWord[][], mode: RevealMode, multi: boolean) {
  const parts = blocks.map(() => span(multi ? styles.partBlock : undefined));
  const frag: Node[] = [];
  parts.forEach((p, i) => {
    if (i > 0) frag.push(document.createTextNode(" "));
    frag.push(p);
  });

  if (mode === "chars") {
    let index = 0;
    blocks.forEach((words, bi) => {
      words.forEach((w, wi) => {
        if (wi > 0) parts[bi].appendChild(document.createTextNode(" "));
        const word = span(`${styles.word}${w.bold ? ` ${styles.lead}` : ""}`);
        word.setAttribute("aria-hidden", "true");
        for (const g of splitGraphemes(w.text)) word.appendChild(charMask(g, index++));
        parts[bi].appendChild(word);
      });
    });
    inner.replaceChildren(...frag);
    return;
  }

  // Lines: lay the words out inline first, read each word's offsetTop, then regroup.
  const wordEls: HTMLSpanElement[][] = blocks.map((words, bi) =>
    words.map((w, wi) => {
      if (wi > 0) parts[bi].appendChild(document.createTextNode(" "));
      const s = span(w.bold ? styles.lead : undefined);
      s.textContent = w.text;
      parts[bi].appendChild(s);
      return s;
    }),
  );
  inner.replaceChildren(...frag);
  const tops = wordEls.map((row) => row.map((w) => w.offsetTop));
  let index = 0;
  blocks.forEach((words, bi) => {
    const nodes = groupLines(tops[bi], REVEAL.lineTolerance).map((group) => {
      const mask = span(`${styles.mask} ${styles.maskLine}`);
      mask.setAttribute("aria-hidden", "true");
      const line = span(styles.line);
      line.style.setProperty("--i", String(index++));
      group.forEach((wi, k) => {
        if (k > 0) line.appendChild(document.createTextNode(" "));
        appendWord(line, words[wi]);
      });
      mask.appendChild(line);
      return mask;
    });
    parts[bi].replaceChildren(...nodes);
  });
}

/**
 * Shared scroll text reveal: chars / lines rise out of an overflow-clipping mask
 * (translateY only). Server and no-JS output is plain readable text; the text is hidden only
 * once it has been split, and stays fully visible under prefers-reduced-motion.
 */
export function TextReveal({
  text,
  lead,
  as: Tag = "p",
  mode = "lines",
  trigger = "scroll",
  play: playProp = false,
  delay = 0,
  id,
  className,
  style,
  data,
}: TextRevealProps) {
  const root = useRef<HTMLElement>(null);
  const wantPlay = useRef(playProp);
  const inner = useRef<HTMLSpanElement>(null);
  const blocks = toBlocks(text, lead);
  const full = plainText(text, lead);
  const multi = blocks.length > 1;
  const sig = `${mode}|${full}|${lead ?? ""}`;
  const cfg = REVEAL[mode];
  const Root = Tag as ElementType;

  useIsoLayoutEffect(() => {
    const host = root.current;
    const box = inner.current;
    if (!host || !box || prefersReducedMotion()) return;

    const original = Array.from(box.childNodes);
    let alive = true;
    let built = false;
    let played = false;
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let st: ScrollTrigger | undefined;
    let ro: ResizeObserver | undefined;
    let cancelIntro = () => {};
    let width = 0;
    const manual = trigger === "manual";
    if (manual) host.dataset.trManual = "";

    const play = () => {
      if (played || !alive) return;
      played = true;
      void host.offsetHeight; // commit the hidden state before the transition starts
      host.dataset.tr = "played";
    };

    const split = () => {
      build(box, blocks, mode, multi);
      built = true;
    };

    const start = () => {
      if (!alive) return;
      split();
      host.setAttribute("aria-label", full);
      host.dataset.tr = played || (manual && wantPlay.current) ? "played" : "ready";
      width = host.clientWidth;

      cancelIntro = whenIntroDone(() => {
        if (!alive || manual) return;
        if (trigger === "load") {
          raf = requestAnimationFrame(play);
          return;
        }
        st = ScrollTrigger.create({
          trigger: host,
          start: REVEAL.start,
          once: true,
          onEnter: play,
          onLeave: play,
          onEnterBack: play,
        });
        // Already above the start line on load: play at once.
        if (host.getBoundingClientRect().top <= window.innerHeight * 0.91) play();
      });

      if (mode === "lines" && typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(() => {
          const w = host.clientWidth;
          if (w === width) return;
          width = w;
          clearTimeout(timer);
          timer = setTimeout(() => {
            if (!alive) return;
            split();
            width = host.clientWidth;
          }, REVEAL.resizeMs);
        });
        ro.observe(host);
      }
    };

    // Lines depend on font metrics: wait for fonts before measuring.
    if (mode === "lines" && document.fonts && document.fonts.status !== "loaded") {
      document.fonts.ready.then(start, start);
    } else {
      start();
    }

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      cancelIntro();
      st?.kill();
      ro?.disconnect();
      if (built) box.replaceChildren(...original);
      host.removeAttribute("aria-label");
      delete host.dataset.tr;
      delete host.dataset.trManual;
    };
    // `blocks` / `full` derive from `sig`.
  }, [sig, trigger, multi]);

  // Manual mode: the parent drives the state, forwards and back.
  useEffect(() => {
    wantPlay.current = playProp;
    const host = root.current;
    if (trigger === "manual" && host?.dataset.tr) host.dataset.tr = playProp ? "played" : "ready";
  }, [playProp, trigger]);

  const rootStyle = {
    "--tr-dur": `${cfg.duration}s`,
    "--tr-stagger": `${cfg.stagger}s`,
    "--tr-delay": `${delay}s`,
    "--tr-from": cfg.distance,
    "--tr-ease": REVEAL.ease,
    ...style,
  } as CSSProperties;

  return (
    <Root
      ref={root}
      id={id}
      className={className}
      style={rootStyle}
      data-text-reveal={mode}
      {...data}
    >
      <span key={sig} ref={inner} className={styles.inner}>
        {blocks.map((words, bi) => (
          <Fragment key={bi}>
            {bi > 0 ? " " : null}
            <span className={multi ? styles.partBlock : undefined}>
              {words.map((w, wi) => (
                <Fragment key={wi}>
                  {wi > 0 ? " " : null}
                  {w.bold ? <span className={styles.lead}>{w.text}</span> : w.text}
                </Fragment>
              ))}
            </span>
          </Fragment>
        ))}
      </span>
    </Root>
  );
}
