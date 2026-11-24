import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommerceProduct } from "@/lib/commerce/types";

vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
const getProduct = vi.fn<(handle: string) => Promise<CommerceProduct | null>>();
vi.mock("@/lib/commerce/index", () => ({ commerce: { getProduct: (h: string) => getProduct(h) } }));

beforeEach(() => vi.clearAllMocks());

describe("getLiveProduct", () => {
  it("returns the product", async () => {
    const { getLiveProduct } = await import("@/lib/commerce/live");
    const p: CommerceProduct = { handle: "mut-gung", title: "x", variants: [] };
    getProduct.mockResolvedValue(p);
    expect(await getLiveProduct("mut-gung")).toBe(p);
  });

  it("falls back to null inside the cached function, so a failed read never fails a prerender", async () => {
    const live = await import("@/lib/commerce/live");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    getProduct.mockRejectedValue(new Error("boom"));
    expect(await live.getLiveProduct("mut-gung")).toBeNull();
    expect(Object.keys(live).sort()).toEqual(["getLiveProduct"]);
    spy.mockRestore();
  });
});
