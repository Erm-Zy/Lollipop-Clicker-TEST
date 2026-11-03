// Existing soundtrack + lightweight synthesized effects. No network audio dependency.
export function createAudio(settings) {
  const music = new Audio(
    new URL("../assets/audio/bmg1.ogg", import.meta.url).href,
  );
  music.loop = true;
  music.volume = 0.25;
  music.preload = "none";
  let context;
  let unlocked = false;
  let suspended = false;
  let lastSound = 0;
  function sync() {
    if (unlocked && settings().music && !suspended)
      music.play().catch(() => {});
    else music.pause();
  }
  return {
    unlock() {
      unlocked = true;
      sync();
    },
    sync,
    suspend(value) {
      suspended = value;
      sync();
    },
    play(type = "click") {
      if (!settings().sfx || suspended) return;
      const now = performance.now();
      if (now - lastSound < 35) return;
      lastSound = now;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      try {
        context ||= new AudioContext();
        if (context.state === "suspended") context.resume().catch(() => {});
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const time = context.currentTime;
        const duration = type === "win" ? 0.28 : 0.09;
        oscillator.type = type === "buy" ? "triangle" : "sine";
        oscillator.frequency.setValueAtTime(type === "win" ? 523 : 440, time);
        oscillator.frequency.exponentialRampToValueAtTime(
          type === "win" ? 1046 : 740,
          time + duration,
        );
        gain.gain.setValueAtTime(0.065, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        oscillator.connect(gain).connect(context.destination);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
        oscillator.start(time);
        oscillator.stop(time + duration);
      } catch {
        /* Audio is optional when a browser denies access. */
      }
    },
    dispose() {
      music.pause();
      context?.close();
    },
  };
}
