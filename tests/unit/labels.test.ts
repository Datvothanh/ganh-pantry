import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { products, type Motif } from "@/content/products";
import * as motifs from "@/components/motifs";

const pub = path.resolve(__dirname, "../../public");
const allMotifs = [...new Set(products.map((p) => p.motif))] as Motif[];

function pngSize(file: string): { width: number; height: number } {
  const buf = fs.readFileSync(file);
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  sig.forEach((b, i) => expect(buf[i]).toBe(b));
  expect(buf.toString("ascii", 12, 16)).toBe("IHDR");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe("labels", () => {
  it("ships a 1600x607 PNG label for every product", () => {
    for (const p of products) {
      expect(p.label).toBe(`/labels/${p.handle}.png`);
      const file = path.join(pub, p.label);
      expect(fs.existsSync(file), file).toBe(true);
      expect(pngSize(file)).toEqual({ width: 1600, height: 607 });
    }
  });

  it("covers all eight motifs", () => {
    expect(allMotifs.length).toBe(8);
  });

  it("ships an SVG and a component export for every motif", () => {
    for (const m of allMotifs) {
      const file = path.join(pub, "motifs", `${m}.svg`);
      expect(fs.existsSync(file), file).toBe(true);
      const svg = fs.readFileSync(file, "utf8");
      expect(svg).toMatch(/^<svg[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
      expect(svg).toContain("<path");
      expect(typeof motifs.motifComponents[m]).toBe("function");
      expect(motifs.motifShapes[m].paths.length).toBeGreaterThan(0);
    }
  });
});
