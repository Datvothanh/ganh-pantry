import type { ReactNode } from "react";

/**
 * Minimal root layout for dev-only routes: no shell, transparent page.
 * In production these routes 404 unless GANH_DEV_ROUTES=1; that gate lives in src/proxy.ts.
 */
export default function DevLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" style={{ background: "transparent" }}>
      <body style={{ margin: 0, background: "transparent" }}>{children}</body>
    </html>
  );
}
