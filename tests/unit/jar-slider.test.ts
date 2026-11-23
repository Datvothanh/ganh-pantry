import { describe, expect, it } from "vitest";
import {
  SLIDER,
  bulge,
  centreDistance,
  computeLayout,
  createSpring,
  curveX,
  dampTo,
  easeInOutQuint,
  easeOutCubic,
  flingDistance,
  itemBlur,
  itemBrightness,
  itemScale,
  pointerResponse,
  quantizeTurn,
  repeatItems,
  smoothDragVelocity,
  spinProgress,
  stepSpring,
  velocityResponse,
  wheelDelta,
  wrapX,
} from "@/lib/jar-slider";

const desktop = computeLayout(1440, 900, 8);

describe("layout", () => {
  it("uses 4 jars per screen on desktop and 3 on tablet / phone", () => {
    expect(desktop.perScreen).toBe(4);
    expect(desktop.spacing).toBeCloseTo((1440 / 4) * 0.92);
    expect(computeLayout(1024, 768, 8).perScreen).toBe(3);
    expect(computeLayout(390, 844, 8).perScreen).toBe(3);
  });
  it("keeps the jar aspect ratio and caps height at 72% of the viewport", () => {
    expect(desktop.itemH / desktop.itemW).toBeCloseTo(1013 / 630);
    const short = computeLayout(1440, 400, 8);
    expect(short.itemH).toBeCloseTo(400 * 0.72);
    expect(short.itemH / short.itemW).toBeCloseTo(1013 / 630);
  });
  it("track span is count × spacing", () => {
    expect(desktop.span).toBeCloseTo(8 * desktop.spacing);
  });
});

describe("repeatItems", () => {
  it("repeats the list to at least the minimum length", () => {
    expect(repeatItems(["a", "b", "c"], 8)).toEqual(["a", "b", "c", "a", "b", "c", "a", "b"]);
    expect(repeatItems([1, 2, 3, 4, 5, 6, 7, 8, 9], 8)).toHaveLength(9);
    expect(repeatItems([], 8)).toEqual([]);
  });
});

describe("marquee wrap", () => {
  it("wraps positions into [-margin, span - margin)", () => {
    for (const offset of [-1e5, -3000, -1, 0, 1, 777, 1e5]) {
      for (let i = 0; i < 8; i++) {
        const x = wrapX(i, offset, desktop);
        expect(x).toBeGreaterThanOrEqual(-desktop.wrapMargin - 1e-6);
        expect(x).toBeLessThan(desktop.span - desktop.wrapMargin + 1e-6);
      }
    }
  });
  it("is periodic in the span and moves with the offset", () => {
    expect(wrapX(2, 100, desktop)).toBeCloseTo(wrapX(2, 100 + desktop.span, desktop));
    expect(wrapX(2, 10, desktop) - wrapX(2, 0, desktop)).toBeCloseTo(10);
  });
  it("keeps neighbours one spacing apart", () => {
    expect(wrapX(1, 0, desktop) - wrapX(0, 0, desktop)).toBeCloseTo(desktop.spacing);
  });
});

describe("curve, scale, filters", () => {
  it("curveX is the identity at the centre and edges move outward", () => {
    expect(curveX(720, 1440)).toBeCloseTo(720);
    expect(curveX(1000, 1440)).toBeGreaterThan(1000);
    expect(curveX(400, 1440)).toBeLessThan(400);
    // monotonic
    let prev = -Infinity;
    for (let x = -400; x <= 1840; x += 20) {
      const c = curveX(x, 1440);
      expect(c).toBeGreaterThan(prev);
      prev = c;
    }
  });
  it("bulge is 1 at the centre and 0 off screen", () => {
    expect(bulge(0.5)).toBeCloseTo(1);
    expect(bulge(0)).toBeCloseTo(0);
    expect(bulge(-0.2)).toBe(0);
    expect(bulge(1.3)).toBe(0);
  });
  it("centre jar is biggest and brightest, edges small, dim and blurred", () => {
    const centre = 720;
    expect(itemScale(centre, desktop)).toBeCloseTo(SLIDER.scaleCentre);
    expect(itemScale(0, desktop)).toBeCloseTo(SLIDER.scaleEdge * (1 - SLIDER.distanceShrink));
    expect(itemScale(centre, desktop)).toBeGreaterThan(itemScale(1100, desktop));
    expect(itemBrightness(centre, 1440)).toBeCloseTo(SLIDER.brightCentre);
    expect(itemBrightness(-50, 1440)).toBeCloseTo(SLIDER.brightEdge);
    expect(itemBlur(centre, desktop)).toBeCloseTo(0);
    expect(itemBlur(0, desktop)).toBeGreaterThan(itemBlur(500, desktop));
    expect(itemBlur(-2000, desktop)).toBeCloseTo(SLIDER.blurMax);
    expect(centreDistance(centre + desktop.spacing, desktop)).toBeCloseTo(1);
  });
});

