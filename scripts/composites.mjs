// Renders public/products/<handle>.webp: the jar photo with its label at the front,
// drawn by the dev route /dev/composite.html (src/lib/jar-label) and screenshotted
// on a transparent background at 2x. Usage: npm run composites [handle ...]
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.COMPOSITES_PORT || 3107);
const BASE = `http://localhost:${PORT}`;
const out = path.join(root, "public/products");

const all = fs
  .readdirSync(path.join(root, "public/jars"))
  .filter((f) => f.endsWith(".webp"))
  .map((f) => f.replace(/\.webp$/, ""))
  .sort();
const handles = process.argv.slice(2).length ? process.argv.slice(2) : all;

async function waitForServer(server) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error("next dev exited early");
    try {
      const res = await fetch(`${BASE}/dev/composite.html`);
      if (res.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("next dev did not start in time");
}

async function launch() {
  const args = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];
  try {
    return await chromium.launch({ channel: "msedge", args });
  } catch {
    return await chromium.launch({ args });
  }
}

fs.mkdirSync(out, { recursive: true });
const server = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "dev", "--webpack", "-p", String(PORT)], {
  cwd: root,
  env: { ...process.env, GANH_DEV_ROUTES: "1" },
  stdio: "ignore",
});
let browser;
try {
  await waitForServer(server);
  browser = await launch();
  const context = await browser.newContext({ viewport: { width: 700, height: 1100 }, deviceScaleFactor: 2 });
  for (const handle of handles) {
    const page = await context.newPage();
    await page.goto(`${BASE}/dev/composite.html?handle=${handle}`);
    await page.waitForSelector('#composite[data-state="ready"], #composite[data-state="error"]', { timeout: 120_000 });
    if ((await page.getAttribute("#composite", "data-state")) !== "ready") throw new Error(`Composite failed for ${handle}`);
    const png = await page.locator("#composite").screenshot({ omitBackground: true });
    await sharp(png).webp({ quality: 92, alphaQuality: 100 }).toFile(path.join(out, `${handle}.webp`));
    await page.close();
    console.log(`composite ${handle}`);
  }
} finally {
  await browser?.close();
  if (process.platform === "win32") spawn("taskkill", ["/pid", String(server.pid), "/t", "/f"], { stdio: "ignore" });
  else server.kill();
}
