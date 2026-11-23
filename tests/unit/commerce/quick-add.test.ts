import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommerceProduct, Money } from "@/lib/commerce/types";

// Render client components as plain functions: hooks are stubbed, the element tree is inspected.
vi.mock("react", async (orig) => ({
  ...(await orig<typeof import("react")>()),
  useEffect: vi.fn(),
  useRef: (v: unknown) => ({ current: v }),
  useState: (v: unknown) => [v, vi.fn()],
}));
vi.mock("@/components/cursor", () => ({ useCursorLabel: () => ({ show: vi.fn(), hide: vi.fn() }) }));
const store = { addToCart: vi.fn(), openCart: vi.fn() };
vi.mock("@/components/cart/store", () => store);

const live = (handle: string, rows: [string, number, boolean][]): CommerceProduct => ({
  handle,
  title: handle,
  variants: rows.map(([id, amount, availableForSale]) => ({
    id,
    merchandiseId: `gid://${id}`,
    weight: id,
    price: { amount, currencyCode: "USD" },
    availableForSale,
  })),
});
// mut-gung: 220g sold out, 314g bumped; every other product: first variant bumped.
const liveFor = async (handle: string): Promise<CommerceProduct | null> => {
  if (handle === "mut-gung") return live(handle, [["220g", 13.5, false], ["314g", 16.5, true]]);
  const { productByHandle } = await import("@/content/products");
  const p = productByHandle(handle)!;
  return live(handle, p.variants.map((v, i): [string, number, boolean] => [v.id, v.price + 4.5, i >= 0]));
};
vi.mock("@/lib/commerce/live", () => ({ getLiveProduct: (h: string) => liveFor(h) }));

function find(node: ReactNode, pred: (e: ReactElement<Record<string, unknown>>) => boolean, out: ReactElement<Record<string, unknown>>[] = []) {
  if (Array.isArray(node)) node.forEach((n) => find(n, pred, out));
  else if (node && typeof node === "object" && "props" in node) {
    const e = node as ReactElement<Record<string, unknown>>;
    if (pred(e)) out.push(e);
    find(e.props.children as ReactNode, pred, out);
  }
  return out;
}

type Card = { handle: string; quickAdd?: { variantId: string; price: Money; label: string } };
const clickQuick = (tree: ReactNode, handle: string) => {
  const [btn] = find(tree, (e) => e.props["data-quick-add"] === handle);
  (btn.props.onClick as (e: unknown) => void)({ preventDefault() {}, stopPropagation() {} });
};
const card = (cards: Card[], handle: string) => cards.find((c) => c.handle === handle)!;

beforeEach(() => vi.clearAllMocks());

describe("quick-add", () => {
  it("PantryGrid and OtherProducts pass the card's variant and live price to addToCart", async () => {
    const { PantryGrid } = await import("@/components/pantry/PantryGrid");
    const { OtherProducts } = await import("@/components/product/OtherProducts");
    const price = { amount: 16.5, currencyCode: "USD" };
    const cards = [
      { handle: "mut-gung", href: "/", name: "n", sub: "s", image: "i", card: "#fff", accent: "#000", motif: "leaf", quickAdd: { variantId: "314g", price, label: "l" } },
    ] as never;
    clickQuick(PantryGrid({ cards, discover: "d" }), "mut-gung");
    expect(store.addToCart).toHaveBeenLastCalledWith("mut-gung", "314g", 1, price);
    clickQuick(OtherProducts({ title: ["t"], cards, discover: "d" }), "mut-gung");
    expect(store.addToCart).toHaveBeenLastCalledWith("mut-gung", "314g", 1, price);
    expect(store.addToCart).toHaveBeenCalledTimes(2);
  });

  it("PantryPage builds quick-add from the first available variant and its live price", async () => {
    const { PantryPage } = await import("@/components/pantry/PantryPage");
    const tree = await PantryPage({ locale: "en" });
    const cards = find(tree, (e) => Array.isArray(e.props.cards)).flatMap((e) => e.props.cards as Card[]);
    expect(card(cards, "mut-gung").quickAdd).toMatchObject({
      variantId: "314g",
      price: { amount: 16.5, currencyCode: "USD" },
    });
  });

  it("ProductPage builds the other-products quick-add from live variants", async () => {
    const { ProductPage } = await import("@/components/product/ProductPage");
    const { productByHandle } = await import("@/content/products");
    // mut-gung appears as a card on another product's page.
    const page = await ProductPage({ product: productByHandle("ca-phao")!, locale: "en" });
    const cards = find(page, (e) => Array.isArray(e.props.cards)).flatMap((e) => e.props.cards as Card[]);
    expect(card(cards, "mut-gung").quickAdd).toMatchObject({
      variantId: "314g",
      price: { amount: 16.5, currencyCode: "USD" },
    });
  });
});
