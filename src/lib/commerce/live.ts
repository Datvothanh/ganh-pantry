import { cacheLife, cacheTag } from "next/cache";
import { commerce } from "./index";
import type { CommerceProduct } from "./types";

/**
 * The read behind the cache, with the phase passed in so tests can reach both branches.
 * At build time a failed read is swallowed (null, cached) so a Storefront outage never fails the
 * build; the next revalidation replaces it. At runtime the error escapes, so a failed
 * revalidation never overwrites the last good entry. Logs once per failed read, here.
 */
export async function readProductUncached(
  handle: string,
  phase: string | undefined,
): Promise<CommerceProduct | null> {
  try {
    return await commerce.getProduct(handle);
  } catch (err) {
    console.error("[commerce]", err);
    if (phase === "phase-production-build") return null;
    throw err;
  }
}

async function readProduct(handle: string): Promise<CommerceProduct | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`product:${handle}`);
  return readProductUncached(handle, process.env.NEXT_PHASE);
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
  } catch {
    // Already logged by readProductUncached.
    return null;
  }
}
