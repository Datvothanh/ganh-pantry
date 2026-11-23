import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict } from "@/content/dict";
import { isLocale } from "@/lib/i18n";
import styles from "../../_placeholder/Placeholder.module.css";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDict(locale).nav.pantry } : {};
}

// Placeholder: the pantry lane fills this page.
export default async function PantryPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{getDict(locale).placeholder.pantry}</h1>
    </main>
  );
}
