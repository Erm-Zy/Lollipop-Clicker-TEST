#!/usr/bin/env bash
# Called INSIDE emulator-runner, before its device teardown. Never print saves/secrets.
set -Eeuo pipefail
api="${ANDROID_SMOKE_API:-35}"
[[ "$api" == 34 || "$api" == 35 ]] || exit 2
out="${RUNNER_TEMP:-/tmp}/android-smoke/api-$api"
mkdir -p "$out"
logcat_pid=""
mode="${1:-suite}"
[[ "$mode" == focus || "$mode" == suite ]] || exit 2
tags=(LollipopSmoke:I AndroidRuntime:E chromium:E Capacitor/Console:E DEBUG:F ActivityManager:E lmkd:I '*:S')
capture() {
  result=$?
  trap - EXIT
  if [[ -n "$logcat_pid" ]]; then kill "$logcat_pid" 2>/dev/null || true; wait "$logcat_pid" 2>/dev/null || true; fi
  printf 'instrumentation_exit=%s\n' "$result" >> "$out/result.txt"
  {
    printf 'api=%s mode=%s finished_utc=%s\n' "$api" "$mode" "$(date -u +%FT%TZ)"
    tail -8 "$out/live-logcat.txt" 2>/dev/null || true
    cat "$out/emulator-exit.json" 2>/dev/null || echo 'emulator exit not yet observable (may still be alive)'
  } > "$out/INDEX.txt"
  timeout 10 adb devices -l > "$out/devices.txt" 2>&1 || printf '\nADB unavailable\n' >> "$out/devices.txt"
  timeout 15 adb logcat -d -v threadtime "${tags[@]}" > "$out/logcat.txt" 2>&1 || printf '\nlogcat unavailable (device may have died)\n' >> "$out/logcat.txt"
  ps -eo pid,ppid,stat,rss,comm | awk 'NR==1 || /qemu|emulator|adb|java/' > "$out/processes.txt" || true
  free -m > "$out/memory.txt" || true
  # Hosted Ubuntu restricts dmesg to root; sudo -n is bounded and never prompts.
  ((timeout 10 sudo -n dmesg --color=never 2>/dev/null || timeout 10 dmesg --color=never 2>/dev/null) | grep -Ei 'qemu|emulator|out of memory|oom-kill|segfault' | tail -60) > "$out/host-kernel.txt" || printf 'Kernel diagnostics unavailable or no matching entries\n' >> "$out/host-kernel.txt"
  cp -r android/app/build/outputs/androidTest-results "$out/instrumentation-results" 2>/dev/null || true
  cp -r android/app/build/reports/androidTests "$out/instrumentation-reports" 2>/dev/null || true
  exit "$result"
}
trap capture EXIT
timeout 60 adb wait-for-device
adb shell svc wifi disable
adb shell svc data disable
adb logcat -c
printf 'phase=instrumentation-starting\n' > "$out/result.txt"
adb logcat -v threadtime "${tags[@]}" > "$out/live-logcat.txt" 2>&1 &
logcat_pid=$!
# pipefail preserves assertion/Gradle failure, diagnostics cannot turn it into success.
run_test() {
  android/gradlew -p android :app:connectedDebugAndroidTest --no-daemon --max-workers=2 --console=plain \
    "-Pandroid.testInstrumentationRunnerArguments.class=com.ermzy.lollipopclicker.$1" 2>&1 | tee "$out/$2.txt"
}
# One focused reproduction first, no assertion retry. Full mandatory suite only
# follows a successful reproduction; test state is disposable, assertions unchanged.
run_test NavigationReproTest focus
if [[ "$mode" == suite ]]; then
  cp -r android/app/build/outputs/androidTest-results "$out/focused-results"
  run_test GameOfflineTest gradle
fi
