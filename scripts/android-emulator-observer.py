#!/usr/bin/env python3
"""CI-only emulator observer installed via emulator-runner's pre-launch hook.

The action still owns AVD creation, boot and teardown. Observe the actual child
exit, not the shell's background-launch status. Never copy crash memory dumps.
"""
import collections
import datetime
import json
import logging
import logging.handlers
import os
from pathlib import Path
import shlex
import signal
import subprocess
import sys
import threading
import time


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="milliseconds")


def output_dir():
    api = os.environ.get("ANDROID_SMOKE_API", "35")
    if api not in ("34", "35"):
        raise ValueError("unsupported diagnostic API")
    out = Path(os.environ.get("RUNNER_TEMP", "/tmp")) / "android-smoke" / f"api-{api}"
    out.mkdir(parents=True, exist_ok=True)
    return out


def install():
    binary = Path(os.environ["ANDROID_HOME"]) / "emulator" / "emulator"
    original = binary.with_name("emulator.smoke-real")
    installed = original.exists()
    if installed and "android-emulator-observer.py" not in binary.read_text(errors="replace"):
        raise RuntimeError("refusing to replace an unknown emulator backup")
    out = output_dir()
    version = subprocess.run([str(original if installed else binary), "-version"], capture_output=True, text=True, timeout=10)
    (out / "emulator-version.txt").write_text(version.stdout[:4096])
    if not installed:
        binary.rename(original)
    binary.write_text("#!/usr/bin/env bash\nexec python3 " + shlex.quote(str(Path(__file__).resolve()))
                      + " supervise " + shlex.quote(str(original)) + ' "$@"\n')
    binary.chmod(0o755)


def supervise(command, out, deadline_seconds=1200):
    out.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("emulator")
    logger.setLevel(logging.INFO)
    handler = logging.handlers.RotatingFileHandler(out / "emulator.log", maxBytes=256*1024, backupCount=1)
    logger.addHandler(handler)
    child = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    status = {"started_utc": now(), "launcher_pid": child.pid, "exit_observable": True}
    # The SDK launcher normally execs QEMU. Record the executable to verify this;
    # don't label the direct child's status as QEMU's if it forks instead.
    def save():
        (out / "emulator-exit.json").write_text(json.dumps(status, indent=2) + "\n")
    save()

    def drain():
        while True:
            line = child.stdout.readline(8192)
            if not line:
                break
            text = line.decode("utf-8", errors="replace").rstrip()
            if any(word in text.lower() for word in ("adb.pubkey", "token", "private key", "authorization")):
                text = "[authentication metadata omitted]"
            logger.info("%s %s", now(), text)
    reader = threading.Thread(target=drain, daemon=True)
    reader.start()
    expires = time.monotonic() + deadline_seconds
    recent = collections.deque(maxlen=600)  # <=20 minutes at 2 seconds; no growing process dump.
    while child.poll() is None:
        try:
            exe = Path(os.readlink(f"/proc/{child.pid}/exe")).name
            status["last_executable"] = exe
        except OSError:
            exe = "not observable"
        try:
            adb = subprocess.run(["adb", "-s", "emulator-5554", "get-state"], capture_output=True,
                                 text=True, timeout=2)
            state = adb.stdout.strip()
            if state not in ("device", "offline", "bootloader"):
                state = "unavailable"
        except (OSError, subprocess.TimeoutExpired):
            state = "unavailable"
        recent.append(f"{now()} pid={child.pid} executable={exe} alive={child.poll() is None} adb={state}\n")
        (out / "device-timeline.txt").write_text("".join(recent))
        if time.monotonic() >= expires:
            status["observer_deadline_reached"] = True
            child.kill()
            break
        time.sleep(2)
    code = child.wait()
    reader.join(timeout=3)
    status.update(ended_utc=now(), returncode=code,
                  signal=signal.Signals(-code).name if code < 0 else None)
    save()
    handler.close()
    logger.removeHandler(handler)
    return code if code >= 0 else 128-code


if __name__ == "__main__":
    if sys.argv[1] == "install":
        install()
    elif sys.argv[1] == "supervise":
        # Only observe the real AVD launch. Version/help probes must not overwrite evidence.
        if "-avd" not in sys.argv[3:]:
            os.execv(sys.argv[2], sys.argv[2:])
        sys.exit(supervise(sys.argv[2:], output_dir()))
    else:
        raise SystemExit("expected install or supervise")
