"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import { defaultLocale } from "@/lib/i18n";

const LocaleContext = createContext<Locale>(defaultLocale);

export const useLocale = (): Locale => useContext(LocaleContext);

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}
