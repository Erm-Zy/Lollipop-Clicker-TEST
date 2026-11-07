import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
export const PREFIX = "android-beta-version/";
export const MAX_CODE = 2100000000;
export function nextVersionCode(tags, now = Date.now(), floor = "3000001") {
  if (
    !/^\d+$/.test(String(floor)) ||
    !Number.isSafeInteger(Number(floor)) ||
    Number(floor) < 1 ||
    Number(floor) >= MAX_CODE
  )
    throw Error("ANDROID_VERSION_CODE_FLOOR inválido.");
  let previous = Number(floor);
  for (const tag of tags) {
    if (!tag.startsWith(PREFIX)) continue;
    const suffix = tag.slice(PREFIX.length);
    if (
      !/^[1-9]\d*$/.test(suffix) ||
      !Number.isSafeInteger(Number(suffix)) ||
      Number(suffix) > MAX_CODE
    )
      throw Error(`Registro de versionCode inválido: ${tag}`);
    previous = Math.max(previous, Number(suffix));
  }
  // Seconds since 2020 exceed the old 3000000+run_number codes. Persisted refs,
  // not the clock or workflow run counter, enforce monotonicity after bootstrap.
  const code = Math.max(
    previous + 1,
    Math.floor((now - Date.UTC(2020, 0, 1)) / 1000),
  );
  if (!Number.isSafeInteger(code) || code < 1 || code > MAX_CODE)
    throw Error(
      "Limite Android de versionCode alcançado; distribuição bloqueada.",
    );
  return code;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const git = (...args) =>
    execFileSync("git", args, { encoding: "utf8" }).trim();
  git("fetch", "origin", `refs/tags/${PREFIX}*:refs/tags/${PREFIX}*`);
  const tags = git("tag", "--list", `${PREFIX}*`).split("\n");
  const code = nextVersionCode(
    tags,
    Date.now(),
    process.env.ANDROID_VERSION_CODE_FLOOR || "3000001",
  );
  // Reserve BEFORE compilation/upload. Failed builds consume their number too.
  // A rejected push fails closed. Never force or delete counter refs.
  git(
    "-c",
    "user.name=Android Beta CI",
    "-c",
    "user.email=android-beta-ci@users.noreply.github.com",
    "-c",
    "tag.gpgSign=false",
    "tag",
    "-a",
    `${PREFIX}${code}`,
    "-m",
    `Reserved versionCode ${code}; ${randomUUID()}`,
  );
  git(
    "push",
    "origin",
    `refs/tags/${PREFIX}${code}:refs/tags/${PREFIX}${code}`,
  );
  appendFileSync(process.env.GITHUB_ENV, `ANDROID_VERSION_CODE=${code}\n`);
  console.log(`versionCode ${code} reservado permanentemente.`);
}
