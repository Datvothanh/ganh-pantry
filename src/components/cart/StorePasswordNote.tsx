import { site } from "@/content/site";
import type { Locale } from "@/lib/i18n";
import { isExternalCheckout } from "./checkout";
import { cartCopy } from "./copy";

/** Demo-store password hint, shown only when Checkout hands off to the hosted Shopify checkout. */
export function StorePasswordNote({
  checkoutUrl,
  locale,
  className,
}: {
  checkoutUrl: string;
  locale: Locale;
  className?: string;
}) {
  if (!isExternalCheckout(checkoutUrl)) return null;
  return (
    <p className={className} data-cart-store-password>
      {cartCopy(locale).storePassword(site.demoStorePassword)}
    </p>
  );
}
