/**
 * The anti-flash script.
 *
 * React cannot help here. Any theme decision made in a component runs *after*
 * first paint, so a user with a dark preference gets a full-screen white flash
 * on every navigation — the single most obvious "this was bolted on" tell in a
 * themed app.
 *
 * The fix is to decide before the browser paints anything: this string is
 * injected into <head> as a blocking inline script, so the `.dark` class is on
 * <html> before the first pixel is drawn. It is deliberately tiny (under 300
 * bytes) because it blocks parsing, and wrapped in try/catch because
 * localStorage throws outright in some privacy modes — a theme preference is
 * never worth breaking the page over.
 *
 * Precedence: an explicit choice the user has made, otherwise the operating
 * system preference.
 */

export const THEME_STORAGE_KEY = "skysift-theme";

export const themeInitScript = `
(function(){try{
var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
var d=s==="dark"||(s===null&&window.matchMedia("(prefers-color-scheme: dark)").matches);
document.documentElement.classList.toggle("dark",d);
}catch(e){}})();
`.trim();
