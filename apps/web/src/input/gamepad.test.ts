import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { gamepadManager, XboxButton, type ControllerDirection } from './gamepad';

describe('GamepadManager', () => {
  beforeEach(() => {
    document.body.className = '';
  });

  afterEach(() => {
    gamepadManager.destroy();
  });

  it('subscribes to button down and up events and marks controller as active', () => {
    const onButtonDown = vi.fn();
    const onButtonUp = vi.fn();

    const unsub = gamepadManager.subscribe({
      id: 'test-listener-1',
      onButtonDown,
      onButtonUp,
    });

    // Simulate A button down
    gamepadManager.simulateButtonDown(XboxButton.A);
    expect(onButtonDown).toHaveBeenCalledTimes(1);
    expect(onButtonDown).toHaveBeenCalledWith(XboxButton.A);
    expect(gamepadManager.getState().isActive).toBe(true);
    expect(document.body.classList.contains('controller-active')).toBe(true);

    // Simulate A button up
    gamepadManager.simulateButtonUp(XboxButton.A);
    expect(onButtonUp).toHaveBeenCalledTimes(1);
    expect(onButtonUp).toHaveBeenCalledWith(XboxButton.A);

    unsub();

    // After unsubscribe, no further calls
    gamepadManager.simulateButtonDown(XboxButton.B);
    expect(onButtonDown).toHaveBeenCalledTimes(1);
  });

  it('subscribes to directional navigation events', () => {
    const onDirection = vi.fn();

    const unsub = gamepadManager.subscribe({
      id: 'test-direction-listener',
      onDirection,
    });

    const directions: ControllerDirection[] = ['up', 'down', 'left', 'right'];
    for (const dir of directions) {
      gamepadManager.simulateDirection(dir);
      expect(onDirection).toHaveBeenCalledWith(dir);
    }

    expect(onDirection).toHaveBeenCalledTimes(4);
    unsub();
  });

  it('notifies on controller connection change', () => {
    const onStateChange = vi.fn();
    const unsub = gamepadManager.onStateChange(onStateChange);

    // Initial state notification
    expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({ isConnected: false }));

    // Simulate connection
    gamepadManager.simulateConnected(true, 'Xbox Wireless Controller');
    expect(gamepadManager.getState().isConnected).toBe(true);
    expect(gamepadManager.getState().gamepadId).toBe('Xbox Wireless Controller');
    expect(onStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isConnected: true,
        gamepadId: 'Xbox Wireless Controller',
      })
    );

    // Simulate disconnect
    gamepadManager.simulateConnected(false);
    expect(gamepadManager.getState().isConnected).toBe(false);
    expect(onStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ isConnected: false, gamepadId: null })
    );

    unsub();
  });

  it('maps simulated keyboard events to Xbox buttons and directions', () => {
    const onButtonDown = vi.fn();
    const onDirection = vi.fn();

    const unsub = gamepadManager.subscribe({
      id: 'test-keyboard-listener',
      onButtonDown,
      onDirection,
    });

    // Face buttons: a, b, x, y
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(onButtonDown).toHaveBeenCalledWith(XboxButton.A);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));
    expect(onButtonDown).toHaveBeenCalledWith(XboxButton.B);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
    expect(onButtonDown).toHaveBeenCalledWith(XboxButton.X);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y' }));
    expect(onButtonDown).toHaveBeenCalledWith(XboxButton.Y);

    // D-pad / Arrow keys
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(onButtonDown).toHaveBeenCalledWith(XboxButton.DPadUp);
    expect(onDirection).toHaveBeenCalledWith('up');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(onButtonDown).toHaveBeenCalledWith(XboxButton.DPadDown);
    expect(onDirection).toHaveBeenCalledWith('down');

    // Bumpers: q (LB), e (RB)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'q' }));
    expect(onButtonDown).toHaveBeenCalledWith(XboxButton.LB);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }));
    expect(onButtonDown).toHaveBeenCalledWith(XboxButton.RB);

    unsub();
  });
});
