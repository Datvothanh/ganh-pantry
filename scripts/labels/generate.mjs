// Renders public/labels/<handle>.png (1600x607) for every product and
// public/motifs/<motif>.svg for every motif.
// usage: npm run labels [-- <handle> ...]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { products } from "../../src/content/products.ts";
import { motifSvg } from "../../src/components/motifs/shapes.ts";
import { HEIGHT, WIDTH, labelHtml, mix } from "./template.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const labelsDir = path.join(root, "public", "labels");
const motifsDir = path.join(root, "public", "motifs");
fs.mkdirSync(labelsDir, { recursive: true });
fs.mkdirSync(motifsDir, { recursive: true });

const only = process.argv.slice(2);
const list = only.length ? products.filter((p) => only.includes(p.handle)) : products;

for (const p of products) {
  const svg = motifSvg(p.motif, p.colors.accent, mix(p.colors.accent, p.colors.label, 0.45));
  fs.writeFileSync(path.join(motifsDir, `${p.motif}.svg`), svg);
}

const browser = await chromium.launch({ channel: "msedge" });
try {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  for (const p of list) {
    await page.setContent(labelHtml(p), { waitUntil: "networkidle" });
    // Load every subset (latin + vietnamese, roman + italic) the label text needs.
    const ok = await page.evaluate(async () => {
      const text = document.body.innerText + document.body.innerText.toUpperCase();
      const faces = [
        '400 100px "Noto Serif Display"',
        'italic 300 100px "Noto Serif Display"',
        '400 14px "Be Vietnam Pro"',
        'italic 400 14px "Be Vietnam Pro"',
        '600 14px "Be Vietnam Pro"',
      ];
      await Promise.all(faces.map((f) => document.fonts.load(f, text)));
      await document.fonts.ready;
      return faces.every((f) => document.fonts.check(f, text));
    });
    if (!ok) throw new Error(`fonts did not load for ${p.handle}`);
    // Fit the Vietnamese name: as large as possible inside the front panel.
    await page.evaluate(() => {
      const el = document.getElementById("name");
      let size = 168;
      el.style.fontSize = `${size}px`;
      while (size > 40 && (el.scrollWidth > 560 || el.offsetHeight > 260)) {
        size -= 2;
        el.style.fontSize = `${size}px`;
      }
    });
    const out = path.join(labelsDir, `${p.handle}.png`);
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
    console.log("label", path.relative(root, out));
  }
} finally {
  await browser.close();
}
