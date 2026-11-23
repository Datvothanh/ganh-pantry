import { notFound } from "next/navigation";
import { Composite } from "./Composite";

/**
 * Dev-only page used by `npm run composites`: draws one jar photo with its label on a
 * transparent page. 404s in production unless `GANH_DEV_ROUTES=1`.
 * The folder name carries an extension so the locale proxy leaves the path alone.
 */
export default function CompositePage() {
  if (process.env.NODE_ENV === "production" && process.env.GANH_DEV_ROUTES !== "1") notFound();
  return <Composite />;
}
