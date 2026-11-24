import { describe, expect, it } from "vitest";
import { isExternalCheckout } from "@/components/cart/checkout";

describe("isExternalCheckout", () => {
  it("is true for a hosted Shopify checkout URL", () => {
    expect(isExternalCheckout("https://ganh-pantry.myshopify.com/cart/c/abc?key=1")).toBe(true);
  });
  it("is false for the in-site demo checkout", () => {
    expect(isExternalCheckout("/checkout-demo")).toBe(false);
  });
});
