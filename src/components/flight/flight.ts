/**
 * Shared-element jar flight: a fixed clone of a slider jar flies into the product hero's
 * `[data-jar-target]` across a client navigation, then hands over to the real hero jar.
 * Imperative and module-scoped so it survives the route change.
 */

/** Same name as `HERO_READY_EVENT` in the product hero. */
const HERO_READY = "ganh:hero-ready";
/** Flight duration (ms). */
const DURATION = 900;
/** Give up waiting for the hero to mount (ms after launch). */
const TARGET_TIMEOUT = 3000;
/** Land even when the hero never announces itself (ms after launch). */
const READY_TIMEOUT = 4500;
/** Fade-out when the flight is aborted (ms). */
const ABORT_FADE = 250;

interface Pose {
  cx: number;
  cy: number;
  scale: number;
  rot: number;
}

/** One parsed filter function (e.g. `blur(2px)`) and the value that means "no effect". */
interface FilterPart {
  name: string;
  value: number;
  unit: string;
  rest: number;
}

interface Flight {
  handle: string;
  clone: HTMLDivElement;
  source: HTMLElement;
  w: number;
  h: number;
  from: Pose;
  /** Source filter at launch, eased to none over the flight. */
  filter: FilterPart[];
  target: HTMLElement | null;
  ready: boolean;
  launched: number;
  flyStart: number;
  raf: number;
  off: () => void;
}

let layer: HTMLElement | null = null;
let classes: { clone?: string; img?: string; label?: string } = {};
let active: Flight | null = null;

/** Called by the layer component mounted in the locale layout. */
export function setFlightLayer(el: HTMLElement | null, cls: typeof classes = {}) {
  layer = el;
  classes = cls;
  if (!el) abort();
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** On-screen rotation (deg) and scale of an element: its own transform composed with every ancestor's. */
function screenPose(el: HTMLElement): { rot: number; scale: number } {
  let rot = 0;
  let scale = 1;
  for (let n: Element | null = el; n && n !== document.documentElement; n = n.parentElement) {
    const t = getComputedStyle(n).transform;
    if (!t || t === "none") continue;
    const m = new DOMMatrixReadOnly(t);
    rot += (Math.atan2(m.b, m.a) * 180) / Math.PI;
    scale *= Math.hypot(m.a, m.b);
  }
  return { rot, scale };
}

const FILTER_REST: Record<string, number> = {
  brightness: 1,
  contrast: 1,
  saturate: 1,
  opacity: 1,
  grayscale: 0,
  sepia: 0,
  invert: 0,
  blur: 0,
  "hue-rotate": 0,
};

/** Parse a computed `filter`; null when it holds anything we cannot ease (e.g. drop-shadow). */
function parseFilter(value: string): FilterPart[] | null {
  const parts: FilterPart[] = [];
  const re = /([a-z-]+)\(\s*(-?[\d.]+)([a-z%]*)\s*\)/g;
  let end = 0;
  for (let m = re.exec(value); m; m = re.exec(value)) {
    if (value.slice(end, m.index).trim() || !(m[1] in FILTER_REST)) return null;
    parts.push({ name: m[1], value: parseFloat(m[2]), unit: m[3], rest: FILTER_REST[m[1]] });
    end = re.lastIndex;
  }
  return value.slice(end).trim() ? null : parts;
}

function setFilter(f: Flight, e: number) {
  if (!f.filter.length) return;
  f.clone.style.filter = f.filter
    .map((p) => `${p.name}(${(p.value + (p.rest - p.value) * e).toFixed(3)}${p.unit})`)
    .join(" ");
}

function place(f: Flight, p: Pose) {
  f.clone.style.transform = `translate3d(${(p.cx - f.w / 2).toFixed(2)}px, ${(p.cy - f.h / 2).toFixed(2)}px, 0) rotate(${p.rot.toFixed(3)}deg) scale(${p.scale.toFixed(4)})`;
}

function hideTarget(el: HTMLElement) {
  el.setAttribute("data-no-rise", "");
  el.style.visibility = "hidden";
}

function finish(f: Flight) {
  cancelAnimationFrame(f.raf);
  f.off();
  f.source.style.visibility = "";
  if (active === f) active = null;
}

/** Hand over to the hero jar: clone gone and hero shown in the same frame. */
function land(f: Flight) {
  if (f.target) f.target.style.visibility = "";
  f.clone.remove();
  finish(f);
}

function abort() {
  const f = active;
  if (!f) return;
  if (f.target) f.target.style.visibility = "";
  finish(f);
  const clone = f.clone;
  clone.style.transition = `opacity ${ABORT_FADE}ms ease-out`;
  clone.style.opacity = "0";
  window.setTimeout(() => clone.remove(), ABORT_FADE);
}

function findTarget(handle: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>("[data-jar-target]")) {
    if (el.dataset.handle === handle && el.getClientRects().length) return el;
  }
  return null;
}

