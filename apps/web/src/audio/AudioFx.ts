/**
 * AudioFx - Procedural Web Audio API Sound Synthesizer for Math Archer
 *
 * Layered transients, material textures, and elemental accents synthesized
 * locally with Web Audio. No downloaded assets; works offline.
 */

import type { ElementType, CharacterType } from '@math-archer/learning-engine';

export const AUDIO_MUTED_STORAGE_KEY = 'math_archer_audio_muted';

export type AudioMuteListener = (isMuted: boolean) => void;

export class AudioManager {
  private audioCtx: AudioContext | null = null;
  private mix: GainNode | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
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
    if (this.master && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(muted ? 0 : 0.72, now + 0.015);
    }
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

  /** A shared mix keeps simultaneous release, flight, and impact layers controlled. */
  private getMix(ctx: AudioContext): GainNode {
    if (this.mix) return this.mix;
    const input = ctx.createGain();
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 35;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.12;
    const master = ctx.createGain();
    master.gain.value = this.isMuted ? 0 : 0.72;
    input.connect(highpass);
    highpass.connect(compressor);
    compressor.connect(master);
    master.connect(ctx.destination);

    // Quiet, short stereo room reflections give body without obscuring the attack.
    const room = ctx.createConvolver();
    const impulse = ctx.createBuffer(2, Math.ceil(ctx.sampleRate * 0.22), ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      let smooth = 0;
      for (let i = 0; i < data.length; i++) {
        smooth = smooth * 0.6 + (Math.random() * 2 - 1) * 0.4;
        const time = i / ctx.sampleRate;
        data[i] = time < 0.012 ? 0 : smooth * Math.exp(-time * 32);
      }
    }
    room.buffer = impulse;
    const wet = ctx.createGain();
    wet.gain.value = 0.09;
    input.connect(room);
    room.connect(wet);
    wet.connect(compressor);
    this.master = master;
    this.mix = input;
    return input;
  }

