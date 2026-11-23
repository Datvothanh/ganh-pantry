import { readdirSync } from "node:fs";
import path from "node:path";

const IMAGE = /\.(webp|avif|jpe?g|png)$/i;

/**
 * Public URLs of the lifestyle photos in `public/photos/<handle>/`, sorted by file name.
 * Read on the server at build time (pages are prerendered); empty when the folder is missing.
 */
export function productPhotos(handle: string): string[] {
  if (!/^[a-z0-9-]+$/.test(handle)) return [];
  try {
    return readdirSync(path.join(process.cwd(), "public", "photos", handle))
      .filter((f) => IMAGE.test(f))
      .sort()
      .map((f) => `/photos/${handle}/${encodeURIComponent(f)}`);
  } catch {
    return [];
  }
}
