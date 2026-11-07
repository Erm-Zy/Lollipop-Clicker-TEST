import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
export const REQUIRED_SIGNING_SECRETS = [
  "ANDROID_KEYSTORE_BASE64",
  "ANDROID_KEYSTORE_PASSWORD",
  "ANDROID_KEY_ALIAS",
  "ANDROID_KEY_PASSWORD",
];
export function validateSigning(env) {
  const missing = REQUIRED_SIGNING_SECRETS.filter((name) => !env[name]?.trim());
  if (missing.length)
    throw Error(
      `Distribuição bloqueada: configure os secrets ${missing.join(", ")}. Nenhum APK beta será distribuído com chave debug temporária.`,
    );
  const encoded = env.ANDROID_KEYSTORE_BASE64.replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4 !== 0)
    throw Error(
      "ANDROID_KEYSTORE_BASE64 inválido. Use o conteúdo base64 do keystore.",
    );
  const bytes = Buffer.from(encoded, "base64");
  if (!bytes.length || bytes.toString("base64") !== encoded)
    throw Error("ANDROID_KEYSTORE_BASE64 inválido.");
  return bytes;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const bytes = validateSigning(process.env);
  if (process.argv[2])
    writeFileSync(process.argv[2], bytes, { mode: 0o600, flag: "wx" });
  console.log(
    "Os quatro secrets de assinatura estão presentes. Alias/senhas/certificado serão verificados na compilação.",
  );
}
