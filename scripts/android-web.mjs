import {
  cpSync,
  mkdirSync,
  rmSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { build } from "esbuild";
rmSync("www", { recursive: true, force: true });
mkdirSync("www");
for (const path of [
  "index.html",
  "pages",
  "css",
  "js",
  "assets",
  "icon-192.png",
  "icon-512.png",
  "manifest.json",
])
  cpSync(path, `www/${path}`, { recursive: true });
rmSync("www/js/native", { recursive: true, force: true });
await build({
  entryPoints: ["js/native/android.js"],
  outfile: "www/native.js",
  bundle: true,
  format: "iife",
  target: "chrome109",
  minify: true,
});
const style = `html{overscroll-behavior:none;touch-action:manipulation}body{user-select:none;-webkit-user-select:none;padding-top:env(safe-area-inset-top);padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right)}input,textarea{user-select:text;-webkit-user-select:text}.beta-info{margin:24px auto;padding:16px;max-width:640px;text-align:center;border:1px solid #a97899;border-radius:16px}.beta-info button{margin:8px}`;
writeFileSync("www/native.css", style);
for (const doc of [
  "index.html",
  ...readdirSync("pages")
    .filter((n) => n.endsWith(".html"))
    .map((n) => `pages/${n}`),
]) {
  const prefix = doc.startsWith("pages/") ? "../" : "./";
  let html = readFileSync(`www/${doc}`, "utf8");
  html = html.replace(
    "width=device-width,",
    "width=device-width,maximum-scale=1,user-scalable=no,",
  );
  html = html.replace(
    "</head>",
    `<link rel="stylesheet" href="${prefix}native.css"><script defer src="${prefix}native.js"></script></head>`,
  );
  writeFileSync(`www/${doc}`, html);
}
console.log(
  "Android: nove páginas e assets locais preparados em www/. Nenhuma URL remota de inicialização.",
);
