import { readFileSync, existsSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
const config = JSON.parse(readFileSync("capacitor.config.json"));
assert.equal(config.appId, "com.ermzy.lollipopclicker");
assert.equal(config.webDir, "www");
assert.ok(!config.server?.url);
const docs = [
  "index.html",
  ...readdirSync("www/pages")
    .filter((n) => n.endsWith(".html"))
    .map((n) => "pages/" + n),
];
assert.equal(docs.length, 9);
for (const path of docs) {
  const html = readFileSync("www/" + path, "utf8");
  assert.ok(html.includes("native.js"));
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const url = new URL(match[1], new URL(path, "https://localhost/"));
    if (url.origin !== "https://localhost") continue;
    assert.ok(
      existsSync("www" + decodeURI(url.pathname)),
      `${path}: ${url.pathname} ausente`,
    );
  }
}
for (const asset of [
  "assets/audio/bmg1.ogg",
  "js/core/runtime.js",
  "native.js",
  "native.css",
])
  assert.ok(existsSync("www/" + asset));
console.log(
  "Pacote Android: 9 documentos, dependências locais e ID estável verificados.",
);
