// HTML template for one wrap-around jar label (1600x607).
// The visible front is u 0.31–0.69 (x 496–1104), centred at x 800.
import { categories } from "../../src/content/products.ts";
import { motifShapes } from "../../src/components/motifs/shapes.ts";
import { nutrition } from "./nutrition.mjs";

export const WIDTH = 1600;
export const HEIGHT = 607;

const FONTS =
  "https://fonts.googleapis.com/css2?family=Noto+Serif+Display:ital,wght@0,300..500;1,300..500&family=Be+Vietnam+Pro:ital,wght@0,400;0,600;1,400&display=block";

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Linear mix of two hex colours, t = share of `b`. */
export function mix(a, b, t) {
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  const m = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${m(r1, r2)}${m(g1, g2)}${m(b1, b2)}`;
}

/** Same composition on every label so the eight read as one family. */
const PLACEMENTS = [
  // seam shape, drawn twice so it wraps across u = 0 / 1 without a cut
  { x: 0, y: 290, size: 420, rot: 14, tone: "accent" },
  { x: 1600, y: 290, size: 420, rot: 14, tone: "accent" },
  // big tint behind the name
  { x: 800, y: 372, size: 560, rot: -8, tone: "tint" },
  // accent shapes peeking into the front, partly behind the name
  { x: 1000, y: 118, size: 250, rot: 152, tone: "accent" },
  { x: 590, y: 556, size: 260, rot: 22, tone: "accent" },
  // tint on the right side, under the producer text
  { x: 1290, y: 470, size: 330, rot: -24, tone: "tint" },
];

function shapeSvg(motif, p, colors) {
  const shape = motifShapes[motif];
  const main = p.tone === "accent" ? colors.accent : colors.tint;
  const alt = mix(main, colors.label, 0.38);
  const paths = shape.paths
    .map((s) => `<path fill="${s.tone === "main" ? main : alt}" d="${s.d}"/>`)
    .join("");
  const style = `left:${p.x - p.size / 2}px;top:${p.y - p.size / 2}px;width:${p.size}px;height:${p.size}px;transform:rotate(${p.rot}deg)`;
  return `<svg class="shape" style="${style}" viewBox="${shape.viewBox}">${paths}</svg>`;
}

/** Our own simple vendor mark: nón lá, shoulder pole, two baskets. */
const MARK = `<svg class="mark" viewBox="0 0 100 100" fill="currentColor">
<path d="M50 6 L74 27 L26 27 Z"/>
<circle cx="50" cy="33" r="6"/>
<path d="M41 40 H59 L65 72 H35 Z"/>
<path d="M41 72 H48 V94 H41 Z M52 72 H59 V94 H52 Z"/>
<path d="M6 42 L94 38 L94 42 L6 46 Z"/>
<path d="M14 44 L5 66 H7 L15 46 Z M14 44 L23 66 H25 L16 46 Z M86 40 L77 62 H79 L87 42 Z M86 40 L95 62 H97 L87 42 Z"/>
<path d="M1 64 H29 L25 80 H5 Z M73 60 H99 L95 76 H77 Z"/>
</svg>`;

/** Split a name into 1–2 balanced lines. */
export function nameLines(name) {
  const words = name.split(" ");
  if (name.length <= 10 || words.length < 2) return [name];
  let best = [name];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const diff = Math.abs(a.length - b.length);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = [a, b];
    }
  }
  return best;
}

const fmt = (n) => String(n);

export function labelHtml(product) {
  const colors = { ...product.colors, tint: mix(product.colors.label, "#FFFFFF", 0.22) };
  const cat = categories.find((c) => c.id === product.category);
  const n = nutrition[product.handle];
  const lines = nameLines(product.nameVi);
  const shapes = PLACEMENTS.map((p) => shapeSvg(product.motif, p, colors)).join("");
  const rows = [
    ["Energy", `${n.kcal} kcal / ${Math.round(n.kcal * 4.184)} kJ`],
    ["Fat", `${fmt(n.fat)} g`],
    ["Carbohydrate", `${fmt(n.carbs)} g`],
    ["of which sugars", `${fmt(n.sugars)} g`],
    ["Protein", `${fmt(n.protein)} g`],
    ["Salt", `${fmt(n.salt)} g`],
  ]
    .map(([k, v], i) => `<tr${i === 3 ? ' class="sub"' : ""}><td>${k}</td><td>${v}</td></tr>`)
    .join("");

  return `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<link rel="stylesheet" href="${FONTS}">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden}
