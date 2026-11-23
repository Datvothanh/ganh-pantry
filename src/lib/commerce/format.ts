import type { Money } from "./types";

export function formatMoney(money: Money, locale: string = "en"): string {
  return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
    style: "currency",
    currency: money.currencyCode,
    minimumFractionDigits: Number.isInteger(money.amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(money.amount);
}

export const money = (amount: number, currencyCode = "USD"): Money => ({
  amount: Math.round(amount * 100) / 100,
  currencyCode,
});
