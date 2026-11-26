import { Commissioner, Source_Sans_3 } from "next/font/google";

// Display: Commissioner variable (flared terminals + higher contrast are set via
// font-variation-settings, see --display-fvs in globals.css). Free lookalike of IvyMode.
export const display = Commissioner({
  weight: "variable",
  style: "normal",
  axes: ["FLAR", "VOLM", "slnt"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-display",
  display: "swap",
});

// Text: Source Sans 3, free lookalike of IvyStyle Sans.
export const text = Source_Sans_3({
  weight: ["400", "600"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-text",
  display: "swap",
});