body{position:relative;background:${colors.label};color:${colors.text};font-family:"Be Vietnam Pro",sans-serif;-webkit-font-smoothing:antialiased}
.shape{position:absolute;display:block;overflow:visible}
.band{position:absolute;left:0;right:0;top:578px;height:5px;background:${colors.text}}
.side{position:absolute;top:34px;width:270px;font-size:14px;line-height:1.42}
.side.l{left:206px}
.side.r{left:1134px;width:260px}
.side h4{font-weight:600;font-size:11px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:3px}
.side p{margin-bottom:12px}
.side .vi{font-style:italic;opacity:.9}
table{border-collapse:collapse;width:100%;font-size:13px;line-height:1.25}
caption{text-align:left;font-weight:600;font-size:11px;letter-spacing:.14em;text-transform:uppercase;padding:4px 0 5px;border-bottom:2px solid currentColor}
td{padding:4px 0;border-bottom:1px solid currentColor}
td:last-child{text-align:right;font-variant-numeric:tabular-nums}
tr.sub td:first-child{padding-left:12px;font-style:italic}
.made{font-family:"Noto Serif Display",serif;font-size:30px;line-height:1.05;font-weight:400;margin-bottom:12px}
.made i{font-weight:300}
.front{position:absolute;left:496px;width:608px;top:0;height:578px;display:flex;flex-direction:column;align-items:center;text-align:center}
.brand{margin-top:34px;display:flex;flex-direction:column;align-items:center}
.mark{width:52px;height:52px;display:block;margin-bottom:4px}
.word{font-family:"Noto Serif Display",serif;font-weight:400;font-size:50px;line-height:.95;letter-spacing:.02em}
.tag{font-family:"Noto Serif Display",serif;font-style:italic;font-weight:300;font-size:22px;line-height:1.1}
.mid{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding-bottom:6px}
.cat{font-size:12px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;margin-bottom:10px}
.name{font-family:"Noto Serif Display",serif;font-weight:400;text-transform:uppercase;line-height:1.02;letter-spacing:-.015em;white-space:nowrap}
.name span{display:block}
.en{font-family:"Noto Serif Display",serif;font-style:italic;font-weight:300;font-size:40px;line-height:1.1;margin-top:8px}
.wt{font-family:"Noto Serif Display",serif;font-weight:400;font-size:26px;margin-top:10px;letter-spacing:.02em}
.wt small{font-family:"Be Vietnam Pro",sans-serif;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;margin-right:8px;vertical-align:4px}
</style></head><body>
${shapes}
<div class="band"></div>
<section class="side l">
<h4>Ingredients</h4>
<p>${esc(product.ingredients.en)}<br><span class="vi">${esc(product.ingredients.vi)}</span></p>
<h4>Storage</h4>
<p>${esc(product.storage.en)} Best within ${esc(product.shelfLife)} months, see lid.</p>
<table><caption>Nutrition per 100 g</caption>${rows}</table>
</section>
<section class="side r">
<div class="made">Made in<br>Việt Nam <i>by hand</i></div>
<h4>Producer</h4>
<p>GÁNH Pantry — concept brand<br>Small-batch kitchen, Hội An</p>
<h4>${esc(cat.name.en)} · ${esc(cat.name.vi)}</h4>
<p>${esc(product.pairing.en)}</p>
</section>
<section class="front">
<div class="brand">${MARK}<div class="word">GÁNH</div><div class="tag">Vietnamese Pantry</div></div>
<div class="mid">
<div class="cat">${esc(product.subtitle.vi)}</div>
<h1 class="name" id="name">${lines.map((l) => `<span>${esc(l)}</span>`).join("")}</h1>
<div class="en">${esc(product.nameEn)}</div>
<div class="wt"><small>Net wt.</small>${esc(product.variants[0].weight)}</div>
</div>
</section>
</body></html>`;
}
