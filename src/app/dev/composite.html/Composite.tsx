"use client";

import { useEffect, useRef } from "react";
import { FRONT_OFFSET, JAR_IMAGE, getJarLabelRenderer } from "@/lib/jar-label";

const SCALE = 2;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Cannot load ${src}`));
    img.src = src;
  });
}

/** Reads `?handle=<product>`; sets `data-state` to "ready" or "error" on the canvas when done. */
export function Composite() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const handle = new URLSearchParams(window.location.search).get("handle");
    if (!canvas || !handle || !/^[a-z0-9-]+$/.test(handle)) {
      canvas?.setAttribute("data-state", "error");
      return;
    }
    let dead = false;
    (async () => {
      const [jar, renderer] = await Promise.all([loadImage(`/jars/${handle}.webp`), getJarLabelRenderer()]);
      const material = renderer.createMaterial(`/labels/${handle}.png`);
      await material.ready;
      const w = JAR_IMAGE.width * SCALE;
      const h = JAR_IMAGE.height * SCALE;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("2D context unavailable");
      ctx.drawImage(jar, 0, 0, w, h);
      renderer.resize(w, h);
      renderer.render(material, FRONT_OFFSET);
      const label = document.createElement("canvas");
      label.width = w;
      label.height = h;
      const labelCtx = label.getContext("2d");
      if (!labelCtx) throw new Error("2D context unavailable");
      renderer.blit(labelCtx);
      ctx.drawImage(label, 0, 0);
      material.dispose();
      if (!dead) canvas.setAttribute("data-state", "ready");
    })().catch((err) => {
      console.error(err);
      canvas.setAttribute("data-state", "error");
    });
    return () => {
      dead = true;
    };
  }, []);

  return (
    <canvas
      ref={ref}
      id="composite"
      data-state="loading"
      style={{ display: "block", width: JAR_IMAGE.width, height: JAR_IMAGE.height }}
    />
  );
}
