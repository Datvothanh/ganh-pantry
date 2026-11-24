#!/usr/bin/env node
// Builds and serves the site against the local fake Storefront (scripts/fake-storefront.mjs)
// to prove that a Shopify-connected build prerenders under Cache Components and that the
// PDP shows live prices and availability. Builds against a Storefront that answers 500 or never
// answers must still succeed and fall back to the catalogue prices.
//
// The build runs in a temporary copy of the project (node_modules linked), so the main
// `.next` is never touched. Everything is cleaned up at the end.

import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PRICE_BUMP, SOLD_OUT, startFakeStorefront } from "./fake-storefront.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 3460;
const SKIP = new Set(["node_modules", ".next", ".git", "test-results", "playwright-report", ".pi"]);

const log = (msg) => console.log(`[check:shopify] ${msg}`);

function copyProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ganh-shopify-"));
  for (const entry of fs.readdirSync(root)) {
    if (SKIP.has(entry) || (entry.startsWith(".env") && entry !== ".env.example")) continue;
    fs.cpSync(path.join(root, entry), path.join(dir, entry), { recursive: true });
  }
  fs.symlinkSync(path.join(root, "node_modules"), path.join(dir, "node_modules"), "junction");
  return dir;
}

function removeProject(dir) {
  try {
    // Unlink the node_modules link first so the removal never follows it.
    fs.unlinkSync(path.join(dir, "node_modules"));
  } catch {}
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
}

function killTree(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
  else child.kill("SIGTERM");
}

function run(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", ...opts });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${args.join(" ")} exited ${code}`))));
  });
}

async function waitFor(url, child, timeoutMs = 120_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (child.exitCode !== null) throw new Error(`next start exited ${child.exitCode}`);
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${url} did not come up`);
}

const usd = (n) => `$${n.toFixed(2)}`;

async function assertPdp(base) {
  const { products } = await import(new URL("../src/content/products.ts", import.meta.url).href);
  const gung = products.find((p) => p.handle === SOLD_OUT[0]);
  const available = gung.variants.find((v) => v.id !== SOLD_OUT[1]);
  const res = await fetch(`${base}/products/${gung.handle}`);
  if (!res.ok) throw new Error(`PDP responded ${res.status}`);
  const html = await res.text();

  // The sold-out first weight is skipped: the buy block shows the next weight at the fake price.
  const price = new RegExp(`data-buy-price="" data-variant="${available.id}">\\${usd(available.price + PRICE_BUMP)}<`);
  if (!price.test(html)) {
    const got = /data-buy-price="[^>]*>[^<]*/.exec(html)?.[0];
    throw new Error(`PDP does not show ${available.id} at ${usd(available.price + PRICE_BUMP)} (got ${got ?? "nothing"})`);
  }
  const soldOutPill = new RegExp(`<button[^>]*data-weight="${SOLD_OUT[1]}"[^>]*>`).exec(html)?.[0] ?? "";
  if (!/\sdisabled=""/.test(soldOutPill)) throw new Error(`sold-out weight ${SOLD_OUT[1]} is not disabled`);
  if (html.includes(`data-buy-price="" data-variant="${available.id}">${usd(available.price)}<`)) {
    throw new Error("PDP shows the catalogue price instead of the Storefront price");
  }
  log(`PDP shows ${available.id} at ${usd(available.price + PRICE_BUMP)}; ${SOLD_OUT[1]} sold out`);
}

async function assertCatalogueFallback(base) {
  const { products } = await import(new URL("../src/content/products.ts", import.meta.url).href);
  const quat = products.find((p) => p.handle === "mut-quat");
  const first = quat.variants[0];
  const res = await fetch(`${base}/products/${quat.handle}`);
  if (!res.ok) throw new Error(`PDP responded ${res.status} with a failing Storefront`);
  const html = await res.text();
  // formatMoney drops ".00" from whole amounts.
  const price = new RegExp(`data-buy-price="" data-variant="${first.id}">\\$${first.price}(\\.00)?<`);
  if (!price.test(html)) {
    throw new Error("PDP does not fall back to the catalogue price when the Storefront fails");
  }
  log(`failing Storefront: build ok, PDP falls back to ${first.id} at ${usd(first.price)}`);
}

/** A Storefront outage: every request gets HTTP 500, or (`hang`) is accepted and never answered. */
function startBrokenStorefront({ hang = false } = {}) {
  return new Promise((resolve) => {
    const server = createServer((_req, res) => {
      if (hang) return;
      res.writeHead(500, { "content-type": "application/json" });
      res.end('{"errors":[{"message":"outage"}]}');
    });
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise((r) => {
            server.close(r);
            server.closeAllConnections();
          }),
      });
    });
  });
}

const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

/** Builds a fresh copy against `storefront`, serves it, runs `assert(base)`, cleans up. */
async function buildAndAssert(storefront, assert) {
  const dir = copyProject();
  log(`building a copy in ${dir} against ${storefront.url}`);
  const env = {
    ...process.env,
    SHOPIFY_STORE_DOMAIN: storefront.url,
    SHOPIFY_STOREFRONT_TOKEN: "fake-token",
    GANH_COMMERCE: "",
    NEXT_TELEMETRY_DISABLED: "1",
  };
  let server;
  try {
    await run(process.execPath, [nextBin, "build", "--webpack"], { cwd: dir, env });
    server = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], { cwd: dir, env, stdio: "inherit" });
    const base = `http://127.0.0.1:${PORT}`;
    await waitFor(base, server);
    await assert(base);
  } finally {
    killTree(server);
    await storefront.close();
    try {
      removeProject(dir);
    } catch (err) {
      console.warn(`[check:shopify] could not remove ${dir}: ${err}`);
    }
  }
}

let failed = false;
try {
  await buildAndAssert(await startFakeStorefront(), assertPdp);
  await buildAndAssert(await startBrokenStorefront(), assertCatalogueFallback);
  await buildAndAssert(await startBrokenStorefront({ hang: true }), assertCatalogueFallback);
  log("ok");
} catch (err) {
  failed = true;
  console.error(`[check:shopify] FAILED: ${err instanceof Error ? err.message : err}`);
}
process.exit(failed ? 1 : 0);
