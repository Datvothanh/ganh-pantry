import Link from "next/link";
import { Mark } from "@/components/brand/Mark";
import { getDict } from "@/content/dict";
import { categories } from "@/content/products";
import { site } from "@/content/site";
import { href, type Locale } from "@/lib/i18n";
import styles from "./Footer.module.css";

export function Footer({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const f = t.footer;

  return (
    <footer className={styles.footer} data-site-footer data-header-dark>
      <div className={styles.wordmark} aria-hidden="true">
        <span className={styles.word}>GÁNH</span>
        <span className={styles.tag}>{site.tagline[locale]}</span>
      </div>

      <div className={styles.grid}>
        <div className={styles.brand}>
          <Mark className={styles.mark} />
          <p>
            <span className={styles.accent}>{f.copyright}</span>
            <br />
            {site.tagline[locale]}
          </p>
        </div>

        <nav className={styles.nav} aria-label={f.explore}>
          <ul>
            <li>
              <Link href={href(locale, "/")}>{t.nav.home}</Link>
            </li>
            <li>
              <Link href={href(locale, "/pantry")}>{t.nav.pantry}</Link>
            </li>
          </ul>
          <ul>
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={href(locale, `/pantry#${c.id}`)}>{c.name[locale]}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.col}>
          <p className={styles.label}>{f.studio}</p>
          <address className={styles.address}>
            {f.address.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </address>
          <p className={styles.note}>{f.note}</p>
        </div>

        <div className={styles.col}>
          <p className={styles.label}>{f.follow}</p>
          <p>
            <span className={styles.social}>{f.social}</span>
          </p>
          <p className={styles.contact}>{f.contact}</p>
          <p>
            <a className={styles.email} href={`mailto:${f.email}`}>
              {f.email}
            </a>
          </p>
        </div>
      </div>

      <div className={styles.bottom}>
        <p className={styles.credit}>{site.credit[locale]}</p>
      </div>
    </footer>
  );
}
