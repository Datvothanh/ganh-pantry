/**
 * Label cylinder in jar-image space (fractions of `public/jars/*.webp`, 630x1013).
 * Tuned so the label sits on the glass body below the shoulder and its edges follow
 * the glass curvature seen from slightly above.
 */
export const JAR_IMAGE = { width: 630, height: 1013 } as const;

export const LABEL_GEOMETRY = {
  /** Top and bottom of the label as fractions of the image height. */
  top: 0.27,
  bottom: 0.87,
  /** Cylinder diameter as a fraction of the image width. */
  width: 0.874,
  /** Horizontal centre of the glass body as a fraction of the image width. */
  centerX: 0.5016,
  /** Tilt toward the camera (deg); makes the label edges smile like the glass rim. */
  tilt: 3,
  /** Unprinted seam gap as a fraction of the circumference. */
  gap: 0.09,
  radialSegments: 128,
  heightSegments: 16,
} as const;

export const LABEL_LIGHT = {
  ambient: 0.89,
  spot: 0.58 * 5,
  spotX: -1,
  roughness: 0.72,
} as const;

/**
 * Texture U offset that centres the label front (u = 0.5 of the texture) toward the camera.
 * The lathe seam (geometry u = 0) faces the camera, so shift by half the printed width.
 */
export const FRONT_OFFSET = 0.5 * (1 - LABEL_GEOMETRY.gap);

/** Supersampling of the label canvas relative to its CSS size (the jar is scaled up to 1.35x). */
export const LABEL_SUPERSAMPLE = 1.35;
