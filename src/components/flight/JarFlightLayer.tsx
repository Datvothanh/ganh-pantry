"use client";

import { useEffect, useRef } from "react";
import { setFlightLayer } from "./flight";
import styles from "./JarFlight.module.css";

/** Fixed overlay for the jar flight; lives in the locale layout so it survives navigation. */
export function JarFlightLayer() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setFlightLayer(ref.current, { clone: styles.clone, img: styles.img, label: styles.label });
    return () => setFlightLayer(null);
  }, []);
  return <div ref={ref} className={styles.layer} aria-hidden="true" data-jar-flight-layer="" />;
}
