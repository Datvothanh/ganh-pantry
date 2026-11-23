import { notFound } from "next/navigation";

// Any unmatched path under a locale renders the localized 404 inside the shell.
export default function CatchAll() {
  notFound();
}
