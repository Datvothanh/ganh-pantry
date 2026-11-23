"use client";

import type { ReactNode } from "react";
import { CursorProvider } from "@/components/cursor/CursorLabel";
import { Loader } from "@/components/loader/Loader";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { getDict } from "@/content/dict";
import type { Locale } from "@/lib/i18n";
import { LocaleProvider } from "./LocaleProvider";

/** Client-side providers shared by every page: locale, smooth scroll, cursor label, loader. */
export function Shell({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <LocaleProvider locale={locale}>
      <SmoothScroll>
        <CursorProvider>
          {children}
          <Loader label={getDict(locale).loader.label} />
        </CursorProvider>
      </SmoothScroll>
    </LocaleProvider>
  );
}
