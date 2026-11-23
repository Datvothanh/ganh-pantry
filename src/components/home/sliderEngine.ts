/**
 * DOM driver for the home jar slider. Owns the rAF loop, input (wheel, drag, fling,
 * pointer proximity, hover spin) and label rendering through the shared jar-label renderer.
 * All maths lives in `@/lib/jar-slider`.
 */
import {
  FRONT_OFFSET,
  getJarLabelRenderer,
  LABEL_SUPERSAMPLE,
  labelPixelRatio,
  type JarLabelRenderer,
  type LabelMaterial,
} from "@/lib/jar-label";
import {
  SLIDER,
  computeLayout,
  createSpring,
  curveX,
  dampTo,
  flingDistance,
  introProgress,
  itemBlur,
  itemBrightness,
  itemJitter,
  itemRotation,
  itemScale,
  itemStiffness,
  pointerResponse,
  quantizeTurn,
  smoothDragVelocity,
  spinProgress,
  stepSpring,
  velocityResponse,
  wheelDelta,
  wrapX,
  type SliderLayout,
  type Spring,
} from "@/lib/jar-slider";

interface Item {
  index: number;
  el: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  url: string;
  material: LabelMaterial | null;
  ready: boolean;
  needsRender: boolean;
  renderedOffset: number;
  over: boolean;
  queued: boolean;
  enterTime: number;
  dwellStart: number;
  spinStart: number;
  introDelay: number;
  turn: Spring;
  lean: Spring;
  lift: Spring;
  pullX: Spring;
  pullY: Spring;
}

export interface SliderEngine {
  /** Begin the intro (call once the loader is done). */
  start: () => void;
  destroy: () => void;
}

const STAGGER_MS = 70;
const LABEL_WAIT_MS = 1500;

