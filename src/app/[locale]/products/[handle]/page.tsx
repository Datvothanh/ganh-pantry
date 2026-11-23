import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { productByHandle, products } from "@/content/products";
import { isLocale, locales } from "@/lib/i18n";
import styles from "../../../_placeholder/Placeholder.module.css";

type Props = { params: Promise<{ locale: string; handle: string }> };

export function generateStaticParams() {
  return locales.flatMap((locale) => products.map((p) => ({ locale, handle: p.handle })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, handle } = await params;
  const product = productByHandle(handle);
  if (!product || !isLocale(locale)) return {};
  return { title: product.nameVi, description: product.subtitle[locale] };
}

// Placeholder: the pdp lane fills this page.
export default async function ProductPage({ params }: Props) {
  const { locale, handle } = await params;
  const product = productByHandle(handle);
  if (!product || !isLocale(locale)) notFound();
  return (
    <main className={styles.page}>
      <h1 className={styles.title} lang="vi">
        {product.nameVi}
      </h1>
      <p className={styles.sub}>{locale === "en" ? product.nameEn : product.subtitle.vi}</p>
    </main>
  );
}
