import { NextResponse, type NextRequest } from "next/server";
import { productByHandle } from "@/content/products";
import { defaultLocale, isLocale, stripLocale } from "@/lib/i18n";

const PRODUCT_PATH = /^\/products\/([^/]+)\/?$/;

/**
 * English lives at "/…" (rewritten to "/en/…"), Vietnamese at "/vi/…".
 * An explicit "/en/…" URL redirects to its unprefixed twin.
 * Unknown product handles are rewritten to the catch-all 404 here, because with
 * Cache Components the page shell streams first and could no longer send a 404 status.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];

  if (first === defaultLocale) {
    const url = request.nextUrl.clone();
    url.pathname = stripLocale(pathname);
    return NextResponse.redirect(url);
  }

  const locale = isLocale(first) ? first : defaultLocale;
  const path = stripLocale(pathname);
  const product = PRODUCT_PATH.exec(path);
  if (product && !productByHandle(decodeURIComponent(product[1]))) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/not-found`;
    return NextResponse.rewrite(url);
  }

  if (isLocale(first)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip Next internals and any path with a file extension (public assets).
  matcher: ["/((?!_next/|api/|.*\\.[a-z0-9]+$).*)"],
};
