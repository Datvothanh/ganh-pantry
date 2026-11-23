#!/usr/bin/env node
// Tiny local stand-in for the Shopify Storefront GraphQL API, for build checks only.
//   node scripts/fake-storefront.mjs [port]
// Answers the product and cart operations used by src/lib/commerce/shopify.ts.
// Prices are the catalogue price + PRICE_BUMP (so a page showing them proves it read the
// "live" data) and SOLD_OUT is unavailable. Carts live in memory.

import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const PRICE_BUMP = 4.5;
/** [handle, variant id] that is sold out. The first weight, so pages must skip it. */
export const SOLD_OUT = ["mut-gung", "220g"];

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadCatalogue() {
  // Node strips the TypeScript types; products.ts has no imports.
  const mod = await import(pathToFileURL(path.join(root, "src/content/products.ts")).href);
  return mod.products;
}

const money = (n) => ({ amount: n.toFixed(2), currencyCode: "USD" });

export async function startFakeStorefront({ port = 0, host = "127.0.0.1" } = {}) {
  const products = await loadCatalogue();
  const variants = new Map(); // gid -> { product, variant, price, available }
  const rawProducts = new Map();
  let n = 0;
  for (const p of products) {
    const edges = p.variants.map((v) => {
      const gid = `gid://shopify/ProductVariant/${++n}`;
      const price = v.price + PRICE_BUMP;
      const available = !(p.handle === SOLD_OUT[0] && v.id === SOLD_OUT[1]);
      variants.set(gid, { p, v, price, available });
      return {
        node: {
          id: gid,
          title: v.id,
          availableForSale: available,
          selectedOptions: [{ name: "Weight", value: v.id }],
          price: money(price),
        },
      };
    });
    rawProducts.set(p.handle, { handle: p.handle, title: p.nameVi, variants: { edges } });
  }

  const carts = new Map(); // id -> [{ id, gid, quantity }]
  let cartSeq = 0;
  let lineSeq = 0;
  const base = () => `http://${host}:${server.address().port}`;

  function rawCart(id) {
    const lines = carts.get(id);
    if (!lines) return null;
    let subtotal = 0;
    const edges = lines.map((l) => {
      const { p, v, price } = variants.get(l.gid);
      subtotal += price * l.quantity;
      return {
        node: {
          id: l.id,
          quantity: l.quantity,
          cost: { totalAmount: money(price * l.quantity) },
          merchandise: {
            id: l.gid,
            selectedOptions: [{ name: "Weight", value: v.id }],
            price: money(price),
            product: { handle: p.handle, title: p.nameVi },
          },
        },
      };
    });
    return {
      id,
      checkoutUrl: `${base()}/checkout/${encodeURIComponent(id)}`,
      totalQuantity: lines.reduce((s, l) => s + l.quantity, 0),
      cost: { subtotalAmount: money(subtotal) },
      lines: { edges },
    };
  }

  const gone = { cart: null, userErrors: [{ field: ["cartId"], message: "The specified cart does not exist." }] };

  function addLines(lines, input) {
    for (const { merchandiseId, quantity } of input) {
      const info = variants.get(merchandiseId);
      if (!info) return { message: `Unknown merchandise ${merchandiseId}` };
      if (!info.available) return { message: `${info.p.handle}/${info.v.id} is sold out` };
      const line = lines.find((l) => l.gid === merchandiseId);
      if (line) line.quantity = Math.min(99, line.quantity + quantity);
      else lines.push({ id: `gid://shopify/CartLine/${++lineSeq}`, gid: merchandiseId, quantity });
    }
    return null;
  }

  function answer(query, vars) {
    const op = /\b(?:query|mutation)\s+(\w+)/.exec(query)?.[1];
    switch (op) {
      case "ProductByHandle":
        return { product: rawProducts.get(vars.handle) ?? null };
      case "GetCart":
        return { cart: rawCart(vars.cartId) };
      case "CartCreate": {
        const id = `gid://shopify/Cart/fake-${++cartSeq}`;
        const lines = [];
        const err = addLines(lines, vars.lines ?? []);
        if (err) return { cartCreate: { cart: null, userErrors: [err] } };
        carts.set(id, lines);
        return { cartCreate: { cart: rawCart(id), userErrors: [] } };
      }
      case "CartLinesAdd": {
        const lines = carts.get(vars.cartId);
        if (!lines) return { cartLinesAdd: gone };
        const err = addLines(lines, vars.lines);
        return { cartLinesAdd: { cart: rawCart(vars.cartId), userErrors: err ? [err] : [] } };
      }
      case "CartLinesUpdate": {
        const lines = carts.get(vars.cartId);
        if (!lines) return { cartLinesUpdate: gone };
        for (const { id, quantity } of vars.lines) {
          const i = lines.findIndex((l) => l.id === id);
          if (i < 0) continue;
          if (quantity <= 0) lines.splice(i, 1);
          else lines[i].quantity = quantity;
        }
        return { cartLinesUpdate: { cart: rawCart(vars.cartId), userErrors: [] } };
      }
      case "CartLinesRemove": {
        const lines = carts.get(vars.cartId);
        if (!lines) return { cartLinesRemove: gone };
        carts.set(
          vars.cartId,
          lines.filter((l) => !vars.lineIds.includes(l.id)),
        );
        return { cartLinesRemove: { cart: rawCart(vars.cartId), userErrors: [] } };
      }
      default:
        return null;
    }
  }

  const server = createServer((req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (req.method !== "POST" || !/^\/api\/[^/]+\/graphql\.json$/.test(req.url ?? "")) {
      return send(404, { errors: [{ message: "Not found" }] });
    }
    if (!req.headers["x-shopify-storefront-access-token"]) {
      return send(401, { errors: [{ message: "Missing access token" }] });
    }
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const { query, variables } = JSON.parse(body);
        const data = answer(query, variables ?? {});
        if (!data) return send(200, { errors: [{ message: "Unsupported operation" }] });
        send(200, { data });
      } catch (err) {
        send(400, { errors: [{ message: String(err) }] });
      }
    });
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  return {
    url: base(),
    close: () =>
      new Promise((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const fake = await startFakeStorefront({ port: Number(process.argv[2]) || 4010 });
  console.log(`fake storefront on ${fake.url}`);
}