export function createSliderEngine(root: HTMLElement, reduced: boolean): SliderEngine | null {
  const wrap = root.querySelector<HTMLElement>("[data-jar-slider-wrap]");
  const els = Array.from(root.querySelectorAll<HTMLElement>("[data-jar-slider-item]"));
  if (!wrap || !els.length) return null;

  const fineQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  const fine = () => fineQuery.matches;

  const items: Item[] = [];
  els.forEach((el, index) => {
    const canvas = el.querySelector("canvas");
    const ctx = canvas?.getContext("2d");
    const url = el.dataset.label;
    if (!canvas || !ctx || !url) return;
    items.push({
      index,
      el,
      canvas,
      ctx,
      url,
      material: null,
      ready: false,
      needsRender: true,
      renderedOffset: NaN,
      over: false,
      queued: false,
      enterTime: -1,
      dwellStart: -1,
      spinStart: -1,
      introDelay: 0,
      turn: createSpring(),
      lean: createSpring(),
      lift: createSpring(),
      pullX: createSpring(),
      pullY: createSpring(),
    });
  });

  let layout: SliderLayout = computeLayout(window.innerWidth, window.innerHeight, els.length);
  let cos = 1;
  let sin = 0;
  let trackX = 0;
  let trackY = 0;
  let renderer: JarLabelRenderer | null = null;
  let alive = true;
  let started = false;
  let startTime = -1;
  let itemsStart = -1;
  let visible = true;

  const measure = () => {
    layout = computeLayout(window.innerWidth, window.innerHeight, els.length);
    root.style.setProperty("--jar-item-w", `${layout.itemW}px`);
    root.style.setProperty("--jar-item-h", `${layout.itemH}px`);
    root.style.setProperty("--jar-marquee-h", `${layout.marqueeH}px`);
    const r = root.getBoundingClientRect();
    const track = root.querySelector<HTMLElement>("[data-jar-slider-track]")?.getBoundingClientRect();
    if (track) {
      trackX = track.left + track.width / 2 - r.left;
      trackY = track.top + track.height / 2 - r.top;
    }
    const angle = (Number.parseFloat(getComputedStyle(root).getPropertyValue("--jar-marquee-angle")) || 0) * (Math.PI / 180);
    cos = Math.cos(angle);
    sin = Math.sin(angle);
  };

  const sizeCanvases = () => {
    const first = items[0]?.canvas;
    const w = first?.offsetWidth ?? 0;
    const h = first?.offsetHeight ?? 0;
    if (!w || !h) return;
    const ratio = labelPixelRatio(w, h, LABEL_SUPERSAMPLE, reduced ? 1 : items.length);
    const pw = Math.round(w * ratio);
    const ph = Math.round(h * ratio);
    renderer?.resize(pw, ph);
    for (const it of items) {
      if (it.canvas.width !== pw || it.canvas.height !== ph) {
        it.canvas.width = pw;
        it.canvas.height = ph;
      }
      it.needsRender = true;
    }
  };

  const draw = (it: Item, offset: number) => {
    if (!renderer || !it.material || !it.ready) return;
    renderer.resize(it.canvas.width, it.canvas.height);
    renderer.render(it.material, offset);
    renderer.blit(it.ctx);
    it.renderedOffset = offset;
    it.needsRender = false;
  };

  const onScreen = (x: number) => x + layout.itemW > 0 && x - layout.itemW < layout.vw;

  const loadMaterial = (it: Item): Promise<void> => {
    if (!renderer || it.material) return Promise.resolve();
    it.material = renderer.createMaterial(it.url);
    return it.material.ready.then(
      () => {
        it.ready = true;
        it.needsRender = true;
        if (reduced) draw(it, FRONT_OFFSET);
      },
      () => {},
    );
  };

  /** Order the intro left to right across the visible jars, then the rest by distance. */
  const orderIntro = () => {
    const onIdx: { it: Item; x: number }[] = [];
    const off: { it: Item; d: number }[] = [];
    for (const it of items) {
      const x = wrapX(it.index, 0, layout);
      if (x + layout.itemW / 2 > 0 && x - layout.itemW / 2 < layout.vw) onIdx.push({ it, x });
      else off.push({ it, d: x < layout.vw / 2 ? Math.abs(x) : Math.abs(x - layout.vw) });
    }
    onIdx.sort((a, b) => a.x - b.x).forEach(({ it }, i) => (it.introDelay = i * STAGGER_MS));
    off.sort((a, b) => a.d - b.d).forEach(({ it }, i) => (it.introDelay = (onIdx.length + i) * STAGGER_MS));
    return { visibleItems: onIdx.map((o) => o.it), rest: off.map((o) => o.it) };
  };

  const beginItems = () => {
    if (itemsStart < 0) itemsStart = performance.now();
  };

  const loadLabels = () => {
    const { visibleItems, rest } = orderIntro();
    const loadRest = () => rest.forEach((it) => void loadMaterial(it));
    if (!renderer) {
      beginItems();
      return;
    }
    const timer = window.setTimeout(beginItems, LABEL_WAIT_MS);
    Promise.all(visibleItems.map(loadMaterial)).then(() => {
      window.clearTimeout(timer);
      beginItems();
      if (alive) loadRest();
    });
  };

  // ---- renderer -------------------------------------------------------------
  const rendererReady = getJarLabelRenderer().then(
    (r) => {
      if (!alive) return;
      renderer = r;
      sizeCanvases();
    },
    () => {},
  );

  // ---- input ----------------------------------------------------------------
  let target = 0;
  let pos = 0;
  let velocity = 0;
  let lastMotion = -1;

  const onWheel = (e: WheelEvent) => {
    if (reduced) return;
    e.preventDefault();
    target += wheelDelta(e, window.innerHeight);
  };

  let down = false;
  let pointerId = -1;
  let dragging = false;
  let dragged = false;
  let lastX = 0;
  let startX = 0;
  let lastT = 0;
  let dragV = 0;

  const onDown = (e: PointerEvent) => {
    if (reduced || (e.pointerType === "mouse" && e.button !== 0)) return;
    down = true;
    pointerId = e.pointerId;
    dragging = false;
    dragged = false;
    lastX = startX = e.clientX;
    dragV = 0;
    lastT = e.timeStamp || performance.now();
  };
  const onMove = (e: PointerEvent) => {
    if (!down || e.pointerId !== pointerId) return;
    if (!dragging) {
      if (Math.abs(e.clientX - startX) <= SLIDER.dragThreshold) return;
      try {
        wrap.setPointerCapture(e.pointerId);
      } catch {
        return;
      }
      dragging = true;
      dragged = true;
      lastX = e.clientX;
      lastT = e.timeStamp || performance.now();
      return;
    }
    const dx = e.clientX - lastX;
    const t = e.timeStamp || performance.now();
    dragV = smoothDragVelocity(dragV, dx, t - lastT);
    lastX = e.clientX;
    lastT = t;
    target += dx * SLIDER.dragFactor;
  };
  const onUp = (e: PointerEvent) => {
    if (pointerId !== -1 && e.pointerId !== pointerId) return;
    if (dragging) {
      try {
        wrap.releasePointerCapture(e.pointerId);
      } catch {}
      target += flingDistance(dragV);
    }
    dragV = 0;
    down = false;
    pointerId = -1;
    dragging = false;
  };
  const onClickCapture = (e: MouseEvent) => {
    if (dragged) {
      e.preventDefault();
      e.stopPropagation();
      dragged = false;
    }
  };

  // Keyboard focus brings the jar to the centre.
  const onFocus = (e: FocusEvent) => {
    if (reduced || down) return;
    const focused = e.target as HTMLElement;
    // Only keyboard focus recentres; a mouse press must not slide the jar from under the pointer.
    try {
      if (!focused.matches(":focus-visible")) return;
    } catch {
      return;
    }
    const el = focused.closest<HTMLElement>("[data-jar-slider-item]");
    const it = items.find((i) => i.el === el);
    if (!it) return;
    const x = wrapX(it.index, target, layout);
    target += layout.vw / 2 - x;
  };

  let pointerIn = false;
  let px = 0;
  let py = 0;
  const onRootMove = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    pointerIn = true;
    px = e.clientX;
    py = e.clientY;
  };
  const onRootLeave = () => {
    pointerIn = false;
  };

  const itemListeners = items.map((it) => {
    const enter = () => {
      if (!fine()) return;
      it.over = true;
      it.queued = true;
      it.enterTime = performance.now();
    };
    const leave = () => {
      it.over = false;
      it.queued = false;
    };
    it.el.addEventListener("pointerenter", enter);
    it.el.addEventListener("pointerleave", leave);
    return () => {
      it.el.removeEventListener("pointerenter", enter);
      it.el.removeEventListener("pointerleave", leave);
    };
  });

  const onResize = () => {
    measure();
    sizeCanvases();
    if (reduced) items.forEach((it) => draw(it, FRONT_OFFSET));
  };

  measure();
  window.addEventListener("resize", onResize);
  wrap.addEventListener("wheel", onWheel, { passive: false });
  wrap.addEventListener("pointerdown", onDown);
  wrap.addEventListener("pointermove", onMove);
  wrap.addEventListener("pointerup", onUp);
  wrap.addEventListener("pointercancel", onUp);
  wrap.addEventListener("click", onClickCapture, true);
  wrap.addEventListener("focusin", onFocus);
  root.addEventListener("pointermove", onRootMove, { passive: true });
  root.addEventListener("pointerleave", onRootLeave);

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  });
  io.observe(root);

  // ---- frame loop -------------------------------------------------------------
  let raf = 0;
  let last = performance.now();
  let presence = 0;
  let parX = 0;
  let parY = 0;

  const frame = (now: number) => {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(1 / 30, Math.max(0, (now - last) / 1000));
    last = now;
    if (!visible) return;

    const vw = layout.vw;
    const rect = root.getBoundingClientRect();
    const lx = px - rect.left;
    const ly = py - rect.top;
    const tracking = pointerIn && fine();
    if (tracking && rect.width > 0) {
      const k = 1 - Math.exp(-4 * dt);
      parX += (Math.max(-1, Math.min(1, (lx / rect.width) * 2 - 1)) - parX) * k;
      parY += (Math.max(-1, Math.min(1, (ly / rect.height) * 2 - 1)) - parY) * k;
    }
    presence = dampTo(presence, tracking ? 1 : 0, 3, dt);
    if (!tracking && presence < 0.001) presence = 0;
    const gx = parX * presence;
    const gy = parY * presence;
    root.style.setProperty("--jar-parallax-x", gx.toFixed(4));
    root.style.setProperty("--jar-parallax-y", gy.toFixed(4));

    const prev = pos;
    pos = dampTo(pos, target, dragging ? SLIDER.smoothDrag : SLIDER.smoothIdle, dt);
    if (Math.abs(target - pos) < 0.05) pos = target;
    velocity = dt > 0 ? (pos - prev) / dt : 0;
    root.style.setProperty("--jar-circle-rotation", `${pos * (layout.phone ? SLIDER.badgeRatePhone : SLIDER.badgeRate)}deg`);
    if (dragging || Math.abs(velocity) > 6) lastMotion = now;
    const calm = !dragging && Math.abs(velocity) <= layout.spacing * 1.4;
    const vr = velocityResponse(velocity, layout.phone);

    const backIntro = started ? introProgress(now - startTime) : 0;
    root.style.setProperty("--jar-intro", backIntro.toFixed(4));

    for (const it of items) {
      const x = wrapX(it.index, pos, layout);
      const cx = curveX(x, vw);
      const p = itemsStart < 0 ? 0 : introProgress(now - itemsStart, it.introDelay);
      const rise = (1 - p) * SLIDER.introRise;
      const jitter = itemJitter(it.index, layout);
      const scale = itemScale(x, layout);

      // Spring targets: velocity response plus pointer proximity.
      let turnT = vr.turn;
      let leanT = vr.lean;
      let liftT = 0;
      let pullXT = 0;
      let pullYT = 0;
      if (presence > 0) {
        const ex = cx - vw / 2;
        const ey = jitter + rise;
        const ix = trackX + ex * cos - ey * sin;
        const iy = trackY + ex * sin + ey * cos;
        const ddx = lx - ix;
        const ddy = ly - iy;
        const mx = ddx * cos + ddy * sin;
        const my = -ddx * sin + ddy * cos;
        const pr = pointerResponse(mx, my, layout.itemW, layout.itemH, presence);
        const par = SLIDER.parallaxPull * (scale / SLIDER.scaleCentre);
        turnT += pr.turn;
        leanT += pr.lean;
        liftT = pr.lift;
        pullXT = pr.pullX + (gx * cos + gy * sin) * par;
        pullYT = pr.pullY + (-gx * sin + gy * cos) * par;
      }
      const k = itemStiffness(it.index);
      stepSpring(it.turn, turnT, k, dt);
      stepSpring(it.lean, leanT, k, dt);
      stepSpring(it.lift, liftT, k, dt);
      stepSpring(it.pullX, pullXT, k, dt);
      stepSpring(it.pullY, pullYT, k, dt);

      const tx = cx - layout.itemW / 2 + it.pullX.value;
      const ty = jitter + rise + it.pullY.value;
      const rot = itemRotation(it.index, pos, layout) + it.lean.value;
      const s = scale * (SLIDER.introScale + p * (1 - SLIDER.introScale)) * vr.squash * (1 + it.lift.value);
      it.el.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) rotate(${rot.toFixed(3)}deg) scale(${s.toFixed(4)})`;
      it.el.style.opacity = p.toFixed(3);
      it.el.style.filter = `brightness(${itemBrightness(x, vw).toFixed(3)}) blur(${itemBlur(x, layout, vr.blur).toFixed(2)}px)`;

      // Hover dwell spins the label one full turn.
      let spin = 0;
      if (!calm || !it.over) it.dwellStart = -1;
      else if (it.dwellStart < 0) it.dwellStart = now;
      if (fine()) {
        if (it.over && it.queued && it.spinStart < 0 && it.dwellStart >= 0 && (it.enterTime > lastMotion || now - it.dwellStart >= SLIDER.dwellMs)) {
          it.spinStart = now;
          it.queued = false;
        }
        if (it.spinStart >= 0) {
          const e = (now - it.spinStart) / 1000;
          if (e >= SLIDER.spinSeconds) it.spinStart = -1;
          else spin = spinProgress(e);
        }
      } else {
        it.spinStart = -1;
        it.queued = false;
        it.over = false;
      }

      const offset = FRONT_OFFSET - spin - p - quantizeTurn(it.turn.value);
      if (it.ready && (it.needsRender || (onScreen(x) && it.renderedOffset !== offset))) draw(it, offset);
    }
  };

  if (reduced) {
    for (const it of items) {
      it.el.style.opacity = "1";
    }
    rendererReady.then(() => {
      if (!alive || !renderer) return;
      items.forEach((it) => void loadMaterial(it));
    });
  } else {
    for (const it of items) it.el.style.opacity = "0";
    raf = requestAnimationFrame(frame);
  }

  return {
    start: () => {
      if (started || !alive) return;
      started = true;
      startTime = performance.now();
      if (reduced) return;
      rendererReady.then(() => {
        if (alive) loadLabels();
      });
    },
    destroy: () => {
      alive = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", onResize);
      wrap.removeEventListener("wheel", onWheel);
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerup", onUp);
      wrap.removeEventListener("pointercancel", onUp);
      wrap.removeEventListener("click", onClickCapture, true);
      wrap.removeEventListener("focusin", onFocus);
      root.removeEventListener("pointermove", onRootMove);
      root.removeEventListener("pointerleave", onRootLeave);
      itemListeners.forEach((off) => off());
      items.forEach((it) => it.material?.dispose());
    },
  };
}
