import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cartCopy } from "@/components/cart/copy";
import { getCartAction } from "@/lib/commerce/actions";
import { formatMoney } from "@/lib/commerce/format";
import { href, isLocale, type Locale } from "@/lib/i18n";
import styles from "./checkout.module.css";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: cartCopy(locale).demo.title } : {};
}

async function OrderSummary({ locale }: { locale: Locale }) {
  const t = cartCopy(locale).demo;
  const cart = await getCartAction();
  if (!cart || cart.lines.length === 0) {
    return (
      <p className={styles.empty} data-checkout-empty>
        {t.empty}
      </p>
    );
  }
  return (
    <>
      <ul className={styles.lines}>
        {cart.lines.map((line) => (
          <li key={line.id} className={styles.line} data-checkout-line={line.handle}>
            <span className={styles.name} lang="vi">
              {line.title}
              <small>{line.weight}</small>
            </span>
            <span className={styles.qty}>
              {t.qty} {line.quantity}
            </span>
            <span className={styles.price}>{formatMoney(line.total, locale)}</span>
          </li>
        ))}
      </ul>
      <p className={styles.subtotal}>
        <span>{t.subtotal}</span>
        <strong data-checkout-subtotal>{formatMoney(cart.subtotal, locale)}</strong>
      </p>
    </>
  );
}

export default async function CheckoutDemoPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = cartCopy(locale).demo;
  return (
    <main className={styles.page} data-checkout-demo>
      <p className={styles.kicker}>{t.kicker}</p>
      <h1 className={styles.title}>{t.title}</h1>
      <p className={styles.body}>{t.body}</p>
      <section className={styles.summary} aria-labelledby="order-summary">
        <h2 id="order-summary" className={styles.summaryTitle}>
          {t.summary}
        </h2>
        <Suspense fallback={null}>
          <OrderSummary locale={locale} />
        </Suspense>
      </section>
      <Link href={href(locale, "/pantry")} className={styles.back}>
        {t.back}
      </Link>
    </main>
  );
}
