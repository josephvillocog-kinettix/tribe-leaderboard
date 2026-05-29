/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class HawaiianAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true;

  constructor() {
    // Lazy initialisation to prevent console noise before user interaction
  }

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (!muted) {
      this.init();
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    }
  }

  public getMuted() {
    return this.isMuted;
  }

  // Play a bamboo "clack" / percussion sound
  public playBambooClack(pitchHz: number = 220, duration: number = 0.15) {
    this.init();
    if (this.isMuted || !this.ctx) return;

    try {
      const actx = this.ctx;
      const osc = actx.createOscillator();
      const gain = actx.createGain();

      // Triangle + Sine combination for wood timbre
      osc.type = "triangle";
      osc.frequency.setValueAtTime(pitchHz, actx.currentTime);
      // Fast exponential decay of frequency creates the striking wood pop
      osc.frequency.exponentialRampToValueAtTime(pitchHz * 1.8, actx.currentTime + 0.02);
      osc.frequency.exponentialRampToValueAtTime(pitchHz * 0.4, actx.currentTime + duration);

      gain.gain.setValueAtTime(0.4, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + duration);

      // Lowpass filter to muffle and make it sound woody
      const filter = actx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1200, actx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(actx.destination);

      osc.start();
      osc.stop(actx.currentTime + duration);
    } catch (e) {
      console.warn("Audio play failed:", e);
    }
  }

  // Play wooden chime sweeping chord (refresh event)
  public playTriumphChime() {
    this.init();
    if (this.isMuted || !this.ctx) return;

    try {
      const actx = this.ctx;
      const pitches = [523.25, 659.25, 783.99, 987.77, 1046.50]; // C Major 7 chord cascade
      
      pitches.forEach((freq, i) => {
        const timeOffset = i * 0.06;
        const osc = actx.createOscillator();
        const gain = actx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, actx.currentTime + timeOffset);

        gain.gain.setValueAtTime(0, actx.currentTime + timeOffset);
        gain.gain.linearRampToValueAtTime(0.12, actx.currentTime + timeOffset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + timeOffset + 0.6);

        osc.connect(gain);
        gain.connect(actx.destination);

        osc.start(actx.currentTime + timeOffset);
        osc.stop(actx.currentTime + timeOffset + 0.65);
      });
    } catch (e) {
      console.warn("Audio play failed:", e);
    }
  }

  // Play a tribal conch drum beat (First Place shifts)
  public playConchDrum() {
    this.init();
    if (this.isMuted || !this.ctx) return;

    try {
      const actx = this.ctx;
      const now = actx.currentTime;

      // Heavy low-pass filtered transient drum pop (Ipu Heke drum)
      const drumHits = [0, 0.22, 0.44];
      drumHits.forEach((offset, idx) => {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        const filter = actx.createBiquadFilter();

        osc.type = "sine";
        // Deep resonance at 65Hz / 55Hz
        const drumFreq = idx === 1 ? 75 : 60;
        osc.frequency.setValueAtTime(drumFreq, now + offset);
        osc.frequency.exponentialRampToValueAtTime(30, now + offset + 0.15);

        gain.gain.setValueAtTime(0, now + offset);
        gain.gain.linearRampToValueAtTime(0.6, now + offset + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.25);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(150, now + offset);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(actx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.3);
      });
    } catch (e) {
      console.warn("Audio play failed:", e);
    }
  }
}

export const islandAudio = new HawaiianAudioEngine();
