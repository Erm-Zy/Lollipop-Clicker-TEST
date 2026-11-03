import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
function walk(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walk(join(path, entry.name))
      : [join(path, entry.name)],
  );
}
const modules = [...walk("js"), ...walk("tests")].filter((path) =>
  path.endsWith(".js"),
);
for (const path of [...modules, "sw.js"])
  execFileSync(process.execPath, ["--check", path], { stdio: "inherit" });
const documents = [
  "index.html",
  ...walk("pages").filter((path) => path.endsWith(".html")),
];
for (const file of documents) {
  const html = readFileSync(file, "utf8");
  if (!html.includes('lang="pt-BR"') || !html.includes('type="module"'))
    throw new Error(`Documento incompleto: ${file}`);
}
console.log(
  `${modules.length + 1} arquivos JavaScript e ${documents.length} documentos HTML verificados.`,
);
