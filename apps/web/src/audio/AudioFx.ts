/**
 * AudioFx - Procedural Web Audio API Sound Synthesizer for Math Archer
 *
 * Generates crisp, realistic archery sound effects using the native browser
 * Web Audio API with zero external audio assets, zero latency, and complete
 * offline capability.
 */

import type { ElementType } from '@math-archer/learning-engine';

class AudioManager {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    }

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    } catch {
      this.audioCtx = null;
    }

    return this.audioCtx;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Bowstring release twang - a snappy, resonant release pluck
   */
  public playBowRelease(element: ElementType = 'fire'): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Base bowstring snap oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';

      // Pitch glide: starts slightly sharp and settles
      const baseFreq = element === 'ice' ? 240 : element === 'wind' ? 220 : element === 'earth' ? 150 : 190;
      osc.frequency.setValueAtTime(baseFreq * 1.5, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.04);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, now + 0.18);

      // Low-pass filter for organic wooden bow vibration
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(250, now + 0.18);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);

      // Add a subtle string vibration overtone
      const stringVib = ctx.createOscillator();
      const stringGain = ctx.createGain();
      stringVib.type = 'sine';
      stringVib.frequency.setValueAtTime(baseFreq * 2.8, now);
      stringVib.frequency.exponentialRampToValueAtTime(baseFreq * 2.0, now + 0.12);

      stringGain.gain.setValueAtTime(0.15, now);
      stringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      stringVib.connect(stringGain);
      stringGain.connect(ctx.destination);

      stringVib.start(now);
      stringVib.stop(now + 0.15);
    } catch {
      // Graceful silence on audio restriction
    }
  }

  /**
   * Arrow in-flight aerodynamic whoosh
   */
  public playArrowFlight(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 3.0;
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(600, now + 0.14);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.16);
    } catch {
      // Gracefully ignore
    }
  }

  /**
   * Target impact: solid wooden thwack and golden bullseye chime on hit, or glancing clatter on miss
   */
  public playTargetHit(outcome: 'hit' | 'miss'): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      if (outcome === 'hit') {
        // 1. Kinetic wooden "Thud / Thwack"
        const thudOsc = ctx.createOscillator();
        const thudGain = ctx.createGain();
        thudOsc.type = 'sine';
        thudOsc.frequency.setValueAtTime(160, now);
        thudOsc.frequency.exponentialRampToValueAtTime(50, now + 0.12);

        thudGain.gain.setValueAtTime(0.5, now);
        thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        thudOsc.connect(thudGain);
        thudGain.connect(ctx.destination);
        thudOsc.start(now);
        thudOsc.stop(now + 0.15);

        // 2. Solid target board impact noise
        const bufferSize = ctx.sampleRate * 0.08;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const impactNoise = ctx.createBufferSource();
        impactNoise.buffer = buffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(600, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(150, now + 0.08);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        impactNoise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        impactNoise.start(now);
        impactNoise.stop(now + 0.09);

        // 3. Golden Bullseye Resonant Chime
        const chimeOsc = ctx.createOscillator();
        const chimeGain = ctx.createGain();
        chimeOsc.type = 'sine';
        chimeOsc.frequency.setValueAtTime(880, now + 0.02); // A5 note
        chimeOsc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.06); // D6 note

        chimeGain.gain.setValueAtTime(0.001, now);
        chimeGain.gain.linearRampToValueAtTime(0.25, now + 0.04);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        chimeOsc.connect(chimeGain);
        chimeGain.connect(ctx.destination);
        chimeOsc.start(now + 0.02);
        chimeOsc.stop(now + 0.36);
      } else {
        // Miss: Deflection glancing ricochet
        const deflectOsc = ctx.createOscillator();
        const deflectGain = ctx.createGain();
        deflectOsc.type = 'triangle';
        deflectOsc.frequency.setValueAtTime(320, now);
        deflectOsc.frequency.exponentialRampToValueAtTime(120, now + 0.16);

        deflectGain.gain.setValueAtTime(0.2, now);
        deflectGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        deflectOsc.connect(deflectGain);
        deflectGain.connect(ctx.destination);
        deflectOsc.start(now);
        deflectOsc.stop(now + 0.2);
      }
    } catch {
      // Gracefully ignore
    }
  }
}

export const audioFx = new AudioManager();

