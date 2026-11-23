export const INTRO_STORAGE_KEY = "ganh:intro";

/**
 * Inline, pre-hydration script for the root layout: marks the intro as done when it
 * already played this session or the user prefers reduced motion, so the loader never flashes.
 */
export const INTRO_BOOT_SCRIPT = `try{if(sessionStorage.getItem(${JSON.stringify(
  INTRO_STORAGE_KEY,
)})||matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.dataset.introDone="1"}catch(e){}`;
