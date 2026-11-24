import { describe, expect, it, vi } from "vitest";
import { CartNotFoundError } from "@/lib/commerce/types";
import { createShopifyAdapter, mapCart } from "@/lib/commerce/shopify";

const money = (amount: string) => ({ amount, currencyCode: "USD" });
const TITLE = "Mứt Gừng";

const rawCart = (lines: { id: string; qty: number; weight: string; price: string }[]) => ({
  id: "gid://shopify/Cart/c1",
  checkoutUrl: "https://shop.example/cart/c/c1",
  totalQuantity: lines.reduce((n, l) => n + l.qty, 0),
  cost: { subtotalAmount: money(lines.reduce((s, l) => s + l.qty * Number(l.price), 0).toFixed(2)) },
  lines: {
    edges: lines.map((l) => ({
      node: {
        id: l.id,
        quantity: l.qty,
        cost: { totalAmount: money((l.qty * Number(l.price)).toFixed(2)) },
        merchandise: {
          id: `gid://shopify/ProductVariant/${l.id}`,
          selectedOptions: [{ name: "Weight", value: l.weight }],
          price: money(l.price),
          product: { handle: "mut-gung", title: TITLE },
        },
      },
    })),
  },
});

const rawProduct = {
  handle: "mut-gung",
  title: TITLE,
  variants: {
    edges: [
      {
        node: {
          id: "gid://shopify/ProductVariant/1",
          title: "220g",
          availableForSale: true,
          selectedOptions: [{ name: "Weight", value: "220g" }],
          price: money("9.00"),
        },
      },
      {
        node: {
          id: "gid://shopify/ProductVariant/2",
          title: "314g",
          availableForSale: false,
          selectedOptions: [{ name: "Weight", value: "314g" }],
          price: money("12.00"),
        },
      },
    ],
  },
};

function mockFetch(...bodies: unknown[]) {
  return vi.fn<typeof fetch>(async () => {
    const body = bodies.shift();
    return new Response(JSON.stringify(body), { status: 200 });
  });
}

const adapterWith = (f: ReturnType<typeof mockFetch>, version?: string) =>
  createShopifyAdapter({
    domain: "https://shop.example/",
    token: "tok",
    version,
    fetch: f,
  });

