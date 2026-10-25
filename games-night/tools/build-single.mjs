// Bundles the whole show into ONE html file (fonts, styles and scripts inlined).
// Handy for sending the file to someone or for a quick preview link.
//
//   node tools/build-single.mjs out.html              full page
//   node tools/build-single.mjs out.html --fragment   page body only (for Claude previews)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [out, flag] = process.argv.slice(2);
if (!out) { console.error("Usage: node tools/build-single.mjs <out.html> [--fragment]"); process.exit(1); }

const read = (p) => readFileSync(join(root, p), "utf8");
const dataUri = (p, type) => `data:${type};base64,${readFileSync(join(root, p)).toString("base64")}`;

let html = read("index.html");

html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => {
  const css = read(href).replace(/url\("\.\.\/(fonts\/[^"]+\.woff2)"\)/g, (_m, f) => `url("${dataUri(f, "font/woff2")}")`);
  return `<style>\n${css}\n</style>`;
});
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => `<script>\n${read(src)}\n</script>`);
html = html.replace(/<link rel="icon" href="([^"]+)"[^>]*>/, (_, href) => `<link rel="icon" href="${dataUri(href, "image/svg+xml")}">`);
html = html.replace(/\s*<link rel="manifest"[^>]*>/, "");

if (flag === "--fragment") {
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
    .replace(/\s*<meta charset[^>]*>/, "")
    .replace(/\s*<meta name="viewport"[^>]*>/, "");
  const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
  html = head.trim() + "\n" + body.trim() + "\n";
}

writeFileSync(out, html);
console.log(`Wrote ${out} (${Math.round(html.length / 1024)} KB)`);
