import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PantryPage } from "@/components/pantry/PantryPage";
import { getDict } from "@/content/dict";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDict(locale).nav.pantry } : {};
}

export default async function Pantry({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <PantryPage locale={locale} />;
}
