"use client";

import Link from "next/link";
import { useEffect, type CSSProperties } from "react";
import { addToCart, openCart } from "@/components/cart/store";
import { useCursorLabel } from "@/components/cursor";
import { MotifSvg } from "@/components/motifs";
import type { OtherCard } from "@/components/product/OtherProducts";
// Same card look as the PDP "other products" row (tile, motif pops, quick-add).
import card from "@/components/product/OtherProducts.module.css";
import styles from "./Pantry.module.css";

/** Motif pops behind the jar on hover: position (% of tile), size, rotation, stagger. */
const POPS = [
  { x: 24, y: 26, s: 0.95, r: -18, d: 0 },
  { x: 78, y: 20, s: 0.7, r: 24, d: 0.05 },
  { x: 84, y: 62, s: 0.9, r: -32, d: 0.1 },
  { x: 16, y: 70, s: 0.75, r: 40, d: 0.08 },
  { x: 52, y: 88, s: 0.6, r: 12, d: 0.14 },
  { x: 50, y: 10, s: 0.5, r: -50, d: 0.12 },
];

/** Category grid of product cards with motif hover and quick-add. */
export function PantryGrid({
  cards,
  discover,
}: {
  cards: OtherCard[];
  discover: string;
}) {
  const cursor = useCursorLabel();
  useEffect(() => cursor.hide, [cursor.hide]);

  return (
    <div
      className={styles.grid}
      data-pantry-grid=""
      style={{ "--n": cards.length } as CSSProperties}
    >
      {cards.map((c) => (
        <div
          key={c.handle}
          className={`${card.card} ${styles.card}`}
          data-product-card=""
          data-handle={c.handle}
          style={{ "--card-bg": c.card, "--accent": c.accent } as CSSProperties}
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse" || e.pointerType === "pen")
              cursor.show(discover);
          }}
          onPointerLeave={cursor.hide}
          onClick={cursor.hide}
        >
          <span className={card.stage} aria-hidden="true">
            {POPS.map((p, k) => (
              <span
                key={k}
                className={card.pop}
                data-motif=""
                style={
                  {
                    "--x": `${p.x}%`,
                    "--y": `${p.y}%`,
                    "--s": p.s,
                    "--r": `${p.r}deg`,
                    "--d": `${p.d}s`,
                  } as CSSProperties
                }
              >
                <MotifSvg motif={c.motif} className={card.motif} />
              </span>
            ))}
          </span>
          <span className={`${card.jar} ${styles.cardJar}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static composite, sized by CSS */}
            <img
              src={c.image}
              alt=""
              width={1260}
              height={2026}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </span>
          {c.quickAdd ? (
            <button
              type="button"
              className={card.quick}
              data-quick-add={c.handle}
              aria-label={c.quickAdd.label}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                cursor.hide();
                openCart();
                void addToCart(c.handle, c.quickAdd!.variantId, 1, c.quickAdd!.price);
              }}
            >
              <span aria-hidden="true">+</span>
            </button>
          ) : null}
          <div className={card.caption}>
            <Link href={c.href} className={card.link} draggable={false}>
              <span className={card.name} lang="vi">
                {c.name}
              </span>
              <span className={card.sub}>{c.sub}</span>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
