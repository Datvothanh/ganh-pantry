import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/commerce/actions", () => ({
  getCartAction: vi.fn(),
  addToCartAction: vi.fn(),
  updateCartLineAction: vi.fn(),
  removeCartLineAction: vi.fn(),
}));

describe("AddToCartButton", () => {
  it("is disabled and marked sold-out when the variant is sold out", async () => {
    const { AddToCartButton } = await import("@/components/cart/AddToCartButton");
    const html = renderToStaticMarkup(
      createElement(AddToCartButton, { handle: "mut-gung", variantId: "314g", soldOut: true }),
    );
    expect(html).toContain("disabled");
    expect(html).toContain('data-status="sold-out"');
  });

  it("is enabled for an available variant", async () => {
    const { AddToCartButton } = await import("@/components/cart/AddToCartButton");
    const html = renderToStaticMarkup(createElement(AddToCartButton, { handle: "mut-gung", variantId: "220g" }));
    expect(html).not.toContain("disabled");
    expect(html).toContain('data-status="idle"');
  });
});
