#!/usr/bin/env node
// Runs a command with GANH_COMMERCE=mock, so the build uses the mock catalogue and cart even
// when .env.local holds Shopify credentials. usage: node scripts/mock-env.mjs <cmd> [args...]
import { spawnSync } from "node:child_process";

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error("usage: node scripts/mock-env.mjs <cmd> [args...]");
  process.exit(2);
}
const res = spawnSync(cmd, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, GANH_COMMERCE: "mock" },
});
if (res.error) {
  console.error(res.error.message);
  process.exit(1);
}
process.exit(res.status ?? 1);
