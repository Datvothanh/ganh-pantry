import { cacheLife, cacheTag } from "next/cache";
import { commerce } from "./index";
import type { CommerceProduct } from "./types";

/**
 * Product price and availability for rendering. Cached (`use cache`, `minutes` profile) so
 * pages prerender under Cache Components and refresh in the background; tag `product:<handle>`
 * for on-demand revalidation. Cart reads and mutations stay uncached in `./actions`.
 *
 * A failed read falls back to null (catalogue data) inside the cache: a build never fails on a
 * Storefront outage, and the fallback is replaced at the next revalidation.
 */
export async function getLiveProduct(handle: string): Promise<CommerceProduct | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`product:${handle}`);
  try {
    return await commerce.getProduct(handle);
  } catch (err) {
    console.error("[commerce]", err);
    return null;
  }
}
