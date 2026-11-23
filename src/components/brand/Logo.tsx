import { site } from "@/content/site";
import type { Locale } from "@/lib/i18n";
import { Mark } from "./Mark";
import styles from "./Logo.module.css";

/** Mark above the GÁNH wordmark and the italic tagline in the page locale. */
export function Logo({ locale, className, compact = false }: { locale: Locale; className?: string; compact?: boolean }) {
  return (
    <span className={`${styles.logo} ${className ?? ""}`} data-compact={compact ? "1" : undefined}>
      <Mark className={styles.mark} />
      <span className={styles.word}>GÁNH</span>
      {!compact && <span className={styles.tag}>{site.tagline[locale]}</span>}
    </span>
  );
}
