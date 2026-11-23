import { Composite } from "./Composite";

/**
 * Dev-only page used by `npm run composites`: draws one jar photo with its label on a
 * transparent page. 404s in production unless `GANH_DEV_ROUTES=1` (gated in src/proxy.ts).
 * The folder name carries an extension so the locale proxy leaves the path alone.
 */
export default function CompositePage() {
  return <Composite />;
}
