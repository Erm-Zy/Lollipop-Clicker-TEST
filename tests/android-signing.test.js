import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  validateSigning,
  REQUIRED_SIGNING_SECRETS,
} from "../scripts/android-signing.mjs";
import {
  nextVersionCode,
  PREFIX,
  MAX_CODE,
} from "../scripts/reserve-android-version.mjs";
const valid = {
  ANDROID_KEYSTORE_BASE64: Buffer.from("test fixture, not a real key").toString(
    "base64",
  ),
  ANDROID_KEYSTORE_PASSWORD: "fixture",
  ANDROID_KEY_ALIAS: "fixture",
  ANDROID_KEY_PASSWORD: "fixture",
};
for (const secret of REQUIRED_SIGNING_SECRETS)
  test(`distribution rejects missing ${secret} without leaking values`, () => {
    const env = { ...valid };
    delete env[secret];
    assert.throws(
      () => validateSigning(env),
      (error) =>
        error.message.includes(secret) && !error.message.includes("fixture"),
    );
  });
test("complete signing configuration decodes without printing credentials", () =>
  assert.ok(validateSigning(valid).length));
test("malformed base64 fails closed", () => {
  for (const text of ["!", "abc", "===="])
    assert.throws(() =>
      validateSigning({ ...valid, ANDROID_KEYSTORE_BASE64: text }),
    );
});
test("version ledger wins over clock rollback, reruns and reset workflow counters", () => {
  const now = Date.UTC(2026, 10, 7);
  const first = nextVersionCode([], now);
  assert.ok(first > 3000023);
  assert.equal(nextVersionCode([PREFIX + first], now - 1e9), first + 1);
  assert.equal(
    nextVersionCode([PREFIX + first, PREFIX + (first + 1)], now),
    first + 2,
  );
  assert.equal(nextVersionCode([], now, "2000000000"), 2000000001);
});
test("invalid or exhausted version ledgers never produce an APK version", () => {
  for (const floor of ["-1", "NaN", "1.5", "2100000000"])
    assert.throws(() => nextVersionCode([], Date.now(), floor));
  assert.throws(() => nextVersionCode([PREFIX + MAX_CODE]));
  assert.throws(() => nextVersionCode([PREFIX + "invalid"]));
});
test("workflow separates untrusted validation from mandatory signed distribution", () => {
  const workflow = readFileSync(".github/workflows/android-apk.yml", "utf8");
  const validate = workflow.split("  validate:")[1].split("  distribute:")[0];
  assert.ok(
    !validate.includes("secrets.") &&
      !validate.includes("uses: actions/upload-artifact"),
  );
  const dist = workflow.split("  distribute:")[1].split("  android-smoke:")[0];
  for (const secret of REQUIRED_SIGNING_SECRETS)
    assert.ok(dist.includes(`secrets.${secret}`));
  assert.ok(
    dist.indexOf("node scripts/android-signing.mjs") <
      dist.indexOf("Compile and verify"),
  );
  assert.ok(
    dist.includes("cancel-in-progress: false") && dist.includes("apksigner"),
  );
  assert.ok(!workflow.split("  android-smoke:")[1].includes("secrets."));
});
test("Gradle derives name from package metadata and fails closed for releases/distribution", () => {
  const gradle = readFileSync("android/app/build.gradle", "utf8");
  assert.ok(gradle.includes('applicationId "com.ermzy.lollipopclicker"'));
  assert.ok(
    gradle.includes("versionName appVersion") &&
      gradle.includes("../../package.json"),
  );
  assert.ok(
    gradle.includes(
      "distribution || releaseRequested || !providedSigning.isEmpty()",
    ),
  );
  assert.ok(gradle.includes("signingConfig signingConfigs.beta"));
});

test("real local Git reservations survive separate processes and use distinct annotated refs", async () => {
  const { mkdtempSync, rmSync, mkdirSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join, resolve } = await import("node:path");
  const { execFileSync } = await import("node:child_process");
  const folder = mkdtempSync(join(tmpdir(), "android-version-test-"));
  const remote = join(folder, "remote.git"),
    repo = join(folder, "work");
  mkdirSync(repo);
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: repo,
      stdio: "pipe",
      encoding: "utf8",
    }).trim();
  try {
    git("init", "--bare", remote);
    git("init");
    git("config", "user.name", "Version fixture");
    git("config", "user.email", "fixture@example.invalid");
    git("commit", "--allow-empty", "-m", "fixture");
    git("remote", "add", "origin", remote);
    const env = {
      ...process.env,
      GITHUB_ENV: join(folder, "env"),
      ANDROID_VERSION_CODE_FLOOR: "2000000000",
    };
    for (let i = 0; i < 2; i++)
      execFileSync(
        process.execPath,
        [resolve("scripts/reserve-android-version.mjs")],
        { cwd: repo, env, stdio: "pipe" },
      );
    const refs = git("ls-remote", "--tags", "origin");
    assert.ok(
      refs.includes(PREFIX + "2000000001") &&
        refs.includes(PREFIX + "2000000002"),
    );
    assert.equal(git("cat-file", "-t", PREFIX + "2000000001"), "tag");
    assert.equal(git("cat-file", "-t", PREFIX + "2000000002"), "tag");
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
