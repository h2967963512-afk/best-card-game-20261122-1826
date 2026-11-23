// Synthesized sound with the Web Audio API: no audio files, no network. Every
// sound is a short envelope over one or two oscillators. The context is created on
// the first user gesture, so browsers never block it.
export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context) return context;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
    } catch {
      return null;
    }
    return context;
  }

  /** A single note: frequency, seconds, wave, and peak volume. */
  function tone(frequency, seconds, type, volume, when = 0) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const start = ctx.currentTime + when;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.05);
  }

  return {
    /** Call from any user gesture so later sounds are allowed to play. */
    unlock() {
      const ctx = ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    select() {
      tone(660, 0.07, 'triangle', 0.12);
    },
    playCard() {
      tone(220, 0.12, 'sine', 0.2);
      tone(440, 0.1, 'triangle', 0.12, 0.05);
    },
    hit() {
      tone(140, 0.18, 'sawtooth', 0.16);
      tone(90, 0.22, 'square', 0.1, 0.03);
    },
    heal() {
      tone(523, 0.12, 'sine', 0.12);
      tone(784, 0.16, 'sine', 0.1, 0.08);
    },
    draw() {
      tone(880, 0.06, 'triangle', 0.08);
    },
    turn() {
      tone(392, 0.09, 'triangle', 0.1);
    },
    win() {
      [523, 659, 784, 1047].forEach((frequency, index) => tone(frequency, 0.28, 'triangle', 0.14, index * 0.13));
    },
    lose() {
      [392, 330, 262, 196].forEach((frequency, index) => tone(frequency, 0.3, 'sine', 0.13, index * 0.15));
    },
  };
}
