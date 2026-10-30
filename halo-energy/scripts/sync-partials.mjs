// Stamps the shared head, header and footer from partials/ into every page.
// Pages stay plain static HTML; run `node scripts/sync-partials.mjs` after editing a partial.
// Each page marks its regions with <!-- head:start --> ... <!-- head:end --> (likewise header/footer)
// and names its nav section with <body data-nav="...">.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const partial = (name) => readFileSync(join(root, "partials", `${name}.html`), "utf8").trimEnd();
const parts = { head: partial("head"), header: partial("header"), footer: partial("footer") };

const pages = readdirSync(root).filter((f) => f.endsWith(".html"));
let changed = 0;

for (const file of pages) {
  const path = join(root, file);
  const before = readFileSync(path, "utf8");
  const nav = before.match(/<body[^>]*\sdata-nav="([^"]+)"/)?.[1];
  let html = before;

  for (const [name, content] of Object.entries(parts)) {
    let body = content;
    if (name === "header" && nav) {
      body = body.replace(`data-nav="${nav}">`, `data-nav="${nav}" aria-current="page">`);
    }
    const re = new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(<!-- ${name}:end -->)`);
    if (!re.test(html)) continue;
    html = html.replace(re, `$1\n${body}\n$2`);
  }

  if (html !== before) {
    writeFileSync(path, html);
    changed++;
  }
}

console.log(`Synced partials into ${changed} of ${pages.length} pages.`);
