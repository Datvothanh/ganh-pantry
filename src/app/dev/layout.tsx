import type { ReactNode } from "react";

/** Minimal root layout for dev-only routes: no shell, transparent page. */
export default function DevLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" style={{ background: "transparent" }}>
      <body style={{ margin: 0, background: "transparent" }}>{children}</body>
    </html>
  );
}
