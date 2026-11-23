export const INTRO_STORAGE_KEY = "ganh:intro";

/**
 * Inline, pre-hydration script for the root layout: marks the intro as done when it
 * already played this session or the user prefers reduced motion, so the loader never flashes.
 * It also sets `html[data-motion]` when scripts run and motion is allowed: intro-only hidden
 * states (loader, hero, photo row) apply only under it, so server HTML without JS or with
 * reduced motion is visible before hydration.
 */
export const INTRO_BOOT_SCRIPT = `(function(){var d=document.documentElement,r=false;try{r=matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){}if(!r)d.dataset.motion="1";try{if(r||sessionStorage.getItem(${JSON.stringify(
  INTRO_STORAGE_KEY,
)}))d.dataset.introDone="1"}catch(e){}})()`;
