import type { FullConfig } from "@playwright/test";

/**
 * e2e must never run against a real store. The served pages are prerendered at build time, so
 * the server env alone is not enough: the build itself has to use the mock (`npm run build:mock`).
 * Every page carries the adapter kind it was rendered with.
 */
export default async function globalSetup(config: FullConfig) {
  const base = config.projects[0].use.baseURL;
  const html = await (await fetch(`${base}/`)).text();
  const kind = /<meta name="ganh-commerce" content="([a-z]+)"/.exec(html)?.[1];
  if (kind !== "mock") {
    throw new Error(
      `e2e needs a mock build, but / was rendered with commerce "${kind ?? "unknown"}". Run \`npm run build:mock\` first.`,
    );
  }
}
