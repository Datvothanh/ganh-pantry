import { href, locales, type Locale } from "@/lib/i18n";
import styles from "./LangPills.module.css";

/** EN / VI pills; the current locale is filled. Plain anchors: switching locale swaps the root layout. */
export function LangPills({
  locale,
  path,
  label,
  tone = "light",
}: {
  locale: Locale;
  path: string;
  label: string;
  tone?: "light" | "dark";
}) {
  return (
    <nav className={styles.pills} aria-label={label} data-tone={tone}>
      {locales.map((l) => (
        <a
          key={l}
          href={href(l, path)}
          hrefLang={l}
          lang={l}
          className={styles.pill}
          data-lang-pill={l}
          aria-current={l === locale ? "true" : undefined}
        >
          {l.toUpperCase()}
        </a>
      ))}
    </nav>
  );
}
