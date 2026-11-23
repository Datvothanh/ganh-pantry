import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { categories, products } from "@/content/products";

const pub = path.resolve(__dirname, "../../public");

describe("product content", () => {
  it("has unique handles and known categories", () => {
    const handles = products.map((p) => p.handle);
    expect(new Set(handles).size).toBe(handles.length);
    const cats = new Set(categories.map((c) => c.id));
    for (const p of products) expect(cats.has(p.category)).toBe(true);
  });
  it("ships a cut-out jar photo for every product", () => {
    for (const p of products) expect(fs.existsSync(path.join(pub, p.jar))).toBe(true);
  });
  it("has both locales filled for every text field", () => {
    for (const p of products)
      for (const f of [p.subtitle, p.description, p.ingredients, p.pairing, p.storage]) {
        expect(f.en.length).toBeGreaterThan(0);
        expect(f.vi.length).toBeGreaterThan(0);
      }
  });
});
