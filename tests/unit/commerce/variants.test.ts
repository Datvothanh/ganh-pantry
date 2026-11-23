import { describe, expect, it } from "vitest";
import { productByHandle } from "@/content/products";
import { firstAvailableVariantId, liveVariants } from "@/lib/commerce/variants";
import type { CommerceProduct } from "@/lib/commerce/types";

const gung = productByHandle("mut-gung")!;
const live = (rows: [string, number, boolean][]): CommerceProduct => ({
  handle: "mut-gung",
  title: "Mứt Gừng",
  variants: rows.map(([id, amount, availableForSale]) => ({
    id,
    merchandiseId: `gid://${id}`,
    weight: id,
    price: { amount, currencyCode: "USD" },
    availableForSale,
  })),
});

describe("live variants", () => {
  it("falls back to the catalogue when commerce has nothing", () => {
    expect(liveVariants(gung, null)).toEqual([
      { id: "220g", weight: "220 g", price: { amount: 9, currencyCode: "USD" }, available: true },
      { id: "314g", weight: "314 g", price: { amount: 12, currencyCode: "USD" }, available: true },
    ]);
    expect(firstAvailableVariantId(gung, null)).toBe("220g");
  });

  it("uses commerce prices and availability; missing variants are unavailable", () => {
    const v = liveVariants(gung, live([["314g", 16.5, true]]));
    expect(v.map((x) => [x.id, x.price.amount, x.available])).toEqual([
      ["220g", 9, false],
      ["314g", 16.5, true],
    ]);
  });

  it("picks the first available variant, or none when all are sold out", () => {
    expect(firstAvailableVariantId(gung, live([["220g", 13.5, false], ["314g", 16.5, true]]))).toBe("314g");
    expect(firstAvailableVariantId(gung, live([["220g", 13.5, false], ["314g", 16.5, false]]))).toBeUndefined();
  });
});
