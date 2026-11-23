import type { ComponentType } from "react";
import type { Motif } from "@/content/products";
import type { MotifProps } from "./MotifSvg";
import { Ginger } from "./ginger";
import { Kumquat } from "./kumquat";
import { Pineapple } from "./pineapple";
import { Chili } from "./chili";
import { Shrimp } from "./shrimp";
import { Lime } from "./lime";
import { Eggplant } from "./eggplant";
import { CoffeeBlossom } from "./coffee-blossom";

export { MotifSvg, type MotifProps } from "./MotifSvg";
export { motifShapes, motifSvg, type MotifShape, type MotifPath, type MotifTone } from "./shapes";
export { Ginger, Kumquat, Pineapple, Chili, Shrimp, Lime, Eggplant, CoffeeBlossom };

/** Motif component per `Product.motif`. */
export const motifComponents: Record<Motif, ComponentType<MotifProps>> = {
  ginger: Ginger,
  kumquat: Kumquat,
  pineapple: Pineapple,
  chili: Chili,
  shrimp: Shrimp,
  lime: Lime,
  eggplant: Eggplant,
  "coffee-blossom": CoffeeBlossom,
};
