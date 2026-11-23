import type { Locale } from "@/content/products";

export type { Locale };

export const locales = ["en", "vi"] as const satisfies readonly Locale[];
export const defaultLocale: Locale = "en";

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (locales as readonly string[]).includes(value);

/** Remove a leading locale segment: "/vi/pantry" → "/pantry", "/en" → "/". */
export function stripLocale(pathname: string): string {
  const parts = pathname.split("/");
  if (isLocale(parts[1])) parts.splice(1, 1);
  const out = parts.join("/");
  return out === "" ? "/" : out;
}

/** Public URL for a path in a locale. The default locale has no prefix. */
export function href(locale: Locale, path: string = "/"): string {
  let p = path.startsWith("/") ? path : `/${path}`;
  p = stripLocale(p);
  if (locale === defaultLocale) return p;
  return p === "/" ? `/${locale}` : `/${locale}${p}`;
}
