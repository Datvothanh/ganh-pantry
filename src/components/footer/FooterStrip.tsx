import Link from "next/link";
import { getDict } from "@/content/dict";
import { site } from "@/content/site";
import { href, locales, type Locale } from "@/lib/i18n";
import styles from "./Footer.module.css";

/** One-line footer pinned inside the home screen: credit, Pantry and the other language. */
export function FooterStrip({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const other = locales.find((l) => l !== locale) ?? locale;

  return (
    <footer className={styles.strip} data-site-footer data-footer-strip>
      <p className={styles.stripCredit}>{site.credit[locale]}</p>
      <nav className={styles.stripNav} aria-label={t.footer.explore}>
        <Link href={href(locale, "/pantry")}>{t.nav.pantry}</Link>
        <Link href={href(other, "/")} hrefLang={other} lang={other}>
          {t.lang[other]}
        </Link>
      </nav>
    </footer>
  );
}