describe("springs and damping", () => {
  it("spring settles on the target", () => {
    const s = createSpring();
    for (let i = 0; i < 600; i++) stepSpring(s, 10, 70, 1 / 60);
    expect(s.value).toBe(10);
    expect(s.velocity).toBe(0);
  });
  it("spring overshoots a little (underdamped)", () => {
    const s = createSpring();
    let max = 0;
    for (let i = 0; i < 120; i++) max = Math.max(max, stepSpring(s, 1, 70, 1 / 60).value);
    expect(max).toBeGreaterThan(1);
    expect(max).toBeLessThan(1.5);
  });
  it("dampTo approaches exponentially and is frame-rate independent", () => {
    let a = 0;
    for (let i = 0; i < 60; i++) a = dampTo(a, 100, 2.3, 1 / 60);
    let b = 0;
    for (let i = 0; i < 30; i++) b = dampTo(b, 100, 2.3, 1 / 30);
    expect(a).toBeCloseTo(100 * (1 - Math.exp(-2.3)), 1);
    expect(b).toBeCloseTo(a, 1);
  });
});

describe("input integration", () => {
  it("wheel uses the dominant axis and normalises line / page modes", () => {
    expect(wheelDelta({ deltaX: 3, deltaY: 100, deltaMode: 0 }, 900)).toBeCloseTo(-100 * SLIDER.wheelFactor);
    expect(wheelDelta({ deltaX: -80, deltaY: 10, deltaMode: 0 }, 900)).toBeCloseTo(80 * SLIDER.wheelFactor);
    expect(wheelDelta({ deltaX: 0, deltaY: 3, deltaMode: 1 }, 900)).toBeCloseTo(-48 * SLIDER.wheelFactor);
    expect(wheelDelta({ deltaX: 0, deltaY: 1, deltaMode: 2 }, 900)).toBeCloseTo(-900 * SLIDER.wheelFactor);
  });
  it("drag velocity is smoothed and fling is clamped", () => {
    const v = smoothDragVelocity(0, 20, 10);
    expect(v).toBeCloseTo(2 * 0.28);
    expect(smoothDragVelocity(0, 5, 0)).toBeCloseTo(5 * 0.28);
    expect(flingDistance(1)).toBeCloseTo(SLIDER.dragFactor * SLIDER.flingMs);
    expect(flingDistance(100)).toBeCloseTo(flingDistance(SLIDER.flingMax));
    expect(flingDistance(-100)).toBeCloseTo(-flingDistance(SLIDER.flingMax));
  });
});

describe("motion responses", () => {
  it("velocity leans against motion, squashes and blurs", () => {
    const still = velocityResponse(0);
    expect(still.lean).toBeCloseTo(0);
    expect(still.squash).toBe(1);
    expect(still.blur).toBe(0);
    const fast = velocityResponse(5000);
    expect(fast.lean).toBeLessThan(0);
    expect(fast.squash).toBeLessThan(1);
    expect(fast.blur).toBeGreaterThan(0);
    expect(velocityResponse(-5000).lean).toBeGreaterThan(0);
  });
  it("pointer pulls toward itself and fades with distance", () => {
    const near = pointerResponse(30, 0, 200, 320, 1);
    const far = pointerResponse(2000, 0, 200, 320, 1);
    expect(near.pullX).toBeGreaterThan(0);
    expect(near.lift).toBeGreaterThan(far.lift);
    expect(far.pullX).toBeCloseTo(0);
    expect(pointerResponse(30, 0, 200, 320, 0).turn).toBe(0);
  });
  it("turn is quantised so idle jars do not re-render", () => {
    expect(quantizeTurn(0.0001)).toBe(0);
    expect(quantizeTurn(36)).toBeCloseTo(0.1);
  });
  it("easings hit their ends", () => {
    for (const f of [easeOutCubic, easeInOutQuint]) {
      expect(f(0)).toBeCloseTo(0);
      expect(f(1)).toBeCloseTo(1);
    }
    expect(spinProgress(0)).toBe(0);
    expect(spinProgress(SLIDER.spinSeconds)).toBe(1);
    expect(spinProgress(SLIDER.spinSeconds / 2)).toBeCloseTo(0.5);
  });
});
