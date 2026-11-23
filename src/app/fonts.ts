import { Be_Vietnam_Pro, Noto_Serif_Display } from "next/font/google";

export const display = Noto_Serif_Display({
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-display",
  display: "swap",
});

export const text = Be_Vietnam_Pro({
  weight: ["400", "600"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-text",
  display: "swap",
});
