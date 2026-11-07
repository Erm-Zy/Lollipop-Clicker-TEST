import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, existsSync } from "node:fs";
import { resolve, join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
function walk(path) {
  return readdirSync(path, { withFileTypes: true }).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(entry =>
    entry.isDirectory() ? walk(join(path,entry.name)) : [join(path,entry.name)]);
}
export function buildPwa({ root = ROOT, out = join(ROOT,"dist") } = {}) {
  root = resolve(root); out = resolve(out);
  // Never allow the clean step to remove source, an ancestor or an application directory.
  if (out === root || !relative(out,root).startsWith("..") ||
      ["js","css","assets","pages","android","tests","scripts",".git"].some(p => out === join(root,p) || out.startsWith(join(root,p)+"/")))
    throw new Error("Diretório de saída inseguro");
  if (existsSync(out) && readdirSync(out).length && !existsSync(join(out,"pwa-release.json")))
    throw new Error("A saída existente não é um artefato PWA; recusa de limpeza");
  const paths = ["index.html","manifest.json","icon-192.png","icon-512.png",".nojekyll"];
  for (const folder of ["pages","css","js","assets"]) {
    for (const absolute of walk(join(root,folder))) {
      const path=relative(root,absolute).replaceAll("\\","/");
      if (!path.startsWith("js/native/") && !path.endsWith("/.gitkeep")) paths.push(path);
    }
  }
  if (existsSync(join(root,"CNAME"))) paths.push("CNAME");
  paths.sort();
  const template=readFileSync(join(root,"sw.js"),"utf8");
  const sources=new Map(paths.map(path=>[path,readFileSync(join(root,path))]));
  const releaseHash=createHash("sha256");
  for (const [path,bytes] of sources) releaseHash.update(`${path}\0${digest(bytes)}\n`);
  releaseHash.update(template).update(readFileSync(fileURLToPath(import.meta.url)));
  const id=releaseHash.digest("hex");
  rmSync(out,{recursive:true,force:true}); mkdirSync(out,{recursive:true});
  const assets=[];
  for (const [path,source] of sources) {
    const bytes=path.endsWith(".html") ? Buffer.from(source.toString().replace("</head>",`<meta name="lollipop-release" content="${id}" /></head>`)) : source;
    mkdirSync(dirname(join(out,path)),{recursive:true}); writeFileSync(join(out,path),bytes);
    const required=path==="index.html" || /^(pages|css|js)\//.test(path) ||
      ["manifest.json","icon-192.png","icon-512.png","assets/audio/bmg1.ogg","assets/images/bg-purple.png"].includes(path) || /\.(woff2?|ttf|otf)$/.test(path);
    assets.push({path,hash:digest(bytes),required});
  }
  const release={protocol:1,id,assets};
  const worker=template.replace("/*__PWA_RELEASE__*/ null",JSON.stringify(release));
  if (worker===template) throw new Error("Marcador de release ausente no worker");
  writeFileSync(join(out,"sw.js"),worker);
  writeFileSync(join(out,"pwa-release.json"),JSON.stringify(release,null,2)+"\n");
  return release;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const index=process.argv.indexOf("--out");
  const release=buildPwa({out:index>=0 ? process.argv[index+1] : undefined});
  console.log(`PWA ${release.id.slice(0,12)}: ${release.assets.filter(a=>a.required).length} arquivos obrigatórios, ${release.assets.length} assets locais.`);
}
