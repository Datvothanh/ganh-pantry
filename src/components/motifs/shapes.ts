import type { Motif } from "@/content/products";

/**
 * Flat cut-paper motif shapes, one per product motif. Pure data (no JSX) so the
 * label generator (`scripts/labels`) and the React components share one source.
 * Every shape lives in a 200x200 box. `main` is the body, `alt` the detail
 * (leaf, stem, calyx…) drawn in a second flat tone on top.
 */
export type MotifTone = "main" | "alt";

export interface MotifPath {
  d: string;
  tone: MotifTone;
}

export interface MotifShape {
  viewBox: string;
  paths: MotifPath[];
}

const VIEWBOX = "0 0 200 200";

/** Rotate a path made only of absolute M/C/L/Z commands around (cx, cy). */
function rotatePath(d: string, deg: number, cx: number, cy: number): string {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, xs: string, ys: string) => {
    const x = Number(xs);
    const y = Number(ys);
    const nx = cx + x * cos - y * sin;
    const ny = cy + x * sin + y * cos;
    return `${nx.toFixed(1)} ${ny.toFixed(1)}`;
  });
}

const petal = "M0 -12 C-30 -30 -28 -78 0 -92 C28 -78 30 -30 0 -12 Z";
const blossomPetals = [0, 72, 144, 216, 288].map((a) => rotatePath(petal, a + 8, 100, 102)).join(" ");

export const motifShapes: Record<Motif, MotifShape> = {
  ginger: {
    viewBox: VIEWBOX,
    paths: [
      {
        tone: "main",
        d: "M28 122 C20 100 38 84 58 92 C60 70 80 58 96 72 C106 52 132 52 138 74 C152 64 174 72 172 94 C188 102 186 128 168 134 C162 152 138 156 126 144 C112 158 86 154 80 138 C62 148 34 142 28 122 Z",
      },
      { tone: "alt", d: "M96 74 C92 52 98 34 110 20 C114 40 110 58 102 76 Z" },
      { tone: "alt", d: "M138 76 C142 56 154 44 168 38 C164 56 154 70 142 80 Z" },
    ],
  },
  kumquat: {
    viewBox: VIEWBOX,
    paths: [
      {
        tone: "main",
        d: "M100 48 C146 48 172 82 170 120 C168 160 136 182 100 182 C62 182 30 158 30 118 C30 80 56 48 100 48 Z",
      },
      { tone: "alt", d: "M102 52 C110 28 136 14 164 18 C154 44 130 58 102 52 Z" },
      { tone: "alt", d: "M97 52 C95 42 92 33 87 26 L93 23 C99 32 103 42 105 52 Z" },
    ],
  },
  pineapple: {
    viewBox: VIEWBOX,
    paths: [
      {
        tone: "main",
        d: "M100 84 C136 84 154 116 152 146 C150 176 128 194 100 194 C72 194 50 176 48 146 C46 116 64 84 100 84 Z",
      },
      {
        tone: "alt",
        d: "M100 90 C88 72 72 60 50 56 C70 50 84 56 92 64 C86 44 76 30 60 20 C80 24 94 38 98 54 C100 34 104 18 112 6 C114 24 112 42 106 58 C116 40 132 30 150 28 C138 40 124 54 114 70 C128 62 144 60 160 66 C140 70 120 78 104 92 Z",
      },
      {
        tone: "alt",
        d: "M76 120 L86 110 L96 120 L86 130 Z M104 120 L114 110 L124 120 L114 130 Z M62 146 L72 136 L82 146 L72 156 Z M90 146 L100 136 L110 146 L100 156 Z M118 146 L128 136 L138 146 L128 156 Z M76 172 L86 162 L96 172 L86 182 Z M104 172 L114 162 L124 172 L114 182 Z",
      },
    ],
  },
  chili: {
    viewBox: VIEWBOX,
    paths: [
      {
        tone: "main",
        d: "M60 42 C70 36 82 40 86 52 C96 92 120 130 168 160 C178 168 172 182 158 180 C104 172 62 130 52 74 C50 60 52 48 60 42 Z",
      },
      { tone: "alt", d: "M48 54 C54 38 80 32 94 46 C86 52 76 54 68 52 C60 56 54 58 48 54 Z" },
      { tone: "alt", d: "M68 42 C64 30 66 16 76 6 L83 10 C75 20 75 30 77 42 Z" },
    ],
  },
  shrimp: {
    viewBox: VIEWBOX,
    paths: [
      {
        tone: "main",
        d: "M150 52 C176 70 182 110 164 140 C146 170 108 180 78 168 C60 160 54 142 66 132 C76 124 90 132 104 134 C130 136 146 116 144 94 C142 76 130 66 118 62 C126 50 140 46 150 52 Z",
      },
      { tone: "alt", d: "M72 136 C54 126 34 130 20 144 C38 148 46 156 50 172 C56 160 66 152 78 150 Z" },
      { tone: "alt", d: "M122 62 C102 40 74 30 42 32 C72 38 96 50 114 68 Z" },
      { tone: "alt", d: "M130 56 C120 30 100 14 74 8 C100 20 114 36 122 60 Z" },
    ],
  },
  lime: {
    viewBox: VIEWBOX,
    paths: [
      {
        tone: "main",
        d: "M38 112 C38 76 66 52 102 52 C138 52 164 76 166 108 C172 112 178 116 180 124 C174 126 168 126 162 126 C154 154 130 174 100 174 C64 174 38 148 38 112 Z",
      },
      { tone: "alt", d: "M106 54 C100 32 112 12 138 6 C144 30 132 50 106 54 Z" },
    ],
  },
  eggplant: {
    viewBox: VIEWBOX,
    paths: [
      {
        tone: "main",
        d: "M100 62 C140 62 172 92 170 132 C168 170 138 192 100 192 C62 192 32 170 30 132 C28 92 60 62 100 62 Z",
      },
      {
        tone: "alt",
        d: "M100 50 C112 50 120 56 124 64 C140 62 152 70 160 84 C142 82 130 84 120 80 C116 92 108 98 100 100 C92 98 84 92 80 80 C70 84 58 82 40 84 C48 70 60 62 76 64 C80 56 88 50 100 50 Z",
      },
      { tone: "alt", d: "M96 52 C94 38 96 24 104 12 L112 16 C104 28 104 40 106 52 Z" },
    ],
  },
  "coffee-blossom": {
    viewBox: VIEWBOX,
    paths: [
      { tone: "main", d: blossomPetals },
      {
        tone: "alt",
        d: "M100 84 C110 84 118 92 118 102 C118 112 110 120 100 120 C90 120 82 112 82 102 C82 92 90 84 100 84 Z",
      },
    ],
  },
};

/** Standalone SVG markup for a motif (used for `public/motifs/<motif>.svg`). */
export function motifSvg(motif: Motif, main: string, alt: string): string {
  const shape = motifShapes[motif];
  const paths = shape.paths
    .map((p) => `<path fill="${p.tone === "main" ? main : alt}" d="${p.d}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${shape.viewBox}">${paths}</svg>\n`;
}
