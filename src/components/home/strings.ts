import type { Locale } from "@/content/products";

/** Home hero copy (both locales). */
export const homeStrings: Record<Locale, { headline: string; prompt: string; jarAlt: (name: string) => string }> = {
  en: {
    headline: "GÁNH — small-batch Vietnamese preserves, sauces, pickles and honey",
    prompt: "Scroll or drag to explore",
    jarAlt: (name) => `${name} — discover the product`,
  },
  vi: {
    headline: "GÁNH — mứt, tương, đồ muối và mật ong Việt làm từng mẻ nhỏ",
    prompt: "Cuộn hoặc kéo để khám phá",
    jarAlt: (name) => `${name} — khám phá sản phẩm`,
  },
};
