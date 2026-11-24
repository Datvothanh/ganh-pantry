/** True when the cart hands off to a hosted checkout (Shopify) rather than the in-site demo page. */
export function isExternalCheckout(checkoutUrl: string): boolean {
  return !checkoutUrl.startsWith("/");
}
