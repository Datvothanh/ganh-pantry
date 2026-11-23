import type { Metadata } from "next";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { HeaderCartSlot } from "@/components/header/HeaderCartSlot";
import "../../../globals.css";

export const metadata: Metadata = { title: "Cart (dev)", robots: { index: false } };

/**
 * Dev harness for the cart e2e, served at /dev/cart/harness.html. The ".html" segment keeps it
 * out of the locale proxy (which would rewrite /dev/cart to /en/dev/cart); it renders on the
 * bare dev layout, so it mounts the header cart slot itself.
 */
export default function DevCartPage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeContent: "center", gap: 16, padding: 24 }}>
      <div style={{ position: "fixed", top: 16, right: 16, display: "flex" }}>
        <HeaderCartSlot />
      </div>
      <h1>Cart dev</h1>
      <div style={{ display: "flex", gap: 12 }}>
        <AddToCartButton handle="mut-gung" variantId="220g" />
        <AddToCartButton handle="mut-quat" variantId="314g" />
      </div>
    </main>
  );
}
