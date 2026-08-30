/**
 * Professional Hotel Concierge Ringer Sound Service
 * Synthesizes a pleasant 3-5 second double-chime bell sound using Web Audio API
 */

let audioContextInstance: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContextInstance) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      audioContextInstance = new AudioCtx();
    }
  }
  if (audioContextInstance && audioContextInstance.state === "suspended") {
    audioContextInstance.resume().catch(() => {});
  }
  return audioContextInstance;
}

/**
 * Plays a 3.5 second luxury hotel chime ringer (3 double chimes)
 */
export function playSupervisorRingerSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // 3 chime pulses spaced over 3.5 seconds (0s, 1.2s, 2.4s)
    const pulses = [0, 1.2, 2.4];

    pulses.forEach((offset) => {
      const startTime = now + offset;

      // Primary Chime Tone (E5 ~ 659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(659.25, startTime);
      gain1.gain.setValueAtTime(0.35, startTime);
      gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.9);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(startTime);
      osc1.stop(startTime + 0.9);

      // Harmonizing Secondary Chime Tone (G#5 ~ 830.61 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(830.61, startTime + 0.12);
      gain2.gain.setValueAtTime(0.4, startTime + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.1);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(startTime + 0.12);
      osc2.stop(startTime + 1.1);

      // Third Top Shimmer Bell (B5 ~ 987.77 Hz)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = "sine";
      osc3.frequency.setValueAtTime(987.77, startTime + 0.25);
      gain3.gain.setValueAtTime(0.2, startTime + 0.25);
      gain3.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.7);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(startTime + 0.25);
      osc3.stop(startTime + 0.7);
    });
  } catch (e) {
    console.warn("Unable to play supervisor audio ringer:", e);
  }
}

/**
 * Triggers supervisor audio ringer across all browser tabs via localStorage
 */
export function triggerSupervisorRingerBroadcast() {
  try {
    localStorage.setItem("roomflow_ring_supervisor_alert", Date.now().toString());
  } catch {
    /* quota error ignore */
  }
  // Also play locally
  playSupervisorRingerSound();
}
