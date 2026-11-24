import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StorePasswordNote } from "@/components/cart/StorePasswordNote";
import { site } from "@/content/site";

const render = (checkoutUrl: string, locale: "en" | "vi" = "en") =>
  renderToStaticMarkup(createElement(StorePasswordNote, { checkoutUrl, locale, className: "n" }));

describe("StorePasswordNote", () => {
  it("shows the demo store password for a hosted Shopify checkout, in both locales", () => {
    const url = "https://ganh-pantry.myshopify.com/cart/c/abc?key=1";
    expect(render(url)).toContain("data-cart-store-password");
    expect(render(url)).toContain(`&quot;${site.demoStorePassword}&quot;`);
    expect(render(url, "vi")).toContain("mật khẩu");
  });
  it("renders nothing for the in-site demo checkout", () => {
    expect(render("/checkout-demo")).toBe("");
  });
});
