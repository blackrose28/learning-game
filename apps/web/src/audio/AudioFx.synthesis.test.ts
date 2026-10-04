import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioManager } from './AudioFx';

function mockContext() {
  const parameter = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  });
  const node = () => ({ connect: vi.fn(), disconnect: vi.fn() });
  const source = () => ({
    ...node(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null as (() => void) | null,
  });
  return {
    currentTime: 10,
    sampleRate: 48000,
    state: 'running',
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    createGain: vi.fn(() => ({ ...node(), gain: parameter() })),
    createOscillator: vi.fn(() => ({ ...source(), frequency: parameter(), type: 'sine' })),
    createBufferSource: vi.fn(() => ({ ...source(), buffer: null })),
    createBiquadFilter: vi.fn(() => ({
      ...node(),
      frequency: parameter(),
      Q: parameter(),
      type: 'lowpass',
    })),
    createDynamicsCompressor: vi.fn(() => ({
      ...node(),
      threshold: parameter(),
      knee: parameter(),
      ratio: parameter(),
      attack: parameter(),
      release: parameter(),
    })),
    createConvolver: vi.fn(() => ({ ...node(), buffer: null })),
    createBuffer: vi.fn((channels: number, length: number) => {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return { getChannelData: (channel: number) => data[channel] };
    }),
  };
}

describe('Sound effect playback', () => {
  let ctx: ReturnType<typeof mockContext>;
  let manager: AudioManager;
  beforeEach(() => {
    localStorage.clear();
    ctx = mockContext();
    vi.stubGlobal(
      'AudioContext',
      vi.fn(function () {
        return ctx;
      })
    );
    manager = new AudioManager();
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each(['fire', 'ice', 'wind', 'earth'] as const)(
    'plays every %s effect with finite envelopes and cleanup',
    (element) => {
      manager.playBowRelease(element);
      manager.playArrowFlight(element);
      manager.playMagicCast(element);
      manager.playCharacterAttack('gunner', element);
      manager.playCharacterAttack('warrior', element);
      manager.playCharacterAttack('archer', element);
      manager.playCharacterAttack('wizard', element);
      manager.playDummyHit('hit', element);
      manager.playTargetHit('hit', element);
      manager.playDummyHit('miss', element);
      manager.playTargetHit('miss', element);
      const sources = [
        ...ctx.createOscillator.mock.results,
        ...ctx.createBufferSource.mock.results,
      ].map((result) => result.value);
      expect(sources.length).toBeGreaterThan(20);
      for (const source of sources) {
        expect(source.start.mock.calls[0][0]).toBeGreaterThanOrEqual(ctx.currentTime);
        expect(source.stop.mock.calls[0][0]).toBeGreaterThan(source.start.mock.calls[0][0]);
        expect(source.stop.mock.calls[0][0]).toBeLessThan(ctx.currentTime + 1);
        expect(source.onended).toBeTypeOf('function');
        source.onended?.();
        expect(source.disconnect).toHaveBeenCalledOnce();
      }
      for (const result of ctx.createGain.mock.results.slice(3)) {
        expect(result.value.gain.setValueAtTime.mock.calls[0][0]).toBe(0);
        expect(result.value.gain.linearRampToValueAtTime.mock.calls.at(-1)?.[0]).toBe(0);
      }
      expect(ctx.createDynamicsCompressor).toHaveBeenCalledOnce();
      expect(ctx.createBuffer).toHaveBeenCalledTimes(2);
      const outputNodes = [
        ...ctx.createGain.mock.results,
        ...ctx.createOscillator.mock.results,
        ...ctx.createBufferSource.mock.results,
      ];
      expect(
        outputNodes.filter((result) =>
          result.value.connect.mock.calls.some((call: unknown[]) => call[0] === ctx.destination)
        )
      ).toHaveLength(1);
    }
  );

  it.each(['playDummyHit', 'playTargetHit'] as const)(
    '%s uses rising success notes on hits and only a swish on misses',
    (method) => {
      manager[method]('hit', 'earth');
      const success = ctx.createOscillator.mock.results
        .map((result) => result.value)
        .filter((note) =>
          [1046.5, 1318.51, 1568].includes(note.frequency.setValueAtTime.mock.calls[0][0])
        );
      expect(success).toHaveLength(3);
      const times = success.map((note) => note.start.mock.calls[0][0]);
      expect(times[0]).toBeLessThan(times[1]);
      expect(times[1]).toBeLessThan(times[2]);
      for (const note of success)
        expect(note.frequency.exponentialRampToValueAtTime.mock.calls[0][0]).toBe(
          note.frequency.setValueAtTime.mock.calls[0][0]
        );
      ctx.createOscillator.mockClear();
      ctx.createBufferSource.mockClear();
      manager[method]('miss', 'earth');
      expect(ctx.createOscillator).not.toHaveBeenCalled();
      expect(ctx.createBufferSource).toHaveBeenCalledTimes(2);
    }
  );

  it('mutes active output as well as future effects', () => {
    manager.playMagicCast('ice');
    const master = ctx.createGain.mock.results[1].value;
    manager.setMuted(true);
    expect(master.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, 10.015);
    ctx.createOscillator.mockClear();
    ctx.createBufferSource.mockClear();
    manager.playCharacterAttack('gunner');
    manager.playCharacterAttack('warrior');
    manager.playBowRelease();
    manager.playArrowFlight();
    manager.playMagicCast();
    manager.playDummyHit('hit');
    manager.playTargetHit('hit');
    expect(ctx.createOscillator).not.toHaveBeenCalled();
    expect(ctx.createBufferSource).not.toHaveBeenCalled();
    manager.setMuted(false);
    expect(master.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0.72, 10.015);
  });

  it('resumes suspended audio and tolerates unavailable Web Audio', () => {
    manager.playBowRelease();
    ctx.state = 'suspended';
    manager.playArrowFlight();
    expect(ctx.resume).toHaveBeenCalledOnce();
    vi.stubGlobal('AudioContext', undefined);
    const unsupported = new AudioManager();
    ctx.createOscillator.mockClear();
    unsupported.playDummyHit('hit');
    expect(ctx.createOscillator).not.toHaveBeenCalled();
  });
});
