import { getDict } from "@/content/dict";
import { site } from "@/content/site";
import { isLocale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import styles from "../_placeholder/Placeholder.module.css";

// Placeholder: the hero lane replaces this page with the jar slider.
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{site.name}</h1>
      <p className={styles.sub}>{getDict(locale).placeholder.home}</p>
    </main>
  );
}
