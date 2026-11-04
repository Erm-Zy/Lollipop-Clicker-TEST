import { createMusicPlayer } from "./music/player.js";

// Local soundtrack player + original lightweight synthesized effects.
export function createAudio(settings, options = {}) {
  const player = createMusicPlayer(settings, options);
  let context;
  let suspended = false;
  let lastSound = 0;
  return {
    ...player,
    suspend(value) {
      suspended = value;
      player.suspend(value);
      if (value && context?.state === "running") context.suspend().catch(() => {});
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
      player.dispose();
      context?.close().catch(() => {});
    },
  };
}
