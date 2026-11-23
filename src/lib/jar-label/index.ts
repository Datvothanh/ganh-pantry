export { FRONT_OFFSET, JAR_IMAGE, LABEL_GEOMETRY, LABEL_LIGHT, LABEL_SUPERSAMPLE } from "./geometry";
export { getJarLabelRenderer, type JarLabelRenderer, type LabelMaterial } from "./renderer";

/**
 * Device-pixel size for label canvases of `cssW`x`cssH`, supersampled but capped so
 * `count` canvases together stay under ~12 MP.
 */
export function labelPixelRatio(cssW: number, cssH: number, supersample: number, count = 1): number {
  const dpr = typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 3);
  const area = cssW * supersample * cssH * supersample * count;
  return area ? Math.max(1, Math.min(dpr, Math.sqrt(12e6 / area))) * supersample : dpr * supersample;
}
