import { describe, expect, it } from "vitest";
import { createCommerce } from "@/lib/commerce";
import { createMockAdapter } from "@/lib/commerce/mock";
import { optimisticAdd, optimisticSet } from "@/lib/commerce/optimistic";

const mock = createMockAdapter();

describe("mock commerce adapter", () => {
  it("is chosen when Shopify env is missing", () => {
    expect(createCommerce({}).kind).toBe("mock");
    expect(createCommerce({ SHOPIFY_STORE_DOMAIN: "x.myshopify.com" }).kind).toBe("mock");
    expect(
      createCommerce({ SHOPIFY_STORE_DOMAIN: "x.myshopify.com", SHOPIFY_STOREFRONT_TOKEN: "t" }).kind,
    ).toBe("shopify");
  });

  it("returns products with prices from the content file", async () => {
    const p = await mock.getProduct("mut-gung");
    expect(p?.variants.map((v) => [v.id, v.price.amount])).toEqual([
      ["220g", 9],
      ["314g", 12],
    ]);
    expect(await mock.getProduct("nope")).toBeNull();
  });

  it("adds, merges, updates and removes lines; the cart id carries the state", async () => {
    let cart = await mock.addLine(undefined, { handle: "mut-gung", variantId: "220g", quantity: 1 });
    expect(cart.checkoutUrl).toBe("/checkout-demo");
    expect(cart.totalQuantity).toBe(1);
    expect(cart.subtotal).toEqual({ amount: 9, currencyCode: "USD" });

    cart = await mock.addLine(cart.id, { handle: "mut-gung", variantId: "220g", quantity: 2 });
    cart = await mock.addLine(cart.id, { handle: "mut-gung", variantId: "314g", quantity: 1 });
    expect(cart.lines).toHaveLength(2);
    expect(cart.totalQuantity).toBe(4);
    expect(cart.subtotal.amount).toBe(39);

    const reread = await mock.getCart(cart.id);
    expect(reread).toEqual(cart);

    const line = cart.lines[0];
    cart = await mock.updateLine(cart.id, line.id, 1);
    expect(cart.subtotal.amount).toBe(21);
    cart = await mock.updateLine(cart.id, line.id, 0);
    expect(cart.lines.map((l) => l.variantId)).toEqual(["314g"]);
    cart = await mock.removeLine(cart.id, cart.lines[0].id);
    expect(cart.lines).toEqual([]);
    expect(cart.totalQuantity).toBe(0);
    expect(cart.subtotal.amount).toBe(0);
  });

  it("rejects unknown variants and ignores garbage cart ids", async () => {
    await expect(
      mock.addLine(undefined, { handle: "mut-gung", variantId: "1kg", quantity: 1 }),
    ).rejects.toThrow();
    expect(await mock.getCart("%%%not-a-cart")).toBeNull();
    const cart = await mock.addLine("garbage", { handle: "mut-quat", variantId: "220g", quantity: 1 });
    expect(cart.totalQuantity).toBe(1);
  });

  it("caps quantities", async () => {
    const cart = await mock.addLine(undefined, { handle: "mut-gung", variantId: "220g", quantity: 99 });
    const more = await mock.addLine(cart.id, { handle: "mut-gung", variantId: "220g", quantity: 5 });
    expect(more.lines[0].quantity).toBe(99);
  });
});

describe("optimistic transforms", () => {
  it("adds and merges lines", () => {
    const a = optimisticAdd(null, "mut-gung", "220g", 1);
    expect(a?.totalQuantity).toBe(1);
    const b = optimisticAdd(a, "mut-gung", "220g", 2);
    expect(b?.lines).toHaveLength(1);
    expect(b?.subtotal.amount).toBe(27);
    expect(optimisticAdd(null, "nope", "x", 1)).toBeNull();
  });
  it("sets and removes quantities", () => {
    const a = optimisticAdd(null, "mut-gung", "220g", 2)!;
    const b = optimisticSet(a, a.lines[0].id, 3);
    expect(b?.subtotal.amount).toBe(27);
    expect(optimisticSet(b, a.lines[0].id, 0)?.lines).toEqual([]);
  });
});
