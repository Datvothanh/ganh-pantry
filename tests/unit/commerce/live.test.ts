import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommerceProduct } from "@/lib/commerce/types";

vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
const getProduct = vi.fn<(handle: string) => Promise<CommerceProduct | null>>();
vi.mock("@/lib/commerce/index", () => ({ commerce: { getProduct: (h: string) => getProduct(h) } }));

beforeEach(() => vi.clearAllMocks());

const BUILD = "phase-production-build";
const RUNTIME = "phase-production-server";

describe("readProductUncached (test seam for the cached read)", () => {
  it("returns the product in either phase", async () => {
    const { readProductUncached } = await import("@/lib/commerce/live");
    const p: CommerceProduct = { handle: "mut-gung", title: "x", variants: [] };
    getProduct.mockResolvedValue(p);
    expect(await readProductUncached("mut-gung", BUILD)).toBe(p);
    expect(await readProductUncached("mut-gung", RUNTIME)).toBe(p);
  });

  it("in the build phase swallows a failed read as null and logs it once", async () => {
    const { readProductUncached } = await import("@/lib/commerce/live");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    getProduct.mockRejectedValue(new Error("boom"));
    expect(await readProductUncached("mut-gung", BUILD)).toBeNull();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("at runtime rethrows a failed read (so the last good cache entry survives) and logs it once", async () => {
    const { readProductUncached } = await import("@/lib/commerce/live");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("boom");
    getProduct.mockRejectedValue(err);
    await expect(readProductUncached("mut-gung", RUNTIME)).rejects.toBe(err);
    await expect(readProductUncached("mut-gung", undefined)).rejects.toBe(err);
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});

describe("getLiveProduct", () => {
  it("returns the product", async () => {
    const { getLiveProduct } = await import("@/lib/commerce/live");
    const p: CommerceProduct = { handle: "mut-gung", title: "x", variants: [] };
    getProduct.mockResolvedValue(p);
    expect(await getLiveProduct("mut-gung")).toBe(p);
  });

  it("falls back to null when the read throws at runtime, with one log line per failed read", async () => {
    const { getLiveProduct } = await import("@/lib/commerce/live");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    getProduct.mockRejectedValue(new Error("boom"));
    expect(await getLiveProduct("mut-gung")).toBeNull();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
