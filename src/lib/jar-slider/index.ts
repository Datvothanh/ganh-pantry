/**
 * Pure maths for the home jar slider: layout, marquee wrap, curved path, scale bulge,
 * depth filters, springs and input integration. No DOM access here so it stays unit-testable.
 * Numbers were tuned against the reference home slider (see docs/REFERENCE.md).
 */

/** Jar photo aspect (height / width) of `public/jars/*.webp`. */
export const JAR_ASPECT = 1013 / 630;

export const SLIDER = {
  /** Spacing between jars as a fraction of (viewport / per-screen). */
  spacingDesktop: 0.92,
  spacingTablet: 1.265,
  spacingPhone: 1.15,
  /** Item width as a fraction of (viewport / per-screen). */
  widthDesktop: 0.5358 * 1.15,
  widthTablet: 0.7875 * 1.15,
  widthPhone: 0.73 * 1.15,
  maxHeight: 0.72,
  /** Scale at the screen centre and at the edges. */
  scaleCentre: 1.35,
  scaleEdge: 0.55,
  /** Extra shrink for jars one spacing or more away from the centre. */
  distanceShrink: 0.1,
  brightEdge: 0.7,
  brightCentre: 1.1,
  blurMax: 4,
  blurMaxPhone: 2,
  /** Curved x path: strength and width of the tanh push away from the centre. */
  curveStrength: 0.55,
  curveWidth: 0.16,
  /** Per-index rotation amplitude (deg) and vertical jitter (fraction of item height). */
  rotateAmp: 18,
  jitter: [-0.053, 0.043, -0.024, 0.057, -0.048, 0.029, -0.038, 0.053],
  /** Marquee smoothing rates (1/s). */
  smoothIdle: 2.3,
  smoothDrag: 11,
  wheelFactor: 1.15,
  dragFactor: 1.5,
  dragThreshold: 6,
  flingMax: 3.5,
  flingMs: 190,
  /** Velocity (px/s) at which lean / squash / blur saturate. */
  velocityMax: 2400,
  velocityLean: 6,
  velocitySquash: 0.05,
  velocityBlur: 3.2,
  velocityBlurPhone: 1.6,
  velocityTurn: 38,
  /** Springs. */
  stiffness: 70,
  damping: 9,
  stiffnessSpread: 0.3,
  /** Pointer response. */
  pointerRadius: 1.6,
  pointerTurn: 30,
  pointerLean: 5,
  pointerLift: 0.05,
  pointerPull: 16,
  pointerFloor: 0.3,
  parallaxPull: 26,
  /** Badge rotation per px of marquee travel (deg). */
  badgeRate: -0.012,
  badgeRatePhone: -0.03,
  /** Intro. */
  introMs: 1150,
  introRise: 56,
  introScale: 0.9,
  /** Hover spin. */
  spinSeconds: 2,
  dwellMs: 260,
  /** Label turn quantum (fraction of a turn). */
  turnQuantum: 1 / 2000,
} as const;

export interface SliderLayout {
  vw: number;
  vh: number;
  count: number;
  perScreen: number;
  phone: boolean;
  spacing: number;
  itemW: number;
  itemH: number;
  span: number;
  /** Items wrap a little before they leave the screen on the left. */
  wrapMargin: number;
  /** Rotation period of the per-index tilt. */
  rotatePeriod: number;
  marqueeH: number;
}

export function computeLayout(vw: number, vh: number, count: number): SliderLayout {
  const phone = vw <= 480;
  const tablet = !phone && vw <= 1024;
  const perScreen = phone || tablet ? 3 : 4;
  const unit = vw / perScreen;
  const spacing = unit * (phone ? SLIDER.spacingPhone : tablet ? SLIDER.spacingTablet : SLIDER.spacingDesktop);
  let itemW = unit * (phone ? SLIDER.widthPhone : tablet ? SLIDER.widthTablet : SLIDER.widthDesktop);
  let itemH = itemW * JAR_ASPECT;
  const maxH = vh * SLIDER.maxHeight;
  if (itemH > maxH) {
    itemH = maxH;
    itemW = itemH / JAR_ASPECT;
  }
  return {
    vw,
    vh,
    count,
    perScreen,
    phone,
    spacing,
    itemW,
    itemH,
    span: count * spacing,
    wrapMargin: itemW * 2,
    rotatePeriod: spacing * 3,
    marqueeH: Math.min(itemH * SLIDER.scaleCentre, vh * 0.95),
  };
}

/** Repeat a list cyclically until it has at least `min` entries. */
export function repeatItems<T>(list: readonly T[], min: number): T[] {
  if (!list.length) return [];
  const n = Math.max(min, list.length);
  return Array.from({ length: n }, (_, i) => list[i % list.length]);
}

/** Centre x of item `index` along the track for marquee offset `offset`, wrapped endlessly. */
export function wrapX(index: number, offset: number, l: SliderLayout): number {
  let x = (index * l.spacing + l.itemW / 2 + offset + l.wrapMargin) % l.span;
  if (x < 0) x += l.span;
  return x - l.wrapMargin;
}

/** Bend the straight track: jars speed up through the centre and bunch toward the edges. */
export function curveX(x: number, vw: number): number {
  const q = x / vw;
  const w = SLIDER.curveWidth;
  return (q + SLIDER.curveStrength * w * Math.tanh((q - 0.5) / w)) * vw;
}

/** 1 at the screen centre, 0 at and beyond the edges. */
export function bulge(q: number): number {
  return q >= 0 && q <= 1 ? Math.sin(q * Math.PI) : 0;
}

