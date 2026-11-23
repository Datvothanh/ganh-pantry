"use client";

import { usePathname } from "next/navigation";
import { Suspense, type ComponentProps } from "react";
import { stripLocale } from "@/lib/i18n";
import { LangPills } from "./LangPills";

type Props = Omit<ComponentProps<typeof LangPills>, "path">;

function CurrentPathPills(props: Props) {
  const path = stripLocale(usePathname() || "/");
  return <LangPills {...props} path={path} />;
}

/** Language pills that keep the current path. The pathname is runtime data, so it streams in. */
export function LangSwitch(props: Props) {
  return (
    <Suspense fallback={<LangPills {...props} path="/" />}>
      <CurrentPathPills {...props} />
    </Suspense>
  );
}
