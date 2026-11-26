/**
 * Pure helpers for the shared scroll text reveal: word / grapheme splitting, line grouping
 * from measured offsets, and the motion numbers. No DOM access here so it stays unit-testable.
 */

export type RevealMode = "chars" | "lines";

/** A word of the text and whether it belongs to the bold lead-in. */
export interface RevealWord {
  text: string;
  bold: boolean;
}

/** Motion numbers per mode: seconds, seconds, and yPercent the unit starts at. */
export const REVEAL = {
  chars: { duration: 0.95, stagger: 0.02, distance: 108 },
  lines: { duration: 0.55, stagger: 0.08, distance: 112 },
  /** Same bezier as the reference's "textveil" ease. */
  ease: "cubic-bezier(.165, 1, .32, 1)",
  /** ScrollTrigger start: the element's top crosses 91% of the viewport. */
  start: "top 91%",
  /** Line grouping tolerance in px for offsetTop jitter between words of one line. */
  lineTolerance: 2,
  /** Debounce before lines are rebuilt after a resize. */
  resizeMs: 160,
} as const;

/** Splits text into whitespace-separated words; words are never broken. */
export function splitWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

let segmenter: Intl.Segmenter | null | undefined;

/** Grapheme clusters of a word, so combining marks stay attached to their base letter. */
export function splitGraphemes(word: string): string[] {
  if (segmenter === undefined) {
    segmenter =
      typeof Intl !== "undefined" && "Segmenter" in Intl
        ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
        : null;
  }
  if (segmenter) return Array.from(segmenter.segment(word), (s) => s.segment);
  // Fallback: attach combining marks and joiners to the previous code point.
  const out: string[] = [];
  for (const ch of Array.from(word)) {
    if (out.length && /^[\p{M}\u200d\ufe0f]$/u.test(ch)) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}

/** The text as blocks (one per array entry) of words; `lead` is a bold prefix of the first block. */
export function toBlocks(text: string | readonly string[], lead?: string): RevealWord[][] {
  const parts = typeof text === "string" ? [text] : [...text];
  return parts.map((part, i) => {
    const words: RevealWord[] = [];
    if (i === 0 && lead) {
      for (const w of splitWords(lead)) words.push({ text: w, bold: true });
    }
    for (const w of splitWords(part)) words.push({ text: w, bold: false });
    return words;
  });
}

/** Full plain text of the blocks, for the container's aria-label. */
export function plainText(text: string | readonly string[], lead?: string): string {
  return toBlocks(text, lead)
    .map((b) => b.map((w) => w.text).join(" "))
    .join(" ");
}

/**
 * Groups word indexes into visual lines from their measured offsetTop: a word starts a new
 * line when it sits lower than the first word of the current line by more than `tolerance`.
 */
export function groupLines(
  tops: readonly number[],
  tolerance: number = REVEAL.lineTolerance,
): number[][] {
  const lines: number[][] = [];
  let lineTop = Number.NEGATIVE_INFINITY;
  tops.forEach((top, i) => {
    if (!lines.length || top > lineTop + tolerance) {
      lines.push([]);
      lineTop = top;
    }
    lines[lines.length - 1].push(i);
  });
  return lines;
}
