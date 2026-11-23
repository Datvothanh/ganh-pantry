import { JarSlider, type JarSliderItem } from "@/components/home/JarSlider";
import { homeStrings } from "@/components/home/strings";
import { getDict } from "@/content/dict";
import { products } from "@/content/products";
import { site } from "@/content/site";
import { href, isLocale } from "@/lib/i18n";
import { repeatItems } from "@/lib/jar-slider";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

/** Minimum jars on the marquee so it always wraps past the screen edges. */
const MIN_ITEMS = 8;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = homeStrings[locale];
  const items: JarSliderItem[] = repeatItems(products, MIN_ITEMS).map((p, i) => ({
    key: `${p.handle}-${i}`,
    handle: p.handle,
    href: href(locale, `/products/${p.handle}`),
    jar: p.jar,
    label: p.label,
    alt: t.jarAlt(`${p.nameVi} (${locale === "en" ? p.nameEn : p.subtitle.vi})`),
  }));
  return (
    <main className={styles.page}>
      <JarSlider
        items={items}
        headline={t.headline}
        prompt={t.prompt}
        badge={site.badge[locale]}
        discover={getDict(locale).cursor.discover}
      />
    </main>
  );
}
