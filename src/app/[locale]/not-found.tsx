"use client";

import Link from "next/link";
import { useLocale } from "@/components/shell/LocaleProvider";
import { getDict } from "@/content/dict";
import { href } from "@/lib/i18n";
import styles from "../_placeholder/Placeholder.module.css";

export default function NotFound() {
  const locale = useLocale();
  const t = getDict(locale).notFound;
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>404</h1>
      <p className={styles.sub}>{t.title}</p>
      <p>{t.body}</p>
      <p>
        <Link href={href(locale, "/")}>{t.back} →</Link>
      </p>
    </main>
  );
}