describe("shopify adapter", () => {
  it("maps a product by handle with the Weight option as variant id", async () => {
    const f = mockFetch({ data: { product: rawProduct } });
    const product = await adapterWith(f).getProduct("mut-gung");
    expect(product).toEqual({
      handle: "mut-gung",
      title: TITLE,
      variants: [
        {
          id: "220g",
          merchandiseId: "gid://shopify/ProductVariant/1",
          weight: "220 g",
          price: { amount: 9, currencyCode: "USD" },
          availableForSale: true,
        },
        {
          id: "314g",
          merchandiseId: "gid://shopify/ProductVariant/2",
          weight: "314 g",
          price: { amount: 12, currencyCode: "USD" },
          availableForSale: false,
        },
      ],
    });
    const [url, init] = f.mock.calls[0];
    expect(String(url)).toBe("https://shop.example/api/2026-10/graphql.json");
    expect((init?.headers as Record<string, string>)["X-Shopify-Storefront-Access-Token"]).toBe("tok");
    expect(JSON.parse(init?.body as string).variables).toEqual({ handle: "mut-gung" });
  });

  it("honours SHOPIFY_API_VERSION and returns null for unknown products", async () => {
    const f = mockFetch({ data: { product: null } });
    expect(await adapterWith(f, "2025-07").getProduct("zzz")).toBeNull();
    expect(String(f.mock.calls[0][0])).toContain("/api/2025-07/");
  });

  it("maps carts", () => {
    const cart = mapCart(rawCart([{ id: "l1", qty: 2, weight: "220g", price: "9.00" }]));
    expect(cart).toEqual({
      id: "gid://shopify/Cart/c1",
      checkoutUrl: "https://shop.example/cart/c/c1",
      totalQuantity: 2,
      subtotal: { amount: 18, currencyCode: "USD" },
      lines: [
        {
          id: "l1",
          quantity: 2,
          handle: "mut-gung",
          title: TITLE,
          variantId: "220g",
          weight: "220 g",
          unitPrice: { amount: 9, currencyCode: "USD" },
          total: { amount: 18, currencyCode: "USD" },
        },
      ],
    });
  });

  it("creates a cart on first add, then updates and removes", async () => {
    const f = mockFetch(
      { data: { product: rawProduct } },
      {
        data: {
          cartCreate: { cart: rawCart([{ id: "l1", qty: 1, weight: "220g", price: "9.00" }]), userErrors: [] },
        },
      },
      {
        data: {
          cartLinesUpdate: { cart: rawCart([{ id: "l1", qty: 3, weight: "220g", price: "9.00" }]), userErrors: [] },
        },
      },
      { data: { cartLinesRemove: { cart: rawCart([]), userErrors: [] } } },
    );
    const a = adapterWith(f);
    const created = await a.addLine(undefined, { handle: "mut-gung", variantId: "220g", quantity: 1 });
    expect(created.totalQuantity).toBe(1);
    const createVars = JSON.parse(f.mock.calls[1][1]?.body as string).variables;
    expect(createVars).toEqual({ lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 }] });

    const updated = await a.updateLine(created.id, "l1", 3);
    expect(updated.subtotal.amount).toBe(27);
    const removed = await a.removeLine(created.id, "l1");
    expect(removed.lines).toEqual([]);
    expect(removed.checkoutUrl).toContain("shop.example");
  });

  it("starts a new cart when the stored one has expired", async () => {
    const f = mockFetch(
      { data: { product: rawProduct } },
      {
        data: {
          cartLinesAdd: {
            cart: null,
            userErrors: [{ field: ["cartId"], message: "The specified cart does not exist." }],
          },
        },
      },
      {
        data: {
          cartCreate: { cart: rawCart([{ id: "l9", qty: 1, weight: "220g", price: "9.00" }]), userErrors: [] },
        },
      },
    );
    const cart = await adapterWith(f).addLine("old", { handle: "mut-gung", variantId: "220g", quantity: 1 });
    expect(cart.lines[0].id).toBe("l9");
  });

  it("reports a gone cart on update and remove", async () => {
    const gone = () =>
      mockFetch({
        data: {
          cartLinesUpdate: {
            cart: null,
            userErrors: [{ field: ["cartId"], message: "The specified cart does not exist." }],
          },
          cartLinesRemove: { cart: null, userErrors: [] },
        },
      });
    await expect(adapterWith(gone()).updateLine("c", "l", 2)).rejects.toBeInstanceOf(CartNotFoundError);
    await expect(adapterWith(gone()).removeLine("c", "l")).rejects.toBeInstanceOf(CartNotFoundError);
  });

  it("surfaces HTTP, GraphQL and user errors", async () => {
    const http = vi.fn<typeof fetch>(async () => new Response("no", { status: 500 }));
    await expect(adapterWith(http).getCart("x")).rejects.toThrow(/500/);
    await expect(adapterWith(mockFetch({ errors: [{ message: "Bad token" }] })).getCart("x")).rejects.toThrow(
      "Bad token",
    );
    const userErr = mockFetch({
      data: { cartLinesUpdate: { cart: null, userErrors: [{ message: "Nope" }] } },
    });
    await expect(adapterWith(userErr).updateLine("c", "l", 2)).rejects.toThrow("Nope");
  });

  it("rejects sold-out and unknown variants", async () => {
    const add = (variantId: string) =>
      adapterWith(mockFetch({ data: { product: rawProduct } })).addLine(undefined, {
        handle: "mut-gung",
        variantId,
        quantity: 1,
      });
    await expect(add("314g")).rejects.toThrow(/sold out/);
    await expect(add("9kg")).rejects.toThrow(/Unknown/);
  });

  it("keeps an explicit http:// domain (local fake storefront)", async () => {
    const f = mockFetch({ data: { product: null } });
    await createShopifyAdapter({ domain: "http://127.0.0.1:4010/", token: "t", fetch: f }).getProduct("x");
    expect(String(f.mock.calls[0][0])).toBe("http://127.0.0.1:4010/api/2026-10/graphql.json");
  });

  it("only sends the token over http to a local host", async () => {
    const urlFor = async (domain: string) => {
      const f = mockFetch({ data: { product: null } });
      await createShopifyAdapter({ domain, token: "t", fetch: f }).getProduct("x");
      return String(f.mock.calls[0][0]);
    };
    expect(await urlFor("http://localhost:3000")).toBe("http://localhost:3000/api/2026-10/graphql.json");
    expect(await urlFor("http://shop.example")).toBe("https://shop.example/api/2026-10/graphql.json");
    expect(await urlFor("http://localhost@evil.example")).toBe("https://localhost@evil.example/api/2026-10/graphql.json");
    expect(await urlFor("http://localhost.evil.example")).toBe(
      "https://localhost.evil.example/api/2026-10/graphql.json",
    );
  });

  it("leaves fetch caching to the caller for product reads and pins no-store on cart calls", async () => {
    const product = mockFetch({ data: { product: rawProduct } });
    await adapterWith(product).getProduct("mut-gung");
    expect(product.mock.calls[0][1]).not.toHaveProperty("cache");

    const cartRead = mockFetch({ data: { cart: null } });
    await adapterWith(cartRead).getCart("c");
    expect(cartRead.mock.calls[0][1]).toHaveProperty("cache", "no-store");

    const add = mockFetch(
      { data: { product: rawProduct } },
      { data: { cartCreate: { cart: rawCart([{ id: "1", qty: 1, weight: "220g", price: "9.00" }]) } } },
    );
    await adapterWith(add).addLine(undefined, { handle: "mut-gung", variantId: "220g", quantity: 1 });
    expect(add.mock.calls.map((c) => c[1]?.cache)).toEqual(["no-store", "no-store"]);

    const update = mockFetch({
      data: { cartLinesUpdate: { cart: rawCart([{ id: "1", qty: 2, weight: "220g", price: "9.00" }]) } },
    });
    await adapterWith(update).updateLine("c", "1", 2);
    expect(update.mock.calls[0][1]).toHaveProperty("cache", "no-store");
  });

  it("returns null for a missing cart", async () => {
    expect(await adapterWith(mockFetch({ data: { cart: null } })).getCart("gone")).toBeNull();
  });
});

