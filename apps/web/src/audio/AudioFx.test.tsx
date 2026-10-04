import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { audioFx, AudioManager, AUDIO_MUTED_STORAGE_KEY } from './AudioFx';
import { App } from '../App';

describe('Item 6: Procedural Audio Mute Setting Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    audioFx.setMuted(false);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    audioFx.setMuted(false);
    vi.unstubAllGlobals();
  });

  it('initializes as unmuted by default when localStorage is empty', () => {
    audioFx.initMuteFromStorage();
    expect(audioFx.getIsMuted()).toBe(false);
  });

  it('persists isMuted to localStorage on setMuted(true) and setMuted(false)', () => {
    audioFx.setMuted(true);
    expect(audioFx.getIsMuted()).toBe(true);
    expect(localStorage.getItem(AUDIO_MUTED_STORAGE_KEY)).toBe('true');

    audioFx.setMuted(false);
    expect(audioFx.getIsMuted()).toBe(false);
    expect(localStorage.getItem(AUDIO_MUTED_STORAGE_KEY)).toBe('false');
  });

  it('hydrates muted state from localStorage on initMuteFromStorage', () => {
    localStorage.setItem(AUDIO_MUTED_STORAGE_KEY, 'true');
    audioFx.initMuteFromStorage();
    expect(audioFx.getIsMuted()).toBe(true);

    localStorage.setItem(AUDIO_MUTED_STORAGE_KEY, 'false');
    audioFx.initMuteFromStorage();
    expect(audioFx.getIsMuted()).toBe(false);
  });

  it('notifies subscribers when audio mute state changes', () => {
    const listener = vi.fn();
    const unsubscribe = audioFx.subscribe(listener);

    // Should receive initial value immediately
    expect(listener).toHaveBeenCalledWith(false);

    audioFx.setMuted(true);
    expect(listener).toHaveBeenCalledWith(true);

    unsubscribe();
    audioFx.setMuted(false);
    expect(listener).toHaveBeenCalledTimes(2); // Initial (false) + true, no call after unsubscribe
  });

  it('avoids audio synthesis when isMuted is true', () => {
    const fakeOsc = {
      connect: vi.fn(),
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      start: vi.fn(),
      stop: vi.fn(),
    };
    const fakeGain = {
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
    };
    const fakeFilter = {
      connect: vi.fn(),
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      Q: { value: 1 },
    };
    const fakeCtx = {
      state: 'running',
      currentTime: 10,
      sampleRate: 44100,
      destination: {},
      createDynamicsCompressor: vi.fn().mockReturnValue({
        connect: vi.fn(),
        threshold: {},
        knee: {},
        ratio: {},
        attack: {},
        release: {},
      }),
      createConvolver: vi.fn().mockReturnValue({ connect: vi.fn(), buffer: null }),
      createOscillator: vi.fn().mockReturnValue(fakeOsc),
      createGain: vi.fn().mockReturnValue(fakeGain),
      createBiquadFilter: vi.fn().mockReturnValue(fakeFilter),
      createBuffer: vi.fn().mockReturnValue({
        getChannelData: vi.fn().mockReturnValue(new Float32Array(100)),
      }),
      createBufferSource: vi.fn().mockReturnValue({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }),
      resume: vi.fn().mockResolvedValue(undefined),
    };

    // Attach mock AudioContext to window
    vi.stubGlobal(
      'AudioContext',
      vi.fn().mockImplementation(() => fakeCtx)
    );

    const manager = new AudioManager();

    // Muted
    manager.setMuted(true);
    manager.playBowRelease('fire');
    manager.playArrowFlight('fire');
    manager.playTargetHit('hit', 'fire');

    // Should not interact with audio context when muted
    expect(fakeCtx.createOscillator).not.toHaveBeenCalled();

    // Unmuted
    manager.setMuted(false);
    manager.playBowRelease('fire');
    expect(fakeCtx.createOscillator).toHaveBeenCalled();
  });

  it('renders audio mute toggle button in App header and allows toggling', async () => {
    await act(async () => {
      render(<App />);
    });

    const toggleBtn = screen.getByTestId('audio-mute-toggle');
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveTextContent(/Sound On/i);

    // Click to mute
    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    expect(toggleBtn).toHaveTextContent(/Muted/i);
    expect(localStorage.getItem(AUDIO_MUTED_STORAGE_KEY)).toBe('true');
    expect(audioFx.getIsMuted()).toBe(true);

    // Click to unmute
    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    expect(toggleBtn).toHaveTextContent(/Sound On/i);
    expect(localStorage.getItem(AUDIO_MUTED_STORAGE_KEY)).toBe('false');
    expect(audioFx.getIsMuted()).toBe(false);
  });

  it('renders correctly with pre-existing muted state in localStorage', async () => {
    localStorage.setItem(AUDIO_MUTED_STORAGE_KEY, 'true');
    audioFx.initMuteFromStorage();

    await act(async () => {
      render(<App />);
    });

    const toggleBtn = screen.getByTestId('audio-mute-toggle');
    expect(toggleBtn).toHaveTextContent(/Muted/i);
  });
});
