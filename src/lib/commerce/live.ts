import { cacheLife, cacheTag } from "next/cache";
import { commerce } from "./index";
import type { CommerceProduct } from "./types";

async function readProduct(handle: string): Promise<CommerceProduct | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`product:${handle}`);
  try {
    return await commerce.getProduct(handle);
  } catch (err) {
    // At build time the fallback is cached so a Storefront outage never fails the build; the
    // next revalidation replaces it. At runtime the error escapes, so a failed revalidation
    // never overwrites the last good entry.
    if (process.env.NEXT_PHASE === "phase-production-build") {
      console.error("[commerce]", err);
      return null;
    }
    throw err;
  }
}

/**
 * Product price and availability for rendering. Cached (`use cache`, `minutes` profile) so
 * pages prerender under Cache Components and refresh in the background; tag `product:<handle>`
 * for on-demand revalidation. Cart reads and mutations stay uncached in `./actions`.
 * Falls back to null (catalogue data) when the Storefront read fails or times out.
 */
export async function getLiveProduct(handle: string): Promise<CommerceProduct | null> {
  try {
    return await readProduct(handle);
  } catch (err) {
    console.error("[commerce]", err);
    return null;
  }
}
