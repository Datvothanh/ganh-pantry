import { beforeEach, describe, expect, it, vi } from "vitest";
import { CartNotFoundError } from "@/lib/commerce/types";

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined),
    set: (k: string, v: string) => void jar.set(k, v),
    delete: (k: string) => void jar.delete(k),
  }),
}));

const adapter = {
  getCart: vi.fn(),
  updateLine: vi.fn(),
  removeLine: vi.fn(),
  addLine: vi.fn(),
};
vi.mock("@/lib/commerce/index", () => ({ commerce: adapter }));

const actions = await import("@/lib/commerce/actions");

beforeEach(() => {
  jar.clear();
  vi.clearAllMocks();
});

describe("cart actions", () => {
  it("reports a gone cart and drops the cookie", async () => {
    jar.set("ganh_cart", "old");
    adapter.updateLine.mockRejectedValue(new CartNotFoundError());
    const r = await actions.updateCartLineAction("l1", 2);
    expect(r).toMatchObject({ ok: false, gone: true });
    expect(jar.has("ganh_cart")).toBe(false);
  });

  it("treats a missing cart cookie as a gone cart", async () => {
    expect(await actions.removeCartLineAction("l1")).toMatchObject({ ok: false, gone: true });
    expect(await actions.updateCartLineAction("l1", 1)).toMatchObject({ ok: false, gone: true });
  });

  it("drops the cookie when the stored cart no longer exists", async () => {
    jar.set("ganh_cart", "old");
    adapter.getCart.mockResolvedValue(null);
    expect(await actions.getCartAction()).toBeNull();
    expect(jar.has("ganh_cart")).toBe(false);
  });
});
