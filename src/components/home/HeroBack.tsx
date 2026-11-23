import styles from "./JarSlider.module.css";

/** Wide soft lacquer hill behind the jars. */
export function BackShape() {
  return (
    <svg className={styles.shape} viewBox="0 0 1400 600" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <path
        fill="currentColor"
        d="M0 600C8 492 58 400 150 336 250 266 372 238 470 176 560 118 610 52 700 52S840 118 930 176C1028 238 1150 266 1250 336 1342 400 1392 492 1400 600Z"
      />
    </svg>
  );
}

const R = 430;
const CIRC = 2 * Math.PI * R;

/** Circular text badge on a textPath; rotation follows the marquee via `--jar-circle-rotation`. */
export function Badge({ text }: { text: string }) {
  // Size the glyphs so the phrase wraps the circle exactly once.
  const fontSize = Math.min(118, CIRC / (text.length * 0.64));
  return (
    <div className={styles.badge} aria-hidden="true">
      <svg viewBox="0 0 1000 1000" className={styles.badgeSvg}>
        <defs>
          <path id="jar-badge-circle" d={`M500 ${500 - R}a${R} ${R} 0 1 1 -0.01 0Z`} />
        </defs>
        <text className={styles.badgeText} fontSize={fontSize} textLength={CIRC - 4} lengthAdjust="spacing">
          <textPath href="#jar-badge-circle">{text}</textPath>
        </text>
      </svg>
    </div>
  );
}
