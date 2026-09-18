/**
 * AudioFx - Procedural Web Audio API Sound Synthesizer for Math Archer
 *
 * Generates crisp, realistic archery sound effects using the native browser
 * Web Audio API with zero external audio assets, zero latency, and complete
 * offline capability.
 */

import type { ElementType } from '@math-archer/learning-engine';

export const AUDIO_MUTED_STORAGE_KEY = 'math_archer_audio_muted';

export type AudioMuteListener = (isMuted: boolean) => void;

class AudioManager {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private listeners: Set<AudioMuteListener> = new Set();

  constructor() {
    this.initMuteFromStorage();
  }

  public initMuteFromStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(AUDIO_MUTED_STORAGE_KEY);
        if (stored !== null) {
          this.isMuted = stored === 'true';
        }
      } catch {
        // localStorage might be unavailable
      }
    }
  }

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
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(AUDIO_MUTED_STORAGE_KEY, String(muted));
      } catch {
        // ignore
      }
    }
    this.notifyListeners();
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public subscribe(listener: AudioMuteListener): () => void {
    this.listeners.add(listener);
    listener(this.isMuted);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.isMuted);
      } catch {
        // ignore
      }
    }
  }

  /**
   * Bowstring release twang - distinct acoustic signature per element
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

      // Pitch glide tailored to element
      const baseFreq =
        element === 'ice' ? 270 : element === 'wind' ? 220 : element === 'earth' ? 135 : 195; // fire default

      osc.frequency.setValueAtTime(baseFreq * 1.5, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.04);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, now + 0.18);

      // Low-pass filter for organic wooden bow vibration
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(
        element === 'ice' ? 1200 : element === 'earth' ? 500 : 800,
        now
      );
      filter.frequency.exponentialRampToValueAtTime(250, now + 0.18);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);

      // Distinct elemental overtone layer
      if (element === 'fire') {
        // Fire: snappy thermal crackle noise burst
        const crackleSize = Math.floor(ctx.sampleRate * 0.06);
        const crackleBuf = ctx.createBuffer(1, crackleSize, ctx.sampleRate);
        const data = crackleBuf.getChannelData(0);
        for (let i = 0; i < crackleSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
        const crackle = ctx.createBufferSource();
        crackle.buffer = crackleBuf;
        const cFilter = ctx.createBiquadFilter();
        cFilter.type = 'bandpass';
        cFilter.frequency.setValueAtTime(1800, now);
        const cGain = ctx.createGain();
        cGain.gain.setValueAtTime(0.2, now);
        cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        crackle.connect(cFilter);
        cFilter.connect(cGain);
        cGain.connect(ctx.destination);
        crackle.start(now);
        crackle.stop(now + 0.07);
      } else if (element === 'ice') {
        // Ice: crystalline chime & glassy ping overtone
        const iceChime = ctx.createOscillator();
        const iceGain = ctx.createGain();
        iceChime.type = 'sine';
        iceChime.frequency.setValueAtTime(1080, now);
        iceChime.frequency.exponentialRampToValueAtTime(860, now + 0.15);
        iceGain.gain.setValueAtTime(0.25, now);
        iceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        iceChime.connect(iceGain);
        iceGain.connect(ctx.destination);
        iceChime.start(now);
        iceChime.stop(now + 0.17);
      } else if (element === 'wind') {
        // Wind: aerodynamic whistling zephyr flutter
        const windOsc = ctx.createOscillator();
        const windGain = ctx.createGain();
        windOsc.type = 'sine';
        windOsc.frequency.setValueAtTime(440, now);
        windOsc.frequency.linearRampToValueAtTime(660, now + 0.08);
        windOsc.frequency.exponentialRampToValueAtTime(330, now + 0.16);
        windGain.gain.setValueAtTime(0.18, now);
        windGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        windOsc.connect(windGain);
        windGain.connect(ctx.destination);
        windOsc.start(now);
        windOsc.stop(now + 0.19);
      } else if (element === 'earth') {
        // Earth: deep resonant wooden body thrum
        const earthSub = ctx.createOscillator();
        const earthGain = ctx.createGain();
        earthSub.type = 'sine';
        earthSub.frequency.setValueAtTime(75, now);
        earthSub.frequency.exponentialRampToValueAtTime(45, now + 0.22);
        earthGain.gain.setValueAtTime(0.4, now);
        earthGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        earthSub.connect(earthGain);
        earthGain.connect(ctx.destination);
        earthSub.start(now);
        earthSub.stop(now + 0.25);
      }
    } catch {
      // Graceful silence on audio restriction
    }
  }

  /**
   * Arrow in-flight aerodynamic whoosh - distinct sound per element
   */
  public playArrowFlight(element: ElementType = 'fire'): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const duration = 0.18;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';

      // Element-specific flight acoustics
      if (element === 'fire') {
        // Roaring flame sizzle
        filter.Q.value = 2.5;
        filter.frequency.setValueAtTime(1400, now);
        filter.frequency.exponentialRampToValueAtTime(500, now + 0.16);
      } else if (element === 'ice') {
        // Glassy high whistling shimmer
        filter.Q.value = 4.5;
        filter.frequency.setValueAtTime(2400, now);
        filter.frequency.exponentialRampToValueAtTime(1200, now + 0.16);
      } else if (element === 'wind') {
        // Rapid streamlined fluttering vortex
        filter.Q.value = 5.0;
        filter.frequency.setValueAtTime(1800, now);
        filter.frequency.exponentialRampToValueAtTime(700, now + 0.16);
      } else {
        // Earth: Low resonant aerodynamic hum
        filter.Q.value = 1.8;
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(320, now + 0.16);
      }

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.18);
    } catch {
      // Gracefully ignore
    }
  }

  /**
   * Target impact: solid wooden thwack and golden bullseye chime on hit,
   * with distinct elemental impact layer (fire combustion, ice crystal shatter,
   * wind vortex release, earth rubble rumble) or distinct miss deflection.
   */
  public playTargetHit(outcome: 'hit' | 'miss', element: ElementType = 'fire'): void {
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
        const bufferSize = Math.floor(ctx.sampleRate * 0.08);
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

        // 4. Distinct Elemental Hit Reaction Sound Layer
        if (element === 'fire') {
          // Fire burst combustion "whoomp"
          const fireOsc = ctx.createOscillator();
          const fireGain = ctx.createGain();
          fireOsc.type = 'sine';
          fireOsc.frequency.setValueAtTime(260, now);
          fireOsc.frequency.exponentialRampToValueAtTime(60, now + 0.18);
          fireGain.gain.setValueAtTime(0.3, now);
          fireGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          fireOsc.connect(fireGain);
          fireGain.connect(ctx.destination);
          fireOsc.start(now);
          fireOsc.stop(now + 0.22);
        } else if (element === 'ice') {
          // Ice shatter crystal sparkles
          const iceShard = ctx.createOscillator();
          const iceGain = ctx.createGain();
          iceShard.type = 'sine';
          iceShard.frequency.setValueAtTime(1760, now + 0.01);
          iceShard.frequency.exponentialRampToValueAtTime(2349, now + 0.08);
          iceGain.gain.setValueAtTime(0.22, now + 0.01);
          iceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
          iceShard.connect(iceGain);
          iceGain.connect(ctx.destination);
          iceShard.start(now + 0.01);
          iceShard.stop(now + 0.25);
        } else if (element === 'wind') {
          // Wind vortex disperse rush
          const windRush = ctx.createOscillator();
          const windGain = ctx.createGain();
          windRush.type = 'triangle';
          windRush.frequency.setValueAtTime(520, now + 0.02);
          windRush.frequency.exponentialRampToValueAtTime(880, now + 0.1);
          windGain.gain.setValueAtTime(0.18, now + 0.02);
          windGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          windRush.connect(windGain);
          windGain.connect(ctx.destination);
          windRush.start(now + 0.02);
          windRush.stop(now + 0.23);
        } else if (element === 'earth') {
          // Earth seismic impact thud
          const earthSub = ctx.createOscillator();
          const earthGain = ctx.createGain();
          earthSub.type = 'sine';
          earthSub.frequency.setValueAtTime(60, now);
          earthSub.frequency.exponentialRampToValueAtTime(30, now + 0.25);
          earthGain.gain.setValueAtTime(0.5, now);
          earthGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
          earthSub.connect(earthGain);
          earthGain.connect(ctx.destination);
          earthSub.start(now);
          earthSub.stop(now + 0.3);
        }
      } else {
        // Miss: Deflection glancing ricochet with elemental acoustic character
        const deflectOsc = ctx.createOscillator();
        const deflectGain = ctx.createGain();
        deflectOsc.type = 'triangle';

        const missFreq =
          element === 'ice' ? 520 : element === 'wind' ? 380 : element === 'earth' ? 180 : 320; // fire default

        deflectOsc.frequency.setValueAtTime(missFreq, now);
        deflectOsc.frequency.exponentialRampToValueAtTime(missFreq * 0.35, now + 0.16);

        deflectGain.gain.setValueAtTime(0.25, now);
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