  private play(effect: (ctx: AudioContext, now: number) => void): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      this.getMix(ctx);
      effect(ctx, ctx.currentTime);
    } catch {
      // Audio may be unavailable in restricted browsers; gameplay still continues.
    }
  }

  private envelope(
    gain: GainNode,
    start: number,
    duration: number,
    level: number,
    attack = 0.002
  ): void {
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration - 0.008);
    gain.gain.linearRampToValueAtTime(0, start + duration);
  }

  private tone(
    ctx: AudioContext,
    start: number,
    frequency: number,
    endFrequency: number,
    duration: number,
    level: number,
    type: OscillatorType = 'sine',
    attack = 0.002
  ): void {
    const source = ctx.createOscillator();
    const gain = ctx.createGain();
    source.type = type;
    source.frequency.setValueAtTime(frequency, start);
    source.frequency.exponentialRampToValueAtTime(endFrequency, start + duration * 0.7);
    this.envelope(gain, start, duration, level, attack);
    source.connect(gain);
    gain.connect(this.getMix(ctx));
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    source.start(start);
    source.stop(start + duration);
  }

  private noise(
    ctx: AudioContext,
    start: number,
    duration: number,
    frequency: number,
    endFrequency: number,
    level: number,
    type: BiquadFilterType = 'bandpass',
    attack = 0.002,
    q = 0.7
  ): void {
    // Reuse full-band noise; random offsets make repeated attacks subtly different.
    if (!this.noiseBuffer) {
      this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(frequency, start);
    filter.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    const gain = ctx.createGain();
    this.envelope(gain, start, duration, level, attack);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.getMix(ctx));
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    source.start(start, Math.random() * (1 - duration));
    source.stop(start + duration);
  }

  /** Texture is separate from success feedback so every element reads as a hit. */
  private elementImpact(ctx: AudioContext, now: number, element: ElementType, strength = 1): void {
    if (element === 'fire') {
      this.noise(ctx, now, 0.2, 2600, 650, 0.26 * strength, 'lowpass');
      this.tone(ctx, now, 180, 75, 0.18, 0.16 * strength);
      for (let i = 0; i < 3; i++) {
        this.noise(ctx, now + 0.035 + i * 0.035, 0.025, 4200, 2200, 0.1 * strength);
      }
    } else if (element === 'ice') {
      this.noise(ctx, now, 0.07, 5500, 2800, 0.18 * strength, 'highpass');
      [1568, 2349, 3520].forEach((frequency, i) => {
        this.tone(ctx, now + i * 0.014, frequency, frequency, 0.24 - i * 0.04, 0.075 * strength);
      });
    } else if (element === 'wind') {
      this.noise(ctx, now, 0.24, 2400, 800, 0.27 * strength, 'bandpass', 0.015, 1.3);
      this.tone(ctx, now + 0.015, 740, 1046, 0.15, 0.045 * strength);
    } else {
      this.tone(ctx, now, 110, 55, 0.24, 0.23 * strength);
      this.noise(ctx, now, 0.18, 1600, 380, 0.3 * strength, 'lowpass');
      this.noise(ctx, now + 0.04, 0.12, 3000, 900, 0.13 * strength);
    }
  }

  /** A stable ascending major interval communicates success, without a pitch slide. */
  private success(ctx: AudioContext, now: number): void {
    [1046.5, 1318.51, 1568].forEach((frequency, i) => {
      const start = now + 0.035 + i * 0.045;
      this.tone(ctx, start, frequency, frequency, 0.28, 0.085, 'sine', 0.004);
      this.tone(ctx, start, frequency * 2, frequency * 2, 0.16, 0.018, 'sine', 0.004);
    });
  }

  public playBowRelease(element: ElementType = 'fire'): void {
    this.play((ctx, now) => {
      const pitch =
        (element === 'earth' ? 0.85 : element === 'ice' ? 1.12 : 1) * (0.98 + Math.random() * 0.04);
      // String snap, taut string harmonics, and the wooden bow body.
      this.noise(ctx, now, 0.035, 4200, 1800, 0.32, 'highpass');
      this.tone(ctx, now, 340 * pitch, 245 * pitch, 0.16, 0.2, 'triangle');
      this.tone(ctx, now, 680 * pitch, 490 * pitch, 0.09, 0.055, 'triangle');
      this.tone(ctx, now, 155 * pitch, 120 * pitch, 0.12, 0.12);
      this.elementImpact(ctx, now + 0.012, element, 0.3);
    });
  }

  public playArrowFlight(element: ElementType = 'fire'): void {
    this.play((ctx, now) => {
      const frequency = element === 'ice' ? 3600 : element === 'earth' ? 1500 : 2600;
      this.noise(ctx, now, 0.22, frequency, frequency * 0.35, 0.18, 'bandpass', 0.025, 1.1);
      this.noise(ctx, now, 0.16, 6500, 2800, 0.065, 'highpass', 0.015);
      if (element === 'ice') this.tone(ctx, now, 1760, 1320, 0.16, 0.035, 'sine', 0.015);
      if (element === 'fire') this.noise(ctx, now, 0.18, 1200, 450, 0.11, 'lowpass', 0.015);
      if (element === 'wind')
        this.noise(ctx, now + 0.025, 0.2, 3800, 1200, 0.1, 'bandpass', 0.02, 2);
      if (element === 'earth') this.tone(ctx, now, 160, 100, 0.18, 0.045, 'sine', 0.015);
    });
  }

  private impact(outcome: 'hit' | 'miss', element: ElementType, dummy: boolean): void {
    this.play((ctx, now) => {
      if (outcome === 'miss') {
        // A quiet passing swish stays clearly distinct from a successful strike.
        const frequency = element === 'ice' ? 3600 : element === 'earth' ? 1500 : 2400;
        this.noise(ctx, now, 0.2, frequency, 700, 0.16, 'bandpass', 0.025);
        this.noise(ctx, now + 0.04, 0.08, 2200, 1200, 0.05, 'highpass', 0.01);
        return;
      }
      const pitch = 0.97 + Math.random() * 0.06;
      // Bright contact transient + audible midrange body, even on small speakers.
      this.noise(ctx, now, 0.045, 5200, 1800, 0.42, 'lowpass');
      this.tone(ctx, now, (dummy ? 185 : 220) * pitch, 95 * pitch, 0.14, 0.32);
      this.tone(
        ctx,
        now + 0.003,
        (dummy ? 390 : 520) * pitch,
        (dummy ? 340 : 460) * pitch,
        0.095,
        0.14,
        'triangle'
      );
      if (dummy) {
        // Burlap/straw crunch, replacing the old descending spring boing.
        this.noise(ctx, now + 0.006, 0.12, 2800, 900, 0.3, 'bandpass');
      } else {
        this.noise(ctx, now + 0.004, 0.09, 1800, 650, 0.23, 'bandpass');
        this.tone(ctx, now, 780 * pitch, 730 * pitch, 0.12, 0.055);
      }
      this.elementImpact(ctx, now + 0.008, element, 0.65);
      this.success(ctx, now);
    });
  }

  public playTargetHit(outcome: 'hit' | 'miss', element: ElementType = 'fire'): void {
    this.impact(outcome, element, false);
  }

  public playDummyHit(outcome: 'hit' | 'miss', element: ElementType = 'fire'): void {
    this.impact(outcome, element, true);
  }

  public playCharacterAttack(character: CharacterType, element: ElementType = 'fire'): void {
    if (character === 'wizard') return this.playMagicCast(element);
    if (character === 'archer') return this.playBowRelease(element);
    this.play((ctx, now) => {
      if (character === 'gunner') {
        // Sharp muzzle crack, a compact low body, and a metallic mechanism tick.
        this.noise(ctx, now, 0.04, 6500, 2200, 0.42, 'highpass');
        this.noise(ctx, now, 0.1, 2800, 450, 0.3, 'lowpass');
        this.tone(ctx, now, 165, 65, 0.12, 0.22);
        this.noise(ctx, now + 0.055, 0.035, 3400, 1800, 0.12);
      } else {
        // Axe release: broad air sweep and a short resonant handle accent.
        this.noise(ctx, now, 0.23, 1200, 3200, 0.28, 'bandpass', 0.025);
        this.noise(ctx, now + 0.025, 0.16, 5200, 1800, 0.1, 'highpass', 0.015);
        this.tone(ctx, now, 240, 150, 0.13, 0.12, 'triangle');
      }
      this.elementImpact(ctx, now + 0.012, element, 0.3);
    });
  }

  public playMagicCast(element: ElementType = 'fire'): void {
    this.play((ctx, now) => {
      const root =
        element === 'ice'
          ? 659.25
          : element === 'wind'
            ? 587.33
            : element === 'earth'
              ? 329.63
              : 440;
      this.noise(ctx, now, 0.26, 850, 4200, 0.22, 'bandpass', 0.045, 1.2);
      this.tone(ctx, now, root, root * 2, 0.23, 0.13, 'sine', 0.025);
      [1, 1.5, 2, 3].forEach((ratio, i) => {
        this.tone(
          ctx,
          now + 0.025 + i * 0.03,
          root * ratio * 2,
          root * ratio * 2,
          0.27,
          0.065 / (1 + i * 0.3),
          'sine',
          0.004
        );
      });
      this.elementImpact(ctx, now + 0.025, element, 0.35);
    });
  }
}

export const audioFx = new AudioManager();
