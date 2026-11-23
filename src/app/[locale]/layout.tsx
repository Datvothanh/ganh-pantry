import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Footer } from "@/components/footer/Footer";
import { Header } from "@/components/header/Header";
import { INTRO_BOOT_SCRIPT } from "@/components/loader/boot";
import { Shell } from "@/components/shell/Shell";
import { getDict } from "@/content/dict";
import { href, isLocale, locales } from "@/lib/i18n";
import { display, text } from "../fonts";
import "../globals.css";

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDict(locale);
  return {
    title: { default: t.meta.title, template: `%s — GÁNH` },
    description: t.meta.description,
    icons: { icon: "/brand/mark.svg" },
    alternates: {
      languages: Object.fromEntries(locales.map((l) => [l, href(l, "/")])),
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html lang={locale} className={`${display.variable} ${text.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_BOOT_SCRIPT }} />
      </head>
      <body>
        <Shell locale={locale}>
          <Header locale={locale} />
          {children}
          <Footer locale={locale} />
        </Shell>
      </body>
    </html>
  );
}
