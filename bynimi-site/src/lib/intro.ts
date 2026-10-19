// Shared by the root layout (server) and the ASCII intro (client).

export const INTRO_KEY = "bn-intro-seen";

/**
 * Inline script for <head>. Runs before first paint and sets
 * <html data-intro-seen> when the intro shouldn't play: already seen this
 * session, landing on a page other than home, or reduced motion.
 */
export const introGuard = `try{if(sessionStorage.getItem("${INTRO_KEY}")||location.pathname!=="/"||matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.dataset.introSeen="";sessionStorage.setItem("${INTRO_KEY}","1")}}catch(e){document.documentElement.dataset.introSeen=""}`;
