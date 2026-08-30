/**
 * Professional Hotel Operations Audio Ringer Sound Service
 * Synthesizes 3-5 second Web Audio API ringer chime sounds for Supervisor & Staff alerts
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
 * Plays a 3.5 second luxury hotel chime ringer for Supervisor (3 double chimes)
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
 * Plays a 3 second energetic staff assignment chime (2 upbeat ascending tri-tone chime pulses)
 */
export function playStaffRingerSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const pulses = [0, 1.4];

    pulses.forEach((offset) => {
      const startTime = now + offset;

      // Note 1: C5 (523.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(523.25, startTime);
      gain1.gain.setValueAtTime(0.4, startTime);
      gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(startTime);
      osc1.stop(startTime + 0.4);

      // Note 2: E5 (659.25 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, startTime + 0.15);
      gain2.gain.setValueAtTime(0.45, startTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(startTime + 0.15);
      osc2.stop(startTime + 0.5);

      // Note 3: G5 (783.99 Hz)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = "sine";
      osc3.frequency.setValueAtTime(783.99, startTime + 0.3);
      gain3.gain.setValueAtTime(0.5, startTime + 0.3);
      gain3.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.8);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(startTime + 0.3);
      osc3.stop(startTime + 0.8);
    });
  } catch (e) {
    console.warn("Unable to play staff audio ringer:", e);
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
  playSupervisorRingerSound();
}

/**
 * Triggers staff audio ringer across browser tabs via localStorage
 */
export function triggerStaffRingerBroadcast(staffName: string) {
  try {
    localStorage.setItem(
      "roomflow_ring_staff_alert",
      JSON.stringify({ staffName, timestamp: Date.now() })
    );
  } catch {
    /* quota error ignore */
  }
  playStaffRingerSound();
}