/** Distance from the screen centre measured in item spacings. */
export function centreDistance(x: number, l: SliderLayout): number {
  return Math.abs(x - l.vw / 2) / l.spacing;
}

export function itemScale(x: number, l: SliderLayout): number {
  const b = bulge(x / l.vw);
  const shrink = 1 - SLIDER.distanceShrink * Math.min(1, centreDistance(x, l));
  return (SLIDER.scaleEdge + b * (SLIDER.scaleCentre - SLIDER.scaleEdge)) * shrink;
}

export function itemBrightness(x: number, vw: number): number {
  return SLIDER.brightEdge + bulge(x / vw) * (SLIDER.brightCentre - SLIDER.brightEdge);
}

export function itemBlur(x: number, l: SliderLayout, extra = 0): number {
  const d = centreDistance(x, l);
  return Math.min(l.phone ? SLIDER.blurMaxPhone : SLIDER.blurMax, d * d) + extra;
}

/** Per-index tilt in degrees; drifts as the marquee moves. */
export function itemRotation(index: number, offset: number, l: SliderLayout): number {
  return Math.sin(((index * l.spacing + offset) / l.rotatePeriod) * Math.PI * 2) * SLIDER.rotateAmp;
}

export function itemJitter(index: number, l: SliderLayout): number {
  return SLIDER.jitter[index % SLIDER.jitter.length] * l.itemH;
}

export interface Spring {
  value: number;
  velocity: number;
}

export const createSpring = (): Spring => ({ value: 0, velocity: 0 });

/** Semi-implicit Euler damped spring; snaps when settled. Mutates and returns `s`. */
export function stepSpring(s: Spring, target: number, stiffness: number, dt: number, damping: number = SLIDER.damping): Spring {
  s.velocity += ((target - s.value) * stiffness - s.velocity * damping) * dt;
  s.value += s.velocity * dt;
  if (Math.abs(s.velocity) < 0.001 && Math.abs(target - s.value) < 0.001) {
    s.value = target;
    s.velocity = 0;
  }
  return s;
}

/** Per-item stiffness, varied by the golden ratio so jars do not move in lockstep. */
export function itemStiffness(index: number): number {
  const spread = SLIDER.stiffnessSpread;
  return SLIDER.stiffness * (1 - spread / 2 + spread * ((index * 0.618034) % 1));
}

/** Frame-rate independent exponential approach. */
export function dampTo(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

/** Marquee offset change for a wheel event (dominant axis, normalised to px). */
export function wheelDelta(e: { deltaX: number; deltaY: number; deltaMode: number }, pageHeight: number): number {
  let d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  if (e.deltaMode === 1) d *= 16;
  else if (e.deltaMode === 2) d *= pageHeight;
  return -d * SLIDER.wheelFactor;
}

/** Exponentially smoothed drag velocity in px/ms. */
export function smoothDragVelocity(prev: number, dx: number, dtMs: number): number {
  return prev * 0.72 + (dx / Math.max(1, dtMs)) * 0.28;
}

/** Extra marquee travel added when a drag is released with velocity `v` (px/ms). */
export function flingDistance(v: number): number {
  const c = Math.max(-SLIDER.flingMax, Math.min(SLIDER.flingMax, v));
  return c * SLIDER.dragFactor * SLIDER.flingMs;
}

/** Lean, squash, blur and label turn caused by marquee velocity (px/s). */
export function velocityResponse(v: number, phone = false) {
  const r = Math.min(1, Math.abs(v) / SLIDER.velocityMax);
  const r2 = r * r;
  return {
    lean: -Math.sign(v) * r * SLIDER.velocityLean,
    squash: 1 - r2 * SLIDER.velocitySquash,
    blur: r2 * (phone ? SLIDER.velocityBlurPhone : SLIDER.velocityBlur),
    turn: -Math.max(-1, Math.min(1, v / SLIDER.velocityMax)) * SLIDER.velocityTurn,
  };
}

/**
 * Spring targets from the pointer. `dx`, `dy` are pointer minus jar centre in marquee space,
 * `presence` (0..1) fades the effect in and out as the pointer enters or leaves the stage.
 */
export function pointerResponse(dx: number, dy: number, itemW: number, itemH: number, presence: number) {
  if (presence <= 0) return { turn: 0, lean: 0, lift: 0, pullX: 0, pullY: 0 };
  const r = itemW * SLIDER.pointerRadius;
  const g = Math.exp(-(dx * dx + dy * dy) / (r * r));
  const tx = Math.tanh(dx / r);
  const ty = Math.tanh(dy / (itemH * 0.8));
  const weight = presence * (SLIDER.pointerFloor + (1 - SLIDER.pointerFloor) * g);
  return {
    turn: tx * SLIDER.pointerTurn * weight,
    lean: tx * SLIDER.pointerLean * g * presence,
    lift: SLIDER.pointerLift * g * presence,
    pullX: tx * SLIDER.pointerPull * g * presence,
    pullY: ty * SLIDER.pointerPull * g * presence,
  };
}

/** Label turn in degrees → quantised fraction of a turn. */
export function quantizeTurn(deg: number): number {
  const q = SLIDER.turnQuantum;
  return Math.round(deg / 360 / q) * q;
}

export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
export const easeInOutQuint = (t: number) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2);
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** Progress (0..1) of the hover spin, eased. */
export function spinProgress(elapsedS: number): number {
  return easeInOutQuint(clamp01(elapsedS / SLIDER.spinSeconds));
}

/** Eased intro progress for an item whose intro starts `delayMs` after `elapsedMs` = 0. */
export function introProgress(elapsedMs: number, delayMs = 0): number {
  return easeOutCubic(clamp01((elapsedMs - delayMs) / SLIDER.introMs));
}
