import { Mark } from "./Mark";
import styles from "./Logo.module.css";

/** Mark above the GÁNH wordmark and the italic "Vietnamese Pantry" line. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={`${styles.logo} ${className ?? ""}`} data-compact={compact ? "1" : undefined}>
      <Mark className={styles.mark} />
      <span className={styles.word}>GÁNH</span>
      {!compact && <span className={styles.tag}>Vietnamese Pantry</span>}
    </span>
  );
}
