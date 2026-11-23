import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { products } from "@/content/products";

const dir = path.resolve(__dirname, "../../public/products");

/** Reads size and alpha flag from a WebP RIFF header (VP8X extended format carries alpha). */
function webpInfo(file: string) {
  const buf = fs.readFileSync(file);
  expect(buf.toString("ascii", 0, 4)).toBe("RIFF");
  expect(buf.toString("ascii", 8, 12)).toBe("WEBP");
  expect(buf.toString("ascii", 12, 16), "VP8X header expected for alpha").toBe("VP8X");
  return {
    alpha: (buf[20] & 0x10) !== 0,
    width: buf.readUIntLE(24, 3) + 1,
    height: buf.readUIntLE(27, 3) + 1,
  };
}

describe("composites", () => {
  it("has 8 products", () => {
    expect(products.length).toBe(8);
  });

  for (const p of products) {
    it(`public/products/${p.handle}.webp is 1260x2026 with alpha`, () => {
      const file = path.join(dir, `${p.handle}.webp`);
      expect(fs.existsSync(file), file).toBe(true);
      expect(webpInfo(file)).toEqual({ alpha: true, width: 1260, height: 2026 });
    });
  }
});
