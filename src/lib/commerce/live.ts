import { cacheLife, cacheTag } from "next/cache";
import { commerce } from "./index";
import type { CommerceProduct } from "./types";

/**
 * Product price and availability for rendering. Cached (`use cache`, `minutes` profile) so
 * pages prerender under Cache Components and refresh in the background; tag `product:<handle>`
 * for on-demand revalidation. Cart reads and mutations stay uncached in `./actions`.
 */
export async function fetchLiveProduct(handle: string): Promise<CommerceProduct | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`product:${handle}`);
  // Errors escape on purpose: a thrown cached function is not cached, so a failed read is not
  // baked into the prerender or served for the cache lifetime.
  return commerce.getProduct(handle);
}

/** `fetchLiveProduct`, falling back to null (catalogue data) when the read fails. */
export async function getLiveProduct(handle: string): Promise<CommerceProduct | null> {
  try {
    return await fetchLiveProduct(handle);
  } catch (err) {
    console.error("[commerce]", err);
    return null;
  }
}