describe("Storefront request timeout", () => {
  /** Answers the first requests with the given bodies, then never answers (until aborted). */
  const hangAfter = (...answers: unknown[]) =>
    vi.fn<typeof fetch>((_url, init) => {
      const body = answers.shift();
      if (body !== undefined) return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal!.reason));
      });
    });
  const adapterFor = (f: typeof fetch) =>
    createShopifyAdapter({ domain: "x.myshopify.com", token: "t", fetch: f, timeoutMs: 50 });
  const add = { handle: "mut-gung", variantId: "220g", quantity: 1 };
  const product = { data: { product: rawProduct } };

  it("rejects a product or cart read that never answers once the timeout passes", async () => {
    const adapter = adapterFor(hangAfter());
    await expect(adapter.getProduct("x")).rejects.toThrow();
    await expect(adapter.getCart("c")).rejects.toThrow();
  }, 2000);

  it("rejects addLine to a new cart when cartCreate never answers", async () => {
    const f = hangAfter(product);
    await expect(adapterFor(f).addLine(undefined, add)).rejects.toThrow();
    expect(f).toHaveBeenCalledTimes(2);
  }, 2000);

  it("rejects addLine to an existing cart when cartLinesAdd never answers", async () => {
    const f = hangAfter(product);
    await expect(adapterFor(f).addLine("c", add)).rejects.toThrow();
    expect(f).toHaveBeenCalledTimes(2);
  }, 2000);

  it("rejects addLine when the variant lookup never answers", async () => {
    await expect(adapterFor(hangAfter()).addLine("c", add)).rejects.toThrow();
  }, 2000);

  it("rejects updateLine and removeLine that never answer", async () => {
    await expect(adapterFor(hangAfter()).updateLine("c", "l", 2)).rejects.toThrow();
    await expect(adapterFor(hangAfter()).removeLine("c", "l")).rejects.toThrow();
  }, 2000);
});
