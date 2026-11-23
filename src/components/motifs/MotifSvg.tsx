import type { SVGProps } from "react";
import type { Motif } from "@/content/products";
import { motifShapes } from "./shapes";

export type MotifProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  /** Colour of the detail tone (leaf, stem…). Defaults to `currentColor` at 60% opacity. */
  alt?: string;
  /** Accessible name; the shape is decorative (aria-hidden) when omitted. */
  title?: string;
};

/** Flat cut-paper motif shape. The body is filled with `currentColor`. */
export function MotifSvg({ motif, alt, title, ...rest }: MotifProps & { motif: Motif }) {
  const shape = motifShapes[motif];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={shape.viewBox}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
      {...rest}
    >
      {shape.paths.map((p, i) =>
        p.tone === "main" ? (
          <path key={i} d={p.d} fill="currentColor" />
        ) : (
          <path key={i} d={p.d} fill={alt ?? "currentColor"} opacity={alt ? undefined : 0.6} />
        ),
      )}
    </svg>
  );
}
