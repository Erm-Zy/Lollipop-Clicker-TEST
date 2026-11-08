#!/usr/bin/env bash
# Called INSIDE emulator-runner, before its device teardown. Never print saves/secrets.
set -Eeuo pipefail
out="${RUNNER_TEMP:-/tmp}/android-smoke"
mkdir -p "$out"
logcat_pid=""
tags=(LollipopSmoke:I AndroidRuntime:E chromium:E Capacitor/Console:E DEBUG:F ActivityManager:E lmkd:I '*:S')
capture() {
  result=$?
  trap - EXIT
  if [[ -n "$logcat_pid" ]]; then kill "$logcat_pid" 2>/dev/null || true; wait "$logcat_pid" 2>/dev/null || true; fi
  printf 'instrumentation_exit=%s\n' "$result" > "$out/result.txt"
  timeout 10 adb devices -l > "$out/devices.txt" 2>&1 || printf '\nADB unavailable\n' >> "$out/devices.txt"
  timeout 15 adb logcat -d -v threadtime "${tags[@]}" > "$out/logcat.txt" 2>&1 || printf '\nlogcat unavailable (device may have died)\n' >> "$out/logcat.txt"
  ps -eo pid,ppid,stat,rss,comm | awk 'NR==1 || /qemu|emulator|adb|java/' > "$out/processes.txt" || true
  free -m > "$out/memory.txt" || true
  (dmesg --color=never 2>/dev/null | grep -Ei 'qemu|emulator|out of memory|oom-kill|segfault' | tail -60) > "$out/host-kernel.txt" || printf 'Kernel diagnostics unavailable or no matching entries\n' >> "$out/host-kernel.txt"
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
android/gradlew -p android :app:connectedDebugAndroidTest --no-daemon --max-workers=2 --console=plain 2>&1 | tee "$out/gradle.txt"
