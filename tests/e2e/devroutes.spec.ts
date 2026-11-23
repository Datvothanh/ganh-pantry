import { spawn } from "node:child_process";
import net from "node:net";
import { expect, test } from "@playwright/test";

// The webServer runs with GANH_DEV_ROUTES=1 (see playwright.config.ts), so the dev routes are
// served here. The env is read per request: a server without it must 404 both routes.
const ROUTES = ["/dev/cart/harness.html", "/dev/composite.html"];
// Markers of the dev pages' content; none may appear in a 404 response.
const MARKERS = ["Cart dev", "Cart (dev)", "AddToCart", "mut-gung", "<canvas", "harness.html/page-", "composite.html/page-"];

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address() as net.AddressInfo;
      srv.close(() => resolve(port));
    });
  });
}

for (const route of ROUTES) {
  test(`${route} is served when GANH_DEV_ROUTES=1`, async ({ request }) => {
    const res = await request.get(route);
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain(route.includes("cart") ? "Cart dev" : 'id="composite"');
  });
}

test("next start without GANH_DEV_ROUTES returns 404 for the dev routes", async () => {
  test.setTimeout(120_000);
  const port = await freePort();
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.GANH_DEV_ROUTES;
  const server = spawn(`npx next start -p ${port}`, { env, shell: true, stdio: "ignore" });
  let exited = false;
  server.once("exit", () => {
    exited = true;
  });
  try {
    const base = `http://127.0.0.1:${port}`;
    const deadline = Date.now() + 90_000;
    for (;;) {
      if (exited) throw new Error("next start exited early");
      try {
        await fetch(base);
        break;
      } catch {
        if (Date.now() > deadline) throw new Error("server did not start");
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    for (const route of ROUTES) {
      const res = await fetch(base + route);
      expect(res.status, route).toBe(404);
      const html = await res.text();
      for (const marker of MARKERS) expect(html, `${route} leaks ${marker}`).not.toContain(marker);
    }
  } finally {
    if (!exited) {
      const gone = new Promise((r) => server.once("exit", r));
      if (process.platform === "win32" && server.pid) {
        await new Promise((r) => spawn("taskkill", ["/pid", String(server.pid), "/t", "/f"], { stdio: "ignore" }).once("exit", r));
      } else {
        server.kill();
      }
      await gone;
    }
  }
});
