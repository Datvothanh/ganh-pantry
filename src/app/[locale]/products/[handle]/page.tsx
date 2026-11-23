import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductPage } from "@/components/product/ProductPage";
import { productByHandle, products } from "@/content/products";
import { isLocale, locales } from "@/lib/i18n";

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

export default async function ProductRoute({ params }: Props) {
  const { locale, handle } = await params;
  const product = productByHandle(handle);
  if (!product || !isLocale(locale)) notFound();
  return <ProductPage product={product} locale={locale} />;
}