function frame(f: Flight, now: number) {
  if (active !== f) return;
  if (!f.target) {
    const late = findTarget(f.handle);
    if (late) {
      hideTarget(late);
      f.target = late;
    }
  }
  if (!f.target) {
    if (now - f.launched > TARGET_TIMEOUT) return abort();
    f.raf = requestAnimationFrame((t) => frame(f, t));
    return;
  }
  if (!f.flyStart) f.flyStart = now;
  if (f.target.dataset.heroReady === "true") f.ready = true;

  const r = f.target.getBoundingClientRect();
  const to: Pose = { cx: r.left + r.width / 2, cy: r.top + r.height / 2, scale: r.height / f.h, rot: 0 };
  const t = Math.min(1, (now - f.flyStart) / DURATION);
  const e = easeInOut(t);
  setFilter(f, e);
  place(f, {
    cx: f.from.cx + (to.cx - f.from.cx) * e,
    cy: f.from.cy + (to.cy - f.from.cy) * e,
    scale: f.from.scale + (to.scale - f.from.scale) * e,
    rot: f.from.rot * (1 - e),
  });
  if (t >= 1 && (f.ready || now - f.launched > READY_TIMEOUT)) return land(f);
  f.raf = requestAnimationFrame((n) => frame(f, n));
}

/**
 * Start a flight from a slider item (the transformed element holding the jar `<img>` and label
 * `<canvas>`). Returns false when no flight could start; the caller then navigates normally.
 */
export function launchJarFlight(source: HTMLElement, handle: string): boolean {
  if (!layer) return false;
  const img = source.querySelector("img");
  if (!img) return false;
  if (active) {
    active.clone.remove();
    finish(active);
  }

  const w = source.offsetWidth;
  const h = source.offsetHeight;
  if (!w || !h) return false;
  const rect = source.getBoundingClientRect();
  const from: Pose = {
    cx: rect.left + rect.width / 2,
    cy: rect.top + rect.height / 2,
    ...screenPose(source),
  };

  // The slider depth-filters its items (brightness, blur): the clone starts with the same look.
  const srcFilter = getComputedStyle(source).filter;
  const hasFilter = !!srcFilter && srcFilter !== "none";
  const filter = hasFilter ? parseFilter(srcFilter) : [];

  const clone = document.createElement("div");
  clone.className = classes.clone ?? "";
  if (hasFilter) clone.style.filter = srcFilter;
  clone.setAttribute("data-jar-flight-clone", "");
  clone.setAttribute("aria-hidden", "true");
  clone.style.width = `${w}px`;
  clone.style.height = `${h}px`;
  const base = document.createElement("img");
  base.className = classes.img ?? "";
  base.src = img.currentSrc || img.src;
  base.alt = "";
  clone.appendChild(base);
  const srcCanvas = source.querySelector("canvas");
  if (srcCanvas && srcCanvas.width && srcCanvas.height) {
    const snap = document.createElement("canvas");
    snap.className = classes.label ?? "";
    snap.width = srcCanvas.width;
    snap.height = srcCanvas.height;
    snap.getContext("2d")?.drawImage(srcCanvas, 0, 0);
    clone.appendChild(snap);
  }

  const onReady = (e: Event) => {
    const d = (e as CustomEvent<{ handle?: string }>).detail;
    if (active && (!d?.handle || d.handle === active.handle)) active.ready = true;
  };
  const onPop = () => abort();
  window.addEventListener(HERO_READY, onReady);
  window.addEventListener("popstate", onPop);

  const f: Flight = {
    handle,
    clone,
    source,
    w,
    h,
    from,
    filter: filter ?? [],
    target: null,
    ready: false,
    launched: performance.now(),
    flyStart: 0,
    raf: 0,
    off: () => {
      window.removeEventListener(HERO_READY, onReady);
      window.removeEventListener("popstate", onPop);
    },
  };
  active = f;
  place(f, from);
  layer.appendChild(clone);
  source.style.visibility = "hidden";
  f.raf = requestAnimationFrame((t) => frame(f, t));
  return true;
}

/**
 * Called by the product hero before paint. When a flight is heading for this product the hero
 * jar stays hidden (and skips its rise) until the clone lands. Returns a cleanup.
 */
export function claimHeroTarget(el: HTMLElement, handle: string): () => void {
  const f = active;
  if (!f || f.handle !== handle || (f.target && f.target !== el)) return () => {};
  hideTarget(el);
  f.target = el;
  return () => {
    // Unmounted (or re-run in dev): let the loop look for the next target or time out.
    if (active === f && f.target === el) {
      f.target = null;
      el.style.visibility = "";
    }
  };
}
